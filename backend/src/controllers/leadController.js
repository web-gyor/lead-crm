const { pool } = require('../config/db'); 
const jwt = require('jsonwebtoken');
const activityController = require("./activityController");

/**
 * Authentication Middleware
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: "Access Denied" });
  
 jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
  if (err) return res.status(403).json({ message: "Invalid Token" });
  req.user = user;
  next();
});
};

/**
 * Fetch Dashboard Statistics and KPIs
 */
const getDashboardStats = async (req, res) => {
  try {
    const role   = req.user?.role?.toLowerCase() || "";
    const userId = req.user?.id;

    // ── Role-based filter ─────────────────────────────────────────────────────
    const isAdmin     = role === "admin" || role === "superadmin" || role === "manager";
    const whereClause = isAdmin ? "1=1" : "l.assigned_user_id = ?";
    const params      = isAdmin ? [] : [userId];

    // ── KPI stats ─────────────────────────────────────────────────────────────
    const [stats] = await pool.query(`
      SELECT
        COUNT(*)                                                                      AS totalLeads,
        SUM(CASE WHEN DATE(l.created_at)       = CURDATE() THEN 1 ELSE 0 END)        AS newToday,
        SUM(CASE WHEN l.lead_status = 'Converted'          THEN 1 ELSE 0 END)        AS converted,
        SUM(CASE WHEN l.lead_status = 'Follow-up'          THEN 1 ELSE 0 END)        AS trueFollowupCount,
        SUM(CASE WHEN l.lead_status = 'Interested'         THEN 1 ELSE 0 END)        AS interestedCount,
        SUM(CASE WHEN l.lead_status = 'New'                THEN 1 ELSE 0 END)        AS newCount,
        SUM(CASE WHEN l.lead_status IN ('Lost','Not Interested') THEN 1 ELSE 0 END)  AS lostRejected,
        SUM(CASE WHEN l.lead_status != 'New'               THEN 1 ELSE 0 END)        AS contactedCount,
        SUM(CASE WHEN DATE(l.first_contacted_at) = CURDATE() THEN 1 ELSE 0 END)      AS callsMadeToday,
        SUM(CASE WHEN DATE(l.updated_at)         = CURDATE() THEN 1 ELSE 0 END)      AS handledToday
      FROM leads l
      WHERE ${whereClause}
    `, params);

    // ── Recent leads ──────────────────────────────────────────────────────────
    const [recent] = await pool.query(`
      SELECT l.full_name, l.interested_course, l.lead_status, l.created_at
      FROM   leads l
      WHERE  ${whereClause}
      ORDER  BY l.created_at DESC
      LIMIT  5
    `, params);

    // ── Source stats ──────────────────────────────────────────────────────────
    // FIX: old code used sourceParams = [...params, ...params] to supply the
    // WHERE clause twice — once in the subquery, once in the outer query.
    // Rewriting with a window function / single pass eliminates the duplication
    // and the parameter-count mismatch that caused incorrect percentages.
    const [sourceStats] = await pool.query(`
      SELECT
        COALESCE(ls.name, 'Bulk Import')                                     AS name,
        COUNT(l.id)                                                           AS value,
        SUM(CASE WHEN l.lead_status = 'Converted' THEN 1 ELSE 0 END)        AS converted,
        ROUND(
          COUNT(l.id) * 100.0 /
          NULLIF(SUM(COUNT(l.id)) OVER (), 0)
        )                                                                     AS percentage
      FROM  leads l
      LEFT  JOIN lead_sources ls ON l.lead_source_id = ls.id
      WHERE ${whereClause}
      GROUP BY ls.id, ls.name
      ORDER BY value DESC
    `, params);

    // ── Daily — last 7 days ───────────────────────────────────────────────────
    const [dailyConversions] = await pool.query(`
      SELECT
        DATE(l.created_at)                                               AS date,
        COUNT(*)                                                          AS total,
        SUM(CASE WHEN l.lead_status = 'Converted' THEN 1 ELSE 0 END)   AS converted
      FROM  leads l
      WHERE ${whereClause}
        AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(l.created_at)
      ORDER BY date ASC
    `, params);

    // ── Weekly — last 6 weeks ─────────────────────────────────────────────────
    // FIX: old GROUP BY used the formatted label string which can collide across
    // years (e.g. "03 Apr 2025" vs "03 Apr 2026" both format to "03 Apr").
    // Group by the actual Monday date, format only for display.
    const [weeklyConversions] = await pool.query(`
      SELECT
        DATE_SUB(DATE(l.created_at), INTERVAL WEEKDAY(l.created_at) DAY) AS week_start,
        DATE_FORMAT(
          DATE_SUB(DATE(l.created_at), INTERVAL WEEKDAY(l.created_at) DAY),
          '%d %b'
        )                                                                  AS label,
        COUNT(*)                                                           AS total,
        SUM(CASE WHEN l.lead_status = 'Converted' THEN 1 ELSE 0 END)    AS converted
      FROM  leads l
      WHERE ${whereClause}
        AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL 41 DAY)
      GROUP BY week_start, label
      ORDER BY week_start ASC
    `, params);

    // ── Monthly — last 6 months ───────────────────────────────────────────────
    // FIX: old code grouped by DATE_FORMAT(...'%Y-%m') AND the display label
    // separately, which works but is redundant. Group by the truncated month
    // date so ORDER BY is deterministic and timezone-safe.
    const [monthlyConversions] = await pool.query(`
      SELECT
        DATE_FORMAT(l.created_at, '%Y-%m-01')                           AS month_start,
        DATE_FORMAT(l.created_at, '%b %Y')                              AS label,
        COUNT(*)                                                          AS total,
        SUM(CASE WHEN l.lead_status = 'Converted' THEN 1 ELSE 0 END)   AS converted
      FROM  leads l
      WHERE ${whereClause}
        AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
      GROUP BY month_start, label
      ORDER BY month_start ASC
    `, params);

    // ── Build response ────────────────────────────────────────────────────────
    const s = stats[0] || {};

    // FIX: stats[0] values come back as BigInt strings from mysql2 when
    // COUNT/SUM returns large numbers. Coerce to Number throughout.
    const n = (v) => Number(v) || 0;

    return res.json({
      success: true,

      // KPIs
      totalLeads:       n(s.totalLeads),
      newToday:         n(s.newToday),
      callsMadeToday:   n(s.callsMadeToday),
      handledToday:     n(s.handledToday),
      pendingFollowUps: n(s.trueFollowupCount),
      highIntentLeads:  n(s.interestedCount),
      lostRejected:     n(s.lostRejected),
      conversionRate:   n(s.totalLeads) > 0
        ? Math.round((n(s.converted) / n(s.totalLeads)) * 100)
        : 0,

      // Lists & charts
      recentLeads:        recent             || [],
      sourceStats:        sourceStats        || [],
      dailyConversions:   dailyConversions   || [],
      weeklyConversions:  weeklyConversions  || [],
      monthlyConversions: monthlyConversions || [],

      // Status breakdown
      statusStats: {
        new:        n(s.newCount),
        contacted:  n(s.contactedCount),
        followup:   n(s.trueFollowupCount),
        interested: n(s.interestedCount),
        converted:  n(s.converted),
        lost:       n(s.lostRejected),
      },
    });

  } catch (error) {
    console.error("Dashboard fetch error:", error.message);
    return res.status(500).json({ error: "Server error during dashboard fetch" });
  }
};
/**
 * Fetch All Leads with Filters and Pagination
 */
