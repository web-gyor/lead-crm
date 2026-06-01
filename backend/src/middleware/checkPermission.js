// 🎯 TARGET FILE: src/middleware/checkPermission.js
const { pool } = require('../config/db');

const checkPermission = (permissionKey, action = 'view') => {
  return async (req, res, next) => {
    try {
      const rawRole = String(req.user?.role || '').trim();
      const userRoleLower = rawRole.toLowerCase();

      if (!rawRole) {
        return res.status(403).json({ error: 'Access Denied: No role found' });
      }

      // 👑 LEVEL 1: Absolute Bypass for True Super Admin
      if (req.user?.is_super_admin || userRoleLower === 'super admin' || userRoleLower === 'superadmin') {
        return next();
      }

      // 🔒 LEVEL 2: SPECIFIC SECURITY RULE FOR ACCESS CONTROL
      // Only Super Admin can view or edit the Access Control Matrix (rbac)
      if (permissionKey.toLowerCase() === 'rbac') {
        return res.status(403).json({ 
          success: false, 
          error: "Access Denied: Absolute Super Admin clearances required to modify user roles or permissions." 
        });
      }

      // 🔄 LEVEL 2.5: ECOSYSTEM UNIFORMITY MAPPING
      // Reconciles SHAJI's "ADMIN", legacy "Branch Admin", and standard "Admin" strings 
      // into a single lookup value that matches your DB permissions table exactly.
      let normalizedRoleForDB = rawRole;
      if (userRoleLower === 'admin' || userRoleLower === 'branch admin') {
        normalizedRoleForDB = 'Admin'; 
      }

      // 🚀 LEVEL 3: Standard Dynamic Matrix Check against DB rows
      const column = `can_${action.toLowerCase()}`;
      
      const [rows] = await pool.query(
        `SELECT ${column} FROM permissions
         WHERE LOWER(name) = LOWER(?) AND LOWER(slug) = LOWER(?)
         LIMIT 1`,
        [normalizedRoleForDB, permissionKey]
      );

      if (rows.length > 0 && rows[0][column] === 1) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: `Access Denied: Missing dynamic permission parameter [${permissionKey}]`,
      });

    } catch (error) {
      console.error('checkPermission error:', error.message);
      return res.status(500).json({ success: false, error: 'Permission engine failure' });
    }
  };
};

module.exports = checkPermission;