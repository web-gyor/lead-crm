const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const countryController = require('../controllers/countryController');
const { authenticateToken } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

// 1. GET all countries (for the Master Settings UI)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM countries ORDER BY country_name ASC"
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Fetch Countries Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. POST a new country
router.post("/", authenticateToken, checkPermission('leads.manage'), async (req, res) => {
  const { country_name } = req.body;
  
  if (!country_name) {
    return res.status(400).json({ success: false, message: "Country name is required" });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO countries (country_name, is_active) VALUES (?, 1)",
      [country_name.trim()]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: "Country already exists" });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});
router.put("/:id", authenticateToken, countryController.updateCountry);
// 3. PUT update status (Toggle Active/Inactive)
router.put("/:id/status", authenticateToken, checkPermission('leads.manage'), async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  try {
    await pool.query(
      "UPDATE countries SET is_active = ? WHERE id = ?",
      [is_active ? 1 : 0, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. DELETE a country (Optional, or just use status toggle)
router.delete("/:id", authenticateToken, checkPermission('leads.manage'), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM countries WHERE id = ?", [id]);
    res.json({ success: true, message: "Country removed" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;