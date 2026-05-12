const { pool } = require("../config/db");

const VALID_SOURCES = ["meta", "whatsapp", "google", "website", "linkedin"];

 
// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION CRUD
// ═══════════════════════════════════════════════════════════════════════════════
 exports.getIntegrations = async (req, res) => {
  // Fix #1 — auth guard on both handlers
  if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });

  try {
    const clientId = req.user.id;

    const [rows] = await pool.query(
      `SELECT source_key, is_active, config_data, updated_at
       FROM client_integrations
       WHERE client_id = ?`,
      [clientId]
    );

    const data = rows.map((row) => {
      const config = row.config_data ?? {};
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
  // Fix #1 — auth guard
  if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });

  const { source_key, is_active, config_data } = req.body;
  const clientId = req.user.id;

  if (!source_key || typeof is_active !== "boolean") {
    return res.status(400).json({ error: "source_key and is_active (boolean) are required" });
  }

  if (!VALID_SOURCES.includes(source_key)) {
    return res.status(400).json({ error: `Unknown source: ${source_key}` });
  }

  try {
    await pool.query(
      `INSERT INTO client_integrations (client_id, source_key, is_active, config_data)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_active   = VALUES(is_active),
         config_data = VALUES(config_data)`,
      [
        clientId,
        source_key,
        is_active ? 1 : 0,
        config_data && typeof config_data === "object" ? config_data : {},
      ]
    );

    res.json({ success: true, message: `${source_key} updated successfully` });
  } catch (error) {
    console.error("updateIntegration error:", error);
    if (error.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
      return res.status(400).json({ error: `Invalid source_key: ${source_key}` });
    }
    res.status(500).json({ error: "Failed to update integration" });
  }
};