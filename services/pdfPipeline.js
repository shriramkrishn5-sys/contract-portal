const { generateContractPdf } = require('./pdfGenerator');
const { uploadContractPdf } = require('./storageService');
const { uploadToDrive } = require('./driveService');
const { sendSignedCopy, sendAdminNotification } = require('./emailService');
const { triggerWebhooks } = require('./webhookService');
const Contract = require('../models/Contract');

/**
 * Shared pipeline for generating, uploading, and dispatching a signed contract PDF.
 */
async function executePdfPipeline(contract, templateData, signatureData, auditTrail) {
  try {
    const { pdfPath, pdfBuffer } = await generateContractPdf(contract, templateData, signatureData, auditTrail);
    const supabasePdfUrl = await uploadContractPdf(pdfPath, `${contract.uuid}.pdf`);
    
    await Contract.updatePdfPath(contract.id, supabasePdfUrl);
    
    // Status should be set to signed after successful generation
    await Contract.updateStatus(contract.id, 'signed');
    
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
    
    return true;
  } catch (err) {
    console.error(`Fatal error in executePdfPipeline for contract ${contract.uuid}:`, err);
    await Contract.updateStatus(contract.id, 'generation_failed').catch(e => console.error('Failed to update status to generation_failed', e));
    throw err; // Re-throw so caller can log it to audit log if needed
  }
}

module.exports = {
  executePdfPipeline
};
