const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'views', 'admin', 'contracts', 'create.ejs');
const templateStr = fs.readFileSync(filePath, 'utf-8');

try {
    const html = ejs.render(templateStr, { 
        template: { slug: 'video-production', name: 'Video Production Agreement', structure: [], id: 1 }, 
        config: { siteName: 'Test' }, 
        title: 'Create Contract', 
        prefill: {} 
    }, { filename: filePath });
    console.log("✅ Render successful! HTML length:", html.length);
} catch (e) {
    console.error("❌ EJS Runtime Error:", e.message);
}
