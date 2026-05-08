const { pool } = require('../config/db');

// Get current attendance status for the logged-in user
exports.getTodayStatus = async (req, res) => {
    try {
        const [rows] = await pool.query(
            // ONLY return the status if they haven't punched out yet
            "SELECT * FROM attendance WHERE user_id = ? AND date = CURDATE() AND check_out IS NULL",
            [req.user.id]
        );
        
        // If row exists, they are "Active". If not, they see the "Punch In" button.
        res.json({ data: rows.length > 0 ? rows[0] : null });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Punch In
// backend/src/controllers/attendanceController.js
exports.punchIn = async (req, res) => {
    const { work_mode, location_data } = req.body;
    try {
    const [result] = await pool.query(
    `INSERT INTO attendance (user_id, date, work_mode, location_data, check_in) 
     VALUES (?, CURDATE(), ?, ?, CONVERT_TZ(NOW(), '+00:00', '+05:30'))`,
    [req.user.id, work_mode, JSON.stringify(location_data)]
);
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error("DEBUG:", error.message);
        res.status(500).json({ error: error.message });
    }
};
// Punch Out
exports.punchOut = async (req, res) => {
    try {
        // 1. Update the record for THIS user for TODAY where check_out is still null
      const [result] = await pool.query(
    `UPDATE attendance 
     SET check_out = CONVERT_TZ(NOW(), '+00:00', '+05:30') 
     WHERE user_id = ? AND date = CURDATE() AND check_out IS NULL`,
    [req.user.id]
);
        if (result.affectedRows === 0) {
            return res.status(400).json({ error: "No active shift found to end." });
        }

        res.json({ success: true, message: "Shift ended successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Get all logs for a specific date (defaults to today)
// In attendanceController.js -> getAllLogs
// backend/src/controllers/attendanceController.js

// backend/src/controllers/attendanceController.js

// backend/src/controllers/attendanceController.js

exports.getAllLogs = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                a.*, 
                u.name as user_name, 
                u.role as user_role,
                -- Get total duration in seconds
                TIMESTAMPDIFF(SECOND, a.check_in, a.check_out) as duration_seconds
            FROM attendance a 
            JOIN users u ON a.user_id = u.id
            ORDER BY a.date DESC, a.check_in DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};