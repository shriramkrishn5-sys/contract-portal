require('dotenv').config();
const Template = require('./models/Template');
const Clause = require('./models/Clause');

async function test() {
  try {
    console.log("Testing Clause.findAll()...");
    await Clause.findAll();
    console.log("Testing Template.findById()...");
    await Template.findById(1);
    console.log("Success!");
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    process.exit(0);
  }
}
test();
