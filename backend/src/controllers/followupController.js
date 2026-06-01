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


const getLeadNotifications = async (req, res) => {
  try {
    const userId     = req.user?.id;
    const role       = String(req.user?.role || '').toLowerCase().trim();
    const todayLocal = req.query.localDate || getISTDateString();

    const isAdmin =
      role === 'super admin' || role === 'superadmin' ||
      role === 'admin'       || role === 'branch admin' ||
      Boolean(req.user?.is_super_admin);

    // ── Scope filter (non-admins see only their own leads) ──────────────────
    let scopeWhere  = '';
    const scopeParams = [];
    if (!isAdmin) {
      scopeWhere = 'AND (l.assigned_user_id = ? OR l.assigned_to = ?)';
      scopeParams.push(userId, userId);
    }

    // ── 1. FOLLOW-UP COUNTS ─────────────────────────────────────────────────
    const [followUpRows] = await pool.query(`
      SELECT DATE(l.next_follow_up_date) AS follow_date
      FROM leads l
      WHERE l.next_follow_up_date IS NOT NULL
        AND l.deleted_at IS NULL
        AND l.is_archived = 0
        AND LOWER(l.lead_status) NOT IN ('converted','lost','not interested','rejected','closed')
        ${scopeWhere}
    `, scopeParams);

    let overdue = 0, today = 0, upcoming = 0;
    followUpRows.forEach(row => {
      if (!row.follow_date) return;
      const d = String(row.follow_date).split('T')[0];
      if      (d < todayLocal)  overdue++;
      else if (d === todayLocal) today++;
      else                       upcoming++;
    });

    // ── 2. UNASSIGNED LEADS FOR ADMINS / ASSIGNED TODAY FOR COUNSELORS ──────
    let newLeads = 0;
    if (isAdmin) {
      // 🚀 FIXED: Dropped 'AND LOWER(lead_status) = "new"' to capture any unassigned lead status
      const [[unassignedRow]] = await pool.query(`
        SELECT COUNT(*) AS count
        FROM leads
        WHERE assigned_user_id IS NULL
          AND assigned_to IS NULL
          AND deleted_at IS NULL
          AND is_archived = 0
      `);
      newLeads = Number(unassignedRow.count || 0);
    } else {
      // For non-admins, keep showing new tasks explicitly routed to them today
      const [[myNewRow]] = await pool.query(`
        SELECT COUNT(*) AS count
        FROM leads
        WHERE (assigned_user_id = ? OR assigned_to = ?)
          AND deleted_at IS NULL
          AND is_archived = 0
          AND LOWER(lead_status) = 'new'
          AND DATE(created_at) = ?
      `, [userId, userId, todayLocal]);
      newLeads = Number(myNewRow.count || 0);
    }

    return res.json({
      success: true,
      overdue,
      today,
      upcoming,
      newLeads,
      total: overdue + today + newLeads,
    });

  } catch (err) {
    console.error('getLeadNotifications error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};
module.exports = { getTodayTasks, getLeadNotifications };