const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth'); 

/**
 * 1. FETCH PERMISSIONS
 * Gets all permission toggles for a specific role.
 */
router.get('/:role', authenticateToken, async (req, res) => {
  const { role } = req.params;
  try {
    // We fetch from Admin first to ensure all possible features are listed, 
    // even if they haven't been set for the target role yet.
 // TO THIS:
const [rows] = await pool.query(
  "SELECT role, feature_name, permission_key, is_enabled FROM role_permissions WHERE role = ?", 
  [role]
);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. UPDATE PERMISSIONS
 * Updates or creates a role-based permission setting.
 */
router.post('/update', authenticateToken, async (req, res) => {
  // Added permission_key to the destructuring
  const { role, feature_name, permission_key, is_enabled } = req.body;

  try {
    const query = `
      INSERT INTO role_permissions (role, feature_name, permission_key, is_enabled) 
      VALUES (?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE is_enabled = ?
    `;
    
    // We use permission_key to ensure the "can()" function works in the frontend
    await pool.query(query, [role, feature_name, permission_key, is_enabled, is_enabled]);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Permissions.update Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;