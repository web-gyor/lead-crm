const { pool } = require('../config/db');

/**
 * Data model for handling Lead operations in the database.
 */
class LeadsModel {
  /**
   * Persists a new lead record.
   */
  static async create(leadData) {
    console.log("FINAL DATA:", {
  whatsapp_same: leadData.whatsapp_same,
  urgency: leadData.urgency
});
    const [result] = await pool.execute(

  `INSERT INTO leads (
    lead_source_id, lead_source_detail, full_name, phone, whatsapp_same,
    alternate_phone, email, age, gender, city, area_locality,
    chief_complaint, interested_treatment, urgency, referred_by_name,
    referred_by_phone, referred_by_type, lead_status, next_follow_up_date,
    created_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    leadData.lead_source_id || null,
    leadData.lead_source_detail || null,
    leadData.full_name,
    leadData.phone,

    // ✅ FIXED
    Number(leadData.whatsapp_same) === 1 ? 1 : 0,

    leadData.alternate_phone || null,
    leadData.email || null,
    leadData.age || null,
    leadData.gender || null,
    leadData.city || null,
    leadData.area_locality || null,
    leadData.chief_complaint || null,
    leadData.interested_treatment || null,

    // ✅ FIXED
    leadData.urgency && leadData.urgency.trim() !== ""
      ? leadData.urgency
      : "Just inquiring",

    leadData.referred_by_name || null,
    leadData.referred_by_phone || null,
    leadData.referred_by_type || null,
    leadData.lead_status || 'New',
    leadData.next_follow_up_date || null,
    leadData.created_by || 1
  ]
);
    return result.insertId;
  }

  /**
   * Retrieves a single lead with source details.
   */
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT l.*, ls.name as lead_source_name 
       FROM leads l 
       LEFT JOIN lead_sources ls ON l.lead_source_id = ls.id 
       WHERE l.id = ?`,
      [id]
    );
    return rows[0];
  }

  /**
   * Retrieves leads with optional filtering and pagination.
   */
  static async findAll({ page = 1, limit = 20, status, city } = {}) {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT l.*, ls.name as lead_source_name 
      FROM leads l 
      LEFT JOIN lead_sources ls ON l.lead_source_id = ls.id
    `;
    let params = [];

    if (status) {
      query += ` WHERE l.lead_status = ?`;
      params.push(status);
    }
    if (city) {
      query += params.length ? ` AND l.city LIKE ?` : ` WHERE l.city LIKE ?`;
      params.push(`%${city}%`);
    }

    query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  /**
   * Updates lead status and follow-up scheduling.
   */
  static async updateStatus(id, status, nextFollowUpDate = null) {
    const [result] = await pool.execute(
      `UPDATE leads SET lead_status = ?, next_follow_up_date = ?, 
       last_contacted_at = NOW() WHERE id = ?`,
      [status, nextFollowUpDate, id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = LeadsModel;