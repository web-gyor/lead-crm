const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { authenticateToken } = require('../controllers/leadController'); 

/**
 * Settings Router
 * Handles system configuration and company profile management.
 */

// Retrieve current company and admin settings
router.get('/', authenticateToken, getSettings);

// Update company profile, admin details, or password
router.put('/', authenticateToken, updateSettings);

module.exports = router;