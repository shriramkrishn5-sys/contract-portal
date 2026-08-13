const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const Template = require('../models/Template');
const TrackingEvent = require('../models/TrackingEvent');
const AuditLog = require('../models/AuditLog');
const { requireAuth, requireRole } = require('../middleware/auth');
const appConfig = require('../config/app');
const { getDb } = require('../config/database');
const { sendContractLink, sendAdminNotification } = require('../services/emailService');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      search: req.query.search,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    const contracts = await Contract.findAll(filters);
    res.render('admin/contracts/index', { contracts, filters, title: 'Contracts' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading contracts');
  }
});

router.get('/pipeline', async (req, res) => {
  try {
    const contracts = await Contract.findAll();
    const pipeline = {
      draft: [],
      sent: [],
      opened: [],
      signed: [],
      completed: [],
      declined: []
    };

    contracts.forEach(c => {
      if (pipeline[c.status]) {
        pipeline[c.status].push(c);
      } else {
        pipeline.draft.push(c); // Fallback
      }
    });

    res.render('admin/contracts/pipeline', { pipeline, title: 'Contract Pipeline' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading pipeline');
  }
});

router.get('/new', async (req, res) => {
  try {
    const templates = await Template.findAll();

    // Calculate Category Counts
    const catCounts = {
      All: templates.length,
      Service: 0,
      Project: 0,
      Legal: 0,
      Financial: 0,
      HR: 0
    };

    templates.forEach(t => {
      const cat = t.category || 'Service';
      if (catCounts[cat] !== undefined) {
        catCounts[cat]++;
      } else {
        catCounts[cat] = 1;
      }
    });

    res.render('admin/contracts/new', { templates, catCounts, title: 'New Contract' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading templates');
  }
});

router.get('/prefill/:templateSlug', async (req, res) => {
  res.redirect(`/admin/contracts/create/${req.params.templateSlug}`);
});

router.get('/create/:templateSlug', async (req, res) => {
  try {
    const template = await Template.findBySlug(req.params.templateSlug);
    if (!template) return res.status(404).send('Template not found');
    res.render('admin/contracts/create', { template, config: appConfig, title: 'Create Contract', prefill: req.query });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading form');
  }
});

router.post('/create', async (req, res) => {
  try {
    const template = await Template.findById(req.body.templateId || req.body.template_id);
    if (!template) return res.status(404).send('Template not found');

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + 7); // 1 week after creation
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1); // 1 month after start date

    const contractData = {
      template_id: template.id,
      template_version: template.version,
      admin_id: req.admin.id,
      company_name: req.body.companyName || req.body.company_name || res.locals.settings?.company_name || 'KKeyQik',
      company_email: req.body.companyEmail || req.body.company_email || res.locals.settings?.company_email || 'hello@kkeyqik.com',
      company_address: req.body.companyAddress || '',
      authorized_signatory: req.body.companySignatory || res.locals.settings?.authorized_signatory || 'Naman Agarwal',
      project_name: req.body.projectName || req.body.project_name,
      scope_of_work: req.body.scopeOfWork || '',
      total_amount: req.body.amount || req.body.total_amount || 0,
      currency: req.body.currency || 'USD',
      payment_type: req.body.paymentType || 'full_advance',
      timeline: req.body.timePeriod || '',
      client_name: req.body.clientName || req.body.client_name,
      client_email: req.body.clientEmail || req.body.client_email,
      client_region: req.body.clientRegion || res.locals.settings?.default_region || 'international',
      selected_clauses: req.body.clauses ? Object.values(req.body.clauses).filter(c => c.enabled === 'true').map(c => ({
        title: c.title,
        content: c.content,
        clientToggleable: c.clientToggleable === 'true',
        defaultEnabled: true
      })) : template.default_clauses,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    };

    if (req.body.expires_in && req.body.expires_in !== 'none') {
      const days = parseInt(req.body.expires_in);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
      contractData.expires_at = expiresAt.toISOString();
    }

    const contract = await Contract.create(contractData);

    await AuditLog.create(req.admin.id, 'Created', 'Contract', contractData.project_name, `Contract created for ${contractData.client_name}`, req.ip);

    sendAdminNotification('Created', contract).catch(e => console.error('Failed admin notification', e));

    if (req.body.action === 'preview') {
      res.redirect(`/admin/contracts/${contract.id}/preview`);
    } else {
      res.redirect(`/admin/contracts/${contract.id}`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating contract');
  }
});

router.post('/delete-template', async (req, res) => {
  try {
    const templateId = req.body.templateId || req.body.id;
    if (!templateId) return res.status(400).send('Template ID is required');
    await Template.delete(templateId);
    await AuditLog.create(req.admin.id, 'Deleted', 'Template', `Template ID: ${templateId}`, 'Template deleted from contracts menu', req.ip);
    res.redirect('back');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting template');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).send('Contract not found');

    const events = await TrackingEvent.findByContractId(contract.id);
    const db = await getDb();
    const notes = await db.all('SELECT * FROM notes WHERE contract_id = ? ORDER BY created_at DESC', [contract.id]);

    res.render('admin/contracts/detail', { contract, events, notes, title: contract.project_name || 'Contract Details', appUrl: process.env.APP_URL || 'http://localhost:3000' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading contract');
  }
});


router.get('/:id/edit', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).send('Not found');
    const template = await Template.findById(contract.template_id);
    res.render('admin/contracts/create', {
      template,
      config: appConfig,
      title: 'Edit Contract',
      isEdit: true,
      contract
    });
  } catch (err) {
    res.status(500).send('Error');
  }
});

router.post('/:id/edit', async (req, res) => {
  try {
    const contractData = {
      company_name: req.body.companyName || req.body.company_name,
      company_email: req.body.companyEmail || req.body.company_email,
      company_address: req.body.companyAddress,
      authorized_signatory: req.body.companySignatory || res.locals.settings?.authorized_signatory || 'Naman Agarwal',
      project_name: req.body.projectName || req.body.project_name,
      scope_of_work: req.body.scopeOfWork,
      total_amount: req.body.amount || req.body.total_amount || 0,
      currency: req.body.currency || 'USD',
      payment_type: req.body.paymentType || 'full_advance',
      timeline: req.body.timePeriod || '',
      client_name: req.body.clientName || req.body.client_name,
      client_email: req.body.clientEmail || req.body.client_email,
      client_region: req.body.clientRegion
    };

    const db = await getDb();
    const fields = [];
    const values = [];
    for (const [k, v] of Object.entries(contractData)) {
      fields.push(`${k} = ?`);
      values.push(v === undefined ? null : v);
    }
    values.push(req.params.id);

    // Save current version before updating
    await Contract.saveVersion(req.params.id, req.admin.id);

    await db.run(`UPDATE contracts SET ${fields.join(', ')} WHERE id = ?`, values);

    if (req.body.action === 'preview') {
      res.redirect(`/admin/contracts/${req.params.id}/preview`);
    } else {
      res.redirect(`/admin/contracts/${req.params.id}`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating contract');
  }
});

router.get('/:id/versions', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).send('Not found');
    const versions = await Contract.getVersions(req.params.id);
    res.render('admin/contracts/versions', { contract, versions, title: 'Version History' });
  } catch (err) {
    res.status(500).send('Error loading versions');
  }
});

router.post('/:id/versions/:versionId/restore', async (req, res) => {
  try {
    const success = await Contract.restoreVersion(req.params.id, req.params.versionId);
    if (success) {
      await AuditLog.create(req.admin.id, 'Updated', 'Contract', req.params.id, `Restored contract to version ${req.params.versionId}`, req.ip);
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: 'Failed to restore version' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error restoring version' });
  }
});

router.get('/:id/preview', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).send('Not found');
    res.render('admin/contracts/preview', { contract, layout: 'layouts/public', title: 'Preview Contract' });
  } catch (err) {
    res.status(500).send('Error');
  }
});

