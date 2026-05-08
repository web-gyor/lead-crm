const { pool } = require('../config/db');

function getLocalDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const getTodayTasks = async (req, res) => {
  try {
    const role = req.user?.role?.toLowerCase() || '';
    const userId = req.user?.id;

    // ✅ SINGLE SOURCE OF TRUTH
    const todayLocal = req.query.localDate || getLocalDate();

    let query = `
      SELECT 
        l.*,
        COALESCE(u.name, 'Unassigned') AS assigned_user_name,
        COALESCE(ls.name, 'Unknown Source') AS lead_source_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_user_id = u.id
      LEFT JOIN lead_sources ls ON l.lead_source_id = ls.id
      WHERE 
        l.next_follow_up_date IS NOT NULL
        AND l.lead_status NOT IN ('Converted', 'Lost', 'Not Interested', 'Rejected', 'Closed')
    `;

    const params = [];

    if (role !== 'admin' && role !== 'superadmin') {
      query += " AND l.assigned_user_id = ?";
      params.push(userId);
    }

    // ✅ ORDER BY USING SAME todayLocal
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

    const [rows] = await pool.query(query, params);

    return res.json({
      success: true,
      leads: rows || [],
      count: rows.length
    });

  } catch (error) {
    console.error("🔥 Follow-up Controller Error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch follow-up tasks"
    });
  }
};
/**
 * GET LEAD NOTIFICATIONS (Unified Controller)
 * FIXED: Syncs perfectly with getTodayTasks using the same local date logic.
 */
const getLeadNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role?.toLowerCase();

    // ✅ SAME DATE SOURCE
    const todayLocal = req.query.localDate || getLocalDate();

    let where = `lead_status NOT IN ('Converted','Lost','Not Interested','Rejected','Closed')`;
    const params = [];

    if (role !== 'admin' && role !== 'superadmin') {
      where += " AND assigned_user_id = ?";
      params.push(userId);
    }

    const [rows] = await pool.query(
      `SELECT next_follow_up_date FROM leads WHERE ${where}`,
      params
    );

    const [[newCount]] = await pool.query(
      `SELECT COUNT(*) as count FROM leads WHERE lead_status = 'New'`
    );

    let overdue = 0;
    let today = 0;
    let upcoming = 0;

    rows.forEach(l => {
      if (!l.next_follow_up_date) return;

      const date = String(l.next_follow_up_date).split("T")[0];

      if (date < todayLocal) overdue++;
      else if (date === todayLocal) today++;
      else upcoming++;
    });

    return res.json({
      success: true,
      overdue,
      today,
      upcoming,
      newLeads: newCount.count,
      total: overdue + today + newCount.count
    });

  } catch (err) {
    console.error("Notification Error:", err);
    res.status(500).json({ error: "Failed to fetch counts" });
  }
};
module.exports = {
  getTodayTasks,
  getLeadNotifications
};