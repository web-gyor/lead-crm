const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET ALL ELIGIBLE USERS NOT YET IN THE POOL
// 🚀 FIXED: Fuzzy string matching allows advanced sub-roles to match cleanly
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/eligible-users', authenticateToken, checkPermission('import', 'view'), async (req, res) => {
  try {
    const query = `
      SELECT id, name, role 
      FROM users 
      WHERE (LOWER(role) LIKE '%counselor%' OR LOWER(role) LIKE '%telecaller%') 
        AND id NOT IN (SELECT user_id FROM counselor_distribution_rules) 
      ORDER BY name ASC
    `;
    const [users] = await pool.query(query);
    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET ACTIVE POOL COUNT (TRACKER PARITY ALIGNED)
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/pending-count", authenticateToken, checkPermission('import', 'view'), async (req, res) => {
  try {
    // 1. Core Parity Query: Checks assignment tracks, archiving, status, AND excludes soft-deletes
    const [trackerRows] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM leads 
      WHERE deleted_at IS NULL
        AND is_archived = 0 
        AND assigned_user_id IS NULL 
        AND assigned_to IS NULL
        AND LOWER(COALESCE(lead_status, 'new')) = 'new'
    `);
    
    // 2. Clear unassigned raw rows total for reference
    const [rawRows] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM leads 
      WHERE deleted_at IS NULL
        AND assigned_user_id IS NULL 
        AND assigned_to IS NULL
    `);
    
    return res.status(200).json({ 
      success: true, 
      count: Number(trackerRows[0].count),   // 24 rows total minus 4 deleted = EXACTLY 20
      rawTotal: Number(rawRows[0].count)
    });
  } catch (error) {
    console.error("DATABASE ERROR:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 3. MANUALLY ADD A COUNSELOR TO THE DISTRIBUTION LIST
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', authenticateToken, checkPermission('import', 'create'), async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ success: false, message: "User selection required" });

  try {
    await pool.query(
      "INSERT INTO counselor_distribution_rules (user_id, assignment_mode, course_specialization, country_specialization, daily_limit, is_active, priority_order) VALUES (?, 'round_robin', '[]', '[]', 15, 1, 10)",
      [user_id]
    );
    return res.status(200).json({ success: true, message: "Counselor successfully added to routing rotation pool" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. RUN DISTRIBUTION ENGINE CORE DATA FETCH
// 🚀 FIXED: Hardened fuzzy parameters matching coupled with explicit cross-property mappings
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', authenticateToken, checkPermission('import', 'view'), async (req, res) => {
  try {
    const query = `
      SELECT 
        u.name, 
        u.role,
        r.*,
        u.id AS userId,
        u.id AS user_id
      FROM users u
      JOIN counselor_distribution_rules r ON u.id = r.user_id
      WHERE LOWER(u.role) LIKE '%counselor%' OR LOWER(u.role) LIKE '%telecaller%'
      ORDER BY r.priority_order ASC, u.name ASC
    `;
    
    const [rows] = await pool.query(query);

    const formattedRows = rows.map(row => {
      let courses = [];
      let countries = [];

      try {
        courses = typeof row.course_specialization === 'string' ? JSON.parse(row.course_specialization) : (row.course_specialization || []);
      } catch { courses = []; }

      try {
        countries = typeof row.country_specialization === 'string' ? JSON.parse(row.country_specialization) : (row.country_specialization || []);
      } catch { countries = []; }

      // 🛠️ DEBUG FIX #2: Forces exact parameter consistency for mapping keys across elements
      return {
        ...row,
        userId: row.user_id, 
        user_id: row.user_id,
        course_specialization: courses,
        country_specialization: countries
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedRows
    });

  } catch (err) {
    console.error("[DISTRIBUTION CORE EXCEPTION]:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. EXPLICITLY DELETE A PRIVILEGE FROM THE POOL
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/:userId', authenticateToken, checkPermission('import', 'delete'), async (req, res) => {
  const { userId } = req.params;
  try {
    await pool.query("DELETE FROM counselor_distribution_rules WHERE user_id = ?", [userId]);
    return res.status(200).json({ success: true, message: "Agent removed from roster constraints" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. UPDATE CONFIGURATION MATRIX ROW CELL DATA 
// ═══════════════════════════════════════════════════════════════════════════════
router.put('/:userId', authenticateToken, checkPermission('import', 'edit'), async (req, res) => {
  const { userId } = req.params;
  const { is_active, assignment_mode, course_specialization, country_specialization, daily_limit } = req.body;
  try {
    if (is_active !== undefined) {
      await pool.query("UPDATE counselor_distribution_rules SET is_active = ? WHERE user_id = ?", [is_active ? 1 : 0, userId]);
    } else {
      await pool.query(
        "UPDATE counselor_distribution_rules SET assignment_mode = COALESCE(?, assignment_mode), course_specialization = COALESCE(?, course_specialization), country_specialization = COALESCE(?, country_specialization), daily_limit = COALESCE(?, daily_limit) WHERE user_id = ?",
        [assignment_mode, course_specialization, country_specialization, daily_limit, userId]
      );
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;