// src/routes/archiveRoutes.js
const express = require("express");
const router = express.Router();
const archiveController = require("../controllers/archiveController");
const { authenticateToken } = require("../middleware/auth"); 

// Base path is /api/leads/archive
router.get("/", authenticateToken, archiveController.getArchive);
router.post("/restore", authenticateToken, archiveController.restoreLead);
router.post("/bulk-delete", authenticateToken, archiveController.bulkDelete);

module.exports = router;