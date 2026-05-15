// src/controllers/archiveController.js
const { pool } = require("../config/db");

const archiveController = {
  getArchive: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;
      const offset = (page - 1) * limit;
      
      // Extract new filter parameters
      const { search, source_id, assigned_user_id, status, startDate, endDate } = req.query;

      let query = "SELECT * FROM archived_leads WHERE 1=1";
      let countQuery = "SELECT COUNT(*) as total FROM archived_leads WHERE 1=1";
      const params = [];
      const countParams = [];

      // 1. Search Filter (Name, Phone, ID)
      if (search) {
        const searchVal = `%${search}%`;
        const searchSql = " AND (full_name LIKE ? OR phone LIKE ? OR id LIKE ?)";
        query += searchSql;
        countQuery += searchSql;
        params.push(searchVal, searchVal, searchVal);
        countParams.push(searchVal, searchVal, searchVal);
      }

      // 2. Source Filter
      if (source_id) {
        query += " AND lead_source_id = ?";
        countQuery += " AND lead_source_id = ?";
        params.push(source_id);
        countParams.push(source_id);
      }

      // 3. Counselor Filter
      if (assigned_user_id) {
        query += " AND assigned_user_id = ?";
        countQuery += " AND assigned_user_id = ?";
        params.push(assigned_user_id);
        countParams.push(assigned_user_id);
      }

      // 4. Status Filter
      if (status) {
        query += " AND lead_status = ?";
        countQuery += " AND lead_status = ?";
        params.push(status);
        countParams.push(status);
      }

      // 5. Date Range Filter (Based on entry date)
      if (startDate && endDate) {
        query += " AND created_at BETWEEN ? AND ?";
        countQuery += " AND created_at BETWEEN ? AND ?";
        params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
        countParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
      }

      // Add Ordering and Pagination
      query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);

      // Execute Queries
      const [rows] = await pool.query(query, params);
      const [countRows] = await pool.query(countQuery, countParams);
      
      const totalItems = countRows[0].total;

      res.json({
        success: true,
        data: rows,
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
        },
      });
    } catch (error) {
      console.error("Archive Fetch Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  restoreLead: async (req, res) => {
    const { ids } = req.body; // Array of IDs
    if (!ids || !ids.length) return res.status(400).json({ success: false, message: "No IDs provided" });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Move from archive to main leads table, resetting status to 'New'
      // Note: We use 'New' as per your requirement
      for (const id of ids) {
        await connection.execute(`
          INSERT INTO leads (full_name, phone, email, city, interested_course, lead_status, lead_quality, counselor_remarks, created_at)
          SELECT full_name, phone, email, city, interested_course, 'New', lead_quality, CONCAT(counselor_remarks, ' (Restored from Archive)'), NOW()
          FROM archived_leads WHERE id = ?
        `, [id]);

        await connection.execute("DELETE FROM archived_leads WHERE id = ?", [id]);
      }

      await connection.commit();
      res.json({ success: true, message: "Leads restored successfully" });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({ success: false, error: error.message });
    } finally {
      connection.release();
    }
  },

  bulkDelete: async (req, res) => {
    const { ids } = req.body;
    try {
      await pool.query("DELETE FROM archived_leads WHERE id IN (?)", [ids]);
      res.json({ success: true, message: "Leads purged permanently" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = archiveController;