const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * Fetches system settings and current admin profile data.
 */
const getSettings = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({
        message: "No user data found in token"
      });
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

        COALESCE(is_call_recording_enabled, 0) AS is_call_recording_enabled,
        COALESCE(telephony_provider, 'none') AS telephony_provider,
        COALESCE(is_sms_template_enabled, 0) AS is_sms_template_enabled,
        COALESCE(is_whatsapp_automation_enabled, 0) AS is_whatsapp_automation_enabled,
        COALESCE(is_email_trigger_enabled, 0) AS is_email_trigger_enabled

      FROM settings
      WHERE id = 1
    `);

    // Fetch logged-in admin
    const [user] = await pool.execute(
      "SELECT name, email FROM users WHERE id = ?",
      [req.user.id]
    );

    if (user.length === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Final settings object
    const settingsData =
      comp && comp.length > 0
        ? comp[0]
        : {};

    return res.status(200).json({
      ...settingsData,

      admin_name: user[0].name,
      admin_email: user[0].email
    });

  } catch (err) {
    console.error(
      "Settings Fetch Error:",
      err.message
    );

    return res.status(500).json({
      error: err.message
    });
  }
};
/**
 * Updates company settings and admin profile within a transaction.
 */
const fs = require('fs');
const path = require('path');

const updateSettings = async (req, res) => {
  try {
    const d = req.body;

    // SAFE BOOLEAN HELPER
    const toBool = (val) => {
      return (
        val === true ||
        val === "true" ||
        val === 1 ||
        val === "1"
      ) ? 1 : 0;
    };

    // LOAD EXISTING SETTINGS
    const [existingRows] = await pool.query(
      "SELECT * FROM settings WHERE id = 1"
    );

    const existing = existingRows[0] || {};

    // CURRENT LOGO
    const oldLogoUrl = existing.logo_url;

    // KEEP OLD LOGO UNLESS NEW ONE UPLOADED
    let logoToSave = oldLogoUrl || "";

    if (req.file) {
      logoToSave = `/uploads/${req.file.filename}`;

      // DELETE OLD LOGO
      if (oldLogoUrl && oldLogoUrl !== logoToSave) {
        const absoluteOldPath = path.join(
          process.cwd(),
          oldLogoUrl
        );

        if (fs.existsSync(absoluteOldPath)) {
          fs.unlinkSync(absoluteOldPath);
        }
      }
    }

    // SQL
    const sql = `
      INSERT INTO settings (
        id,
        company_name,
        company_phone,
        company_email,
        company_address,
        company_website,
        logo_url,
        admin_name,
        admin_email,
        is_call_recording_enabled,
        telephony_provider,
        is_sms_template_enabled,
        is_whatsapp_automation_enabled,
        is_email_trigger_enabled
      )
      VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON DUPLICATE KEY UPDATE
        company_name = VALUES(company_name),
        company_phone = VALUES(company_phone),
        company_email = VALUES(company_email),
        company_address = VALUES(company_address),
        company_website = VALUES(company_website),
        logo_url = VALUES(logo_url),
        admin_name = VALUES(admin_name),
        admin_email = VALUES(admin_email),
        is_call_recording_enabled = VALUES(is_call_recording_enabled),
        telephony_provider = VALUES(telephony_provider),
        is_sms_template_enabled = VALUES(is_sms_template_enabled),
        is_whatsapp_automation_enabled = VALUES(is_whatsapp_automation_enabled),
        is_email_trigger_enabled = VALUES(is_email_trigger_enabled)
    `;

    // SAFE VALUES
    const values = [
      d.company_name ??
        existing.company_name ??
        "",

      d.company_phone ??
        existing.company_phone ??
        "",

      d.company_email ??
        existing.company_email ??
        "",

      d.company_address ??
        existing.company_address ??
        "",

      d.company_website ??
        existing.company_website ??
        "",

      logoToSave ||
        existing.logo_url ||
        "",

      req.user?.name ||
        existing.admin_name ||
        "System Admin",

      req.user?.email ||
        existing.admin_email ||
        "",

      toBool(
        d.is_call_recording_enabled ??
        existing.is_call_recording_enabled
      ),

      d.telephony_provider ??
        existing.telephony_provider ??
        "none",

      toBool(
        d.is_sms_template_enabled ??
        existing.is_sms_template_enabled
      ),

      toBool(
        d.is_whatsapp_automation_enabled ??
        existing.is_whatsapp_automation_enabled
      ),

      toBool(
        d.is_email_trigger_enabled ??
        existing.is_email_trigger_enabled
      )
    ];

    await pool.query(sql, values);

    return res.json({
      success: true
    });

  } catch (err) {

    console.error(
      "BACKEND ERROR:",
      err.message
    );

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
module.exports = { getSettings, updateSettings };