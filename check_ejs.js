const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'views', 'admin', 'contracts', 'create.ejs');
const templateStr = fs.readFileSync(filePath, 'utf-8');

try {
    const compiled = ejs.compile(templateStr, { filename: filePath });
    console.log("✅ EJS Syntax is valid!");
} catch (e) {
    console.error("❌ EJS Syntax Error:", e.message);
}
