const cron = require('node-cron');
const Contract = require('../models/Contract');
const { sendReminderEmail } = require('./emailService');

function startCronJobs() {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily contract reminder scan...');
    try {
      const contracts = await Contract.findAll();
      const now = new Date();
      
      for (const contract of contracts) {
        // Only target contracts that are sent, opened, or filled (but NOT signed/completed/cancelled)
        if (['sent', 'opened', 'filled'].includes(contract.status)) {
          const sentDate = new Date(contract.sent_at || contract.created_at);
          const diffTime = Math.abs(now - sentDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Send reminder if exactly 3 days or exactly 7 days old
          if (diffDays === 3 || diffDays === 7) {
            console.log(`Sending reminder to ${contract.client_email} for contract ${contract.uuid}`);
            if (sendReminderEmail) {
               await sendReminderEmail(contract, diffDays);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error running cron job:', error);
    }
  });
  console.log('Cron scheduler started.');
}

module.exports = { startCronJobs };
