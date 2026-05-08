const { pool } = require('../config/db');

const normalize = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();

const getDashboardStats = async (req, res) => {
  try {
    const role = req.user?.role?.toLowerCase() || "";
    const userId = req.user?.id;

    const isAdmin = ["admin", "superadmin", "manager"].includes(role);
    const whereClause = isAdmin ? "1=1" : "l.assigned_user_id = ?";
    const params = isAdmin ? [] : [userId];

    // ─────────────────────────────────────────────
    // 1. STATUS COUNTS (Total Leads)
    // ─────────────────────────────────────────────
    const [statusRows] = await pool.query(`
      SELECT 
        LOWER(TRIM(REPLACE(REPLACE(l.lead_status,'-',' '),'_',' '))) AS status,
        COUNT(*) AS cnt
      FROM leads l
      WHERE ${whereClause}
      GROUP BY status
    `, params);

    const sm = {};
    let totalLeads = 0;

    statusRows.forEach(r => {
      const key = normalize(r.status);
      const cnt = Number(r.cnt) || 0;
      sm[key] = cnt;
      totalLeads += cnt;
    });

    const statusStats = {
      new: sm["new"] || 0,
      contacted: sm["contacted"] || 0,
      interested: sm["interested"] || 0,
      followup: sm["follow up"] || sm["followup"] || 0,
      converted: sm["converted"] || 0,
      lost: sm["lost"] || 0,
      notInterested: sm["not interested"] || 0,
    };

    // ─────────────────────────────────────────────
    // 2. HIGH INTENT LEADS (ADDED)
    // ─────────────────────────────────────────────
    const [intentRows] = await pool.query(`
      SELECT COUNT(*) AS highIntentCount
      FROM leads l
      WHERE ${whereClause}
      AND l.lead_quality IN ('High', 'Hot', 'Very High')
      AND l.lead_status NOT IN ('Converted', 'Lost', 'Not Interested')
    `, params);

    const highIntentLeads = Number(intentRows[0]?.highIntentCount) || 0;

    // ─────────────────────────────────────────────
    // 3. PENDING FOLLOW-UPS (ADDED)
    // ─────────────────────────────────────────────
    const [followupRows] = await pool.query(`
      SELECT COUNT(*) AS pendingCount
      FROM leads l
      WHERE ${whereClause}
      AND l.next_follow_up_date IS NOT NULL
      AND DATE(l.next_follow_up_date) <= CURDATE()
      AND l.lead_status NOT IN ('Converted', 'Lost', 'Not Interested')
    `, params);

    const pendingFollowUps = Number(followupRows[0]?.pendingCount) || 0;

    // ─────────────────────────────────────────────
    // 4. TODAY LEADS
    // ─────────────────────────────────────────────
    const [today] = await pool.query(`
      SELECT COUNT(*) AS newToday
      FROM leads l
      WHERE ${whereClause}
      AND DATE(l.created_at) = CURDATE()
    `, params);

    const newToday = Number(today[0]?.newToday) || 0;

    // ─────────────────────────────────────────────
    // 5. RECENT LEADS & SOURCE STATS
    // ─────────────────────────────────────────────
    const [recentLeads] = await pool.query(`
      SELECT l.full_name, l.interested_course, l.lead_status, l.created_at,
             ls.name AS lead_source_name
      FROM leads l
      LEFT JOIN lead_sources ls ON l.lead_source_id = ls.id
      WHERE ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT 10
    `, params);

    const [sourceStats] = await pool.query(`
      SELECT
        ls.id,
        COALESCE(ls.name, 'Other') AS name,
        COUNT(l.id) AS value
      FROM leads l
      LEFT JOIN lead_sources ls ON l.lead_source_id = ls.id
      WHERE ${whereClause}
      GROUP BY ls.id, ls.name
      ORDER BY value DESC
    `, params);

    // ─────────────────────────────────────────────
    // 6. TRENDS & ANALYTICS
    // ─────────────────────────────────────────────
    const [dailyConversions] = await pool.query(`
      SELECT DATE(l.created_at) AS date, COUNT(*) AS total,
      SUM(CASE WHEN LOWER(TRIM(l.lead_status)) = 'converted' THEN 1 ELSE 0 END) AS converted
      FROM leads l WHERE ${whereClause} AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY date ORDER BY date ASC
    `, params);

    // ─────────────────────────────────────────────
    // 7. FINAL RESPONSE
    // ─────────────────────────────────────────────
    const conversionRate = totalLeads > 0
      ? Math.round((statusStats.converted / totalLeads) * 100)
      : 0;

    return res.json({
      success: true,
      totalLeads,
      newToday,
      conversionRate,
      highIntentLeads, // Return to Frontend
      pendingFollowUps, // Return to Frontend
      statusStats,
      recentLeads: recentLeads || [],
      sourceStats: sourceStats || [],
      dailyConversions: dailyConversions || []
    });

  } catch (error) {
    console.error("[DASHBOARD ERROR]", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getDashboardStats };