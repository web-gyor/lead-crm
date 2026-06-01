const { pool } = require("../config/db");

const isAdmin = (user) => user?.role?.toLowerCase() === 'admin';

// ── CREATE LEAD INTERACTION LOG ───────────────────────────────────────────────
// ── CREATE LEAD INTERACTION LOG (Hardened Constrained Version) ──────────────────
const createLog = async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: "Unauthorized access detected" });
  }

  const { lead_id, type, summary } = req.body;
  const userId = req.user.id;

  if (!lead_id || !summary?.trim()) {
    return res.status(400).json({ error: "lead_id and summary text details are required" });
  }

  // 🎯 STRICT RULE 1: Sanitize and enforce exact ENUM string matches ('Call','WhatsApp','Email','Note')
  let logType = 'Note'; // Safe default matching your enum columns rule mapping
  const normalizedType = String(type || '').trim().toLowerCase();

  if (normalizedType === 'call') logType = 'Call';
  else if (normalizedType === 'whatsapp' || normalizedType === 'wa') logType = 'WhatsApp';
  else if (normalizedType === 'email') logType = 'Email';
  else if (normalizedType === 'note') logType = 'Note';
  else logType = 'Note'; // Forces any SMS or alternative triggers down as a Note block

  // 🎯 STRICT RULE 2: Enforce exact case matches matching your allowed outcome values
  // enum('Connected','Not Reachable','Switched Off','Sent','Replied','No Response','Interested','Busy')
  let outcome = 'Connected';
  if (logType === 'Email' || logType === 'WhatsApp') {
    outcome = 'Sent';
  } else if (logType === 'Note') {
    outcome = 'Connected'; // Default matching valid values index arrays
  }

  try {
    // Executes prepared transaction with sanitized parameter sets cleanly
    const [result] = await pool.execute(
      `INSERT INTO lead_interactions (lead_id, interaction_type, outcome, remarks, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        Number(lead_id), 
        logType, 
        outcome, 
        summary.trim(), 
        Number(userId)
      ]
    );

    return res.status(201).json({ 
      success: true, 
      logId: result.insertId,
      message: "Interaction timeline record saved cleanly" 
    });

  } catch (err) {
    console.error("❌ Critical lead_interactions SQL execution crash:", err.message);
    return res.status(500).json({ error: "Database rejected operation constraint parameters: " + err.message });
  }
};
// ── GET LOGS BY LEAD (Corrected Fetch Logic) ──────────────────────────────────
const getLogsByLead = async (req, res) => {
  // 1. Auth Guard Checklist
  if (!req.user?.id) return res.status(401).json({ error: "Unauthorized access" });

  const leadId = parseInt(req.params.leadId, 10);
  if (!leadId) return res.status(400).json({ error: "Invalid lead identification key parameter" });

  try {
    // 🎯 FIXED SQL: Removes the restrictive cross-table block. If you can view the lead, you can view its timeline.
    const sql = `
      SELECT 
        li.id,
        li.interaction_type AS type,
        li.remarks AS summary,
        li.created_at,
        COALESCE(u.name, 'Staff') AS user_name
      FROM lead_interactions li
      LEFT JOIN users u ON li.created_by = u.id
      WHERE li.lead_id = ?
      ORDER BY li.created_at DESC
    `;

    const [rows] = await pool.execute(sql, [leadId]);
    
    console.log(`📡 Timeline Sync: Loaded ${rows.length} logs for Lead #${leadId}`);
    return res.json({ success: true, data: rows });

  } catch (err) {
    console.error("❌ getLogsByLead database fetch failure trace:", err.message);
    return res.status(500).json({ error: "Timeline fetch sequence failed: " + err.message });
  }
};

// ── GET GENERAL COMMUNICATION FEED ───────────────────────────────────────────
// 🎯 TARGET FILE: src/controllers/communicationController.js -> getCommLogs function
const getCommLogs = async (req, res) => {
  try {
    const { date, search, staffId } = req.query;
    const userRoleLower = String(req.user?.role || "").trim().toLowerCase();
    
    const hasAdministrativeVisibility = 
      Boolean(req.user?.is_super_admin) || 
      userRoleLower === "super admin" || 
      userRoleLower === "admin" || 
      userRoleLower === "manager";

    let whereClause = "1=1";
    let params = [];

    if (!hasAdministrativeVisibility) {
      whereClause += " AND cl.created_by = ?";
      params.push(req.user.id);
    }

    if (date) {
      whereClause += " AND DATE(cl.created_at) = DATE(?)";
      params.push(date);
    }

    if (staffId && staffId !== "all") {
      whereClause += " AND cl.created_by = ?";
      params.push(staffId);
    }

    if (search?.trim()) {
      const wild = `%${search.trim()}%`;
      whereClause += " AND (cl.remarks LIKE ? OR l.full_name LIKE ?)";
      params.push(wild, wild);
    }

    const [rows] = await pool.query(`
      SELECT 
        cl.id, cl.lead_id, cl.interaction_type, cl.outcome, cl.remarks, cl.created_at,
        u.name AS staff_name, l.full_name AS lead_name
      FROM lead_interactions cl
      LEFT JOIN users u ON cl.created_by = u.id
      LEFT JOIN leads l ON cl.lead_id = l.id
      WHERE ${whereClause}
      ORDER BY cl.created_at DESC
      LIMIT 100
    `, params);

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("getCommLogs error:", error.message);
    return res.status(500).json({ success: false, error: "Failed to pull communication feed logs" });
  }
};
module.exports = { createLog, getLogsByLead, getCommLogs };