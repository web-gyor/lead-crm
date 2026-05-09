const { pool } = require('../config/db');

/**
 * Fetches a list of counselors for populating dropdown menus.
 */
exports.getStaffDropdown = async (req, res) => {
  try {
    // Only fetch staff who are Counselors
    const [rows] = await pool.query(
      "SELECT id, name FROM users WHERE role = 'Counselor' ORDER BY name ASC"
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("Dropdown Error:", err.message);
    return res.status(500).json({ error: "Failed to fetch staff list" });
  }
};

exports.getPerformanceComparison = async (req, res) => {
  try {
    const { from, to, staffId } = req.query;
    const queryParams = [];

    // Base query: JOIN logic moved to ON clause for date filtering
    let sql = `
      SELECT 
        u.id, 
        u.name, 
        u.role, 
        COUNT(l.id) as total_leads,
        SUM(CASE WHEN l.lead_status IN ('Won', 'Converted', 'Admission') THEN 1 ELSE 0 END) as conversions,
        0 as prev_total_leads, 
        0 as prev_conversions
      FROM users u
      LEFT JOIN leads l ON u.id = l.assigned_user_id
    `;

    // Date range must be in the JOIN condition to keep 0-lead staff visible
    if (from && to) {
      sql += ` AND l.created_at BETWEEN ? AND ? `;
      queryParams.push(`${from} 00:00:00`, `${to} 23:59:59`);
    }

    // Role and specific staff filter stay in WHERE
    const whereClauses = ["u.role = 'Counselor'"];
    if (staffId && staffId !== 'all') {
      whereClauses.push("u.id = ?");
      queryParams.push(staffId);
    }

    sql += ` WHERE ` + whereClauses.join(" AND ") + ` GROUP BY u.id, u.name, u.role ORDER BY total_leads DESC`;

    const [rows] = await pool.query(sql, queryParams);
    return res.status(200).json(rows || []);
  } catch (err) {
    console.error("Staff Performance Error:", err.message);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
};