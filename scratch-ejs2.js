const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, 'views/public/contract-complete.ejs');
const templateStr = fs.readFileSync(templatePath, 'utf8');

try {
  const html = ejs.render(templateStr, {
    title: 'Complete',
    contract: { status: 'signed', signed_pdf_path: 'something.pdf', uuid: '123' },
  }, { views: [path.join(__dirname, 'views')] });
  console.log("Render successful! Length:", html.length);
} catch (err) {
  console.error("EJS RENDER ERROR:", err);
}
