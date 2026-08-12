const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '../models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace saveDb import if it exists, since we don't need it
  content = content.replace(/const {.*?getDb.*?saveDb.*?} = require\('\.\.\/config\/database'\);/, "const { getDb } = require('../config/database');");
  
  // Replace simple db.exec for all rows
  content = content.replace(/const result = db\.exec\((.*?)\);\n\s+const \w+ = \[\];\n\s+if \(result\.length > 0\) {[\s\S]*?}\n\s+return \w+;/g, "return await db.all($1);");
  
  // Replace db.prepare + stmt.bind + stmt.step + getAsObject for single row fetch
  content = content.replace(/const stmt = db\.prepare\((.*?)\);\n\s*stmt\.bind\((.*?)\);\n\s*let (\w+) = null;\n\s*if \(stmt\.step\(\)\) {\n\s*\3 = stmt\.getAsObject\(\);\n\s*}\n\s*stmt\.free\(\);\n\s*return \3;/g, "return await db.get($1, $2);");

  // Replace db.prepare + stmt.bind + stmt.step + getAsObject + push for multi row fetch with params
  content = content.replace(/const stmt = db\.prepare\((.*?)\);\n\s*stmt\.bind\((.*?)\);\n\s*const (\w+) = \[\];\n\s*while \(stmt\.step\(\)\) {\n\s*\3\.push\(stmt\.getAsObject\(\)\);\n\s*}\n\s*stmt\.free\(\);\n\s*return \3;/g, "return await db.all($1, $2);");
  
  // Same thing without params:
  content = content.replace(/const stmt = db\.prepare\((.*?)\);\n\s*const (\w+) = \[\];\n\s*while \(stmt\.step\(\)\) {\n\s*\2\.push\(stmt\.getAsObject\(\)\);\n\s*}\n\s*stmt\.free\(\);\n\s*return \2;/g, "return await db.all($1);");

  // Replace db.run with await db.run
  // Watch out: sometimes db.run is wrapped in multiple lines
  content = content.replace(/db\.run\(([\s\S]*?)\);/g, "await db.run($1);");
  
  // Remove saveDb();
  content = content.replace(/\s*saveDb\(\);/g, "");

  // Update exports and variable declarations for sql.js specific array iteration (if any missed)
  
  fs.writeFileSync(filePath, content);
  console.log(`Processed ${file}`);
}
