require('dotenv').config({ path: '.env.ftp' });
const ftp = require('basic-ftp');
const path = require('path');

const filesToUpload = [
    'views/admin/contracts/new.ejs',
    'views/admin/contracts/create.ejs',
    'routes/contracts.js',
    'models/Contract.js',
    'routes/templates.js',
    'services/trackingService.js',
    'models/Template.js',
    'views/public/contract-fill.ejs',
    'routes/public.js',
    'services/pdfGenerator.js'
];

async function deploy() {
    const client = new ftp.Client();
    try {
        console.log("Connecting to FTP...");
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS,
            port: parseInt(process.env.FTP_PORT) || 21,
            secure: false
        });

        for (const file of filesToUpload) {
            const localPath = path.join(__dirname, file);
            const remotePath = `${process.env.FTP_REMOTE_DIR}/${file}`;
            const remoteDir = path.dirname(remotePath).replace(/\\/g, '/');
            
            await client.ensureDir(remoteDir);
            await client.uploadFrom(localPath, remotePath);
            console.log(`✅ Uploaded: ${file}`);
        }
        console.log("🚀 All recent files deployed successfully!");
    } catch (err) {
        console.error("❌ FTP Error:", err.message);
    } finally {
        client.close();
    }
}

deploy();
