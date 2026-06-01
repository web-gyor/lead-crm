// controllers/pipelineController.js
const { pool } = require('../config/db');

const getPipeline = async (req, res) => {
  try {
    const { range } = req.query; // will be 'today', 'week', 'month', 'year', or 'all'
    
   let whereClause = `LOWER(TRIM(l.lead_status)) IN ('new', 'contacted', 'called', 'interested', 'follow-up', 'converted', 'lost', 'not interested')`;
    
    // --- TIME RANGE FILTERING ---
   if (range === 'today') {
      whereClause += " AND DATE(l.created_at) = CURDATE()";
    } else if (range === 'week') {
      // Rolling 7 days or start of week
      whereClause += " AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
    } else if (range === 'month') {
      // 🚀 FIXED: Enforces strict current calendar month parsing (June 1st onwards)
      whereClause += " AND YEAR(l.created_at) = YEAR(CURDATE()) AND MONTH(l.created_at) = MONTH(CURDATE())";
    } else if (range === 'year') {
      whereClause += " AND YEAR(l.created_at) = YEAR(CURDATE())";
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