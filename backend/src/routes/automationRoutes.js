const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const automationController = require("../controllers/automationController");

// Get all active rules
router.get("/", authenticateToken, automationController.getRules);

// Create a new rule
router.post("/", authenticateToken, automationController.createRule);

// Update a rule (Toggle active/inactive or edit)
router.put("/:id", authenticateToken, automationController.updateRule);

// Delete a rule
router.delete("/:id", authenticateToken, automationController.deleteRule);

module.exports = router;