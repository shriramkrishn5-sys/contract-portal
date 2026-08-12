const { generateContractPdf } = require('../services/pdfGenerator');

async function testPdf() {
  const dummyContract = {
    id: 999,
    uuid: 'test-uuid',
    title: 'Test Contract',
    clientName: 'Naman',
    clientEmail: 'naman@test.com'
  };
  
  const template = {
    companyAddress: 'Test Address',
    companyCin: 'CIN-TEST'
  };

  const signature = {
    text: 'Naman',
    fontFamily: 'cursive'
  };

  const audit = {
    ip: '127.0.0.1',
    timestamp: new Date().toISOString(),
    userAgent: 'test-agent'
  };

  console.log('Generating PDF...');
  try {
    const { pdfPath } = await generateContractPdf(dummyContract, template, signature, audit);
    console.log('PDF generated at:', pdfPath);
    process.exit(0);
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    process.exit(1);
  }
}

testPdf();
