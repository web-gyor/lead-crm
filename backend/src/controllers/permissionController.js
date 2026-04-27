const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth'); 

/**
 * Updates or creates a role-based permission setting.
 */
router.post('/update', authenticateToken, async (req, res) => {
  const { role, feature_name, is_enabled } = req.body;

  try {
    const query = `
      INSERT INTO role_permissions (role, feature_name, is_enabled) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE is_enabled = ?
    `;
    
    await pool.query(query, [role, feature_name, is_enabled, is_enabled]);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Permissions.update Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;