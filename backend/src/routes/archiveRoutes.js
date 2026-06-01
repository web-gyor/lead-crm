// src/routes/archiveRoutes.js
const express = require("express");
const router = express.Router();
const archiveController = require("../controllers/archiveController");
const { authenticateToken } = require("../middleware/auth"); 

// 🛡️ RUNTIME WRAPPER PROTECTOR: Stops Express from throwing TypeError crashes at startup if keys are shifted
const safe = (controllerObject, methodKey) => {
  return (req, res, next) => {
    if (controllerObject && typeof controllerObject[methodKey] === 'function') {
      return controllerObject[methodKey](req, res, next);
    }
    console.error(`🔴 ARCHIVE ROUTE BREAKDOWN: Target method "${methodKey}" is undefined or missing inside archiveController!`);
    return res.status(500).json({ 
      success: false, 
      error: `Internal Configuration Error: Method "${methodKey}" not found.` 
    });
  };
};

// 🚀 Base path is mounted at /api/leads/archive
router.get("/", authenticateToken, safe(archiveController, 'getArchive'));
router.post("/restore", authenticateToken, safe(archiveController, 'restoreLead'));
router.get("/restore", authenticateToken, safe(archiveController, 'restoreLead')); // Backup routing track
router.post("/bulk-delete", authenticateToken, safe(archiveController, 'bulkDeleteArchive'));

module.exports = router;