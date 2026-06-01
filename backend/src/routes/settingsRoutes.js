const express = require('express');
const router = express.Router();
const { runDatabaseBackup } = require('../utils/backupScheduler');
const { authenticateToken } = require('../middleware/auth'); 

// 🎯 CRITICAL IMPORTS: Point this exactly to your local project MySQL pool connection configuration
const db = require('../config/db'); 

/* ──────────────────────────────────────────────────────────────────────────
   1. TRIGGER MANUAL DATABASE BACKUP SNAPSHOT ENGINE
   ────────────────────────────────────────────────────────────────────────── */
router.put("/backup/trigger", authenticateToken, async (req, res) => {
  const userRole = String(req.user?.role || "").toLowerCase().replace(/\s+|-/g, "");
  
  if (userRole !== "admin" && userRole !== "superadmin") {
    return res.status(403).json({ success: false, error: "Privileged administrator action required" });
  }

  try {
    console.log("[ROUTER DEBUG]: Active admin initiating backup sequence...");
    
    // Await the local fallback compress process engine promise
    const fileResult = await runDatabaseBackup();
    
    console.log("[ROUTER DEBUG]: Backup snapshot written successfully:", fileResult);

    return res.status(200).json({ 
      success: true, 
      message: "Database backup snapshot routine executed cleanly",
      details: fileResult 
    });
  } catch (err) {
    console.error("[ROUTER CRITICAL ERROR]:", err.message);
    return res.status(500).json({ 
      success: false, 
      error: `Backup Engine Failed: ${err.message}` 
    });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   2. UPDATE SYSTEM LOG RECORDING CONFIGURATIONS
   ────────────────────────────────────────────────────────────────────────── */
router.put('/', authenticateToken, async (req, res) => {
  try {
    console.log("[SETTINGS UPDATE DEBUG]: Incoming request body payload:", req.body);

    let { is_call_recording_enabled } = req.body;
    
    const updateFields = [];
    const queryParams = [];

    // 🎯 PAYLOAD NORMALIZATION: Convert boolean states safely to 1 or 0 for MySQL tinyint
    if (is_call_recording_enabled !== undefined) {
      const normalizedValue = (is_call_recording_enabled === true || Number(is_call_recording_enabled) === 1) ? 1 : 0;
      
      updateFields.push("is_call_recording_enabled = ?");
      queryParams.push(normalizedValue);
      
      console.log(`[SETTINGS AUTOMATION]: Normalized recording state flag value parsed as: ${normalizedValue}`);
    }

    // Handle telephony carrier provider drops
    if (req.body.telephony_provider !== undefined) {
      updateFields.push("telephony_provider = ?");
      queryParams.push(req.body.telephony_provider);
    }

    // Process general company text inputs if passed down in the request cycle
    if (req.body.company_name !== undefined) {
      updateFields.push("company_name = ?");
      queryParams.push(req.body.company_name);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: "No verifiable data parameters provided for update" });
    }

    // Append standard row identifier search parameter (Primary settings row target code is 1)
    const settingsRowId = 1; 
    queryParams.push(settingsRowId);

    const queryStr = `UPDATE settings SET ${updateFields.join(', ')} WHERE id = ?`;
    
    // Execute data modification pool call
    const [result] = await db.execute(queryStr, queryParams);

    console.log("[SETTINGS DB SUCCESS]: Row modified status details:", result);

    // Return root success structure matching both validation schemes
    return res.status(200).json({ 
      success: true, 
      message: "System configuration rules adjusted successfully",
      data: { success: true } 
    });

  } catch (err) {
    console.error("[SETTINGS CRITICAL FAULT ROUTE]:", err.message);
    return res.status(500).json({ success: false, error: `Database entry modification reject: ${err.message}` });
  }
});

module.exports = router;