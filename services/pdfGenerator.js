const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const Setting = require('../models/Setting');

let _cachedCompanySignatureUrl = null;
let _cachedCompanySignatureValid = false;

/**
 * Generates a PDF from the contract data
 * @param {Object} contractData - The contract data
 * @param {Object} templateData - The template data
 * @param {Object} signatureData - The signature data (image, etc.)
 * @param {Object} auditTrail - The audit trail data
 * @returns {Promise<{pdfPath: string, pdfBuffer: Buffer}>}
 */
async function generateContractPdf(contractData, templateData, signatureData, auditTrail) {
  try {
    const settings = await Setting.getAll();
    
    // 1. SIGNATURE VALIDATION
    if (signatureData) {
      const sigDataStr = signatureData.image || signatureData.data;
      if (signatureData.type !== 'type' && (!sigDataStr || !sigDataStr.startsWith('data:image/') || sigDataStr.length < 100)) {
        throw new Error('SIGNATURE_VALIDATION_FAILED: Client signature data is missing, empty, or not a valid data URI.');
      }
    }

    if (settings?.company_signature) {
      if (_cachedCompanySignatureUrl !== settings.company_signature || !_cachedCompanySignatureValid) {
        try {
          let response = await fetch(settings.company_signature, { method: 'HEAD' });
          if (!response.ok) {
             // Retry once with GET in case HEAD is blocked
             response = await fetch(settings.company_signature, { method: 'GET' }); 
          }
          if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
            throw new Error(`Status ${response.status} or invalid content-type: ${response.headers.get('content-type')}`);
          }
          _cachedCompanySignatureUrl = settings.company_signature;
          _cachedCompanySignatureValid = true;
        } catch (err) {
          _cachedCompanySignatureValid = false;
          throw new Error('SIGNATURE_VALIDATION_FAILED: Company signature fetch failed - ' + err.message);
        }
      }
    }
    
    // Determine path to the EJS template
    const templatePath = path.join(__dirname, '../views/pdf/contract.ejs');
    
    const parseTemplateVars = (text, contract, settings) => {
      if (!text) return '';
      
      // Format currency properly
      const amount = parseFloat(contract.total_amount) || 0;
      const currencyCode = contract.currency || 'INR';
      const currencySymbol = currencyCode === 'USD' ? '$' : currencyCode === 'EUR' ? '€' : currencyCode === 'GBP' ? '£' : '₹';
      const formattedAmount = amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      let renderedText = text;

      // 1. Dynamic replacement for ALL fields inside the contract object
      // Strict regex: matches only alphanumeric + underscores (no spaces/symbols) to prevent false positives on IT/software clauses
      const matches = renderedText.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
      if (matches) {
        matches.forEach(match => {
          const varName = match.replace(/[{}]/g, '').trim();
          
          // Identify if this is a key variable that should be auto-bolded
          const boldVars = ['total_amount', 'currency', 'start_date', 'end_date', 'company_name', 'client_signatory_name', 'client_name', 'client_company', 'client_designation', 'authorized_signatory'];
          const shouldBold = boldVars.includes(varName);
          
          let val = '';

          // Special formatting overrides
          if (varName === 'total_amount') {
            val = formattedAmount;
          } else if (varName === 'currency') {
            val = currencySymbol;
          } else if (varName === 'start_date' || varName === 'end_date') {
            const d = contract[varName];
            val = d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : `[${varName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}]`;
          } else if (varName === 'company_name') {
            val = settings?.company_name || 'KKeyQik Private Limited';
          } else if (varName === 'client_signatory_name') {
            val = contract.client_selections?.client_signatory_name || contract.client_name || '[Client Signatory Name]';
          } else if (varName === 'client_signatory_title') {
            val = contract.client_selections?.client_signatory_title || '[Client Signatory Title]';
          } else if (varName === 'client_address') {
            val = contract.client_selections?.client_address || contract.client_address || contract.client_company || '[Client Address]';
          } else if (varName === 'payment_terms_section') {
            let terms = "Standard payment terms apply.";
            if (contract.payment_type === 'full_advance') {
              terms = "The total amount is payable in full as an advance before the commencement of services.";
            } else if (contract.payment_type === 'custom_split') {
              terms = "Payment shall be made in two tranches: 50% advance before commencement, and 50% upon successful delivery.";
            } else if (contract.payment_type === 'milestone') {
              terms = "Payment shall be made in stages based on agreed project milestones as outlined in the invoice.";
            }
            val = terms;
          } else if (contract[varName] !== undefined && contract[varName] !== null) {
            val = contract[varName];
          }

          if (val !== '') {
            if (shouldBold) val = `<strong style="font-weight: bold;">${val}</strong>`;
            renderedText = renderedText.split(match).join(val);
          }
        });
      }

      // 2. Inject Admin Signature
      if (settings?.company_signature) {
        const sigHtml = `<br><img src="${settings.company_signature}" alt="Company Signature" style="max-height: 50px; max-width: 250px; mix-blend-mode: multiply;"><br>`;
        renderedText = renderedText.replace(/Signature:\s*_{5,}/i, `Signature: ${sigHtml}`);
      }
      
      // 3. Detect unresolved template variables
      const strayMatches = renderedText.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
      if (strayMatches) {
        throw new Error(`TEMPLATE_VARIABLE_ERROR: Unresolved template variables detected in contract ${contract.uuid}: ${strayMatches.join(', ')}`);
      }

      // 4. Parse basic Markdown bold (**text**)
      renderedText = renderedText.replace(/\*\*([\s\S]*?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>');

      return renderedText;
    };

    // Read and render the template
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const html = ejs.render(templateContent, {
      contract: contractData,
      template: templateData,
      signature: signatureData,
      audit: auditTrail,
      settings: settings,
      parseTemplateVars: parseTemplateVars
    });

    // Vercel /tmp directory
    const pdfPath = path.join('/tmp', `${contractData.uuid || Date.now().toString()}.pdf`);

    // Setup Chromium for Vercel using dynamic imports (modern standard for CJS -> ESM interoperability)
    const puppeteer = await import('puppeteer-core').then(m => m.default || m);
    const chromium = await import('@sparticuz/chromium').then(m => m.default || m);
    
    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath || process.env.CHROME_EXECUTABLE_PATH, // Fallback for local
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; font-size: 9px; font-family: Arial, sans-serif; color: #9ca3af; padding: 0 50px; display: flex; justify-content: space-between; align-items: center;">
          <span>${contractData.project_name || 'Contract Agreement'} — Confidential</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: '60px',
        bottom: '60px',
        left: '50px',
        right: '50px'
      }
    });

    await browser.close();

    return { pdfPath, pdfBuffer };
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

module.exports = {
  generateContractPdf
};
