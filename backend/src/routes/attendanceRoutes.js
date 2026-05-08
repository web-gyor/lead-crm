const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// ─── ADD THIS LINE ──────────────────────────────────────────
const { authenticateToken } = require('../middleware/auth'); 
// ────────────────────────────────────────────────────────────

router.post('/punch-in', authenticateToken, attendanceController.punchIn);
router.post('/punch-out', authenticateToken, attendanceController.punchOut);
router.get('/today', authenticateToken, attendanceController.getTodayStatus);
router.get('/all', authenticateToken, attendanceController.getAllLogs);

module.exports = router;