const { pool } = require("../config/db");

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
 
const getTodayTasks = async (req, res) => {
  let connection;
  try {
    const role   = String(req.user?.role || '').toLowerCase().trim();
    const userId = req.user?.id;
    const todayLocal = req.query.localDate || getISTDateString();

    // 🚀 EXPLICIT ROLE DETECTION: Aligned with strict security discussion matching
    const isAdminOrManager =
      ['super admin', 'superadmin', 'admin', 'branch admin', 'manager'].includes(role) ||
      Boolean(req.user?.is_super_admin) ||
      Boolean(req.user?.is_branch_admin) ||
      Boolean(req.user?.is_manager);

    connection = await pool.getConnection();

    let query = `
      SELECT 
        l.*,
        COALESCE(u.name, 'Unassigned') AS assigned_user_name,
        COALESCE(ls.name, 'Unknown Source') AS lead_source_name
      FROM leads l
      LEFT JOIN users u  ON l.assigned_user_id = u.id
      LEFT JOIN lead_sources ls ON l.lead_source_id = ls.id
      WHERE l.next_follow_up_date IS NOT NULL
        AND l.deleted_at IS NULL
        AND l.is_archived = 0
        AND LOWER(l.lead_status) = 'follow-up'
    `;
    const params = [];

    if (!isAdminOrManager) {
      query += " AND l.assigned_user_id = ?";
      params.push(userId);
    }

    // 🚀 NO CONVERT_TZ: Comparing pure DATE strings cleanly without timezone distortion shifting
    query += `
      ORDER BY 
        CASE 
          WHEN l.next_follow_up_date < ? THEN 1
          WHEN l.next_follow_up_date = ? THEN 2
          ELSE 3
        END,
        l.next_follow_up_date ASC
    `;
    params.push(todayLocal, todayLocal);

    const [rows] = await connection.query(query, params);

    const leads = rows.map(r => ({
      ...r,
      next_follow_up_date: r.next_follow_up_date ? String(r.next_follow_up_date) : null,
    }));

    return res.json({ success: true, leads, count: leads.length });

  } catch (error) {
    console.error('getTodayTasks error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch follow-up tasks' });
  } finally {
    if (connection) connection.release();
  }
};

const getLeadNotifications = async (req, res) => {
  let connection;
  try {
    const userId     = req.user?.id;
    const role       = String(req.user?.role || '').toLowerCase().trim();
    const todayLocal = req.query.localDate || getISTDateString();

    // 🚀 EXPLICIT ROLE DETECTION: Guarantees global data counts for admins/managers
    const isAdminOrManager =
      ['super admin', 'superadmin', 'admin', 'branch admin', 'manager'].includes(role) ||
      Boolean(req.user?.is_super_admin) ||
      Boolean(req.user?.is_branch_admin) ||
      Boolean(req.user?.is_manager);

    let scopeWhere = '';
    const scopeParams = [];
    if (!isAdminOrManager) {
      scopeWhere = 'AND l.assigned_user_id = ?';
      scopeParams.push(userId);
    }

    connection = await pool.getConnection();

    // ── 1. FOLLOW-UP COUNTS ─────────────────────────────────────────────────
    // Direct string comparison matching on raw database DATE columns
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

    // ── 2. NEW/UNASSIGNED LEADS COUNT ───────────────────────────────────────────
    let newLeads = 0;
    if (isAdminOrManager) {
      // Global unassigned counts for core platform management dashboards
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
      // Personal counselor/telecaller metrics isolated strictly to their assigned rows
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

    return res.json({
      success: true,
      overdue: Number(metrics.overdue || 0),
      today: Number(metrics.today || 0),
      upcoming: Number(metrics.upcoming || 0),
      newLeads,
      // Total count tracks actionable entries (Overdue + Today + New Inbound Leads)
      total: Number(metrics.overdue || 0) + Number(metrics.today || 0) + newLeads,
    });

  } catch (err) {
    console.error('getLeadNotifications error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { getTodayTasks, getLeadNotifications };