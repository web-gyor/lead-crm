// controllers/pipelineController.js
const { pool } = require('../config/db');

const getPipeline = async (req, res) => {
  try {
    const role = req.user?.role?.toLowerCase() || '';
    const userId = req.user?.id;
    const { range } = req.query; // Get 'today', 'week', 'month' from query

    const isAdmin = role === 'admin' || role === 'superadmin' || role === 'manager';

    let whereClause = `LOWER(TRIM(l.lead_status)) IN ('new','contacted','interested','follow-up','converted','lost','not interested')`;
    const params = [];

    // --- TIME RANGE FILTERING ---
    if (range === 'today') {
      whereClause += " AND DATE(l.created_at) = CURDATE()";
    } else if (range === 'week') {
      whereClause += " AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
    } else if (range === 'month') {
      whereClause += " AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    }

    if (!isAdmin && userId) {
      whereClause += " AND l.assigned_user_id = ?";
      params.push(userId);
    }

    const [rows] = await pool.query(`
      SELECT 
        l.id, 
        l.full_name, 
        TRIM(l.lead_status) AS lead_status, 
        l.phone, 
        l.interested_course, 
        l.assigned_user_id, 
        l.lead_source_id, 
        l.updated_at, 
        l.created_at,
        u.name AS assigned_user_name,
        ls.name AS source_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_user_id = u.id
      LEFT JOIN lead_sources ls ON l.lead_source_id = ls.id
      WHERE ${whereClause}
      ORDER BY l.updated_at DESC
      LIMIT 600
    `, params);

    return res.json({ success: true, leads: rows || [] });
  } catch (error) {
    console.error("Pipeline Error:", error.message);
    return res.status(500).json({ success: false, error: "Failed to fetch pipeline data" });
  }
};

module.exports = { getPipeline };