const getAllLeads = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    let whereClause = "1=1";
    let params = [];
    
    // --- UPDATED: Added assigned_user_id to the destructuring ---
    const { 
      search, 
      status, 
      lead_source_id, 
      source_id, 
      assigned_user_id, // From your new counselor filter
      startDate, 
      endDate, 
      range 
    } = req.query;

    const finalSourceId = lead_source_id || source_id;

    // Permissions Check
    const userRole = (req.user?.role || "").toLowerCase();
    const [permResult] = await pool.query(
      "SELECT is_enabled FROM role_permissions WHERE LOWER(role) = ? AND feature_name = 'View All Leads'",
      [userRole]
    );

    const canViewAll =
      userRole === 'admin' ||
      userRole === 'superadmin' ||
      (permResult.length > 0 && permResult[0].is_enabled === 1);

    if (!canViewAll) {
      whereClause += " AND (l.assigned_user_id = ? OR l.created_by = ? OR l.created_by IS NULL)"; 
      params.push(req.user.id, req.user.id);
    }

    // Search logic
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      whereClause += " AND (l.full_name LIKE ? OR l.phone LIKE ? OR l.lead_uid LIKE ?)";
      params.push(term, term, term);
    }

    // Status logic
    if (status && !['all', 'leads', ''].includes(status.toLowerCase())) {
      let dbStatus = status;
      if (status === 'Won')       dbStatus = 'Converted';
      if (status === 'Rejected') dbStatus = 'Not Interested';
      whereClause += " AND l.lead_status = ?";
      params.push(dbStatus);
    }

    // Source Logic
    if (finalSourceId && !['all', '', 'undefined', 'null'].includes(String(finalSourceId).toLowerCase())) {
      whereClause += " AND l.lead_source_id = ?";
      params.push(finalSourceId);
    }

   

