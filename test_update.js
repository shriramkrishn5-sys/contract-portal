const { getDb } = require('./config/database');
const Contract = require('./models/Contract');

async function testUpdate() {
  const contractData = {
      company_name: 'KKeyQik',
      company_email: 'hello@kkeyqik.com',
      company_address: '',
      authorized_signatory: 'Admin',
      project_name: 'Test Project',
      scope_of_work: 'Testing scope',
      total_amount: 500,
      currency: 'USD',
      payment_type: 'full_advance',
      timeline: '1 month',
      client_name: 'Test Client',
      client_email: 'test@example.com',
      client_region: 'international'
  };
  
  try {
    const db = await getDb();
    
    // We need an ID that exists. Let's create one first or pick ID 1.
    const id = 1;

    const fields = [];
    const values = [];
    for (const [k, v] of Object.entries(contractData)) {
      fields.push(`${k} = ?`);
      values.push(v);
    }
    values.push(id);

    await db.run(`UPDATE contracts SET ${fields.join(', ')} WHERE id = ?`, values);
    console.log("Update successful");
  } catch (err) {
    console.error("MySQL Error Object:", err);
  }
  process.exit();
}

testUpdate();
