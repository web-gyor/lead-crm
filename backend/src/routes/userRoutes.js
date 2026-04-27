const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Admin Authorization Middleware
 */
const isAdmin = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  if (role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Admin access only" });
  }
};

/**
 * Public Authentication Routes
 * Mounted at: /auth or /api/users
 */
router.post('/login', userController.login);
router.post('/check-role', userController.checkUserRole);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

/**
 * Private Staff Management Routes (Admin Only)
 */
router.get('/', authenticateToken, isAdmin, userController.getAllUsers);
router.post('/', authenticateToken, isAdmin, userController.createUser);
router.put('/:id', authenticateToken, isAdmin, userController.updateUser);
router.delete('/:id', authenticateToken, isAdmin, userController.deleteUser);

// Alias for registration
router.post('/register', authenticateToken, isAdmin, userController.createUser);

module.exports = router;