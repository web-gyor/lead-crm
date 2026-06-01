// src/controllers/settingsController.js
const { pool } = require('../config/db');
const { runDatabaseBackup } = require('../utils/backupScheduler');
const fs = require('fs');
const path = require('path');

/**
 * GET /api/settings
 * Fetches system settings and current admin profile data.
 */
const getSettings = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({ success: false, message: "No user data found in token" });
    }

    // Fetch system settings
    const [comp] = await pool.execute(`
      SELECT
        id,
        company_name,
        company_phone,
        company_email,
        company_address,
        company_website,
        logo_url,
        agency_contact_name,
        agency_contact_email,
        COALESCE(is_call_recording_enabled, 0) AS is_call_recording_enabled,
        COALESCE(telephony_provider, 'none') AS telephony_provider,
        COALESCE(is_sms_template_enabled, 0) AS is_sms_template_enabled,
        COALESCE(is_whatsapp_automation_enabled, 0) AS is_whatsapp_automation_enabled,
        COALESCE(is_email_trigger_enabled, 0) AS is_email_trigger_enabled
      FROM settings
      WHERE id = 1
    `);

    // Fetch logged-in admin context properties
    const [user] = await pool.execute(
      "SELECT name, email FROM users WHERE id = ?",
      [req.user.id]
    );

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const dbSettings = comp[0] || {};

    return res.status(200).json({
      success: true,
      data: {
        id: dbSettings.id || 1,
        company_name: dbSettings.company_name || "",
        company_phone: dbSettings.company_phone || "",
        company_email: dbSettings.company_email || "",
        company_address: dbSettings.company_address || "",
        company_website: dbSettings.company_website || "",
        logo_url: dbSettings.logo_url || "",
        
        // Agency Point-of-Contact Data Columns
        agency_contact_name: dbSettings.agency_contact_name || "",
        agency_contact_email: dbSettings.agency_contact_email || "",
        
        // Automation Switches
        is_call_recording_enabled: Number(dbSettings.is_call_recording_enabled) === 1,
        is_sms_template_enabled: Number(dbSettings.is_sms_template_enabled) === 1,
        is_whatsapp_automation_enabled: Number(dbSettings.is_whatsapp_automation_enabled) === 1,
        is_email_trigger_enabled: Number(dbSettings.is_email_trigger_enabled) === 1,
        telephony_provider: dbSettings.telephony_provider || "none",
        
        // Logged-in Session Profile References (Read-Only context block)
        admin_name: user[0].name || "",
        admin_email: user[0].email || ""
      }
    });

  } catch (err) {
    console.error("Settings Fetch Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /api/settings
 * Updates or Creates core company profile settings and communication toggles.
 */
const updateSettings = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const data = req.body || {};
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User authorization footprint missing from execution context");
    }

    const [currentSettingsRows] = await connection.execute("SELECT * FROM settings WHERE id = 1");
    const current = currentSettingsRows[0] || {};

    const parseToggleValue = (key) => {
      if (data[key] === undefined || data[key] === null) return current[key] !== undefined ? current[key] : 0;
      return (data[key] === true || data[key] === 1 || data[key] === "1" || String(data[key]).trim().toLowerCase() === "true") ? 1 : 0;
    };

    const company_name = data.company_name !== undefined && String(data.company_name) !== "undefined" ? String(data.company_name).trim() : (current.company_name || "");
    const company_phone = data.company_phone !== undefined && String(data.company_phone) !== "undefined" ? String(data.company_phone).trim() : (current.company_phone || "");
    const company_email = data.company_email !== undefined && String(data.company_email) !== "undefined" ? String(data.company_email).trim() : (current.company_email || "");
    const company_address = data.company_address !== undefined && String(data.company_address) !== "undefined" ? String(data.company_address).trim() : (current.company_address || "");
    const company_website = data.company_website !== undefined && String(data.company_website) !== "undefined" ? String(data.company_website).trim() : (current.company_website || "");
    
    const agency_contact_name = data.agency_contact_name !== undefined && String(data.agency_contact_name) !== "undefined" ? String(data.agency_contact_name).trim() : (current.agency_contact_name || "");
    const agency_contact_email = data.agency_contact_email !== undefined && String(data.agency_contact_email) !== "undefined" ? String(data.agency_contact_email).trim() : (current.agency_contact_email || "");

    let logo_url = current.logo_url || "";
    if (req.file && req.file.filename) {
      const oldLogoUrl = current.logo_url;
      logo_url = `/uploads/${req.file.filename}`;

      // Purge old logo file cleanly out of storage layers if a new replacement is uploaded
      if (oldLogoUrl && oldLogoUrl !== logo_url && !oldLogoUrl.startsWith('http')) {
        const absoluteOldPath = path.join(process.cwd(), oldLogoUrl);
        if (fs.existsSync(absoluteOldPath)) {
          fs.unlinkSync(absoluteOldPath);
        }
      }
    } else if (data.logo_url !== undefined && String(data.logo_url) !== "undefined") {
      logo_url = String(data.logo_url);
    }

    const is_call_recording_enabled = parseToggleValue("is_call_recording_enabled");
    const is_sms_template_enabled = parseToggleValue("is_sms_template_enabled");
    const is_whatsapp_automation_enabled = parseToggleValue("is_whatsapp_automation_enabled");
    const is_email_trigger_enabled = parseToggleValue("is_email_trigger_enabled");
    const telephony_provider = data.telephony_provider !== undefined && String(data.telephony_provider) !== "undefined" ? String(data.telephony_provider) : (current.telephony_provider || "none");

    await connection.execute(
      `INSERT INTO settings (
        id, company_name, company_phone, company_email, company_address, company_website, logo_url,
        agency_contact_name, agency_contact_email, is_call_recording_enabled, is_sms_template_enabled, 
        is_whatsapp_automation_enabled, is_email_trigger_enabled, telephony_provider
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        company_name = VALUES(company_name),
        company_phone = VALUES(company_phone),
        company_email = VALUES(company_email),
        company_address = VALUES(company_address),
        company_website = VALUES(company_website),
        logo_url = VALUES(logo_url),
        agency_contact_name = VALUES(agency_contact_name),
        agency_contact_email = VALUES(agency_contact_email),
        is_call_recording_enabled = VALUES(is_call_recording_enabled),
        is_sms_template_enabled = VALUES(is_sms_template_enabled),
        is_whatsapp_automation_enabled = VALUES(is_whatsapp_automation_enabled),
        is_email_trigger_enabled = VALUES(is_email_trigger_enabled),
        telephony_provider = VALUES(telephony_provider)`,
      [
        company_name, company_phone, company_email, company_address, company_website, logo_url,
        agency_contact_name, agency_contact_email, is_call_recording_enabled, is_sms_template_enabled, 
        is_whatsapp_automation_enabled, is_email_trigger_enabled, telephony_provider
      ]
    );

    await connection.commit();
    return res.status(200).json({ success: true, message: "Systems settings synchronized successfully" });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Settings Update Error Trace:", err.message);
    return res.status(400).json({ success: false, error: err.message });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * PUT /api/settings/backup/trigger
 * Allows privileged admin scopes to trigger immediate manual database snapshots to cloud object nodes.
 */
const triggerManualBackup = async (req, res) => {
  const userRole = String(req.user?.role || "").toLowerCase().replace(/\s+|-/g, "");
  
  if (userRole !== "admin" && userRole !== "superadmin") {
    return res.status(403).json({ success: false, error: "Privileged administrator action required" });
  }

  try {
    console.log("[DEBUG]: Manual backup process initialized by user ID:", req.user?.id);
    const result = await runDatabaseBackup();
    console.log("[DEBUG]: Backup utility resolved successfully:", result);

    return res.status(200).json({ 
      success: true, 
      message: "Database backup snapshot routine executed cleanly",
      details: result 
    });
  } catch (err) {
    console.error("[CRITICAL BACKEND FAULT]:", err.message);
    return res.status(500).json({ 
      success: false, 
      error: `SYSTEM ENGINE REJECTION: ${err.message}` 
    });
  }
};

module.exports = { getSettings, updateSettings, triggerManualBackup };