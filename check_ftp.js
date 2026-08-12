require('dotenv').config({ path: '.env.ftp' });
const ftp = require('basic-ftp');

async function checkFtp() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS,
            port: parseInt(process.env.FTP_PORT) || 21,
            secure: false
        });

        console.log("\nListing /contract-portal:");
        const list = await client.list("/contract-portal");
        list.forEach(item => {
            console.log(item.isDirectory ? `DIR: ${item.name}` : `FILE: ${item.name}`);
        });

    } catch (err) {
        console.error("❌ FTP Error:", err.message);
    } finally {
        client.close();
    }
}

checkFtp();
