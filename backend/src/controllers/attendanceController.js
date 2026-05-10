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

exports.getAllLogs = async (req, res) => {
    // 1. Extract query parameters with defaults
    const { date, start_date, end_date, staff_id, page = 1, limit = 10 } = req.query;
    
    // Calculate offset for pagination
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    
    let params = [];
    let whereClauses = [];

    // 2. Dynamic Filter Construction
    if (staff_id) { 
        whereClauses.push("a.user_id = ?"); 
        params.push(staff_id); 
    }
    
    if (date) { 
        whereClauses.push("a.date = ?"); 
        params.push(date); 
    } else if (start_date && end_date) { 
        // Range filtering for Weekly/Monthly overviews
        whereClauses.push("a.date BETWEEN ? AND ?"); 
        params.push(start_date, end_date); 
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    try {
        // 3. Main Data Query
        // Uses IFNULL(a.check_out, NOW()) to show "Live" duration for active shifts
        const query = `
            SELECT 
                a.*, 
                u.name as user_name, 
                u.role as user_role,
                TIMESTAMPDIFF(SECOND, a.check_in, IFNULL(a.check_out, NOW())) as duration_seconds
            FROM attendance a 
            JOIN users u ON a.user_id = u.id
            ${whereSql}
            ORDER BY a.date DESC, a.check_in DESC
            LIMIT ? OFFSET ?`;

        const [rows] = await pool.query(query, [...params, parseInt(limit), offset]);

        // 4. Count Query for Pagination UI
        const countQuery = `SELECT COUNT(*) as total FROM attendance a ${whereSql}`;
        const [countResult] = await pool.query(countQuery, params);
        const total = countResult[0].total;

        // 5. Send Professional JSON Response
        return res.status(200).json({ 
            success: true, 
            data: rows, 
            total, 
            pages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page)
        });

    } catch (error) {
        console.error("Attendance Master Error:", error.message);
        // Ensure we return here to stop execution and avoid "Headers already sent"
        return res.status(500).json({ 
            success: false, 
            error: error.message,
            message: "Critical error in Attendance Master sync"
        });
    }
};