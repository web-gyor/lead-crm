const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { 
    getTemplates, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate 
} = require("../controllers/templateController");

/**
 * Route: /api/communication-templates
 * Handles template management for WhatsApp, SMS, and Email.
 */

// Fetch templates (Filter via ?type=sms|whatsapp|email)
router.get("/", authenticateToken, getTemplates);

// Create a new template
router.post("/", authenticateToken, createTemplate);

// Update template by ID
router.put("/:id", authenticateToken, updateTemplate);

// Delete template by ID
router.delete("/:id", authenticateToken, deleteTemplate);

module.exports = router;