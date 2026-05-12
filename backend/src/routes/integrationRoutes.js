const express = require("express");
const router  = express.Router();
const { getIntegrations, updateIntegration } = require("../controllers/integrationController");
const { authenticateToken } = require("../middleware/auth");

// ✅ use authenticateToken — not protect (which was never imported)
router.get("/",        authenticateToken, getIntegrations);
router.put("/toggle",  authenticateToken, updateIntegration); // PUT not POST, matches frontend apiPut

module.exports = router;