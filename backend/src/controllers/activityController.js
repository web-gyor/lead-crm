const { pool } = require("../config/db");

/**
 * Controller for managing and auditing lead activities and system logs.
 */
const activityController = {

  /**
   * Fetches the activity history for a specific lead.
   */
getLeadHistory: async (req, res) => {
  const { leadId } = req.params;
   const limit = parseInt(req.query.limit) || 5; 

  try {
    let query = `
      SELECT 
        al.id, al.lead_id, al.user_id,
        COALESCE(u.name, 'System') AS user_name,
        al.action_type, al.description,
        al.old_value, al.new_value, al.created_at
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.lead_id = ?
      ORDER BY al.created_at DESC
    `;

    const params = [leadId];

  
    if (limit) {
      query += " LIMIT ?";
      params.push(Number(limit));
    }

    const [rows] = await pool.query(query, params);

    return res.status(200).json({ success: true, data: rows });

  } catch (err) {
    console.error("ActivityController.getLeadHistory Error:", err.message);
    return res.status(500).json({ success: false, error: "Failed to retrieve lead history" });
  }
},


  /**
   * Fetches global logs for administrative audit purposes.
   * Limited to the most recent 100 entries for performance.
   */
  getGlobalLogs: async (req, res) => {
    try {
      const [logs] = await pool.query(`
        SELECT 
          al.id, al.lead_id, al.user_id,
          COALESCE(u.name, 'System') AS user_name,
          al.action_type, al.description,
          al.old_value, al.new_value, al.created_at,
          l.full_name AS student_name
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN leads l ON al.lead_id = l.id
        ORDER BY al.created_at DESC
        LIMIT 100
      `);

      return res.status(200).json({ success: true, data: logs });
    } catch (err) {
      console.error("ActivityController.getGlobalLogs Error:", err.message);
      return res.status(500).json({ success: false, error: "Failed to retrieve audit logs" });
    }
  },

  /**
   * Internal utility to record a new activity log.
   * Can be called from other controllers.
   */
  record: async ({ userId, leadId, actionType, description, oldValue, newValue }) => {
    try {
      if (!leadId) {
        console.warn("Activity logging skipped: Missing leadId");
        return false;
      }

      await pool.query(`
        INSERT INTO activity_logs 
          (user_id, lead_id, action_type, description, old_value, new_value)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        userId || null,
        leadId,
        actionType || 'OTHER',
        description || 'Activity performed',
        oldValue || null,
        newValue || null,
      ]);

      return true;
    } catch (err) {
      console.error("ActivityController.record Internal Error:", err.message);
      return false;
    }
  },

  /**
   * Moves logs older than 12 months to an archive table and removes from primary table.
   */
  archiveOldLogs: async (req, res) => {
    try {
      // 1. Copy to archive
      await pool.query(`
        INSERT INTO activity_logs_archive 
          (id, user_id, lead_id, action_type, description, old_value, new_value, created_at)
        SELECT 
          id, user_id, lead_id, action_type, description, old_value, new_value, created_at
        FROM activity_logs
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 12 MONTH)
      `);

      // 2. Delete from main table
      const [result] = await pool.query(`
        DELETE FROM activity_logs 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 12 MONTH)
      `);

      return res.status(200).json({
        success: true,
        archivedCount: result.affectedRows,
        message: `${result.affectedRows} logs moved to archive successfully`
      });
    } catch (err) {
      console.error("ActivityController.archiveOldLogs Error:", err.message);
      return res.status(500).json({ success: false, error: "Maintenance task failed" });
    }
  },

  /**
   * Generates and streams a CSV export of all activity logs.
   */
  exportLogsCSV: async (req, res) => {
    try {
      const [logs] = await pool.query(`
        SELECT 
          al.id,
          COALESCE(u.name, 'System') AS staff_name,
          l.full_name AS lead_name,
          al.action_type,
          al.description,
          al.old_value,
          al.new_value,
          al.created_at
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN leads l ON al.lead_id = l.id
        ORDER BY al.created_at DESC
      `);

      if (logs.length === 0) {
        return res.status(404).json({ success: false, message: "No logs available for export" });
      }

      const headers = ['ID', 'Staff', 'Lead', 'Action', 'Description', 'Old Value', 'New Value', 'Date'];
      
      const rows = logs.map(l => {
        // Sanitizing values for CSV format to avoid breakage
        const sanitize = (val) => val ? `"${String(val).replace(/"/g, '""').replace(/\n/g, ' ')}"` : '""';
        
        return [
          l.id,
          sanitize(l.staff_name),
          sanitize(l.lead_name),
          sanitize(l.action_type),
          sanitize(l.description),
          sanitize(l.old_value),
          sanitize(l.new_value),
          sanitize(new Date(l.created_at).toLocaleString('en-IN'))
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=webgyor_activity_logs.csv');
      return res.status(200).send(csvContent);
    } catch (err) {
      console.error("ActivityController.exportLogsCSV Error:", err.message);
      return res.status(500).json({ success: false, error: "Export process failed" });
    }
  },
};

module.exports = activityController;