const { getDb } = require('../config/database');
const Contract = require('../models/Contract');
const Template = require('../models/Template');
const { generateContractPdf } = require('../services/pdfGenerator');
const fs = require('fs');
const path = require('path');

async function testPdfGeneration() {
  try {
    const db = await getDb();
    
    // Get the video production template
    let template = await Template.findById(1);
    if (!template) {
        console.log("Template 1 not found. Exiting.");
        return;
    }

    // Create a mock contract
    const contractData = {
      template_id: template.id,
      template_version: template.version,
      admin_id: 1,
      project_name: 'Test Video Production for Naman',
      client_name: 'Amogh',
      client_company: 'Amogh Tech',
      client_designation: 'Director',
      client_email: 'amogh@example.com',
      client_address: '123 Fake Street, Tech City',
      total_amount: 150000,
      payment_type: 'full_advance',
      scope_of_work: 'Create an amazing 2-minute promotional video.',
      timeline: '2 weeks',
      selected_clauses: JSON.stringify(template.default_clauses), // Stringify for SQLite
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'signed',
      signature_data: 'Amogh (Signed Digitally)',
      signature_type: 'type',
      signature_ip: '::1',
      signed_at: new Date().toISOString()
    };
    
    const contract = await Contract.create(contractData);
    
    // Generate PDF
    const signatureData = { text: 'Amogh', fontFamily: 'cursive' };
    const auditTrail = {
      timestamp: contract.signed_at,
      ip: contract.signature_ip,
      os: 'Windows 10',
      browser: 'Chrome 115',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0.0.0',
      hash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2'
    };
    
    const { pdfPath } = await generateContractPdf(contract, template, signatureData, auditTrail);
    console.log(`PDF generated successfully at: ${pdfPath}`);
  } catch (err) {
    console.error("Error generating PDF:", err);
  }
}

testPdfGeneration();
