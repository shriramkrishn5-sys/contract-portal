const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const Setting = require('../models/Setting');
const TrackingEvent = require('../models/TrackingEvent');

/**
 * Uploads a signed contract PDF to Google Drive
 * @param {Object} contract - The contract database object
 * @param {string} pdfPath - The absolute path to the generated PDF on disk
 */
async function uploadToDrive(contract, pdfPath) {
  try {
    const settings = await Setting.getAll();
    
    // Check if enabled
    if (settings.google_drive_enabled !== 'yes') {
      return;
    }

    const clientEmail = settings.google_drive_client_email;
    const privateKey = settings.google_drive_private_key;
    const folderId = settings.google_drive_folder_id;

    if (!clientEmail || !privateKey || !folderId) {
      console.warn('Google Drive Backup is enabled, but credentials are missing in Settings.');
      return;
    }

    // Format the private key (handle escaped newlines if entered incorrectly in UI)
    const formattedKey = privateKey.replace(/\\n/g, '\n');

    // Authenticate with Google Drive API via Service Account
    const auth = new google.auth.JWT(
      clientEmail,
      null,
      formattedKey,
      ['https://www.googleapis.com/auth/drive.file']
    );

    const drive = google.drive({ version: 'v3', auth });
    
    // Prepare File metadata
    const fileName = `Signed_${contract.client_name || 'Contract'}_${contract.uuid}.pdf`;
    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };
    
    // Prepare Media
    const media = {
      mimeType: 'application/pdf',
      body: fs.createReadStream(pdfPath)
    };

    // Upload
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    console.log(`Successfully uploaded to Google Drive: ${response.data.id}`);

    // Log to AuditTrail (TrackingEvent)
    await TrackingEvent.create(contract.id, 'backup_success', { 
      provider: 'google_drive',
      fileId: response.data.id,
      fileName: fileName
    });

    return response.data;
  } catch (err) {
    console.error('Failed to upload contract to Google Drive:', err);
    // Log failure to AuditTrail
    try {
      await TrackingEvent.create(contract.id, 'backup_failed', { 
        provider: 'google_drive',
        error: err.message
      });
    } catch (logErr) {
      // Ignore
    }
    throw err;
  }
}

module.exports = {
  uploadToDrive
};
