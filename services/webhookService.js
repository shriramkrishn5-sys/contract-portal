const Webhook = require('../models/Webhook');

async function triggerWebhooks(eventType, payload) {
  try {
    const webhooks = await Webhook.getActiveByEventType(eventType);
    
    for (const webhook of webhooks) {
      try {
        await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error(`Failed to trigger webhook ${webhook.url} for event ${eventType}`, err);
      }
    }
  } catch (err) {
    console.error('Error fetching webhooks to trigger', err);
  }
}

module.exports = { triggerWebhooks };
