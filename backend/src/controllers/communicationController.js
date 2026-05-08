const db = require('../config/db');

/**
 * CREATE COMMUNICATION LOG
 */
const createLog = async (req, res) => {
  const { lead_id, type, summary } = req.body;

  const userId = req.user ? req.user.id : 1;

  try {
    const sql = `
      INSERT INTO communication_logs 
      (lead_id, user_id, type, summary) 
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await db.execute(sql, [
      lead_id,
      userId,
      type || 'Call',
      summary
    ]);

    return res.status(201).json({
      success: true,
      logId: result.insertId
    });

  } catch (err) {
    console.error("createLog Error:", err.message);
    return res.status(500).json({
      error: "Database Save Failed: " + err.message
    });
  }
};

/**
 * GET LOGS BY LEAD (FULL HISTORY)
 */
const getLogsByLead = async (req, res) => {
  try {
    const sql = `
      SELECT 
        cl.*,
        u.name AS user_name
      FROM communication_logs cl
      LEFT JOIN users u ON cl.user_id = u.id
      WHERE cl.lead_id = ?
      ORDER BY cl.created_at DESC
    `;

    const [rows] = await db.execute(sql, [req.params.leadId]);

    return res.status(200).json({
      success: true,
      data: rows
    });

  } catch (err) {
    console.error("getLogsByLead Error:", err.message);
    return res.status(500).json({
      error: "Fetch Failed"
    });
  }
};

/**
 * GET GENERAL COMMUNICATION FEED (PIPELINE STYLE)
 * (REPLACES OLD counselor_remarks SYSTEM)
 */
const getCommLogs = async (req, res) => {
  try {
    const role = req.user?.role?.toLowerCase() || '';
    const userId = req.user?.id;

    let query = `
      SELECT 
        cl.id,
        l.full_name,
        cl.summary AS message,
        cl.created_at AS timestamp,
        u.name AS staff_name,
        cl.type
      FROM communication_logs cl
      JOIN leads l ON cl.lead_id = l.id
      JOIN users u ON cl.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    // non-admin restriction
    if (role !== 'admin' && userId) {
      query += " AND l.assigned_user_id = ?";
      params.push(userId);
    }

    query += " ORDER BY cl.created_at DESC LIMIT 50";

    const [rows] = await db.execute(query, params);

    return res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error("getCommLogs Error:", error.message);
    return res.status(500).json({
      error: "Failed to load communication logs"
    });
  }
};

module.exports = {
  createLog,
  getLogsByLead,
  getCommLogs
};