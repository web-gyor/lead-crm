const { pool } = require("../config/db");

// ── Matches your AuthContext role exactly ──────────────────────────────────────
const isAdmin = (user) => user?.role?.toLowerCase() === 'admin';

// ── CREATE COMMUNICATION LOG ──────────────────────────────────────────────────

const createLog = async (req, res) => {
  // Fix #1: reject if auth didn't run — never fall back to user ID 1
  if (!req.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { lead_id, type, summary } = req.body;
  const userId = req.user.id;

  // Fix #2: validate required fields up front
  if (!lead_id || !summary?.trim()) {
    return res.status(400).json({ error: "lead_id and summary are required" });
  }

  const VALID_TYPES = ['Call', 'Email', 'WhatsApp', 'Meeting', 'Note'];
  const logType = VALID_TYPES.includes(type) ? type : 'Call';

  try {
    const [result] = await db.execute(
      `INSERT INTO communication_logs (lead_id, user_id, type, summary)
       VALUES (?, ?, ?, ?)`,
      [lead_id, userId, logType, summary.trim()]
    );

    return res.status(201).json({ success: true, logId: result.insertId });

  } catch (err) {
    console.error("createLog error:", err); // full error in server logs only
    return res.status(500).json({ error: "Failed to save log" }); // Fix #3: no leak
  }
};

// ── GET LOGS BY LEAD ──────────────────────────────────────────────────────────

const getLogsByLead = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });

  // Fix #4: validate leadId is a number
  const leadId = parseInt(req.params.leadId);
  if (!leadId) return res.status(400).json({ error: "Invalid lead ID" });

  try {
    // Fix #5: non-admins can only fetch logs for leads assigned to them
    let sql = `
      SELECT cl.*, u.name AS user_name
      FROM communication_logs cl
      LEFT JOIN users u ON cl.user_id = u.id
      WHERE cl.lead_id = ?
    `;
    const params = [leadId];

    if (!isAdmin(req.user)) {
      sql += ` AND EXISTS (
        SELECT 1 FROM leads l
        WHERE l.id = cl.lead_id AND l.assigned_user_id = ?
      )`;
      params.push(req.user.id);
    }

    sql += " ORDER BY cl.created_at DESC";

    const [rows] = await db.execute(sql, params);
    return res.json({ success: true, data: rows });

  } catch (err) {
    console.error("getLogsByLead error:", err);
    return res.status(500).json({ error: "Failed to fetch logs" });
  }
};

// ── GET GENERAL COMMUNICATION FEED ───────────────────────────────────────────

const getCommLogs = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });

  // Fix #6: pagination instead of hard-coded LIMIT 50
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const offset = (page - 1) * limit;

  try {
    let where  = "WHERE 1=1";
    const params = [];

    // Fix #7: compare against 'admin' consistently — isAdmin() lowercases it
    if (!isAdmin(req.user)) {
      where += " AND l.assigned_user_id = ?";
      params.push(req.user.id);
    }

    const [rows] = await db.execute(
      `SELECT
         cl.id,
         l.full_name,
         cl.summary   AS message,
         cl.type,
         cl.created_at AS timestamp,
         u.name        AS staff_name
       FROM communication_logs cl
       JOIN leads l ON cl.lead_id = l.id
       JOIN users u ON cl.user_id = u.id
       ${where}
       ORDER BY cl.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({ success: true, data: rows, page, limit });

  } catch (err) {
    console.error("getCommLogs error:", err);
    return res.status(500).json({ error: "Failed to load communication logs" });
  }
};

module.exports = { createLog, getLogsByLead, getCommLogs };