const { pool } = require('../config/db');

// Get current attendance status for the logged-in user
exports.getAttendance = exports.getAllLogs;

// Update getTodayStatus wrapper to include success: true
// (Replace your existing getTodayStatus with this)
exports.getTodayStatus = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM attendance WHERE user_id = ? AND date = CURDATE() AND check_out IS NULL",
            [req.user.id]
        );
        
        // Frontend needs the success: true flag
        return res.json({ 
            success: true, 
            data: rows.length > 0 ? rows[0] : null 
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
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

exports.getAllLogs = async (req, res) => {
    const { date, start_date, end_date, staff_id, page = 1, limit = 10 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    
    let params = [];
    let whereClauses = [];

    if (staff_id) { 
        whereClauses.push("a.user_id = ?"); 
        params.push(staff_id); 
    }
    
    if (start_date && end_date) { 
        whereClauses.push("a.date BETWEEN ? AND ?"); 
        params.push(start_date, end_date); 
    } else if (date) { 
        whereClauses.push("DATE(a.date) = DATE(?)"); 
        params.push(date); 
    }
    
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    try {
        // Query with LEFT JOIN to guarantee rows are never dropped
        const [rows] = await pool.query(`
            SELECT a.*, COALESCE(u.name, 'Unknown Staff') as user_name, COALESCE(u.role, 'N/A') as user_role,
            CASE 
                WHEN a.check_out IS NOT NULL THEN TIMESTAMPDIFF(SECOND, a.check_in, a.check_out)
                WHEN a.date = CURDATE() THEN TIMESTAMPDIFF(SECOND, a.check_in, CONVERT_TZ(NOW(), '+00:00', '+05:30'))
                ELSE NULL 
            END as duration_seconds
            FROM attendance a 
            LEFT JOIN users u ON a.user_id = u.id
            ${whereSql}
            ORDER BY a.date DESC, a.check_in DESC
            LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

        // Added LEFT JOIN here so count matches the rows
        const [countResult] = await pool.query(`
            SELECT COUNT(*) as total 
            FROM attendance a 
            LEFT JOIN users u ON a.user_id = u.id 
            ${whereSql}`, params);
            
        const total = countResult[0]?.total || 0;

        res.json({ 
            success: true, 
            data: rows, 
            pages: Math.ceil(total / parseInt(limit)) 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
// ALIAS: This ensures the route 'getAttendance' works if called
exports.getAttendance = exports.getAllLogs;