const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { authenticateToken } = require("../middleware/auth");

// Base path: /api/analytics

// Updated to match the function name in your controller
router.get("/business-overview", authenticateToken, analyticsController.getBusinessOverview);

module.exports = router;