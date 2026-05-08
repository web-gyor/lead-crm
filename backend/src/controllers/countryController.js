const { pool } = require('../config/db');

// Get all countries
exports.getAllCountries = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM countries ORDER BY country_name ASC");
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Create country
exports.createCountry = async (req, res) => {
    const { country_name, is_active } = req.body;
    try {
        const [result] = await pool.query(
            "INSERT INTO countries (country_name, is_active) VALUES (?, ?)",
            [country_name.trim(), is_active ?? 1]
        );
        res.json({ id: result.insertId, success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update country
exports.updateCountry = async (req, res) => {
    const { id } = req.params;
    const { country_name, is_active } = req.body;
    try {
        await pool.query(
            "UPDATE countries SET country_name=?, is_active=? WHERE id=?",
            [country_name.trim(), is_active, id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Delete country
exports.deleteCountry = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM countries WHERE id=?", [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};