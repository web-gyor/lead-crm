const { pool } = require("../config/db");

/**
 * Controller for managing and auditing lead activities and system logs.
 * Fully optimized to release connection pools instantly and handle multi-user streams cleanly.
 */
const activityController = {

  /**
   * Fetches the activity history for a specific lead.
   */
  getActivityByLead: async (req, res) => {
    const leadId = Number(req.params.id); 
    
    if (isNaN(leadId)) {
      return res.status(400).json({ success: false, data: [], error: "Invalid Lead ID parameter mapping" });
    }

    let connection;
    try {
      connection = await pool.getConnection();
      const [rows] = await connection.query(`
        SELECT * FROM (
          SELECT 
            id,
            'STATUS_CHANGE' as action_type,
            CONCAT('Status changed from ', old_status, ' to ', new_status) as description,
            changed_at as created_at
          FROM lead_status_history 
          WHERE lead_id = ?
          
          UNION ALL

          SELECT 
            id,
            action_type,
            description,
            created_at
          FROM activity_logs 
          WHERE lead_id = ?
        ) AS combined_logs
        ORDER BY created_at DESC
        LIMIT 10
      `, [leadId, leadId]);

      return res.status(200).json({ success: true, data: rows });
    } catch (error) {
      console.error("❌ SQL ERROR in getActivityByLead:", error.message);
      return res.status(200).json({ success: true, data: [], error: error.message });
    } finally {
      if (connection) connection.release();
    }
  },

  /**
   * Fetches the activity history for a specific lead (Full List)
   */
  getLeadHistory: async (req, res) => {
    const leadId = Number(req.params.leadId);
    const limit = parseInt(req.query.limit) || 20;

    if (isNaN(leadId)) {
      return res.status(400).json({ success: false, error: "Invalid Lead ID" });
    }

    let connection;
    try {
      connection = await pool.getConnection();
      const [rows] = await connection.query(`
        SELECT * FROM (
          SELECT 
            h.id, 
            h.lead_id, 
            h.changed_by as user_id,
            COALESCE(u.name, 'System') AS user_name,
            'STATUS_CHANGE' as action_type,
            CONCAT('Status changed from ', h.old_status, ' to ', h.new_status) as description,
            h.old_status as old_value,
            h.new_status as new_value,
            h.changed_at as created_at
          FROM lead_status_history h
          LEFT JOIN users u ON h.changed_by = u.id
          WHERE h.lead_id = ?

          UNION ALL

          SELECT 
            al.id, 
            al.lead_id, 
            al.user_id,
            COALESCE(u.name, 'System') AS user_name,
            al.action_type, 
            al.description,
            al.old_value, 
            al.new_value, 
            al.created_at
          FROM activity_logs al
          LEFT JOIN users u ON al.user_id = u.id
          WHERE al.lead_id = ?
        ) AS combined_history
        ORDER BY created_at DESC
        LIMIT ?
      `, [leadId, leadId, limit]);

      return res.status(200).json({ success: true, data: rows });
    } catch (err) {
      console.error("ActivityController.getLeadHistory Error:", err.message);
      return res.status(500).json({ success: false, error: "Failed to retrieve lead history" });
    } finally {
      if (connection) connection.release();
    }
  },

  /**
   * Fetches global logs for administrative audit purposes.
   */
  // 🎯 UPDATE IN: backend/src/controllers/activityController.js

getGlobalLogs: async (req, res) => {
  let connection;
  try {
    // 🚀 READ THE FRONTEND DATE PICKER VALUE: (e.g., '2026-06-02')
    const filterDate = req.query.date || req.query.localDate;
    
    let logsWhere = "1=1";
    let historyWhere = "1=1";
    const params = [];

    if (filterDate) {
      // If the frontend passes a date, force the database to compare days directly
      logsWhere = "DATE(al.created_at) = ?";
      historyWhere = "DATE(h.changed_at) = ?";
      params.push(filterDate, filterDate); // Pass to both sides of the UNION
    }

    connection = await pool.getConnection();
    const [logs] = await connection.query(`
      SELECT * FROM (
        SELECT 
          al.id, al.lead_id, al.user_id,
          COALESCE(u.name, 'System') AS user_name,
          al.action_type, al.description,
          al.old_value, al.new_value, al.created_at,
          COALESCE(l.full_name, 'System / Auth') AS student_name
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN leads l ON al.lead_id = l.id
        WHERE ${logsWhere}

        UNION ALL

        SELECT 
          h.id, h.lead_id, h.changed_by AS user_id,
          COALESCE(u2.name, 'System') AS user_name,
          'STATUS_UPDATE' AS action_type,
          CONCAT('Status changed from ', h.old_status, ' to ', h.new_status) AS description,
          h.old_status AS old_value, h.new_status AS new_value, h.changed_at AS created_at,
          COALESCE(l2.full_name, 'System / Auth') AS student_name
        FROM lead_status_history h
        LEFT JOIN users u2 ON h.changed_by = u2.id
        LEFT JOIN leads l2 ON h.lead_id = l2.id
        WHERE ${historyWhere}
      ) AS macro_history
      ORDER BY created_at DESC
      LIMIT 100
    `, params);

    return res.status(200).json({ success: true, data: logs });
  } catch (err) {
    console.error("ActivityController.getGlobalLogs Error:", err.message);
    return res.status(500).json({ success: false, error: "Failed to retrieve audit logs" });
  } finally {
    if (connection) connection.release();
  }
},
  /**
   * Internal utility to record a new activity log safely.
   */
 // 🎯 TARGET LOCATION: backend/src/controllers/activityController.js -> record() utility

record: async (logData) => {
  let connection;
  try {
    // 🚀 FIXED: Accept both camelCase and snake_case properties transparently
    const userId      = logData.userId || logData.user_id;
    const leadId      = logData.leadId || logData.lead_id;
    const actionType  = logData.actionType || logData.action_type || 'OTHER';
    const description = logData.description;
    const oldValue    = logData.oldValue || logData.old_value;
    const newValue    = logData.newValue || logData.new_value;

    connection = await pool.getConnection();
    await connection.query(`
      INSERT INTO activity_logs 
        (user_id, lead_id, action_type, description, old_value, new_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userId || null,
      leadId || null, 
      String(actionType).toUpperCase(), // Force clean uppercase 'LOGIN' tokens
      description || 'Activity performed',
      oldValue || null,
      newValue || null,
    ]);

    return true;
  } catch (err) {
    console.error("ActivityController.record Internal Error:", err.message);
    return false;
  } finally {
    if (connection) connection.release();
  }
},
  /**
   * Moves logs older than 12 months to an archive table.
   */
  archiveOldLogs: async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      await connection.query(`
        INSERT INTO activity_logs_archive 
          (id, user_id, lead_id, action_type, description, old_value, new_value, created_at)
        SELECT 
          id, user_id, lead_id, action_type, description, old_value, new_value, created_at
        FROM activity_logs
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 12 MONTH)
      `);

      const [result] = await connection.query(`
        DELETE FROM activity_logs 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 12 MONTH)
      `);

      await connection.commit();

      return res.status(200).json({
        success: true,
        archivedCount: result.affectedRows,
        message: `${result.affectedRows} logs moved to archive successfully`
      });
    } catch (err) {
      if (connection) await connection.rollback();
      console.error("ActivityController.archiveOldLogs Error:", err.message);
      return res.status(500).json({ success: false, error: "Maintenance task failed" });
    } finally {
      if (connection) connection.release();
    }
  },

  /**
   * Generates and streams a CSV export of all activity logs.
   */
  exportLogsCSV: async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const [logs] = await connection.query(`
        SELECT 
          al.id,
          COALESCE(u.name, 'System') AS staff_name,
          COALESCE(l.full_name, 'System / Auth') AS lead_name,
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
    } finally {
      if (connection) connection.release();
    }
  },
};

module.exports = activityController;