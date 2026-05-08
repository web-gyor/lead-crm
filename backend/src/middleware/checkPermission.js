const { pool } = require('../config/db');

/**
 * Higher-order middleware to verify role-based permissions using structured keys.
 * Grants automatic access to Admin and Superadmin roles.
 */
const checkPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const userRole = (req.user?.role || "").toLowerCase();

      // 🛡️ 1. Global Admin Override
      // Admins and Superadmins bypass all specific permission checks.
      if (userRole === 'admin' || userRole === 'superadmin') {
        return next();
      }

      // 🔍 2. Database Key Check
      // We check the permission_key column for the specific role.
      const [rows] = await pool.query(
        "SELECT is_enabled FROM role_permissions WHERE LOWER(role) = ? AND permission_key = ?",
        [userRole, permissionKey]
      );

      // ✅ 3. Permission Validation
      if (rows.length > 0 && (rows[0].is_enabled === 1 || rows[0].is_enabled === true)) {
        return next();
      }

      // ❌ 4. Access Denied
      return res.status(403).json({ 
        success: false,
        error: `Access Denied: Missing permission [${permissionKey}]` 
      });

    } catch (error) {
      console.error("Critical Permission Check Error:", error.message);
      return res.status(500).json({ error: "Internal security verification failed" });
    }
  };
};

module.exports = checkPermission;