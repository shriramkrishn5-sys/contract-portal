const crypto = require('crypto');

// Replace with a valid contract UUID from your database
const TEST_UUID = '0368bf55-b2d5-4324-9204-f4cb905430fa'; 
const APP_URL = 'https://contract-portal-theta.vercel.app'; // Or http://localhost:3000

async function simulateSignature(userId) {
  console.log(`[User ${userId}] Starting signature submission...`);
  const startTime = Date.now();
  
  try {
    const res = await fetch(`${APP_URL}/c/${TEST_UUID}/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `ConcurrentTestBot/${userId}`
      },
      // Provide valid signature payload expected by your route
      body: JSON.stringify({
        signatureData: { data: 'data:image/png;base64,...' } 
      })
    });
    
    const timeTaken = Date.now() - startTime;
    console.log(`[User ${userId}] Received HTTP ${res.status} in ${timeTaken}ms!`);
  } catch (err) {
    console.error(`[User ${userId}] Failed:`, err.message);
  }
}

async function runTest() {
  console.log('--- Starting Concurrent Load Test ---');
  // Fire 5 concurrent requests without awaiting them individually
  const promises = [];
  for (let i = 1; i <= 5; i++) {
    promises.push(simulateSignature(i));
  }
  
  await Promise.all(promises);
  console.log('--- All requests dispatched. Now check Vercel Logs for background PDF generation completion! ---');
}

runTest();
