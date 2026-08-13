const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const Template = require('../models/Template');
const { generateContractPdf } = require('../services/pdfGenerator');
const { sendSignedCopy, sendAdminNotification } = require('../services/emailService');
const { triggerWebhooks } = require('../services/webhookService');
const { uploadToDrive } = require('../services/driveService');
const { uploadContractPdf } = require('../services/storageService');

// Simple security middleware for internal endpoints
function requireInternalSecret(req, res, next) {
  const secret = process.env.INTERNAL_API_SECRET || 'fallback-secret-for-internal';
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(requireInternalSecret);

router.post('/process-signature', async (req, res) => {
  // We hold the response until everything finishes so Vercel doesn't kill the function early.
  try {
    const { contractId, signatureData, ua, osName, browserName, ip } = req.body;
    const contract = await Contract.findById(contractId);
    if (!contract) return res.status(404).send('Not found');

    const templateData = await Template.findById(contract.template_id);
    
    const { pdfPath, pdfBuffer } = await generateContractPdf(contract, templateData, signatureData, {
      ip: ip,
      timestamp: new Date().toISOString(),
      userAgent: ua,
      os: osName,
      browser: browserName,
      hash: require('crypto').createHash('sha256').update(signatureData.data + contract.uuid).digest('hex')
    });

    const supabasePdfUrl = await uploadContractPdf(pdfPath, `${contract.uuid}.pdf`);
    await Contract.updatePdfPath(contract.id, supabasePdfUrl);
    
    await Promise.allSettled([
      sendSignedCopy(contract, pdfBuffer),
      sendAdminNotification('Signed', contract),
      triggerWebhooks('contract.signed', {
        uuid: contract.uuid,
        client_name: contract.client_name,
        status: 'signed'
      }),
      uploadToDrive(contract, pdfPath)
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error in background process-signature:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
