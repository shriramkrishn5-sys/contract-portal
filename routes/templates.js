const express = require('express');
const router = express.Router();
const multer = require('multer');
const Template = require('../models/Template');
const Clause = require('../models/Clause');
const AuditLog = require('../models/AuditLog');
const { requireAuth } = require('../middleware/auth');

const upload = multer({ dest: '/tmp' });

router.use(requireAuth);

// POST /admin/templates/import - Import .docx as template
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No file uploaded');

    // Parse docx to html
    const mammoth = require('mammoth');
    const result = await mammoth.convertToHtml({ path: req.file.path });
    const html = result.value;

    const slug = `imported-template-${Date.now()}`;
    const newTemplate = {
      name: req.body.name || 'Imported Template',
      slug: slug,
      description: 'Template imported from DOCX.',
      icon: '📄',
      content_sections: [{ title: 'Imported Content', content: html }],
      default_clauses: [],
      fields_schema: [],
      client_fields_schema: []
    };

    await Template.create(newTemplate);

    await AuditLog.create(req.admin.id, 'Imported', 'Template', newTemplate.name, 'Template imported from DOCX', req.ip);
    res.redirect('/admin/templates');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error importing template');
  } finally {
    if (req.file) {
      const fs = require('fs');
      try { fs.unlinkSync(req.file.path); } catch (e) { }
    }
  }
});

// POST /admin/templates/upload - Upload JSON schema or HTML file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No file uploaded');

    const fs = require('fs');
    const content = fs.readFileSync(req.file.path, 'utf8');

    let content_sections = [];
    if (req.file.originalname.endsWith('.json')) {
      const parsed = JSON.parse(content);
      content_sections = parsed.content_sections || [{ title: 'Section', content: JSON.stringify(parsed) }];
    } else {
      content_sections = [{ title: 'Uploaded Content', content: content }];
    }

    const slug = `uploaded-template-${Date.now()}`;
    const newTemplate = {
      name: req.body.name || 'Uploaded Template',
      slug: slug,
      description: 'Template uploaded.',
      icon: '📄',
      content_sections: content_sections,
      default_clauses: [],
      fields_schema: [],
      client_fields_schema: []
    };

    await Template.create(newTemplate);

    await AuditLog.create(req.admin.id, 'Uploaded', 'Template', newTemplate.name, 'Template uploaded', req.ip);
    res.redirect('/admin/templates');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error uploading template');
  } finally {
    if (req.file) {
      const fs = require('fs');
      try { fs.unlinkSync(req.file.path); } catch (e) { }
    }
  }
});

// GET /admin/templates - List templates for editing
router.get('/', async (req, res) => {
  try {
    const templates = await Template.findAll();
    res.render('admin/templates-list', {
      title: 'Template Editor',
      currentPath: '/admin/templates',
      templates
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading templates');
  }
});

// POST /admin/templates - Create blank template
router.post('/', async (req, res) => {
  try {
    const defaultIcon = '📄';
    const slug = `custom-template-${Date.now()}`;
    const newTemplate = {
      name: 'Untitled Template',
      slug: slug,
      description: 'A custom contract template.',
      icon: defaultIcon,
      content_sections: [{ title: 'Section 1', content: 'Enter your content here...' }],
      default_clauses: [],
      fields_schema: [],
      client_fields_schema: []
    };

    // Create method expects specific fields. Let's look at Template model.
    // Assuming Template.create(data) exists or we use raw SQL.
    const db = await require('../config/database').getDb();
    const result = await db.run(
      `INSERT INTO templates (name, slug, description, version, content_sections, default_clauses, fields_schema, client_fields_schema, icon) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newTemplate.name, slug, newTemplate.description, 1,
        JSON.stringify(newTemplate.content_sections), JSON.stringify([]),
        JSON.stringify([]), JSON.stringify([]), newTemplate.icon
      ]
    );

    const newId = result.insertId;

    await AuditLog.create(req.admin.id, 'Created', 'Template', newTemplate.name, 'Blank template created', req.ip);

    // If fetch call, return JSON, else redirect
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.json({ success: true, redirect: `/admin/templates/${newId}/edit` });
    } else {
      res.redirect(`/admin/templates/${newId}/edit`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error creating template' });
  }
});

// GET /admin/templates/:id/edit - Structural builder UI
router.get('/:id/edit', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    const clauses = await Clause.findAll(); // To allow attaching clauses
    if (!template) return res.status(404).send('Template not found');

    res.render('admin/templates-edit', {
      title: `Edit Template: ${template.name}`,
      currentPath: '/admin/templates',
      template,
      clauses
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading template editor: ' + (error.message || error) + '<br><pre>' + (error.stack || '') + '</pre>');
  }
});

// PUT /admin/templates/:id - Update template structure
router.put('/:id', async (req, res) => {
  try {
    const { name, description, icon, content_sections, default_clauses, fields_schema, client_fields_schema } = req.body;
    await Template.update(req.params.id, {
      name, description, icon, content_sections, default_clauses, fields_schema, client_fields_schema
    });

    await AuditLog.create(req.admin.id, 'Updated', 'Template', name, 'Template structure updated', req.ip);

    res.json({ success: true, message: 'Template updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error updating template' });
  }
});

module.exports = router;
