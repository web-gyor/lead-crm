const pool = require('../config/db');
const express = require('express');
const router = express.Router();
const telephonyController = require('../controllers/telephonyController');
const { authenticateToken } = require('../middleware/auth'); // Ensure this path is correct

// ✅ The middleware must be the second argument
router.get('/logs', authenticateToken, telephonyController.getCallLogs);
router.put('/feedback', authenticateToken, telephonyController.saveFeedback);
// Clear logs older than 30 days
router.post('/logs', authenticateToken, telephonyController.createCallLog);
router.put('/clear-old-logs', authenticateToken, async (req, res) => {

  try {

    if ((req.user?.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await pool.query(`
  DELETE FROM call_logs
  WHERE YEAR(created_at) < YEAR(CURDATE())
     OR (
          YEAR(created_at) = YEAR(CURDATE())
          AND MONTH(created_at) < MONTH(CURDATE())
        )
`);

    return res.json({
      success: true
    });

  } catch (err) {

    console.error("CLEAR_LOG_ERROR:", err.message);

    return res.status(500).json({
      success: false,
      error: err.message
    });

  }
});

module.exports = router;