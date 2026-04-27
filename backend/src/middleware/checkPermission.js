const pool = require('../config/db');

/**
 * Higher-order middleware to verify role-based feature permissions.
 * Grants automatic access to Admin roles.
 */
const checkPermission = (featureName) => {
  return async (req, res, next) => {
    try {
      // Standard Admin override
      if (req.user && req.user.role === 'Admin') {
        return next();
      }

      const [rows] = await pool.query(
        "SELECT is_enabled FROM role_permissions WHERE role = ? AND feature_name = ?",
        [req.user.role, featureName]
      );

      if (rows.length > 0 && rows[0].is_enabled === 1) {
        return next();
      }

      return res.status(403).json({ error: `Permission Denied: ${featureName}` });
    } catch (error) {
      console.error("Permission Check Error:", error.message);
      return res.status(500).json({ error: "Security check failed" });
    }
  };
};

module.exports = checkPermission;