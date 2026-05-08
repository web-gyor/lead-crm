const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

// GET all counselor rules for the Admin UI

router.get("/pending-count", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM leads WHERE assigned_user_id IS NULL");
        return res.status(200).json({ success: true, count: rows[0].count });
    } catch (error) {
        console.error("DATABASE ERROR:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post("/run-pending", authenticateToken, checkPermission('leads.assign'), async (req, res) => {
  try {
    const leadDistributor = require("../services/leadDistributor"); // Ensure this path is correct
    
    // 1. Get the leads waiting for assignment
    const [pendingLeads] = await pool.query(
      "SELECT id, full_name, phone, country, interested_course FROM leads WHERE assigned_user_id IS NULL AND is_archived = 0"
    );

    if (pendingLeads.length === 0) {
      return res.json({ success: true, count: 0, message: "No leads to distribute" });
    }

    let assignedCount = 0;

    // 2. Process them through the engine
    for (const lead of pendingLeads) {
      try {
        const result = await leadDistributor.distribute(lead, req.user.id);
        if (result?.success) assignedCount++;
      } catch (err) {
        console.error(`[Engine] Skip lead ${lead.id}:`, err.message);
      }
    }

    res.json({ success: true, count: assignedCount });
  } catch (error) {
    console.error("Distribution Engine Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/rules', authenticateToken, checkPermission('leads.assign'), async (req, res) => {
  try {
    const query = `
      SELECT 
        u.name, 
        u.role,
        r.*,
        -- Calculate counts from JSON strings for the UI badges
        IF(r.course_specialization IS NULL OR r.course_specialization = '', 0, JSON_LENGTH(r.course_specialization)) as course_count,
        IF(r.country_specialization IS NULL OR r.country_specialization = '', 0, JSON_LENGTH(r.country_specialization)) as country_count
      FROM users u
      JOIN counselor_distribution_rules r ON u.id = r.user_id
      WHERE u.role IN ('Counselor', 'Manager')
      ORDER BY r.priority_order ASC, u.name ASC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// UPDATE a specific rule (e.g., Toggle Active/Inactive)
router.put('/rules/:userId', authenticateToken, checkPermission('leads.assign'), async (req, res) => {
  const { userId } = req.params;
  const { is_active } = req.body;
  try {
    await pool.query(
      "UPDATE counselor_distribution_rules SET is_active = ? WHERE user_id = ?",
      [is_active ? 1 : 0, userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;