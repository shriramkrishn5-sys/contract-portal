const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let errorCount = 0;
walkDir(path.join(__dirname, 'views'), (filePath) => {
    if (filePath.endsWith('.ejs')) {
        const templateStr = fs.readFileSync(filePath, 'utf-8');
        try {
            ejs.compile(templateStr, { filename: filePath });
        } catch (e) {
            console.error(`\n❌ Error in: ${filePath}`);
            console.error(e.message);
            errorCount++;
        }
    }
});

if (errorCount === 0) {
    console.log("✅ All EJS templates passed syntax validation!");
} else {
    console.log(`\nFound ${errorCount} EJS files with syntax errors.`);
}
