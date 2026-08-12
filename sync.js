require('dotenv').config({ path: '.env.ftp' });
const chokidar = require('chokidar');
const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

const {
    FTP_HOST,
    FTP_USER,
    FTP_PASS,
    FTP_PORT,
    FTP_REMOTE_DIR
} = process.env;

if (!FTP_HOST || !FTP_USER || !FTP_PASS || !FTP_REMOTE_DIR) {
    console.error("❌ ERROR: Missing FTP credentials in .env.ftp");
    console.error("Please fill out .env.ftp before running this script.");
    process.exit(1);
}

const watcher = chokidar.watch('.', {
    ignored: [
        /(^|[\/\\])\../, // ignore hidden files
        'node_modules/**',
        'tmp/**',
        'sync.js',
        '*.log'
    ],
    persistent: true,
    ignoreInitial: true
});

const uploadFile = async (localPath) => {
    const client = new ftp.Client();
    try {
        await client.access({
            host: FTP_HOST,
            user: FTP_USER,
            password: FTP_PASS,
            port: parseInt(FTP_PORT) || 21,
            secure: false
        });

        const normalizedPath = localPath.split(path.sep).join('/');
        const remotePath = `${FTP_REMOTE_DIR}/${normalizedPath}`;
        const remoteDir = path.dirname(remotePath);

        // Ensure remote directory exists
        await client.ensureDir(remoteDir);
        
        // Upload the file
        await client.uploadFrom(localPath, remotePath);
        
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] ✅ SYNCED: ${localPath} -> ${remotePath}`);
    } catch (err) {
        console.error(`❌ FAILED TO SYNC: ${localPath}`);
        console.error(err.message);
    } finally {
        client.close();
    }
};

console.log(`\n🚀 Auto-Sync Started!`);
console.log(`Watching for file changes...`);
console.log(`Target: ${FTP_HOST} (${FTP_REMOTE_DIR})\n`);

// Event listeners for file changes
watcher
    .on('add', path => uploadFile(path))
    .on('change', path => uploadFile(path));

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping Auto-Sync...');
    watcher.close();
    process.exit(0);
});
