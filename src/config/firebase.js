const logger = require('./logger');
const fs = require('fs');
let messaging = null;

// Support either a raw/base64 JSON in FIREBASE_SERVICE_ACCOUNT or a file path
// via FIREBASE_SERVICE_ACCOUNT_PATH which points to the service account JSON.
let svc = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!svc && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  try {
    svc = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
  } catch (err) {
    logger.warn({ err }, 'Failed to read FIREBASE_SERVICE_ACCOUNT_PATH file');
  }
}

if (svc) {
  try {
    // Support either raw JSON or base64-encoded JSON
    if (typeof svc === 'string' && !svc.trim().startsWith('{')) {
      svc = Buffer.from(svc, 'base64').toString('utf8');
    }
    const serviceAccount = JSON.parse(svc);
    const admin = require('firebase-admin');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    messaging = admin.messaging();
    logger.info('Firebase admin initialized');
  } catch (err) {
    logger.warn({ err }, 'Failed to initialize Firebase admin; FCM sends disabled');
  }
} else {
  logger.info('FIREBASE_SERVICE_ACCOUNT not set; FCM sends disabled');
}

module.exports = messaging;
