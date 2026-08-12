const crypto = require('crypto');

/**
 * Process and validate a drawn signature
 * @param {string} base64Png - Base64 encoded PNG string
 * @returns {Buffer} - The signature buffer
 */
async function processDrawnSignature(base64Png) {
  try {
    if (!base64Png || typeof base64Png !== 'string') {
      throw new Error('Invalid signature data');
    }
    
    // Remove data URL prefix if present
    const base64Data = base64Png.replace(/^data:image\/png;base64,/, "");
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    console.error('Error processing drawn signature:', error);
    throw error;
  }
}

/**
 * Process a typed signature
 * @param {string} text - The typed signature text
 * @param {string} fontFamily - The font family used
 * @returns {Object} - Typed signature data
 */
async function processTypedSignature(text, fontFamily) {
  try {
    if (!text || text.trim() === '') {
      throw new Error('Signature text cannot be empty');
    }
    return { text: text.trim(), fontFamily: fontFamily || 'Arial' };
  } catch (error) {
    console.error('Error processing typed signature:', error);
    throw error;
  }
}

/**
 * Generate a SHA-256 hash for document content
 * @param {string} contentString - The string to hash
 * @returns {string} - The hex hash string
 */
function generateDocumentHash(contentString) {
  return crypto.createHash('sha256').update(contentString).digest('hex');
}

/**
 * Create an audit trail object from request data
 * @param {Object} req - The Express request object
 * @param {Object} contract - The contract data
 * @returns {Object} - Audit trail metadata
 */
function createAuditTrail(req, contract) {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'Unknown';
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  // Basic parsing for browser/OS
  let browser = 'Unknown';
  let os = 'Unknown';
  
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'MacOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

  return {
    contractId: contract.id || null,
    ip: ip,
    userAgent: userAgent,
    browser: browser,
    os: os,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate an HMAC-SHA256 seal for tamper proofing
 * @param {string|Object} payload - The payload to seal
 * @param {string} secret - The secret key
 * @returns {string} - The HMAC hash
 */
function generateHmacSeal(payload, secret) {
  const dataString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(dataString);
  return hmac.digest('hex');
}

module.exports = {
  processDrawnSignature,
  processTypedSignature,
  generateDocumentHash,
  createAuditTrail,
  generateHmacSeal
};
