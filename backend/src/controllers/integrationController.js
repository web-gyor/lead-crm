const pool = require("../config/db");

const VALID_SOURCES = ["meta", "whatsapp", "google", "website", "linkedin"];

// ── GET /api/integrations ─────────────────────────────────────────────────────
// Fix #1: parse config_data back to object, and strip secret field values
//         so tokens are never sent back to the frontend
exports.getIntegrations = async (req, res) => {
  try {
    const clientId = req.user.id;

    const [rows] = await pool.query(
      `SELECT source_key, is_active, config_data, updated_at
       FROM client_integrations
       WHERE client_id = ?`,
      [clientId]
    );

    const data = rows.map((row) => {
      let config = {};
      try {
        config = row.config_data ? JSON.parse(row.config_data) : {};
      } catch {
        config = {};
      }

      // Fix #1b: scrub secret values — return keys but not the values
      // so the frontend knows which fields are already filled
      const safeConfig = Object.fromEntries(
        Object.keys(config).map((k) => [k, config[k] ? "••••••••" : ""])
      );

      return {
        source_key:  row.source_key,
        is_active:   !!row.is_active,
        config_data: safeConfig,
        updated_at:  row.updated_at,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error("getIntegrations error:", error);
    res.status(500).json({ error: "Failed to load integrations" });
  }
};

// ── PUT /api/integrations/toggle ──────────────────────────────────────────────
exports.updateIntegration = async (req, res) => {
  const { source_key, is_active, config_data } = req.body;
  const clientId = req.user.id;

  // Fix #2: validate required fields up front
  if (!source_key || typeof is_active !== "boolean") {
    return res.status(400).json({ error: "source_key and is_active (boolean) are required" });
  }

  if (!VALID_SOURCES.includes(source_key)) {
    return res.status(400).json({ error: `Unknown source: ${source_key}` });
  }

  try {
    // Fix #3: always stringify from the object — never trust it's already a string
    const configString = JSON.stringify(
      config_data && typeof config_data === "object" ? config_data : {}
    );

    // Fix #4: include updated_at so you can audit when each integration last changed.
    // This query requires: UNIQUE KEY uq_client_source (client_id, source_key)
    // in your table — add it with the migration below if missing.
    await pool.query(
      `INSERT INTO client_integrations (client_id, source_key, is_active, config_data, updated_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         is_active   = VALUES(is_active),
         config_data = VALUES(config_data),
         updated_at  = NOW()`,
      [clientId, source_key, is_active ? 1 : 0, configString]
    );

    res.json({ success: true, message: `${source_key} updated successfully` });
  } catch (error) {
    // Fix #5: log full stack for traceability in production logs
    console.error("updateIntegration error:", error);
    res.status(500).json({ error: "Failed to update integration" });
  }
};