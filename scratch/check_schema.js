const { getDb } = require('../config/database');

async function run() {
  const db = await getDb();
  const tables = db.exec("PRAGMA table_info('contracts')");
  console.log(JSON.stringify(tables[0].values, null, 2));
}
run();
