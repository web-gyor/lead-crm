const { pool } = require('../config/db');

/**
 * Data model for managing lead source entities.
 */
class LeadSourcesModel {
  /**
   * Retrieves the ID of a lead source by its name.
   */
  static async getLeadSourceIdByName(name) {
    if (!name) return null;
    
    const [rows] = await pool.execute(
      'SELECT id FROM lead_sources WHERE name = ? AND is_active = TRUE',
      [name]
    );
    
    return rows[0]?.id || null;
  }

  /**
   * Fetches all lead sources currently marked as active.
   */
  static async getAllActiveSources() {
    const [rows] = await pool.execute(
      'SELECT id, name FROM lead_sources WHERE is_active = TRUE ORDER BY name'
    );
    return rows;
  }

  /**
   * Registers a new lead source in the system.
   */
  static async createSource(name) {
    const [result] = await pool.execute(
      'INSERT INTO lead_sources (name) VALUES (?)',
      [name]
    );
    return result.insertId;
  }
}

module.exports = LeadSourcesModel;