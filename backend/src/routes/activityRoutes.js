const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activityController");
const { authenticateToken } = require("../middleware/auth");

// Fetch global audit logs for administrative review
router.get("/global", authenticateToken, activityController.getGlobalLogs);

// Export all activity logs to a CSV file
router.get("/export", authenticateToken, activityController.exportLogsCSV);

// Manually trigger the archiving of logs older than 12 months
router.post("/archive", authenticateToken, activityController.archiveOldLogs);

// 🎯 FIXED: Map this explicitly to point to :id to align with your controller parameter extractor
router.get("/lead/:id", authenticateToken, activityController.getActivityByLead);

module.exports = router;