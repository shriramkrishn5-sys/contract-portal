const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '../models');
const files = ['AuditLog.js', 'Client.js', 'InAppNotification.js', 'Setting.js', 'Template.js', 'TrackingEvent.js'];

for (const file of files) {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace single row query with bind
  content = content.replace(/const stmt = db\.prepare\((.*?)\);\n\s*stmt\.bind\((.*?)\);\n\s*let (\w+) = null;\n\s*if \(stmt\.step\(\)\) {\n\s*\3 = stmt\.getAsObject\(\);\n\s*}\n\s*stmt\.free\(\);/g, "const $3 = await db.get($1, $2);");

  // Replace single row query WITHOUT bind
  content = content.replace(/const stmt = db\.prepare\((.*?)\);\n\s*let (\w+) = null;\n\s*if \(stmt\.step\(\)\) {\n\s*\2 = stmt\.getAsObject\(\);\n\s*}\n\s*stmt\.free\(\);/g, "const $2 = await db.get($1);");

  // Replace count query with bind
  content = content.replace(/const (.*?) = db\.prepare\((.*?)\);\n\s*\1\.bind\((.*?)\);\n\s*let (\w+) = 0;\n\s*if \(\1\.step\(\)\) {\n\s*\4 = \1\.getAsObject\(\)\.\4;\n\s*}\n\s*\1\.free\(\);/g, "const _row = await db.get($2, $3);\n    const $4 = _row ? _row.$4 : 0;");

  // Replace count query WITHOUT bind
  content = content.replace(/const (.*?) = db\.prepare\((.*?)\);\n\s*let (\w+) = 0;\n\s*if \(\1\.step\(\)\) {\n\s*\3 = \1\.getAsObject\(\)\.\3;\n\s*}\n\s*\1\.free\(\);/g, "const _row = await db.get($2);\n    const $3 = _row ? _row.$3 : 0;");

  // Replace multi row query with bind (while)
  content = content.replace(/const (.*?) = db\.prepare\((.*?)\);\n\s*\1\.bind\((.*?)\);\n\s*const (\w+) = \[\];\n\s*while \(\1\.step\(\)\) {\n\s*(.*?)\n\s*}\n\s*\1\.free\(\);/gs, (match, stmtVar, query, bindArgs, arrayVar, innerBody) => {
      // modify inner body to replace stmtVar.getAsObject() with row
      let newInner = innerBody.replace(new RegExp(`${stmtVar}\\.getAsObject\\(\\)`), 'row');
      return `const ${arrayVar} = [];\n    const _rows = await db.all(${query}, ${bindArgs});\n    for (const row of _rows) {\n      ${newInner}\n    }`;
  });

  // Replace multi row query WITHOUT bind (while)
  content = content.replace(/const (.*?) = db\.prepare\((.*?)\);\n\s*const (\w+) = \[\];\n\s*while \(\1\.step\(\)\) {\n\s*(.*?)\n\s*}\n\s*\1\.free\(\);/gs, (match, stmtVar, query, arrayVar, innerBody) => {
      let newInner = innerBody.replace(new RegExp(`${stmtVar}\\.getAsObject\\(\\)`), 'row');
      return `const ${arrayVar} = [];\n    const _rows = await db.all(${query});\n    for (const row of _rows) {\n      ${newInner}\n    }`;
  });

  fs.writeFileSync(filePath, content);
  console.log(`Processed ${file}`);
}