// --- UPDATE THIS BLOCK ---
if (assigned_user_id) {
  if (assigned_user_id === 'unassigned') {
    // This targets leads where no one is assigned (Anil, Madhu, or Shaji)
    whereClause += " AND (l.assigned_user_id IS NULL OR l.assigned_user_id = 0)";
  } else if (!['all', '', 'undefined', 'null'].includes(String(assigned_user_id).toLowerCase())) {
    // This targets a specific person (like Anil or Madhu)
    whereClause += " AND l.assigned_user_id = ?";
    params.push(assigned_user_id);
  }
}

    // Date Range Logic
    if (range === 'today') {
      whereClause += " AND DATE(l.created_at) = CURDATE()";
    } 
    else if (range === 'this_week') {
      whereClause += " AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
    } 
    else if (range === 'this_month') {
      whereClause += " AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    } 
    else if (range === 'this_year') {
      whereClause += " AND YEAR(l.created_at) = YEAR(CURDATE())";
    } 
    else if (startDate && endDate) {
      whereClause += " AND l.created_at >= ? AND l.created_at <= ?";
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    }

    // Final Queries
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM leads l WHERE ${whereClause}`,
      params
    );
    const totalItems = countResult[0].total;

const [leads] = await pool.query(`
  SELECT 
    l.*, 
    u.name AS counselor_name -- This pulls 'Shaji' directly from the users table
  FROM leads l 
  LEFT JOIN users u ON l.assigned_user_id = u.id
  WHERE ${whereClause} 
  ORDER BY l.created_at DESC 
  LIMIT ? OFFSET ?
`, [...params, limit, offset]);

    res.json({
      success: true,
      data: leads,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Critical Error in getAllLeads:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create New Lead and Log Activity
 */
const createLead = async (req, res) => {
  try {
    const {
      full_name, parent_name, parent_contact, phone, email, city, age, gender,
      qualification, year_of_passing,
      whatsapp_same,   // ✅ FIXED
      urgency,         // ✅ FIXED
      lead_source_id,
      assigned_user_id, interested_course,
      counselor_remarks, lead_status
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO leads (
        full_name, parent_name, parent_contact, phone, whatsapp_same,
        email, city, age, gender, qualification, year_of_passing,
        lead_source_id, assigned_user_id, interested_course,
        counselor_remarks, lead_status, urgency, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name || 'N/A',
        parent_name || null,
        parent_contact || null,
        phone,

        // ✅ FIXED
        Number(whatsapp_same) === 1 ? 1 : 0,

        email || null,
        city || null,
        age || null,
        gender || null,
        qualification || null,
        year_of_passing || null,
        lead_source_id || null,
        assigned_user_id || null,
        interested_course || null,
        counselor_remarks || null,
        lead_status || 'New',

        // ✅ FIXED
        urgency && urgency.trim() !== ""
          ? urgency
          : "Just inquiring",

        req.user?.id
      ]
    );

    res.status(201).json({ success: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};
/**
 * Fetch Single Lead by ID
 */
const getLeadById = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT l.* FROM leads l WHERE l.id = ?`, [req.params.id]);
    res.json(rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update Lead and Log Changes
 */
const updateLead = async (req, res) => {
  const { id }    = req.params;
  const updates   = req.body;
  try {
    const [current] = await pool.query("SELECT * FROM leads WHERE id = ?", [id]);
    if (current.length === 0) return res.status(404).json({ error: "Lead not found" });

    const old = current[0];

    let firstContactedAt = old.first_contacted_at;
    if ((updates.lead_status === 'Contacted' || updates.lead_status === 'Follow-up') && !firstContactedAt) {
      firstContactedAt = new Date();
    }

    const data = {
      ...old,
      ...updates,
      first_contacted_at: firstContactedAt,
      updated_at:  new Date(),
      lead_status: updates.lead_status || old.lead_status || 'New',
    };

    await pool.query(`
      UPDATE leads 
      SET full_name=?, phone=?, email=?, city=?, age=?, gender=?, qualification=?, 
          year_of_passing=?, parent_name=?, parent_contact=?, lead_status=?, 
          lead_source_id=?, assigned_user_id=?, interested_course=?, 
          counselor_remarks=?, next_follow_up_date=?, urgency=?, lead_quality=?, whatsapp_same=?,
          first_contacted_at=?, updated_at=? 
      WHERE id = ?`,
      [
        data.full_name, data.phone, data.email, data.city, data.age, data.gender,
        data.qualification, data.year_of_passing, data.parent_name, data.parent_contact,
        data.lead_status,
        data.lead_source_id || null,
        (data.assigned_user_id === "" || data.assigned_user_id === "0") ? null : (data.assigned_user_id || null),
        data.interested_course, data.counselor_remarks, data.next_follow_up_date,
        data.urgency, data.lead_quality, data.whatsapp_same, data.first_contacted_at, data.updated_at, id
      ]
    );

    const userId = req.user?.id;

    if (updates.lead_status && updates.lead_status !== old.lead_status) {
      await activityController.record({
        userId,
        leadId:      id,
        actionType:  'STATUS_UPDATE',
        description: `Status changed from "${old.lead_status}" to "${updates.lead_status}"`,
        oldValue:    old.lead_status,
        newValue:    updates.lead_status,
      });
    }

    if (updates.assigned_user_id && String(updates.assigned_user_id) !== String(old.assigned_user_id)) {
      await activityController.record({
        userId,
        leadId:      id,
        actionType:  'ASSIGNED',
        description: `Lead reassigned to user ID ${updates.assigned_user_id}`,
        oldValue:    String(old.assigned_user_id || 'Unassigned'),
        newValue:    String(updates.assigned_user_id),
      });
    }

    if (updates.counselor_remarks && updates.counselor_remarks !== old.counselor_remarks) {
      await activityController.record({
        userId,
        leadId:      id,
        actionType:  'NOTE_ADDED',
        description: `Remark updated: "${updates.counselor_remarks}"`,
        oldValue:    old.counselor_remarks || '',
        newValue:    updates.counselor_remarks,
      });
    }

    res.json({ success: true, message: "Updated successfully" });
  } catch (error) {
    console.error("Update Lead Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Bulk Assign Leads and Log Activity
 */
const bulkAssignLeads = async (req, res) => {
  const { leadIds, assigned_user_id, lead_status } = req.body;
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: "No leads selected" });
  }
  try {
    await pool.query(
      `UPDATE leads SET assigned_user_id = ?, lead_status = ? WHERE id IN (?)`,
      [assigned_user_id, lead_status || 'New', leadIds]
    );

    await Promise.all(leadIds.map(leadId =>
      activityController.record({
        userId:      req.user?.id,
        leadId,
        actionType:  'ASSIGNED',
        description: `Bulk assigned to user ID ${assigned_user_id} with status "${lead_status || 'New'}"`,
        oldValue:    null,
        newValue:    String(assigned_user_id),
      })
    ));

    res.json({ message: `Successfully updated ${leadIds.length} leads` });
  } catch (error) {
    console.error("Bulk Assignment Error:", error.message);
    res.status(500).json({ error: "Bulk update failed" });
  }
};

/**
 * Bulk Import Leads
 */
const bulkImportLeads = async (req, res) => {
  const { leads } = req.body;
  const createdBy = req.user?.id || 1;

  try {
    // First, get the ID of "Bulk Import" source
    const [bulkSource] = await pool.query(
      "SELECT id FROM lead_sources WHERE name = 'Bulk Import' LIMIT 1"
    );

    const bulkImportSourceId = bulkSource.length > 0 ? bulkSource[0].id : null;

    const values = leads.map(l => [
      l.full_name, 
      l.phone, 
      l.email || null, 
      l.age || null, 
      l.gender || null,
      l.city || null, 
      l.qualification || null, 
      l.year_of_passing || null,
      l.parent_name || null, 
      l.parent_contact || null, 
      l.interested_course || null,
      l.counselor_remarks || null, 
      bulkImportSourceId,           // ← Force Bulk Import
      'New', 
      createdBy
    ]);

    await pool.query(
      `INSERT INTO leads 
       (full_name, phone, email, age, gender, city, qualification, year_of_passing, 
        parent_name, parent_contact, interested_course, counselor_remarks, 
        lead_source_id, lead_status, created_by) 
       VALUES ? 
       ON DUPLICATE KEY UPDATE updated_at = NOW()`,
      [values]
    );

    res.json({ 
      success: true, 
      message: `Successfully imported ${leads.length} leads as Bulk Import` 
    });

  } catch (error) {
    console.error("Bulk Import Error:", error.message);
    res.status(500).json({ error: "Bulk import failed" });
  }
};

/**
 * Delete Individual Lead (Admin Only)
 */
const deleteLead = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user?.role?.toLowerCase() !== 'admin') return res.status(403).json({ error: "Admin required." });
    await pool.query("DELETE FROM leads WHERE id = ?", [Number(id)]);
    res.json({ success: true, message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Delete Lead Error:", error.message);
    res.status(500).json({ error: "Database error" });
  }
};

