// routes/permissions.js
const express  = require('express');
const router   = express.Router();
const { pool } = require('../config/db');
const permissionController = require("../controllers/permissionController");
const { authenticateToken } = require('../middleware/auth');

router.get('/',             authenticateToken, PermissionController.fetchAll);
router.post('/update',      authenticateToken, PermissionController.updatePermission);
router.post('/bulk-update', authenticateToken, PermissionController.bulkUpdatePermissions);

// BUG FIX: AuthContext calls GET /api/permissions/role/:role on page refresh
// to re-hydrate permissions without a full re-login. This route was missing,
// causing a 404 → empty permissions array → all sidebar items hidden on refresh.
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