router.post('/:id/send', async (req, res) => {
  try {
    await Contract.updateStatus(req.params.id, 'sent');
    const contract = await Contract.findById(req.params.id);
    contract.contractUrl = `${process.env.APP_URL || 'http://localhost:3000'}/c/${contract.uuid}`;
    sendContractLink(contract).catch(e => console.error('Error sending contract link', e));

    sendAdminNotification('Sent', contract).catch(e => console.error('Failed admin notification', e));

    await AuditLog.create(req.admin.id, 'Sent', 'Contract', contract.project_name || req.params.id, `Contract sent to ${contract.client_email}`, req.ip);

    res.redirect(`/admin/contracts/${req.params.id}`);
  } catch (err) {
    res.status(500).send('Error sending');
  }
});

router.post('/:id/resend', async (req, res) => {
  res.redirect(`/admin/contracts/${req.params.id}`);
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    await Contract.updateStatus(req.params.id, 'cancelled');
    await AuditLog.create(req.admin.id, 'Cancelled', 'Contract', contract ? contract.project_name : req.params.id, 'Contract cancelled', req.ip);

    if (contract) {
      sendAdminNotification('Cancelled', contract).catch(e => console.error('Failed admin notification', e));
    }
    res.redirect(`/admin/contracts/${req.params.id}`);
  } catch (err) {
    res.status(500).send('Error cancelling');
  }
});

