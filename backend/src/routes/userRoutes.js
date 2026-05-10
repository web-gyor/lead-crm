const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, isAdmin } = require('../middleware/auth'); // Import both here

/**
 * Public Authentication Routes
 */
router.post('/login', userController.login);
router.post('/check-role', userController.checkUserRole);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

/**
 * Private Staff Management Routes (Admin Only)
 */
// Use the imported authenticateToken
router.get('/staff', authenticateToken, userController.getStaffList);

// Use both imported middlewares
router.get('/', authenticateToken, isAdmin, userController.getAllUsers);
router.post('/', authenticateToken, isAdmin, userController.createUser);
router.put('/:id', authenticateToken, isAdmin, userController.updateUser);
router.delete('/:id', authenticateToken, isAdmin, userController.deleteUser);

// Alias for registration
router.post('/register', authenticateToken, isAdmin, userController.createUser);

module.exports = router;