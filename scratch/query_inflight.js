require('dotenv').config();
const { getDb } = require('../config/database');

async function main() {
  try {
    const db = await getDb();
    const contracts = await db.all("SELECT id, uuid, status, created_at, sent_at, expires_at FROM contracts WHERE status IN ('sent', 'opened')");
    console.log(`Found ${contracts.length} in-flight contracts.`);
    console.log(JSON.stringify(contracts, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
main();
