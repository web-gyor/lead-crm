const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

/**
 * Permissions Router
 * Manages feature-level access control for different user roles.
 */

// Retrieve all permissions across all roles for the management matrix
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT role, feature_name, is_enabled 
       FROM role_permissions 
       ORDER BY role, feature_name ASC`
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("Permissions.fetchAll Error:", err.message);
    return res.status(500).json({ error: "Database fetch failed" });
  }
});

// Retrieve permissions for a specific role (used by AuthContext)
router.get('/:role', authenticateToken, async (req, res) => {
  const { role } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT role, feature_name, permission_key, is_enabled 
       FROM role_permissions 
       WHERE LOWER(role) = LOWER(?)`,
      [role]
    );
    
    // Most of your frontend components expect the data inside a 'data' property
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Permissions.fetchByRole Error:", err.message);
    return res.status(500).json({ error: "Database fetch failed" });
  }
});
// Update a specific feature permission toggle
router.post('/update', authenticateToken, async (req, res) => {
  const { role, feature_name, is_enabled } = req.body;

  if (!role || !feature_name || is_enabled === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const [result] = await pool.query(
      `UPDATE role_permissions 
       SET is_enabled = ?, updated_at = NOW()
       WHERE LOWER(role) = LOWER(?) AND feature_name = ?`,
      [is_enabled, role, feature_name]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        error: `No record found for role "${role}" and feature "${feature_name}"` 
      });
    }

    return res.status(200).json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error("Permissions.update Error:", err.message);
    return res.status(500).json({ error: "Database update failed" });
  }
});

module.exports = router;