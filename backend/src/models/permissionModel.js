const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth'); 

/**
 * Handles role-based permission updates.
 * Upserts the permission status for a specific feature and role.
 */
router.post('/update', authenticateToken, async (req, res) => {
    const { role, feature_name, is_enabled } = req.body;
    try {
        const sql = `
            INSERT INTO role_permissions (role, feature_name, is_enabled) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE is_enabled = ?
        `;
        
        await pool.query(sql, [role, feature_name, is_enabled, is_enabled]);
        
        return res.json({ success: true });
    } catch (error) {
        console.error("Permission Update Error:", error.message);
        return res.status(500).json({ error: "Database update failed" });
    }
});

module.exports = router;