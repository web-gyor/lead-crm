const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Debugging: This will tell us if the functions are actually loading
console.log('Verify Function:', typeof webhookController.verifyMetaWebhook);
console.log('Receive Function:', typeof webhookController.receiveMetaWebhook);

// Verification Route (The GET request Meta sends first)
if (typeof webhookController.verifyMetaWebhook === 'function') {
    router.get('/meta/:clientId', webhookController.verifyMetaWebhook);
} else {
    console.error('❌ Error: verifyMetaWebhook is not a function!');
}

// Data Route (The POST request for leads)
if (typeof webhookController.receiveMetaWebhook === 'function') {
    router.post('/meta/:clientId', webhookController.receiveMetaWebhook);
} else {
    console.error('❌ Error: receiveMetaWebhook is not a function!');
}
// Meta Verification (Initial Setup)
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === "YOUR_VERIFY_TOKEN") {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Data Receipt
router.post('/whatsapp', webhookController.handleWhatsAppWebhook);

router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Main data handler
router.post('/whatsapp', webhookController.handleWhatsAppLead);

module.exports = router;