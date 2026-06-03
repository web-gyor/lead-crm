const { pool } = require('../config/db');

const normalize = (s) => (s || "").toLowerCase().replace(/[_-]/g, " ").trim();

// Helper to generate absolute IST date text values for matching rules
const getISTDateString = () => {
  const now    = new Date();
  const utcMs  = now.getTime() + now.getTimezoneOffset() * 60_000;
  const istMs  = utcMs + 5.5 * 60 * 60_000;
  const ist    = new Date(istMs);
  const y      = ist.getFullYear();
  const m      = String(ist.getMonth() + 1).padStart(2, '0');
  const d      = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ── MODULE EXTENSION: 🎯 CORE ROUTE HANDLER FOR NOTIFICATION COUNTERS ──
const getDashboardNotifications = async (req, res) => {
  let connection;
  try {
    if (!req.user) {
      return res.status(403).json({ success: false, error: "Unauthorised" });
    }

    const userId     = req.user.id;
    const role       = String(req.user.role || '').toLowerCase().trim();
    const todayLocal = req.query.localDate || getISTDateString();

    // 🚀 EXPLICIT ROLE DETECTION: Guarantees unified global counts for management tiers
    const isAdminOrManager =
      ['super admin', 'superadmin', 'admin', 'branch admin', 'manager'].includes(role) ||
      Boolean(req.user?.is_super_admin) ||
      Boolean(req.user?.is_branch_admin) ||
      Boolean(req.user?.is_manager);

    let scopeWhere = '';
    const scopeParams = [];
    if (!isAdminOrManager) {
      // Personal isolation barriers for Counselors and Telecallers
      scopeWhere = 'AND l.assigned_user_id = ?';
      scopeParams.push(userId);
    }

    connection = await pool.getConnection();

    // ── 1. FOLLOW-UP PIPELINE CALCULATIONS (Pure DATE format with no shifting) ──
    const [countsResult] = await connection.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN l.next_follow_up_date < ? THEN l.id END) AS overdue,
        COUNT(DISTINCT CASE WHEN l.next_follow_up_date = ? THEN l.id END) AS today,
        COUNT(DISTINCT CASE WHEN l.next_follow_up_date > ? THEN l.id END) AS upcoming
      FROM leads l
      WHERE l.next_follow_up_date IS NOT NULL
        AND l.deleted_at IS NULL
        AND l.is_archived = 0
        AND LOWER(l.lead_status) = 'follow-up'
        ${scopeWhere}
    `, [todayLocal, todayLocal, todayLocal, ...scopeParams]);

    const metrics = countsResult[0] || { overdue: 0, today: 0, upcoming: 0 };

    // ── 2. NEW INBOUND LEAD CALCULATION ──
    let newLeads = 0;
    if (isAdminOrManager) {
      const [[unassignedRow]] = await connection.query(`
        SELECT COUNT(DISTINCT id) AS count
        FROM leads
        WHERE assigned_user_id IS NULL
          AND assigned_to IS NULL
          AND deleted_at IS NULL
          AND is_archived = 0
      `);
      newLeads = Number(unassignedRow?.count || 0);
    } else {
      const [[myNewRow]] = await connection.query(`
        SELECT COUNT(DISTINCT id) AS count
        FROM leads
        WHERE assigned_user_id = ?
          AND deleted_at IS NULL
          AND is_archived = 0
          AND LOWER(lead_status) = 'new'
          AND DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) = ?
      `, [userId, todayLocal]);
      newLeads = Number(myNewRow?.count || 0);
    }

    return res.status(200).json({
      success: true,
      overdue: Number(metrics.overdue || 0),
      today: Number(metrics.today || 0),
      upcoming: Number(metrics.upcoming || 0),
      newLeads,
      total: Number(metrics.overdue || 0) + Number(metrics.today || 0) + newLeads,
    });

  } catch (err) {
    console.error('getDashboardNotifications error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch notification metrics' });
  } finally {
    if (connection) connection.release();
  }
};

// ── CORE MODULE: MAIN DASHBOARD CORE GRIDS AGGREGATOR ──
const getDashboardStats = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({ success: false, error: "Unauthorised" });
    }

    const { id: userId, is_super_admin, role } = req.user;
    const userRoleLower = String(role || "").trim().toLowerCase();

    const hasAdministrativeVisibility = 
      Boolean(is_super_admin) || 
      ['super admin', 'superadmin', 'admin', 'branch admin', 'manager'].includes(userRoleLower);

    let whereClause = "l.deleted_at IS NULL";
    let params = [];

    if (!hasAdministrativeVisibility) {
      whereClause += " AND (l.assigned_user_id = ? OR l.assigned_to = ?)";
      params.push(userId, userId);
    }

    // ── 1. STATUS COUNTS ──────────────────────────────────────
    const [statusRows] = await pool.query(`
      SELECT LOWER(TRIM(l.lead_status)) AS status, COUNT(*) AS cnt
      FROM leads l
      WHERE ${whereClause}
      GROUP BY LOWER(TRIM(l.lead_status))
    `, params);

    const sm = {};
    statusRows.forEach(r => {
      const key = normalize(r.status);
      sm[key] = (sm[key] || 0) + (Number(r.cnt) || 0);
    });

    const statusStats = {
      new: sm["new"] || 0,
      contacted: (sm["contacted"] || 0) + (sm["called"] || 0),
      interested: sm["interested"] || 0,
      followup: (sm["follow up"] || 0) + (sm["followup"] || 0) + (sm["follow-up"] || 0),
      converted: sm["converted"] || 0,
      lost: sm["lost"] || 0,
      notInterested: sm["not interested"] || 0,
    };

    const totalLeads = statusStats.new + statusStats.contacted + statusStats.interested +
                       statusStats.followup + statusStats.converted + statusStats.lost +
                       statusStats.notInterested;

    // ── 2. HIGH INTENT LEADS ──────────────────────────────────
    const [intentRows] = await pool.query(`
      SELECT COUNT(*) AS highIntentCount
      FROM leads l
      WHERE ${whereClause}
        AND LOWER(TRIM(l.lead_quality)) IN ('high','hot','very high','warm')
        AND LOWER(TRIM(l.lead_status)) NOT IN ('converted','lost','not interested')
    `, params);

    const highIntentLeads = Number(intentRows[0]?.highIntentCount) || 0;

    // ── 3. PENDING FOLLOW-UPS ─────────────────────────────────
    const [followupRows] = await pool.query(`
      SELECT COUNT(*) AS pendingCount
      FROM leads l
      WHERE ${whereClause}
        AND l.next_follow_up_date IS NOT NULL
        AND LOWER(TRIM(l.lead_status)) NOT IN ('converted','lost','not interested')
    `, params);

    const pendingFollowUps = Number(followupRows[0]?.pendingCount) || 0;

    // ── 4. NEW TODAY ──────────────────────────────────────────
    const [todayRows] = await pool.query(`
      SELECT COUNT(*) AS newToday
      FROM leads l
      WHERE ${whereClause}
        AND DATE(CONVERT_TZ(l.created_at, '+00:00', '+05:30')) = CURDATE()
    `, params);

    const newToday = Number(todayRows[0]?.newToday) || 0;

    // ── 5. RECENT LEADS ───────────────────────────────────────
    const [recentLeads] = await pool.query(`
      SELECT l.full_name, l.interested_course, l.lead_status, l.created_at, ls.name AS lead_source_name
      FROM leads l
      LEFT JOIN lead_sources ls ON l.lead_source_id = ls.id
      WHERE ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT 10
    `, params);

    // ── 6. SOURCE PERFORMANCE MATRIX ──────────────────────────
    const [sourceRows] = await pool.query(`
      SELECT 
        ls.id,
        COALESCE(ls.name, 'Other') AS source_title, 
        COUNT(l.id) AS total_value,
        SUM(CASE WHEN LOWER(TRIM(l.lead_status)) = 'converted' THEN 1 ELSE 0 END) AS total_converted
      FROM leads l
      LEFT JOIN lead_sources ls ON l.lead_source_id = ls.id
      WHERE ${whereClause}
      GROUP BY ls.id, ls.name
      ORDER BY total_value DESC
    `, params);

    const sourceStats = sourceRows.map((row) => ({
      id: row.id || 999,
      name: row.source_title.toUpperCase(),
      value: Number(row.total_value || 0),
      converted: Number(row.total_converted || 0),
      percentage: totalLeads > 0 ? Math.round((row.total_value / totalLeads) * 100) : 0
    }));

    // ── 7. INGESTION YIELD CYCLES ─────────────────────────────
    const period = req.query.period || "daily";
    let activeData = [];

    if (period === "weekly") {
      const [weeklyRows] = await pool.query(`
        SELECT 
          CONCAT('Wk ', WEEK(l.created_at)) AS label, 
          COUNT(l.id) AS total, 
          SUM(CASE WHEN LOWER(TRIM(l.lead_status)) = 'converted' THEN 1 ELSE 0 END) AS converted
        FROM leads l
        WHERE ${whereClause} 
          AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK)
        GROUP BY CONCAT('Wk ', WEEK(l.created_at))
        ORDER BY MIN(l.created_at) ASC
        LIMIT 6
      `, params);
      activeData = weeklyRows;
    } else if (period === "monthly") {
      const [monthlyRows] = await pool.query(`
        SELECT 
          DATE_FORMAT(l.created_at, '%b %y') AS label, 
          COUNT(l.id) AS total, 
          SUM(CASE WHEN LOWER(TRIM(l.lead_status)) = 'converted' THEN 1 ELSE 0 END) AS converted
        FROM leads l
        WHERE ${whereClause} 
          AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL 18 MONTH)
        GROUP BY DATE_FORMAT(l.created_at, '%b %y'), DATE_FORMAT(l.created_at, '%Y-%m')
        ORDER BY DATE_FORMAT(l.created_at, '%Y-%m') ASC
        LIMIT 6
      `, params);
      activeData = monthlyRows;
    } else {
      const [dailyRows] = await pool.query(`
        SELECT 
          DATE_FORMAT(l.created_at, '%a') AS label, 
          COUNT(l.id) AS total, 
          SUM(CASE WHEN LOWER(TRIM(l.lead_status)) = 'converted' THEN 1 ELSE 0 END) AS converted
        FROM leads l
        WHERE ${whereClause} 
          AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE_FORMAT(l.created_at, '%a'), DATE(l.created_at)
        ORDER BY DATE(l.created_at) ASC
        LIMIT 7
      `, params);
      activeData = dailyRows;
    }

    const highestTotal = activeData.length > 0 ? Math.max(...activeData.map(d => Number(d.total || 0))) : 0;
    const maxBar = highestTotal > 0 ? highestTotal : 10;

    const conversionRate = totalLeads > 0 ? Math.round((statusStats.converted / totalLeads) * 100) : 0;

    return res.status(200).json({
      success: true,
      totalLeads,
      newToday,
      conversionRate,
      highIntentLeads,
      pendingFollowUps,
      statusStats,
      recentLeads: recentLeads || [],
      sourceStats: sourceStats || [],
      activeData: activeData || [],
      maxBar,
    });
  } catch (error) {
    console.error("[getDashboardStats error]", error.message);
    return res.status(500).json({ success: false, error: "Dashboard data aggregation failed" });
  }
};

module.exports = { getDashboardStats, getDashboardNotifications };