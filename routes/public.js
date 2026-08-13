const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const Template = require('../models/Template');
const Client = require('../models/Client');
const TrackingEvent = require('../models/TrackingEvent');
const { trackContractView } = require('../middleware/tracking');
const { generateContractPdf } = require('../services/pdfGenerator');
const { sendSignedCopy, sendAdminNotification } = require('../services/emailService');
const { triggerWebhooks } = require('../services/webhookService');
const { uploadToDrive } = require('../services/driveService');
const { uploadContractPdf } = require('../services/storageService');
const { executePdfPipeline } = require('../services/pdfPipeline');
const rateLimit = require('express-rate-limit');
const { waitUntil } = require('@vercel/functions');
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

function parseTemplateVars(text, contract, settings) {
  if (!text) return '';
  
  // Format currency properly
  const amount = parseFloat(contract.total_amount) || 0;
  const currencyCode = contract.currency || 'INR';
  const currencySymbol = currencyCode === 'USD' ? '$' : currencyCode === 'EUR' ? '€' : currencyCode === 'GBP' ? '£' : '₹';
  const formattedAmount = amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  let renderedText = text;

  // 1. Dynamic replacement for ALL fields inside the contract object
  const matches = renderedText.match(/\{\{([^}]+)\}\}/g);
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
    const sigHtml = `<br><img src="${settings.company_signature}" alt="Company Signature" style="max-height: 80px; max-width: 300px; mix-blend-mode: multiply;"><br>`;
    renderedText = renderedText.replace(/Signature:\s*_{5,}/i, `Signature: ${sigHtml}`);
  }
  
  // 3. Parse basic Markdown bold (**text**)
  renderedText = renderedText.replace(/\*\*([\s\S]*?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>');

  return renderedText;
}

// Prevent browser caching of contract pages — stops back-button from showing stale signed pages
router.use('/:uuid', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Welcome page (Step 1)
router.get('/:uuid', trackContractView, async (req, res) => {
  try {
    const contract = await Contract.findByUuid(req.params.uuid);
    if (!contract) return res.status(404).send('Contract not found');
    const template = await Template.findById(contract.template_id);

    if (contract.expires_at && new Date(contract.expires_at) < new Date()) {
      return res.render('public/contract-expired', { layout: 'layouts/public', title: 'Contract Expired' });
    }
    if (contract.status === 'signed') {
      return res.render('public/contract-complete', { contract, layout: 'layouts/public', title: 'Contract Signed' });
    }
    if (contract.status === 'declined') {
      return res.render('public/contract-declined', { layout: 'layouts/public', title: 'Contract Declined' });
    }

    if (contract.status === 'sent') {
      await Contract.updateStatus(contract.id, 'opened');
      sendAdminNotification('Viewed', contract).catch(e => console.error('Failed admin notification', e));
    }
    
    await TrackingEvent.create(contract.id, 'opened', req.trackingData);
    
    res.render('public/welcome', { contract, template, settings: res.locals.settings, layout: 'layouts/public', title: "You've received a contract" });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading contract: ' + (err.message || err) + '<br><pre>' + (err.stack || '') + '</pre>');
  }
});

// View contract document (Step 2)
router.get('/:uuid/review', async (req, res) => {
  try {
    const contract = await Contract.findByUuid(req.params.uuid);
    if (!contract) return res.status(404).send('Contract not found');
    const template = await Template.findById(contract.template_id);

    if (contract.status === 'signed') return res.redirect(`/c/${contract.uuid}/complete`);
    if (contract.status === 'declined') return res.redirect(`/c/${contract.uuid}`);
    
    res.render('public/contract-view', { contract, template, parseTemplateVars, settings: res.locals.settings, layout: 'layouts/public', title: 'Review Contract' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading contract');
  }
});

// Decline contract
router.post('/:uuid/decline', async (req, res) => {
  try {
    const contract = await Contract.findByUuid(req.params.uuid);
    if (!contract) return res.status(404).send('Contract not found');
    
    await Contract.updateStatus(contract.id, 'declined');
    await TrackingEvent.create(contract.id, 'declined', { ip: req.ip });
    sendAdminNotification('Declined', contract).catch(e => console.error('Failed admin notification', e));
    
    res.redirect(`/c/${contract.uuid}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error declining contract');
  }
});


// Fill form
router.get('/:uuid/fill', async (req, res) => {
  try {
    const contract = await Contract.findByUuid(req.params.uuid);
    if (!contract) return res.status(404).send('Not found');
    if (contract.status === 'signed') return res.redirect(`/c/${contract.uuid}/complete`);
    if (contract.status === 'declined') return res.redirect(`/c/${contract.uuid}`);
    res.render('public/contract-fill', { contract, layout: 'layouts/public', title: 'Fill Details' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

router.post('/:uuid/fill', publicLimiter, async (req, res) => {
  try {
    const contract = await Contract.findByUuid(req.params.uuid);
    if (!contract) return res.status(404).send('Not found');
    if (contract.status === 'signed') return res.redirect(`/c/${contract.uuid}/complete`);
    if (contract.status === 'declined') return res.redirect(`/c/${contract.uuid}`);

    let finalClauses = [];
    if (contract.selected_clauses) {
      contract.selected_clauses.forEach(clause => {
        if (clause.clientToggleable) {
          if (req.body[`clause_${clause.id}`] === 'on') {
            finalClauses.push(clause);
          }
        } else {
          finalClauses.push(clause);
        }
      });
    }

    // Merge country code with phone number
    if (req.body.client_phone_code && req.body.client_phone) {
      req.body.client_phone = `${req.body.client_phone_code} ${req.body.client_phone}`;
    }

    await Contract.updateClientDetails(req.params.uuid, req.body, finalClauses);
    await TrackingEvent.create(contract.id, 'filled', { ip: req.ip });
    res.redirect(`/c/${req.params.uuid}/review`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving details: ' + err.message);
  }
});

// Sign
router.get('/:uuid/sign', async (req, res) => {
  try {
    const contract = await Contract.findByUuid(req.params.uuid);
    if (!contract) return res.status(404).send('Not found');
    if (contract.status === 'signed') return res.redirect(`/c/${contract.uuid}/complete`);
    if (contract.status === 'declined') return res.redirect(`/c/${contract.uuid}`);
    const template = await Template.findById(contract.template_id);
    res.render('public/contract-sign', { contract, template, parseTemplateVars, settings: res.locals.settings, layout: 'layouts/public', title: 'Sign Contract' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

router.post('/:uuid/sign', publicLimiter, async (req, res) => {
  try {
    const signatureData = {
      image: req.body.signature,
      data: req.body.signature,
      type: req.body.signature_type || 'drawn',
      text: req.body.signature_text || null,
      fontFamily: req.body.signature_font || 'cursive',
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Prevent double-signing
    const preCheck = await Contract.findByUuid(req.params.uuid);
    if (preCheck && preCheck.status === 'signed') return res.redirect(`/c/${req.params.uuid}/complete`);

    await Contract.updateSignature(req.params.uuid, signatureData);
    await Contract.updateStatus(preCheck.id, 'signed');
    
    const contract = await Contract.findByUuid(req.params.uuid);
    await Client.upsertFromContract(contract);
    await TrackingEvent.create(contract.id, 'signed', { ip: req.ip });
    
    // Parse user-agent for OS and Browser
    const ua = req.headers['user-agent'] || '';
    let osName = 'Unknown', browserName = 'Unknown';
    if (ua.includes('Windows NT 10')) osName = 'Windows 10/11';
    else if (ua.includes('Windows NT')) osName = 'Windows';
    else if (ua.includes('Mac OS X')) osName = 'macOS';
    else if (ua.includes('Linux')) osName = 'Linux';
    else if (ua.includes('Android')) osName = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) osName = 'iOS';
    if (ua.includes('Edg/')) browserName = 'Microsoft Edge';
    else if (ua.includes('Chrome/') && !ua.includes('Chromium')) browserName = 'Google Chrome';
    else if (ua.includes('Firefox/')) browserName = 'Mozilla Firefox';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browserName = 'Safari';
    
    // Generate PDF asynchronously but explicitly keep Vercel function alive
    waitUntil((async () => {
      try {
        const templateData = await Template.findById(contract.template_id);
        
        await executePdfPipeline(contract, templateData, signatureData, {
          ip: req.ip,
          timestamp: new Date().toISOString(),
          userAgent: ua,
          os: osName,
          browser: browserName,
          hash: require('crypto').createHash('sha256').update(signatureData.data + contract.uuid).digest('hex')
        });
      } catch (err) {
        // executePdfPipeline already logs and sets status to generation_failed
        console.error('Handled by executePdfPipeline:', err.message);
      }
    })());
    
    res.redirect(`/c/${req.params.uuid}/complete`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error signing: ' + err.message + '<br><pre>' + err.stack + '</pre>');
  }
});

// Complete
router.get('/:uuid/complete', async (req, res) => {
  try {
    const contract = await Contract.findByUuid(req.params.uuid);
    if (!contract) return res.status(404).send('Not found');
    res.render('public/contract-complete', { contract, layout: 'layouts/public', title: 'Contract Signed' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// Status polling for complete page
router.get('/:uuid/status', publicLimiter, async (req, res) => {
  try {
    const contract = await Contract.findByUuid(req.params.uuid);
    if (!contract) return res.status(404).json({ error: 'Not found' });
    res.json({
      status: contract.status,
      signed_pdf_path: contract.signed_pdf_path || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Time tracking beacon
router.post('/:uuid/beacon', publicLimiter, async (req, res) => {
  try {
    const contract = await Contract.findByUuid(req.params.uuid);
    if (!contract) return res.json({ success: false });
    await TrackingEvent.create(contract.id, 'time_on_page', { timeOnPage: req.body.timeOnPage });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// Download signed PDF
router.get('/:uuid/download', publicLimiter, async (req, res) => {
  try {
    const contract = await Contract.findByUuid(req.params.uuid);
    if (!contract || !contract.signed_pdf_path) {
      return res.status(404).send('PDF not available yet');
    }
    
    // signed_pdf_path is now a Supabase Storage URL
    if (contract.signed_pdf_path.startsWith('http')) {
      return res.redirect(contract.signed_pdf_path);
    }
    
    // Fallback for older local files
    const path = require('path');
    const fs = require('fs');
    const pdfPath = path.resolve(contract.signed_pdf_path);
    if (fs.existsSync(pdfPath)) {
      const safeName = (contract.project_name || 'Contract').replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
      const clientName = (contract.client_name || 'Client').replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
      const fileName = `${safeName}-${clientName}.pdf`;
      res.download(pdfPath, fileName);
    } else {
      res.status(404).send('PDF file not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error downloading');
  }
});

module.exports = router;
