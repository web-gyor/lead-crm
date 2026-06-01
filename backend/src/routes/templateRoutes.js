const express = require('express');
const router = express.Router();
const { parseTemplate } = require('../utils/templateHelper');
// Import your database models / execution connection points here
const db = require('../config/db'); 
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/templates/parse
 * Dynamic compilation gate for on-the-fly text rendering
 */
router.post('/parse', authenticateToken, async (req, res) => {
  const { templateId, leadId } = req.body;

  if (!templateId || !leadId) {
    return res.status(400).json({ success: false, error: "Missing tracking keys" });
  }

  try {
    // 1. Fetch template context from library storage
    const [templates] = await db.execute('SELECT * FROM templates WHERE id = ?', [templateId]);
    const template = templates[0];

    // 2. Fetch targeted customer lead parameter payload metrics
    const [leads] = await db.execute('SELECT * FROM leads WHERE id = ?', [leadId]);
    const lead = leads[0];

    if (!template || !lead) {
      return res.status(404).json({ success: false, error: "Record references mismatched" });
    }

    // 🎯 EXECUTE MATCH RUNTIME: Parse using your existing helper engine
    const compiledText = parseTemplate(template.content, lead);

    return res.status(200).json({
      success: true,
      compiledText: compiledText
    });
  } catch (err) {
    console.error("[TEMPLATE COMPILER FAULT]:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;