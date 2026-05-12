const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken } = require('../middleware/auth'); 

const safe = (fn, name) => {
    if (typeof fn === 'function') return fn;
    console.error(`Missing Controller: ${name}`);
    return (req, res) => res.status(500).json({ error: `${name} not found` });
};

router.post('/punch-in', authenticateToken, safe(attendanceController.punchIn, 'punchIn'));
router.post('/punch-out', authenticateToken, safe(attendanceController.punchOut, 'punchOut'));
router.get('/today', authenticateToken, safe(attendanceController.getTodayStatus, 'getTodayStatus'));

// Points both the main and /all paths to the logic
router.get('/all', authenticateToken, safe(attendanceController.getAllLogs, 'getAllLogs'));
router.get('/', authenticateToken, safe(attendanceController.getAllLogs, 'getAllLogs'));

module.exports = router;