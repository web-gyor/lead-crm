const { pool } = require('../config/db');

// ─────────────────────────────────────────────────────────────
// GET ALL PERMISSIONS
// GET /api/permissions
// ─────────────────────────────────────────────────────────────
exports.fetchAll = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM permissions
      ORDER BY name ASC, slug ASC
    `);
    return res.status(200).json(rows);
  } catch (err) {
    console.error('fetchAll error:', err.message);
    return res.status(500).json({ error: 'Failed to load permissions' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET PERMISSIONS BY ROLE
// GET /api/permissions/role/:role
// ─────────────────────────────────────────────────────────────
exports.getPermissionsByRole = async (req, res) => {
  try {
    const { role } = req.params;
    if (!role) return res.status(400).json({ error: 'Role is required' });

    const [rows] = await pool.query(
      `SELECT * FROM permissions WHERE LOWER(name) = LOWER(?) ORDER BY slug ASC`,
      [role]
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error('getPermissionsByRole error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// UPDATE SINGLE PERMISSION CELL
// POST /api/permissions/update
// ─────────────────────────────────────────────────────────────
exports.updatePermission = async (req, res) => {
  const { name, slug, action, value } = req.body;

  if (!name || !slug || !action) {
    return res.status(400).json({ error: 'Missing required fields: name, slug, action' });
  }

  const allowed = ['view', 'create', 'edit', 'delete', 'export'];
  const actionLower = action.toLowerCase();

  if (!allowed.includes(actionLower)) {
    return res.status(400).json({
      error: `Invalid action "${action}". Must be one of: ${allowed.join(', ')}`
    });
  }

  const column = `can_${actionLower}`;
  const intVal = value ? 1 : 0;

  try {
    await pool.query(
      `INSERT INTO permissions (name, slug, ${column}, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         ${column}  = VALUES(${column}),
         updated_at = NOW()`,
      [name, slug, intVal]
    );

    return res.status(200).json({
      success: true,
      updated: { name, slug, action: column, value: intVal }
    });
  } catch (err) {
    console.error('updatePermission error:', err.message);
    return res.status(500).json({ error: 'Failed to update permission' });
  }
};

// ─────────────────────────────────────────────────────────────
// BULK GRANT / REVOKE ALL FOR A ROLE
// POST /api/permissions/bulk-update
// ─────────────────────────────────────────────────────────────
exports.bulkUpdatePermissions = async (req, res) => {
  const { role, slugActions, is_enabled } = req.body;

  if (!role || !slugActions || typeof slugActions !== 'object') {
    return res.status(400).json({ error: 'Missing role or slugActions map' });
  }

  const allowed = ['view', 'create', 'edit', 'delete', 'export'];
  const enabled = is_enabled ? 1 : 0;

  try {
    for (const [slug, actions] of Object.entries(slugActions)) {
      const cols = Array.isArray(actions)
        ? actions.filter(a => allowed.includes(a))
        : [];

      if (!cols.length) continue;

      const insertCols    = cols.map(a => `can_${a}`).join(', ');
      const insertVals    = cols.map(() => '?').join(', ');
      const updateClauses = cols.map(a => `can_${a} = ?`).join(', ');
      const vals          = cols.map(() => enabled);

      await pool.query(
        `INSERT INTO permissions (name, slug, ${insertCols}, updated_at)
         VALUES (?, ?, ${insertVals}, NOW())
         ON DUPLICATE KEY UPDATE
           ${updateClauses},
           updated_at = NOW()`,
        [role, slug, ...vals, ...vals]
      );
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('bulkUpdatePermissions error:', err.message);
    return res.status(500).json({ error: 'Failed to perform bulk update' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET CURRENT USER PERMISSIONS
// GET /api/permissions/me
// ─────────────────────────────────────────────────────────────
exports.getUserPermissions = async (req, res) => {
  const user = req.user;

  if (!user || !user.role) {
    return res.status(400).json({ error: 'User role not found' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT * FROM permissions WHERE LOWER(name) = LOWER(?) ORDER BY slug ASC`,
      [user.role]
    );
    return res.status(200).json({ success: true, permissions: rows });
  } catch (err) {
    console.error('getUserPermissions error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch permissions' });
  }
};