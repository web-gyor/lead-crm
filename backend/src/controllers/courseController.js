const { pool } = require('../config/db');

// Get all courses ordered by name
exports.getAllCourses = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM courses ORDER BY name ASC");
        res.json(rows);
    } catch (error) {
        console.error("Error in getAllCourses:", error.message);
        res.status(500).json({ error: error.message });
    }
};

// Create a new course
exports.createCourse = async (req, res) => {
    const { name, code, fee, is_active } = req.body;
    try {
        const [result] = await pool.query(
            "INSERT INTO courses (name, code, fee, is_active) VALUES (?, ?, ?, ?)",
            [name, code, fee, is_active ?? 1]
        );
        res.json({ id: result.insertId, success: true });
    } catch (error) {
        console.error("Error in createCourse:", error.message);
        res.status(500).json({ error: error.message });
    }
};

// Update an existing course
exports.updateCourse = async (req, res) => {
    const { id } = req.params;
    const { name, code, fee, is_active } = req.body;
    try {
        await pool.query(
            "UPDATE courses SET name=?, code=?, fee=?, is_active=? WHERE id=?",
            [name, code, fee, is_active, id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Error in updateCourse:", error.message);
        res.status(500).json({ error: error.message });
    }
};

// Delete a course by ID
exports.deleteCourse = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM courses WHERE id=?", [id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Error in deleteCourse:", error.message);
        res.status(500).json({ error: error.message });
    }
};