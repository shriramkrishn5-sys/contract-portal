const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        if (dirPath.includes('node_modules') || dirPath.includes('scratch') || dirPath.includes('.git')) return;
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let errorCount = 0;
walkDir(path.join(__dirname), (filePath) => {
    if (filePath.endsWith('.js')) {
        try {
            // node -c checks syntax without executing
            execSync(`node -c "${filePath}"`, { stdio: 'ignore' });
        } catch (e) {
            console.error(`❌ Syntax Error in: ${filePath}`);
            errorCount++;
        }
    }
});

if (errorCount === 0) {
    console.log("✅ All JS files passed syntax validation!");
} else {
    console.log(`\nFound ${errorCount} JS files with syntax errors.`);
}
