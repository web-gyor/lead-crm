const { pool } = require('../config/db');

/**
 * Dropdown — active Counselors and Telecallers only.
 */
exports.getStaffDropdown = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, role 
       FROM users 
       WHERE LOWER(role) IN ('counselor', 'telecaller') 
         AND status = 'active'
       ORDER BY name ASC`
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error('getStaffDropdown error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch staff list' });
  }
};

/**
 * Performance comparison — Counselors and Telecallers only.
 * Excludes Super Admin, Admin, Manager at SQL level.
 */
exports.getPerformanceComparison = async (req, res) => {
  try {
    const { from, to, staffId } = req.query;
    const params = [];

    // ── Build date-conditional COUNT so users with 0 leads still appear ──────
    // Using conditional aggregation instead of WHERE on leads, so staff with
    // no leads in the period show as 0 rather than being dropped from results.
    let leadCountExpr   = `COUNT(l.id)`;
    let convCountExpr   = `SUM(CASE WHEN LOWER(l.lead_status) IN ('won','converted','admission') THEN 1 ELSE 0 END)`;

    if (from && to) {
      // Only count leads within the selected date range
      leadCountExpr  = `COUNT(CASE WHEN l.created_at BETWEEN ? AND ? THEN 1 END)`;
      convCountExpr  = `SUM(CASE WHEN l.created_at BETWEEN ? AND ?
                              AND LOWER(l.lead_status) IN ('won','converted','admission')
                              THEN 1 ELSE 0 END)`;
      // Each expression uses 2 params — push them in order
      params.push(`${from} 00:00:00`, `${to} 23:59:59`); // for leadCountExpr
      params.push(`${from} 00:00:00`, `${to} 23:59:59`); // for convCountExpr
    }

    // ── WHERE conditions ──────────────────────────────────────────────────────
    const where = [
      `u.status = 'active'`,
      `LOWER(u.role) IN ('counselor', 'telecaller')`, // explicit allowlist — safer than blocklist
    ];

    if (staffId && staffId !== 'all' && staffId !== 'undefined') {
      where.push(`u.id = ?`);
      params.push(Number(staffId));
    }

    const sql = `
      SELECT
        u.id,
        u.name,
        u.role,
        ${leadCountExpr}  AS total_leads,
        COALESCE(${convCountExpr}, 0) AS conversions,
        0 AS prev_total_leads,
        0 AS prev_conversions,
        NULL AS avg_response_hours,
        NULL AS followup_count
      FROM users u
      LEFT JOIN leads l ON u.id = l.assigned_to
      WHERE ${where.join(' AND ')}
      GROUP BY u.id, u.name, u.role
      ORDER BY total_leads DESC
    `;

    const [rows] = await pool.query(sql, params);
    return res.status(200).json(rows || []);

  } catch (err) {
    console.error('getPerformanceComparison error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch performance stats' });
  }
};