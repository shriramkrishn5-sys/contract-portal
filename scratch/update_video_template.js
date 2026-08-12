const { getDb, saveDb } = require('../config/database');
const Template = require('../models/Template');

(async () => {
  try {
    const db = await getDb();
    const templates = await Template.findAll();
    
    // Find the Video Production template
    const videoTemplate = templates.find(t => t.name.toLowerCase().includes('video'));
    if (!videoTemplate) {
      console.log('Video template not found.');
      process.exit(1);
    }
    
    console.log('Found template:', videoTemplate.name);

    // 1. Fix content_sections (replace square brackets with curly brackets)
    let contentSectionsStr = JSON.stringify(videoTemplate.content_sections);
    
    // Fix Dates
    contentSectionsStr = contentSectionsStr.replace(/\[Start Date\]/g, '{{start_date}}');
    contentSectionsStr = contentSectionsStr.replace(/\[End Date\]/g, '{{end_date}}');
    
    // Fix Signatory Title
    contentSectionsStr = contentSectionsStr.replace(/\[Client Signatory Title\]/g, '{{client_signatory_title}}');
    
    // Fix Currency (if hardcoded as INR $ or $)
    contentSectionsStr = contentSectionsStr.replace(/INR \$1,299\.00/g, '{{total_amount}}');
    contentSectionsStr = contentSectionsStr.replace(/INR \$/g, 'INR ');

    videoTemplate.content_sections = JSON.parse(contentSectionsStr);

    // 2. Fix default_clauses (Remove irrelevant software clauses and conflicting payments)
    const clausesToRemove = [
      'source-code', 
      'maintenance-support', 
      'payment-10-90' // Let's keep 50-50 and 100% Advance but remove 10/90 to simplify
    ];
    
    videoTemplate.default_clauses = videoTemplate.default_clauses.filter(
      clause => !clausesToRemove.includes(clause.id)
    );

    // Update the database record
    db.run(
      `UPDATE templates SET 
        content_sections = ?, 
        default_clauses = ?, 
        updated_at = ?
       WHERE id = ?`,
      [
        JSON.stringify(videoTemplate.content_sections),
        JSON.stringify(videoTemplate.default_clauses),
        new Date().toISOString(),
        videoTemplate.id
      ]
    );
    
    saveDb();
    console.log('Successfully updated Video Production template.');
  } catch (err) {
    console.error('Error:', err);
  }
})();
