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
  try {
    const role   = String(req.user?.role || '').toLowerCase().trim();
    const userId = req.user?.id;
    const todayLocal = req.query.localDate || getISTDateString();

    // ✅ cover all admin role variants
    const isAdmin = role === 'admin' || role === 'super admin' || role === 'superadmin' ||
                    role === 'branch admin' || Boolean(req.user?.is_super_admin) || Boolean(req.user?.is_branch_admin);

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
        AND l.lead_status NOT IN ('Converted', 'Lost', 'Not Interested', 'Rejected', 'Closed')
    `;
    const params = [];

    if (!isAdmin) {
      query += " AND l.assigned_user_id = ?";
      params.push(userId);
    }

    query += `
      ORDER BY 
        CASE 
          WHEN DATE(l.next_follow_up_date) < ?  THEN 1
          WHEN DATE(l.next_follow_up_date) = ?  THEN 2
          ELSE 3
        END,
        l.next_follow_up_date ASC
    `;
    params.push(todayLocal, todayLocal);

    const [rows] = await pool.query(query, params);

    // ✅ Normalise date to YYYY-MM-DD string before sending — prevents UTC offset on frontend
    const leads = rows.map(r => ({
      ...r,
      next_follow_up_date: r.next_follow_up_date
        ? String(r.next_follow_up_date).split('T')[0]
        : null,
    }));

    return res.json({ success: true, leads, count: leads.length });

  } catch (error) {
    console.error('getTodayTasks error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch follow-up tasks' });
  }
};


// 🎯 UPDATE IN: backend/src/controllers/followUpController.js (or corresponding route controller)

const getLeadNotifications = async (req, res) => {
  let connection;
  try {
    const userId     = req.user?.id;
    const role       = String(req.user?.role || '').toLowerCase().trim();
    const todayLocal = req.query.localDate || getISTDateString();

    const isAdmin =
      role === 'super admin' || role === 'superadmin' ||
      role === 'admin'       || role === 'branch admin' ||
      Boolean(req.user?.is_super_admin);

    let scopeWhere = '';
    const scopeParams = [];
    if (!isAdmin) {
      scopeWhere = 'AND l.assigned_user_id = ?';
      scopeParams.push(userId);
    }

    connection = await pool.getConnection();

    // 🚀 FIXED: Run a single high-speed conditional aggregation that perfectly mirrors your workflow rules
    const [countsResult] = await connection.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN DATE(CONVERT_TZ(l.next_follow_up_date, '+00:00', '+05:30')) < ? THEN l.id END) AS overdue,
        COUNT(DISTINCT CASE WHEN DATE(CONVERT_TZ(l.next_follow_up_date, '+00:00', '+05:30')) = ? THEN l.id END) AS today,
        COUNT(DISTINCT CASE WHEN DATE(CONVERT_TZ(l.next_follow_up_date, '+00:00', '+05:30')) > ? THEN l.id END) AS upcoming
      FROM leads l
      WHERE l.next_follow_up_date IS NOT NULL
        AND l.deleted_at IS NULL
        AND l.is_archived = 0
        AND l.lead_status NOT IN ('Converted', 'Lost', 'Not Interested', 'Rejected', 'Closed')
        ${scopeWhere}
    `, [todayLocal, todayLocal, todayLocal, ...scopeParams]);

    const metrics = countsResult[0] || { overdue: 0, today: 0, upcoming: 0 };

    // ── 2. UNASSIGNED LEADS COUNT ───────────────────────────────────────────
    let newLeads = 0;
    if (isAdmin) {
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

    return res.json({
      success: true,
      overdue: Number(metrics.overdue || 0),
      today: Number(metrics.today || 0),
      upcoming: Number(metrics.upcoming || 0),
      newLeads,
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