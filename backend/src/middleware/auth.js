const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Access Denied: No Token Provided" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("Configuration Error: JWT_SECRET is missing");
    return res.status(500).json({ success: false, message: "Internal Server Configuration Error" });
  }

  try {
    const decoded = jwt.verify(token, secret);

    // Fetch user status only (no branch join needed)
    const [rows] = await pool.execute(
      "SELECT id, status FROM users WHERE id = ?",
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(403).json({ success: false, message: "User session non-existent" });
    }

    if (rows[0].status !== 'active') {
      return res.status(403).json({ success: false, message: "Access suspended. Account deactivated." });
    }

    // Mount user identity
    req.user = {
      id: Number(decoded.id),
      role: decoded.role,
      is_super_admin: Boolean(decoded.is_super_admin),
      permissions: decoded.permissions || []
    };

    next();
  } catch (err) {
    console.error("Auth Error:", err.message);
    return res.status(403).json({ success: false, message: "Session expired or invalid token" });
  }
};

const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(500).json({ success: false, message: "Authentication fault" });
  }
  
  // Simple check for role or super admin flag
  if (req.user.role?.toLowerCase() === 'admin' || req.user.is_super_admin) {
    next();
  } else {
    res.status(403).json({ success: false, message: "Forbidden: Admin permissions required" });
  }
};

module.exports = { 
  authenticateToken, 
  verifyToken: authenticateToken,
  isAdmin 
};