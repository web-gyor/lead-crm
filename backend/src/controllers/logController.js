const db = require('../config/db');

/**
 * Creates a new communication log entry for a lead.
 */
exports.createLog = async (req, res) => {
    const { lead_id, type, summary } = req.body;
    
    // Use user ID from token or fallback to 1 during development
    const userId = req.user ? req.user.id : 1; 

    try {
        const sql = `INSERT INTO communication_logs (lead_id, user_id, type, summary) VALUES (?, ?, ?, ?)`;
        
        // Using mysql2 destructuring for the insert result
        const [result] = await db.execute(sql, [lead_id, userId, type || 'Call', summary]);
        
        return res.status(201).json({ success: true, logId: result.insertId });
    } catch (err) {
        console.error("CommunicationLog.createLog Error:", err.message);
        return res.status(500).json({ error: "Database Save Failed: " + err.message });
    }
};

/**
 * Retrieves all communication logs for a specific lead.
 */
exports.getLogsByLead = async (req, res) => {
    try {
        const sql = `
            SELECT cl.*, u.name as user_name 
            FROM communication_logs cl
            LEFT JOIN users u ON cl.user_id = u.id
            WHERE cl.lead_id = ?
            ORDER BY cl.created_at DESC
        `;
        const [rows] = await db.execute(sql, [req.params.leadId]);
        return res.status(200).json(rows);
    } catch (err) {
        console.error("CommunicationLog.getLogsByLead Error:", err.message);
        return res.status(500).json({ error: "Fetch Failed" });
    }
};