const express = require('express');
const router = express.Router();
const { pool: db } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

/**
 * Communication Logs Router
 * Handles recording and retrieving interaction history with leads.
 */

// Save a new communication log
router.post('/communication-logs', authenticateToken, async (req, res) => {
  const { lead_id, type, summary } = req.body;
  const userId = req.user.id;

  if (!lead_id || !summary) {
    return res.status(400).json({ error: "Lead ID and Summary are required" });
  }

  try {
    const sql = `INSERT INTO communication_logs (lead_id, user_id, type, summary) VALUES (?, ?, ?, ?)`;
    await db.query(sql, [lead_id, userId, type || 'Call', summary]); 
    
    return res.status(201).json({ success: true, message: "Log saved successfully" });
  } catch (err) {
    console.error("CommunicationLogs.save Error:", err.message);
    return res.status(500).json({ error: "Database save failed" });
  }
});

// Fetch all logs for a specific lead
router.get('/communication-logs/:leadId', authenticateToken, async (req, res) => {
  try {
    const sql = `
      SELECT cl.*, u.name as user_name 
      FROM communication_logs cl
      LEFT JOIN users u ON cl.user_id = u.id
      WHERE cl.lead_id = ?
      ORDER BY cl.created_at DESC
    `;
    const [rows] = await db.query(sql, [req.params.leadId]);
    return res.json(rows);
  } catch (err) {
    console.error("CommunicationLogs.fetch Error:", err.message);
    return res.status(500).json({ error: "Fetch failed" });
  }
});

// Delete a specific log entry
router.delete('/communication-logs/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const sql = `DELETE FROM communication_logs WHERE id = ?`;
    await db.query(sql, [id]);
    
    return res.json({ success: true, message: "Log deleted successfully" });
  } catch (err) {
    console.error("CommunicationLogs.delete Error:", err.message);
    return res.status(500).json({ error: "Failed to delete log" });
  }
});

module.exports = router;