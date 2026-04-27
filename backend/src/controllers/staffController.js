const { pool } = require('../config/db');

/**
 * Fetches a list of counselors for populating dropdown menus.
 */
exports.getStaffDropdown = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM users WHERE role = 'Counselor'");
    return res.status(200).json(rows);
  } catch (err) {
    console.error("StaffController.getStaffDropdown Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Analytics endpoint to compare counselor performance metrics.
 * Requires date range and supports optional individual staff filtering.
 */
exports.getPerformanceComparison = async (req, res) => {
  try {
    const { from, to, staffId } = req.query;

    // Validation: Date range is required for analytics
    if (!from || !to) {
      return res.status(400).json({ error: "Date range (from and to) is required" });
    }

    let sql = `
      SELECT 
        u.id, 
        u.name, 
        COUNT(l.id) as total_leads,
        SUM(CASE WHEN l.lead_status = 'Interested' THEN 1 ELSE 0 END) as interested_count,
        SUM(CASE WHEN l.lead_status IN ('Won', 'Converted', 'Admission') THEN 1 ELSE 0 END) as converted_count
      FROM users u
      LEFT JOIN leads l ON l.assigned_user_id = u.id
      WHERE u.role = 'Counselor'
    `;

    const params = [];

    // Apply Date Range Filter
    const fromDate = new Date(from).toISOString().split("T")[0] + " 00:00:00";
    const toDate   = new Date(to).toISOString().split("T")[0]   + " 23:59:59";
    sql += ` AND l.created_at BETWEEN ? AND ? `;
    params.push(fromDate, toDate);

    // Apply Staff Filter
    if (staffId && staffId !== 'all') {
      const staffIdNum = parseInt(staffId, 10);
      if (!isNaN(staffIdNum) && staffIdNum > 0) {
        sql += ` AND u.id = ? `;
        params.push(staffIdNum);
      }
    }

    sql += ` GROUP BY u.id, u.name ORDER BY total_leads DESC `;

    const [rows] = await pool.query(sql, params);
    return res.status(200).json(rows);

  } catch (err) {
    console.error("StaffController.getPerformanceComparison Error:", err.message);
    return res.status(500).json({ error: "Data fetch failed" });
  }
};