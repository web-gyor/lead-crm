const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { pool } = require('../config/db'); // Ensure pool is imported
const { authenticateToken } = require('../middleware/auth'); 

// Import permission engine
const importedPermissionEngine = require('../middleware/checkPermission');
const checkPermission = typeof importedPermissionEngine === 'function' 
  ? importedPermissionEngine 
  : (importedPermissionEngine.checkPermission || (() => (req, res, next) => next()));

/**
 * PUBLIC AUTHENTICATION GATEWAYS
 */
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

/**
 * SECURE STAFF WORKSPACE LAYER
 */
router.use(authenticateToken);

// 1. Unified Staff Lookup (Handled by the controller, remove the duplicate)
router.get('/staff', userController.getStaffList);

// 2. Staff/User Roster Management
router.get('/', checkPermission('users.manage'), userController.getAllUsers);
router.post('/', checkPermission('users.manage'), userController.createUser);
router.post('/register', checkPermission('users.manage'), userController.createUser);
router.put('/:id', checkPermission('users.manage'), userController.updateUser);
router.delete('/:id', checkPermission('users.manage'), userController.deleteUser);

module.exports = router;