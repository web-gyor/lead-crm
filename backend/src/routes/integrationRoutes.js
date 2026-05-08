const express = require("express");
const router = express.Router();
const { getIntegrations, updateIntegration } = require("../controllers/integrationController");
const { protect } = require("../middleware/authMiddleware"); // Your auth middleware

router.get("/", protect, getIntegrations);
router.post("/update", protect, updateIntegration);

module.exports = router;