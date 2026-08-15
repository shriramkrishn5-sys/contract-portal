require('dotenv').config();
const Admin = require('./models/Admin');

async function run() {
  try {
    const user = await Admin.create('Chirag Gupta', 'chiraggupta30082001@gmail.com', 'testpassword', 'Manager (Create & Edit)');
    console.log("Success:", user);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    process.exit(0);
  }
}
run();
