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
// backend/src/controllers/userController.js (or similar)
exports.getCounselors = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, name FROM users WHERE role IN ('Counselor', 'Manager', 'Admin') ORDER BY name ASC"
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
router.get('/staff-list', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, name FROM users WHERE role IN ('Counselor', 'Manager', 'Admin') ORDER BY name ASC"
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;