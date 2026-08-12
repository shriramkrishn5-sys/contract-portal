const fs = require('fs');
const path = require('path');
const { uploadToDrive } = require('../services/driveService');
require('../config/database'); // Ensure DB is initialized to get settings

async function run() {
  console.log('Testing Google Drive Upload...');
  
  // Create a dummy PDF if none exists
  const pdfsPath = path.join(__dirname, '../storage/pdfs');
  if (!fs.existsSync(pdfsPath)) fs.mkdirSync(pdfsPath, { recursive: true });
  
  const dummyPdfPath = path.join(pdfsPath, 'test-upload.pdf');
  if (!fs.existsSync(dummyPdfPath)) {
    fs.writeFileSync(dummyPdfPath, '%PDF-1.4\n1 0 obj\n<<\n/Title (Dummy PDF)\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF');
  }

  const dummyContract = {
    id: 999,
    uuid: 'test-uuid-123',
    client_name: 'Test Client'
  };

  try {
    const result = await uploadToDrive(dummyContract, dummyPdfPath);
    if (result) {
      console.log('Test successful. File ID:', result.id);
    } else {
      console.log('Test skipped. Please ensure Google Drive Backup is enabled in Settings and valid credentials are provided.');
    }
  } catch (err) {
    console.error('Upload Test Failed:', err.message);
  }
}

setTimeout(run, 1000); // Give DB time to init
