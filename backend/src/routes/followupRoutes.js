const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const followupController = require('../controllers/followupController');

const safe = (fn, name) => {
  if (typeof fn === 'function') return fn;
  return (req, res) => res.status(500).json({ error: `${name} not found in controller` });
};

// This handles GET /api/followups
router.get('/', authenticateToken, safe(followupController.getTodayTasks, 'getTodayTasks'));

module.exports = router;