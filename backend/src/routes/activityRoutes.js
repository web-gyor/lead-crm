const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activityController");
const { authenticateToken } = require("../middleware/auth");

/**
 * Routes for system auditing, activity logging, and log management.
 * All routes require a valid authentication token.
 */

// Fetch global audit logs for administrative review
router.get("/global", authenticateToken, activityController.getGlobalLogs);

// Export all activity logs to a CSV file
router.get("/export", authenticateToken, activityController.exportLogsCSV);

// Manually trigger the archiving of logs older than 12 months
router.post("/archive", authenticateToken, activityController.archiveOldLogs);

// Fetch the specific activity history for a single lead
router.get("/lead/:leadId", authenticateToken, activityController.getLeadHistory);

module.exports = router;