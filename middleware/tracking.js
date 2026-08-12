const TrackingEvent = require('../models/TrackingEvent');

async function trackContractView(req, res, next) {
  const uuid = req.params.uuid;
  if (!uuid) return next();

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';
  const referrer = req.headers['referer'] || '';

  req.trackingData = { ip, userAgent, referrer };
  next();
}

module.exports = { trackContractView };