router.post('/:id/notes', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('INSERT INTO notes (contract_id, admin_id, content, created_at) VALUES (?, ?, ?, ?)',
      [req.params.id, req.admin.id, req.body.content, new Date().toISOString()]);
    res.redirect(`/admin/contracts/${req.params.id}`);
  } catch (err) {
    res.status(500).send('Error adding note');
  }
});

router.post('/:id/delete', requireRole(['superadmin']), async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    const projectName = contract ? contract.project_name : req.params.id;
    const details = contract ? `Client: ${contract.client_name} (${contract.client_email}), Company: ${contract.client_company || 'N/A'}, Value: ${contract.total_amount || 0}` : 'Unknown';
    await Contract.delete(req.params.id);
    await AuditLog.create(req.admin.id, 'Contract Hard Deleted', 'Contract', projectName, `Contract deleted: ${details}`, req.ip);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Retry PDF Generation
router.post('/:id/retry-pdf', requireRole(['superadmin', 'admin']), async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract || contract.status !== 'generation_failed') {
      return res.status(400).json({ error: 'Contract not in failed state' });
    }
    
    // We need generateContractPdf, etc.
    const { executePdfPipeline } = require('../services/pdfPipeline');
    const { waitUntil } = require('@vercel/functions');
    
    waitUntil((async () => {
      try {
        const Template = require('../models/Template');
        const templateData = contract.template_id ? await Template.findById(contract.template_id) : null;
        let signatureData = null;
        if (contract.signature_data) {
          signatureData = typeof contract.signature_data === 'string' ? JSON.parse(contract.signature_data) : contract.signature_data;
        }

        const auditTrail = {
          ip: contract.signature_ip || 'N/A',
          timestamp: contract.signed_at || new Date().toISOString(),
          userAgent: contract.signature_user_agent || '',
          os: 'N/A',
          browser: 'N/A',
          hash: require('crypto').createHash('sha256').update((signatureData ? signatureData.data || '' : '') + contract.uuid).digest('hex')
        };

        await executePdfPipeline(contract, templateData, signatureData, auditTrail);
        
        await AuditLog.create(req.admin.id, 'Retried', 'Contract', contract.project_name || 'Contract', `Manually retried PDF generation`, req.ip, contract.id);
      } catch (err) {
        console.error(`Fatal error in manual PDF retry for contract ${contract.uuid}:`, err);
        // Stays in generation_failed, log to audit
        await AuditLog.create(req.admin.id, 'Failed', 'Contract', contract.project_name || 'Contract', `Manual PDF generation failed: ${err.message}`, req.ip, contract.id);
      }
    })());

    res.json({ success: true, message: 'Retry triggered in background' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/bulk-delete', requireRole(['superadmin']), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    let deleted = 0;
    let errors = [];

    for (const id of ids) {
      try {
        const contract = await Contract.findById(id);
        const projectName = contract ? contract.project_name : id;
        const details = contract ? `Client: ${contract.client_name} (${contract.client_email}), Company: ${contract.client_company || 'N/A'}, Value: ${contract.total_amount || 0}` : 'Unknown';
        await Contract.delete(id);
        await AuditLog.create(req.admin.id, 'Contract Hard Deleted', 'Contract', projectName, `Contract deleted in bulk: ${details}`, req.ip);
        deleted++;
      } catch (err) {
        errors.push(`ID ${id}: ${err.message}`);
      }
    }

    if (errors.length > 0 && deleted === 0) {
      return res.status(400).json({ success: false, message: 'Failed to delete contracts.', errors });
    }

    res.json({ success: true, deleted, errors });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during bulk delete' });
  }
});

router.post('/bulk-action', async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!ids || !Array.isArray(ids) || !action) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    let processed = 0;
    let errors = [];

    for (const id of ids) {
      try {
        const contract = await Contract.findById(id);
        if (!contract) continue;

        if (action === 'archive') {
          await Contract.updateStatus(id, 'archived');
          await AuditLog.create(req.admin.id, 'Updated', 'Contract', contract.project_name, 'Contract archived in bulk', req.ip);
        } else if (action === 'resend') {
          await Contract.updateStatus(id, 'sent');
          contract.contractUrl = `${process.env.APP_URL || 'http://localhost:3000'}/c/${contract.uuid}`;
          sendContractLink(contract).catch(e => console.error('Error sending contract link', e));
          await AuditLog.create(req.admin.id, 'Sent', 'Contract', contract.project_name, 'Contract reminder sent in bulk', req.ip);
        }
        processed++;
      } catch (err) {
        errors.push(`ID ${id}: ${err.message}`);
      }
    }

    res.json({ success: true, processed, errors });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during bulk action' });
  }
});

module.exports = router;
