require('dotenv').config();
const Template = require('./models/Template');

async function run() {
  try {
    const t = await Template.findById(9);
    console.log("Template 9:", t);
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    process.exit(0);
  }
}
run();
