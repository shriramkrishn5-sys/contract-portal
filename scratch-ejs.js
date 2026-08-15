const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, 'views/admin/templates-edit.ejs');
const templateStr = fs.readFileSync(templatePath, 'utf8');

try {
  const html = ejs.render(templateStr, {
    title: 'Edit Template: Untitled',
    currentPath: '/admin/templates',
    template: {
      id: 9,
      name: 'Untitled Template',
      description: null,
      content_sections: [],
      default_clauses: [],
      fields_schema: {},
      client_fields_schema: {}
    },
    clauses: []
  }, { views: [path.join(__dirname, 'views')] });
  console.log("Render successful! Length:", html.length);
} catch (err) {
  console.error("EJS RENDER ERROR:", err);
}
