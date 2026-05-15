const { pool } = require("../config/db");

// Fetch Templates (Filtered by type: 'email' or 'sms')
const getTemplates = async (req, res) => {
    try {
        const { type } = req.query; // 'email' or 'sms'
        const [rows] = await pool.query(
            "SELECT * FROM communication_templates WHERE type = ? ORDER BY id DESC",
            [type]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch templates" });
    }
};

const createTemplate = async (req, res) => {
    try {
        const { title, category, message, type, is_active } = req.body;
        const [result] = await pool.query(
            "INSERT INTO communication_templates (title, category, message, type, is_active) VALUES (?, ?, ?, ?, ?)",
            [title, category || 'General', message, type, is_active ?? true]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, message: "Creation failed" });
    }
};

const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, message, is_active } = req.body;
        await pool.query(
            "UPDATE communication_templates SET title = ?, category = ?, message = ?, is_active = ? WHERE id = ?",
            [title, category, message, is_active, id]
        );
        res.json({ success: true, message: "Updated" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Update failed" });
    }
};

const deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM communication_templates WHERE id = ?", [id]);
        res.json({ success: true, message: "Deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Delete failed" });
    }
};

module.exports = { getTemplates, createTemplate, updateTemplate, deleteTemplate };