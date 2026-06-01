
const express = require("express");
const router = express.Router();
const { pool } = require('../config/db');

const permissionController = require("../controllers/permissionController"); // Lowercase reference variable
const { authenticateToken } = require("../middleware/auth");

// 🚀 FIXED: All execution methods converted to use the correct lowercase reference variable instance
router.get('/',               authenticateToken, permissionController.fetchAll);
router.post('/update',        authenticateToken, permissionController.updatePermission);
router.post('/bulk-update',   authenticateToken, permissionController.bulkUpdatePermissions);

router.get('/role/:role', authenticateToken, async (req, res) => {
  const role = decodeURIComponent(req.params.role || '').trim();
  if (!role) return res.status(400).json({ error: 'role param required' });

  try {
    const [rows] = await pool.query(
      `SELECT name, slug, can_view, can_create, can_edit, can_delete, can_export
       FROM permissions
       WHERE LOWER(name) = LOWER(?)
       ORDER BY slug`,
      [role]
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error('Role permissions fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to load role permissions' });
  }
});

module.exports = router;