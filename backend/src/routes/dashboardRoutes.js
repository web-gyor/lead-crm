const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const leadKpiController = require('../controllers/leadKpiController');
const leadController = require('../controllers/leadController');
const checkPermission = require('../middleware/checkPermission');
const { authenticateToken } = require('../middleware/auth');

// ─── SAFE HANDLER RESOLVER WRAPPER ───────────────────────────────────────────
const safe = (ctrl, method) => (req, res, next) => {
  if (ctrl && typeof ctrl[method] === 'function') {
    return ctrl[method](req, res, next);
  }
  console.error(`[Dashboard Route] Missing handler method reference: ${method}`);
  return res.status(500).json({ success: false, error: `Handler "${method}" not found` });
};

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD & KPI CONTROL NODES — Attached to database slug: 'dashboard'
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/dashboard/dashboard-data
router.get('/dashboard-data', authenticateToken, checkPermission('dashboard', 'view'), safe(dashboardController, 'getDashboardStats'));
router.get('/status-stats', authenticateToken, checkPermission('dashboard', 'view'), safe(leadController, 'getStatusStats'));

// GET /api/dashboard/kpis
router.get('/kpis',           authenticateToken, checkPermission('dashboard', 'view'), safe(leadKpiController,   'getLeadKpis'));

// GET /api/dashboard/summary-stats
router.get('/summary-stats',  authenticateToken, checkPermission('dashboard', 'view'), safe(leadController,      'getSummaryStats'));



// 🎯 TARGET FILE: Your Backend Dashboard Router file (e.g., src/routes/dashboard.js)

router.get('/notifications', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { pool } = require('../config/db');

    const userId     = req.user?.id;
    const role       = String(req.user?.role || '').toLowerCase().trim();
    
    // Generate absolute IST string date comparisons cleanly
    const todayLocal = req.query.localDate || (() => {
      const now   = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
      const ist   = new Date(utcMs + 5.5 * 60 * 60_000);
      return `${ist.getFullYear()}-${String(ist.getMonth()+1).padStart(2,'0')}-${String(ist.getDate()).padStart(2,'0')}`;
    })();

    // 🚀 FIXED: Added explicit 'manager' validation here to group your management dashboards
    const isAdminOrManager =
      ['super admin', 'superadmin', 'admin', 'branch admin', 'manager'].includes(role) ||
      Boolean(req.user?.is_super_admin) ||
      Boolean(req.user?.is_branch_admin) ||
      Boolean(req.user?.is_manager);

    // ── Scope: Non-admins see only their own leads ──────────────────────────
    const scopeWhere  = isAdminOrManager ? '' : 'AND (l.assigned_user_id = ? OR l.assigned_to = ?)';
    const scopeParams = isAdminOrManager ? [] : [userId, userId];

    connection = await pool.getConnection();

    // ── Follow-up counts — reads leads.next_follow_up_date ─────────────────
    // 🚀 FIXED: Removed CONVERT_TZ to prevent shifting your pure database DATE values
    const [fuRows] = await connection.query(`
      SELECT DISTINCT l.id, l.next_follow_up_date AS follow_date
      FROM leads l
      WHERE l.next_follow_up_date IS NOT NULL
        AND l.deleted_at   IS NULL
        AND l.is_archived  = 0
        AND LOWER(l.lead_status) = 'follow-up'
        ${scopeWhere}
    `, scopeParams);

    let overdue = 0, today = 0, upcoming = 0;
    fuRows.forEach(row => {
      if (!row.follow_date) return;

      let d;
      if (row.follow_date instanceof Date) {
        const yyyy = row.follow_date.getFullYear();
        const mm = String(row.follow_date.getMonth() + 1).padStart(2, '0');
        const dd = String(row.follow_date.getDate()).padStart(2, '0');
        d = `${yyyy}-${mm}-${dd}`;
      } else {
        d = String(row.follow_date).includes('T') 
          ? String(row.follow_date).split('T')[0] 
          : String(row.follow_date).trim();
      }
      
      if (d < todayLocal) {
        overdue++;
      } else if (d === todayLocal) {
        today++;
      } else {
        upcoming++;
      }
    });

    // ── Unassigned new leads ─────────────────────────────────────────────────
    let newLeads = 0;
    if (isAdminOrManager) {
      const [[row]] = await connection.query(`
        SELECT COUNT(*) AS count FROM leads
        WHERE assigned_user_id IS NULL
          AND deleted_at  IS NULL
          AND is_archived = 0
          AND LOWER(lead_status) = 'new'
      `);
      newLeads = Number(row?.count || 0);
    } else {
      // Non-admins: new leads assigned to them today
      const [[row]] = await connection.query(`
        SELECT COUNT(*) AS count FROM leads
        WHERE (assigned_user_id = ? OR assigned_to = ?)
          AND deleted_at  IS NULL
          AND is_archived = 0
          AND LOWER(lead_status) = 'new'
          AND DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) = ?
      `, [userId, userId, todayLocal]);
      newLeads = Number(row?.count || 0);
    }

    return res.status(200).json({
      success: true,
      data: { overdue, today, newLeads },
      overdue, today, upcoming, newLeads,
      total: overdue + today + newLeads
    });

  } catch (err) {
    console.error('Dashboard notifications error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  } finally {
    if (connection) connection.release();
  }
});
// Leave this single module statement at the absolute bottom untouched:
module.exports = router;

