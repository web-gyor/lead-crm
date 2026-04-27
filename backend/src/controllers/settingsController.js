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
const updateSettings = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const data = req.body;
    const userId = req.user.id;

    // Update Company Settings
    await connection.execute(
      `UPDATE settings SET 
        company_name = ?, company_phone = ?, company_email = ?, 
        company_address = ?, company_website = ?, logo_url = ? 
       WHERE id = 1`,
      [
        data.company_name, 
        data.company_phone, 
        data.company_email, 
        data.company_address, 
        data.company_website, 
        data.logo_url
      ]
    );

    // Update Admin Profile
    await connection.execute(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [data.admin_name, data.admin_email, userId]
    );

    // Password Update Logic
    if (data.new_password && data.current_password) {
      const [user] = await connection.execute("SELECT password FROM users WHERE id = ?", [userId]);
      const isMatch = await bcrypt.compare(data.current_password, user[0].password);
      
      if (!isMatch) {
        throw new Error("Current password incorrect");
      }

      const hashed = await bcrypt.hash(data.new_password, 10);
      await connection.execute("UPDATE users SET password = ? WHERE id = ?", [hashed, userId]);
    }

    await connection.commit();
    return res.status(200).json({ success: true, message: "Settings updated successfully" });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Settings Update Error:", err.message);
    return res.status(400).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { getSettings, updateSettings };