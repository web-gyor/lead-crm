// 1. Destructure 'pool' from your config and explicitly name it 'db'
const { pool: db } = require("../config/db"); 

// GET ALL RULES
exports.getRules = async (req, res) => {
    try {
        // 2. Now 'db' is defined as the connection pool
        const [rows] = await db.execute(`
            SELECT 
                ar.*, 
                IFNULL(ct.title, 'No Template Assigned') as template_name 
            FROM automation_rules ar
            LEFT JOIN communication_templates ct ON ar.template_id = ct.id
            ORDER BY ar.id DESC
        `);
        
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        // This will now show the actual SQL error if one occurs, not "db is not defined"
        console.error("CRITICAL SQL ERROR [getRules]:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// CREATE RULE
exports.createRule = async (req, res) => {
    const { name, type, trigger_status, delay_value, delay_unit, template_id, is_active } = req.body;
    try {
        // Using 'db' here as well
        const [result] = await db.execute(
            `INSERT INTO automation_rules 
            (name, type, trigger_status, delay_value, delay_unit, template_id, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, type, trigger_status, delay_value, delay_unit, template_id, is_active ? 1 : 0]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        console.error("SQL ERROR [createRule]:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE RULE
exports.updateRule = async (req, res) => {
    const { id } = req.params;
    const { name, trigger_status, delay_value, delay_unit, template_id, is_active } = req.body;
    try {
        await db.execute(
            `UPDATE automation_rules 
             SET name=?, trigger_status=?, delay_value=?, delay_unit=?, template_id=?, is_active=? 
             WHERE id=?`,
            [
                name, 
                trigger_status, 
                delay_value || 0, 
                delay_unit || 'minutes', 
                template_id, 
                is_active ? 1 : 0, 
                id
            ]
        );
        res.json({ success: true, message: "Rule updated" });
    } catch (error) {
        console.error("SQL ERROR [updateRule]:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE RULE
exports.deleteRule = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute("DELETE FROM automation_rules WHERE id = ?", [id]);
        res.json({ success: true, message: "Rule deleted successfully" });
    } catch (error) {
        console.error("SQL ERROR [deleteRule]:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};