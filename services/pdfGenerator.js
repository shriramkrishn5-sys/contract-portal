const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const Setting = require('../models/Setting');

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
    
    // Determine path to the EJS template
    const templatePath = path.join(__dirname, '../views/pdf/contract.ejs');
    
    const parseTemplateVars = (text, contract, settings) => {
      if (!text) return '';
      
      // Format currency properly
      const amount = parseFloat(contract.total_amount) || 0;
      const currencyCode = contract.currency || 'INR';
      const currencySymbol = currencyCode === 'USD' ? '$' : currencyCode === 'EUR' ? '€' : currencyCode === 'GBP' ? '£' : '₹';
      const formattedAmount = `${currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      
      let renderedText = text;

      // 1. Dynamic replacement for ALL fields inside the contract object
      const matches = renderedText.match(/\{\{([^}]+)\}\}/g);
      if (matches) {
        matches.forEach(match => {
          const varName = match.replace(/[{}]/g, '').trim();
          
          // Special formatting overrides
          if (varName === 'total_amount') {
            renderedText = renderedText.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), formattedAmount);
          } else if (varName === 'start_date' || varName === 'end_date') {
            const d = contract[varName];
            const formattedDate = d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : `[${varName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}]`;
            renderedText = renderedText.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), formattedDate);
          } else if (varName === 'company_name') {
            renderedText = renderedText.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), settings?.company_name || 'KKeyQik Private Limited');
          } else if (varName === 'client_signatory_name') {
            renderedText = renderedText.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), contract.client_selections?.client_signatory_name || contract.client_name || '[Client Signatory Name]');
          } else if (varName === 'client_signatory_title') {
            renderedText = renderedText.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), contract.client_selections?.client_signatory_title || '[Client Signatory Title]');
          } else if (varName === 'client_address') {
            renderedText = renderedText.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), contract.client_selections?.client_address || contract.client_address || contract.client_company || '[Client Address]');
          } else if (varName === 'payment_terms_section') {
            let terms = "Standard payment terms apply.";
            if (contract.payment_type === 'full_advance') {
              terms = "The total amount is payable in full as an advance before the commencement of services.";
            } else if (contract.payment_type === 'custom_split') {
              terms = "Payment shall be made in two tranches: 50% advance before commencement, and 50% upon successful delivery.";
            } else if (contract.payment_type === 'milestone') {
              terms = "Payment shall be made in stages based on agreed project milestones as outlined in the invoice.";
            }
            renderedText = renderedText.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), terms);
          } else if (contract[varName] !== undefined && contract[varName] !== null) {
            // Standard dynamic replacement
            renderedText = renderedText.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), contract[varName]);
          }
        });
      }

      // 2. Inject Admin Signature
      if (settings?.company_signature) {
        const sigHtml = `<br><img src="${settings.company_signature}" alt="Company Signature" style="max-height: 50px; max-width: 250px; mix-blend-mode: multiply;"><br>`;
        renderedText = renderedText.replace(/Signature:\s*_{5,}/i, `Signature: ${sigHtml}`);
      }
      
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
