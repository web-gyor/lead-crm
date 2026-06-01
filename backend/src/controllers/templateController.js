const { pool } = require("../config/db");

// 1. Fetch Templates (Filtered by type: 'whatsapp', 'email', or 'sms')
const getTemplates = async (req, res) => {
    try {
        // Force lowercase to match DB ENUM structures safely
        const type = (req.query.type || 'whatsapp').toLowerCase(); 
        
        const [rows] = await pool.query(
            "SELECT * FROM communication_templates WHERE type = ? ORDER BY id DESC",
            [type]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error("Fetch Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch templates" });
    }
};

// 2. Create a new template
const createTemplate = async (req, res) => {
    try {
        const { title, category, message, type, is_active } = req.body;

        if (!title || !message || !type) {
            return res.status(400).json({ success: false, message: "Title, Message, and Type are required fields" });
        }

        // Added explicit handling for boolean properties to align cleanly with TiDB / MySQL bits
        const activeValue = is_active === undefined ? 1 : (is_active ? 1 : 0);

        const [result] = await pool.query(
            `INSERT INTO communication_templates (title, category, message, type, is_active) 
             VALUES (?, ?, ?, ?, ?)`,
            [title, category || 'General', message, type.toLowerCase(), activeValue]
        );

        res.status(201).json({ 
            success: true, 
            message: "Template created successfully", 
            id: result.insertId 
        });
    } catch (err) {
        console.error("Creation Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// 3. Update a template (Maintains existing values if fields are missing)
const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, message, is_active } = req.body;

        // Normalize boolean updates if passed down stream
        const activeValue = is_active === undefined ? null : (is_active ? 1 : 0);

        const [result] = await pool.query(
            `UPDATE communication_templates 
             SET title = IFNULL(?, title), 
                 category = IFNULL(?, category), 
                 message = IFNULL(?, message), 
                 is_active = IFNULL(?, is_active)
             WHERE id = ?`,
            [title, category, message, activeValue, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Template not found" });
        }

        res.json({ success: true, message: "Template updated successfully" });
    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ success: false, message: "Failed to update template" });
    }
};

// 4. Delete a template
const deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query("DELETE FROM communication_templates WHERE id = ?", [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Template already removed or not found" });
        }

        res.json({ success: true, message: "Template deleted successfully" });
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ success: false, message: "Error deleting template" });
    }
};

module.exports = {
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate
};