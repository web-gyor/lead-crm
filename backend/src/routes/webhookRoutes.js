const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

/**
 * META (Facebook & Instagram) LEAD ADS
 * Handlers: verifyMetaWebhook (GET), handleMetaLead (POST)
 */
router.get('/meta/:clientId', webhookController.verifyMetaWebhook);
router.post('/meta/:clientId', webhookController.handleMetaLead);

/**
 * WHATSAPP BUSINESS WEBHOOKS
 * Handlers: verifyWebhook (GET), handleWhatsAppLead (POST)
 */
router.get('/whatsapp/:clientId', webhookController.verifyWebhook);
router.post('/whatsapp/:clientId', webhookController.handleWhatsAppLead);

/**
 * GOOGLE ADS LEAD FORMS
 * Handler: handleGoogleLead (POST)
 */
router.post('/google/:clientId', webhookController.handleGoogleLead);

/**
 * UNIVERSAL WEBHOOK (Website Forms, Elementor, Custom)
 * Handler: handleLeadWebhook (POST)
 */
router.post('/capture/:clientId/:source', webhookController.handleLeadWebhook);

module.exports = router;