/**
 * Fetch Scheduled Follow-ups for Today
 */
const getTodayTasks = async (req, res) => {
  try {
    const role   = req.user?.role?.toLowerCase() || '';
    const userId = req.user?.id;
    let whereClause = "(DATE(next_follow_up_date) <= CURDATE() AND lead_status NOT IN ('Converted', 'Lost', 'Not Interested'))";
    const params = [];
    if (role !== 'admin' && userId) {
      whereClause += " AND assigned_user_id = ?";
      params.push(userId);
    }
    const [rows] = await pool.query(
      `SELECT * FROM leads WHERE ${whereClause} ORDER BY next_follow_up_date ASC`, params
    );
    res.json({ leads: rows || [], tasks: rows || [], data: rows || [] });
  } catch (error) {
    console.error("Today Tasks Error:", error.message);
    res.status(500).json({ error: "Failed to fetch today's tasks" });
  }
};

/**
 * Fetch Pipeline Leads (Active Statuses)
 */
const getPipeline = async (req, res) => {
  try {
    const role   = req.user?.role?.toLowerCase() || '';
    const userId = req.user?.id;
    let whereClause = "lead_status IN ('New', 'Contacted', 'Interested', 'Follow-up')";
    const params = [];
    if (role !== 'admin' && userId) {
      whereClause += " AND assigned_user_id = ?";
      params.push(userId);
    }
    const [rows] = await pool.query(
      `SELECT * FROM leads WHERE ${whereClause} ORDER BY updated_at DESC`, params
    );
    res.json({ leads: rows || [], data: rows || [], success: true });
  } catch (error) {
    console.error("Pipeline Error:", error.message);
    res.status(500).json({ error: "Failed to fetch pipeline data" });
  }
};

