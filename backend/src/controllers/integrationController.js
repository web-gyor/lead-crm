const pool = require("../config/db"); // Adjust based on your db config path

// Get all integration statuses for the logged-in client
exports.getIntegrations = async (req, res) => {
  try {
    const clientId = req.user.id; // Assuming you have auth middleware
    const [rows] = await pool.query(
      "SELECT source_key, is_active, config_data FROM client_integrations WHERE client_id = ?",
      [clientId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle or Update Integration Config
exports.updateIntegration = async (req, res) => {
  const { source_key, is_active, config_data } = req.body;
  const clientId = req.user.id;

  try {
    // ON DUPLICATE KEY UPDATE makes this work for both new and existing integrations
    await pool.query(
      `INSERT INTO client_integrations (client_id, source_key, is_active, config_data) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       is_active = VALUES(is_active), 
       config_data = VALUES(config_data)`,
      [clientId, source_key, is_active, JSON.stringify(config_data)]
    );

    res.json({ success: true, message: `${source_key} updated successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};