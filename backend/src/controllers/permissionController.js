const { pool } = require('../config/db');

// ─────────────────────────────────────────────────────────────
// GET ALL PERMISSIONS (Admin matrix view)
// GET /api/permissions
// ─────────────────────────────────────────────────────────────
exports.fetchAll = async (req, res) => {
  let connection;
  try {
    const userRole = String(req.user?.role || "").toLowerCase().replace(/\s+|-/g, "");

    connection = await pool.getConnection();

    // ✅ FIX: Return ALL permission rows for admin matrix display
    // The frontend AccessControlCenter needs the full table — not just the current user's rows
    const [rows] = await connection.query(
      `SELECT id, name, slug, can_view, can_create, can_edit, can_delete, can_export, updated_at
       FROM permissions
       ORDER BY name ASC, slug ASC`
    );

    return res.json(rows); // ✅ Return plain array — frontend does: Array.isArray(data)

  } catch (err) {
    console.error("Permission fetch failed:", err);
    return res.status(500).json({ success: false, error: "Internal security link failure" });
  } finally {
    if (connection) connection.release();
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
const bulkUpdateRolePermissions = async (req, res) => {
  let connection;
  try {
    const { role, name, slugActions, is_enabled } = req.body;
    const targetRoleName = name || role;
    const binaryValue = Number(is_enabled) === 1 ? 1 : 0;

    if (!targetRoleName || !slugActions) {
      return res.status(400).json({ success: false, error: 'Missing name/role or slugActions' });
    }

    connection = await pool.getConnection();

    for (const [slug, actions] of Object.entries(slugActions)) {
      const updateFields = (actions as string[])
        .map(action => `can_${action} = ${binaryValue}`)
        .join(', ');

      await connection.query(
        `UPDATE permissions 
         SET ${updateFields}
         WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND LOWER(TRIM(slug)) = LOWER(TRIM(?))`,
        [targetRoleName, slug]
      );
    }

    return res.json({ success: true, message: "Bulk permissions updated successfully." });
  } catch (error) {
    console.error('bulkUpdate error:', error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// ✅ FIX: Export with the name the router expects
exports.bulkUpdatePermissions = bulkUpdateRolePermissions;

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