/**
 * Fetch Recent Communication Logs/Remarks
 */
const getCommLogs = async (req, res) => {
  try {
    const role   = req.user?.role?.toLowerCase() || '';
    const userId = req.user?.id;
    let query = `
      SELECT l.id, l.full_name, l.counselor_remarks as message, l.updated_at as timestamp, u.name as staff_name
      FROM leads l
      JOIN users u ON l.assigned_user_id = u.id
      WHERE l.counselor_remarks IS NOT NULL AND l.counselor_remarks != ''
    `;
    const params = [];
    if (role !== 'admin' && userId) {
      query += " AND l.assigned_user_id = ?";
      params.push(userId);
    }
    query += " ORDER BY l.updated_at DESC LIMIT 50";
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Communication Logs Error:", error.message);
    res.status(500).json({ error: "Failed to load communication logs" });
  }
};

/**
 * Export Leads to CSV
 */
const exportLeads = async (req, res) => {
  try {
    const [leads] = await pool.query(`
      SELECT lead_uid as ID, full_name as Name, phone as Phone, email as Email,
             lead_status as Status, interested_course as Course, created_at as Date
      FROM leads ORDER BY created_at DESC
    `);
    if (leads.length === 0) return res.status(404).json({ message: "No leads to export" });
    const headers = Object.keys(leads[0]).join(",");
    const rows    = leads.map(l => Object.values(l).map(v => `"${v || ''}"`).join(","));
    const csv     = [headers, ...rows].join("\n");
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads_export.csv');
    res.status(200).send(csv);
  } catch (error) {
    console.error("Export Error:", error.message);
    res.status(500).json({ error: "Failed to generate export" });
  }
};

