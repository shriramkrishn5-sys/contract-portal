const { getDb } = require('./config/database');
(async () => {
  const db = await getDb();
  const res = db.exec("PRAGMA table_info(contracts)");
  console.log(JSON.stringify(res, null, 2));
})();
