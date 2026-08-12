const fs = require('fs');
const path = require('path');
const { getDb, saveDb } = require('../config/database');

const templatesDir = path.join(__dirname, '../templates');
const templateFiles = [
  'web-development.json',
  'mobile-app-development.json',
  'seo-retainer.json',
  'video-production.json',
  'business-consultancy.json'
];

const newPaymentClauses = [
  {
    "id": "payment-50-50",
    "title": "Payment Terms: 50/50 Split",
    "content": "The Client agrees to pay 50% of the total amount as an upfront deposit before work commences, and the remaining 50% upon final delivery and acceptance of the project.",
    "defaultEnabled": true,
    "clientToggleable": false
  },
  {
    "id": "payment-10-90",
    "title": "Payment Terms: 10/90 Split",
    "content": "The Client agrees to pay 10% of the total amount as a retainer to initiate the project, with the remaining 90% due upon successful completion and deployment.",
    "defaultEnabled": false,
    "clientToggleable": false
  },
  {
    "id": "payment-advance",
    "title": "Payment Terms: 100% Advance Payment",
    "content": "The Client agrees to pay 100% of the total amount upfront prior to the commencement of any services or deliverables.",
    "defaultEnabled": false,
    "clientToggleable": false
  }
];

async function updateTemplates() {
  const db = await getDb();

  for (const file of templateFiles) {
    const filePath = path.join(templatesDir, file);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping missing file: ${file}`);
      continue;
    }

    let tpl;
    try {
      tpl = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.error(`Error parsing JSON in ${file}`);
      continue;
    }

    // Ensure they have standard clauses, we check 'portfolio-usage', 'case-study', 'nda-clause'
    // Actually they already have portfolio-usage, case-study, and nda-clause.
    // Let's add the payment clauses if they are missing
    let clausesModified = false;
    
    newPaymentClauses.forEach(newClause => {
      const exists = tpl.clauses.find(c => c.id === newClause.id);
      if (!exists) {
        tpl.clauses.push(newClause);
        clausesModified = true;
      }
    });

    if (clausesModified) {
      fs.writeFileSync(filePath, JSON.stringify(tpl, null, 2), 'utf8');
      console.log(`Updated JSON for ${file}`);
      
      // Update the database
      const slug = tpl.slug || file.replace('.json', '');
      db.run(
        'UPDATE templates SET default_clauses = ? WHERE slug = ?',
        [JSON.stringify(tpl.clauses), slug]
      );
      console.log(`Updated DB for ${slug}`);
    } else {
      console.log(`No changes needed for ${file}`);
    }
  }

  saveDb();
  console.log('Finished updating templates.');
}

updateTemplates().catch(err => console.error(err));
