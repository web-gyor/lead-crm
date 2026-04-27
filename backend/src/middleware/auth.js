const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token and attach user to request
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access Denied: No Token Provided" });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    // Log the error but don't exit the process to keep the server alive for other requests
    console.error("Configuration Error: JWT_SECRET is missing from .env");
    return res.status(500).json({ message: "Internal Server Configuration Error" });
  }

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      console.error("JWT Verify Error:", err.message);
      return res.status(403).json({ message: "Invalid or Expired Token" });
    }
    req.user = user;
    next();
  });
};

/**
 * Middleware to restrict access to Admin users only
 */
const isAdmin = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  
  if (role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Admin privileges required" });
  }
};

module.exports = { authenticateToken, isAdmin };