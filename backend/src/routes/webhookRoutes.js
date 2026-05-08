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

module.exports = router;