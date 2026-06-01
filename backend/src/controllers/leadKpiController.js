// 🎯 TARGET FILE: src/controllers/leadKpiController.js
const { pool } = require("../config/db");

const normalize = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();

const getLeadKpis = async (req, res) => {
  try {
    const userRoleLower = String(req.user?.role || "").trim().toLowerCase();
    
    // 👑 ADMINISTRATIVE VISIBILITY BYPASS
    const hasAdministrativeVisibility = 
      Boolean(req.user?.is_super_admin) || 
      userRoleLower === "super admin" || 
      userRoleLower === "admin" || 
      userRoleLower === "manager";

    let whereClause = "l.deleted_at IS NULL";
    let params = [];

    // 🎓 OPERATOR TIER BOUNDARY
    if (!hasAdministrativeVisibility) {
      whereClause += " AND (l.assigned_user_id = ? OR l.assigned_to = ?)";
      params.push(req.user.id, req.user.id);
    }

    const { startDate, endDate } = req.query;
    if (startDate) {
      whereClause += " AND DATE(l.created_at) >= ?";
      params.push(startDate);
    }
    if (endDate) {
      whereClause += " AND DATE(l.created_at) <= ?";
      params.push(endDate);
    }

    // ─── STATUS COUNTS ──────────────────────────────────────────
    const [statusRows] = await pool.query(
      `SELECT LOWER(TRIM(l.lead_status)) AS status, COUNT(*) AS cnt 
       FROM leads l 
       WHERE ${whereClause} 
       GROUP BY LOWER(TRIM(l.lead_status))`,
      params
    );

    const sm = {};
    statusRows.forEach((r) => {
      const key = normalize(r.status);
      sm[key] = (sm[key] || 0) + Number(r.cnt || 0);
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

    // ─── NEW TODAY ──────────────────────────────────────────────
    const [[todayRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM leads l WHERE ${whereClause} AND DATE(l.created_at) = CURDATE()`,
      params
    );

    // ─── HIGH INTENT ────────────────────────────────────────────
    const [[intentRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM leads l 
       WHERE ${whereClause} 
       AND LOWER(TRIM(l.lead_quality)) IN ('high','hot','very high','warm')
       AND LOWER(TRIM(l.lead_status)) NOT IN ('converted','lost','not interested')`,
      params
    );

    // ─── FOLLOWUPS ──────────────────────────────────────────────
    const [[followupRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM leads l 
       WHERE ${whereClause} 
       AND l.next_follow_up_date IS NOT NULL
       AND LOWER(TRIM(l.lead_status)) NOT IN ('converted','lost','not interested')`,
      params
    );

    // ─── 🚀 FIXED: UNASSIGNED LEADS TRACKING CORE (Now strictly targets NEW leads only!) ───
    // Changes OR to AND for complete unassigned confirmation and filters out working states
    const [[unassignedRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM leads l
       WHERE ${whereClause}
         AND l.is_archived = 0
         AND l.assigned_user_id IS NULL 
         AND l.assigned_to IS NULL
         AND LOWER(COALESCE(l.lead_status, 'new')) = 'new'`,
      params
    );

    return res.json({
      success: true,
      totalLeads,
      newToday: Number(todayRow.total || 0),
      highIntentLeads: Number(intentRow.total || 0),
      pendingFollowUps: Number(followupRow.total || 0),
      
      unassignedLeads: Number(unassignedRow.total || 0), 
      unassigned: Number(unassignedRow.total || 0), 
      
      statusStats: statusStats, 
      statusCounts: statusStats, 
      stats: {
        all: totalLeads,
        totalLeads,
        newToday: Number(todayRow.total || 0),
        highIntentLeads: Number(intentRow.total || 0),
        pendingFollowUps: Number(followupRow.total || 0),
        unassignedLeads: Number(unassignedRow.total || 0),
        unassigned: Number(unassignedRow.total || 0),
        ...statusStats
      }
    });

  } catch (error) {
    console.error("getLeadKpis error:", error);
    return res.status(500).json({ success: false, error: "Failed to load KPI stats" });
  }
};

module.exports = { getLeadKpis };