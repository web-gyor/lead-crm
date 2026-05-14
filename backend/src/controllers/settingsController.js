const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * Fetches system settings and current admin profile data.
 */
const getSettings = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: "No user data found in token" });
    }

    const [comp] = await pool.execute("SELECT * FROM settings WHERE id = 1");
    const [user] = await pool.execute("SELECT name, email FROM users WHERE id = ?", [req.user.id]);

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      ...(comp[0] || {}),
      admin_name: user[0].name,
      admin_email: user[0].email
    });
  } catch (err) {
    console.error("Settings Fetch Error:", err.message);
    return res.status(500).json({ error: err.message });
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
    
    // 1. Get current logo path from DB
    const [rows] = await pool.query("SELECT logo_url FROM settings WHERE id = 1");
    const oldLogoUrl = rows[0]?.logo_url;

    // 2. Determine the static path for the new logo
    // We force this to be 'agency-logo' to match your Multer config
   let logoToSave = oldLogoUrl || "";

if (req.file) {
  logoToSave = `/uploads/${req.file.filename}`;
}

    if (req.file) {
      logoToSave = `/uploads/${req.file.filename}`;

      // 3. DELETE OLD FILE: Use process.cwd() so it finds the file in backend/uploads
      if (oldLogoUrl && oldLogoUrl !== logoToSave) {
        const absoluteOldPath = path.join(process.cwd(), oldLogoUrl);
        if (fs.existsSync(absoluteOldPath)) {
          fs.unlinkSync(absoluteOldPath);
        }
      }
    }

    // 4. DEFINE THE SQL STRING (This fixes your 'sql is not defined' error)
    const sql = `
      INSERT INTO settings (
        id, company_name, company_phone, company_email, company_address, company_website, 
        logo_url, admin_name, admin_email, is_call_recording_enabled, telephony_provider, 
        is_sms_template_enabled, is_whatsapp_automation_enabled, is_email_trigger_enabled
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        company_name=VALUES(company_name), company_phone=VALUES(company_phone), 
        company_email=VALUES(company_email), company_address=VALUES(company_address), 
        company_website=VALUES(company_website), logo_url=VALUES(logo_url), 
        admin_name=VALUES(admin_name), admin_email=VALUES(admin_email),
        is_call_recording_enabled=VALUES(is_call_recording_enabled),
        telephony_provider=VALUES(telephony_provider),
        is_sms_template_enabled=VALUES(is_sms_template_enabled),
        is_whatsapp_automation_enabled=VALUES(is_whatsapp_automation_enabled),
        is_email_trigger_enabled=VALUES(is_email_trigger_enabled)
    `;

    // 5. Prepare values (Ensure booleans are converted to 1/0 for MySQL)
    const values = [
      d.company_name || "", d.company_phone || "", d.company_email || "",
      d.company_address || "", d.company_website || "", 
      logoToSave, 
      req.user?.name || "System Admin", req.user?.email || "",
      d.is_call_recording_enabled === 'true' || d.is_call_recording_enabled === true ? 1 : 0,
      d.telephony_provider || "none",
      d.is_sms_template_enabled === 'true' || d.is_sms_template_enabled === true ? 1 : 0,
      d.is_whatsapp_automation_enabled === 'true' || d.is_whatsapp_automation_enabled === true ? 1 : 0,
      d.is_email_trigger_enabled === 'true' || d.is_email_trigger_enabled === true ? 1 : 0
    ];

    await pool.query(sql, values);
    res.json({ success: true });

  } catch (err) {
    console.error("BACKEND ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
module.exports = { updateSettings };

module.exports = { getSettings, updateSettings };