/**
 * Check for Duplicate Leads by Phone or Email
 */
const checkDuplicate = async (req, res) => {
  const { phone, email } = req.query;
  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, lead_status FROM leads WHERE phone = ? OR (email = ? AND email != '') LIMIT 1",
      [phone, email]
    );
    res.json({ exists: rows.length > 0, lead: rows[0] || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Fetch All Lead Sources
 */
const getSources = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM lead_sources ORDER BY name ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to load lead sources" });
  }
};

/**
 * Log Manual Interaction and Schedule Follow-up
 */
const logInteraction = async (req, res) => {
  const { lead_id, type, outcome, remarks, next_follow_up } = req.body;
  try {
    await pool.query(
      "INSERT INTO lead_interactions (lead_id, interaction_type, outcome, remarks, created_by) VALUES (?, ?, ?, ?, ?)",
      [lead_id, type, outcome, remarks, req.user.id]
    );

    let statusUpdate = "";
    if (outcome === 'Replied' || outcome === 'Connected') statusUpdate = ", lead_status = 'Interested'";
    if (outcome === 'Not Reachable')                      statusUpdate = ", lead_status = 'Follow-up'";

    await pool.query(
      `UPDATE leads SET updated_at = NOW(), next_follow_up_date = ? ${statusUpdate} WHERE id = ?`,
      [next_follow_up || null, lead_id]
    );

    await activityController.record({
      userId:      req.user?.id,
      leadId:      lead_id,
      actionType:  'NOTE_ADDED',
      description: `Interaction logged — ${type}: ${outcome}. Remarks: "${remarks}"`,
      oldValue:    null,
      newValue:    outcome,
    });

    res.json({ success: true, message: "Interaction logged & Follow-up scheduled" });
  } catch (err) {
    console.error("Log Interaction Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Standalone Status Update and Activity Logging
 */
const updateLeadStatus = async (req, res) => {
    try {
        const { leadId, newStatus, oldStatus } = req.body;
        const userId = req.user?.id || 1; 

        await pool.query("UPDATE leads SET status = ? WHERE id = ?", [newStatus, leadId]);

        if (activityController && activityController.record) {
            await activityController.record({
                userId: userId,
                leadId: leadId,
                actionType: 'STATUS_UPDATE',
                description: `Status updated from ${oldStatus || 'Inquiry'} to ${newStatus}`,
                oldValue: oldStatus,
                newValue: newStatus
            });
        }

        res.json({ success: true, message: "Status updated and logged" });
    } catch (error) {
        console.error("Update Status Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};
const getNewLeadCount = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) as count FROM leads WHERE lead_status = 'New' AND assigned_user_id IS NULL"
    );
    res.json({ count: rows[0].count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const bulkUpdateLeads = async (req, res) => {
  const { leadIds, lead_source_id, lead_status } = req.body;

  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: "No leads selected" });
  }

  try {
    let updateFields = [];
    let params = [];

    if (lead_source_id) {
      updateFields.push("lead_source_id = ?");
      params.push(lead_source_id);
    }

    if (lead_status) {
      updateFields.push("lead_status = ?");
      params.push(lead_status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    // Build the query
    const query = `UPDATE leads SET ${updateFields.join(', ')} WHERE id IN (?)`;
    
    // IMPORTANT: mysql2 requires the array of IDs wrapped in another array for IN (?)
    params.push(leadIds); 

    const [result] = await pool.query(query, params);

    res.json({ 
      success: true, 
      message: `${result.affectedRows} leads updated successfully` 
    });
  } catch (error) {
    console.error("Bulk Update Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  authenticateToken,
  getDashboardStats,
  getAllLeads,
  createLead,
  getLeadById,
  updateLead,
  bulkAssignLeads,
  bulkImportLeads,
  deleteLead,
  getTodayTasks,
  getPipeline,
  checkDuplicate,
  exportLeads,
  getSources,
  logInteraction,
  getCommLogs,
  updateLeadStatus,
  getNewLeadCount,
  bulkUpdateLeads,
};