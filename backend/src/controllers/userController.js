const { pool }  = require('../config/db');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');

// 🚀 Global import with correct relative fallback directory path
const activityController = require("./activityController");

// ─── ROLE ADAPTER ─────────────────────────────────────────────────────────────
const mapUIToDBRole = (uiRole) => {
  const rawString = String(uiRole || "").trim();

  // Keep uppercase ADMIN intact if passed that way
  if (rawString === "ADMIN") {
    return "Admin";
  }

  const n = rawString.toLowerCase();
  
  if (n === 'super admin' || n === 'superadmin') return 'Super Admin';
  
  // 🚀 FIXED: Map standard admins to 'Admin' (Capitalized) to perfectly match permission rows 14-26!
  if (n === 'admin')                            return 'Admin'; 
  
  if (n.includes('manager'))                     return 'Manager';
  if (n.includes('counselor'))                   return 'Counselor';
  if (n.includes('tele'))                        return 'Telecaller';
  
  return 'Counselor';
};

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password are required' });

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );
    if (!rows.length)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const user   = rows[0];
    const valid  = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (user.status !== 'active')
      return res.status(403).json({ success: false, message: 'Account suspended.' });

    const normalisedRole = mapUIToDBRole(user.role);

    // 🚀 FIXED: Log the authentication directly into the audit database trail!
    try {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  
  await activityController.record({
    userId: user.id,
    leadId: null, 
    actionType: "LOGIN",  // Keeps your destructuring safe
    action_type: "LOGIN", // 🚀 FIXED: Directly feeds your database column expectation!
    description: `Logged into the dashboard workspace successfully as ${normalisedRole} from IP ${clientIp}`
  });
  console.log(`📊 Audit Tracker: Login registered for User ID ${user.id}`);
} catch (logError) {
  console.error('⚠️ Secondary logging operation bypassed:', logError.message);
}

    // ── Fetch permissions ──────────────────────────────────────────────────
    let permissions = [];
    try {
      const [permRows] = await pool.execute(
        `SELECT slug, can_view, can_create, can_edit, can_delete, can_export
         FROM permissions
         WHERE LOWER(name) = LOWER(?)
         ORDER BY slug ASC`,
        [normalisedRole]
      );
      permissions = permRows;
    } catch (e) {
      console.error('Permission fetch failed during login:', e.message);
      permissions = [];
    }

    // ── Update last login ──────────────────────────────────────────────────
    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // ── Sign JWT ───────────────────────────────────────────────────────────
    const token = jwt.sign(
      {
        id:             user.id,
        role:           normalisedRole,       
        is_super_admin: Boolean(user.is_super_admin),
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.status(200).json({
      success:     true,
      token,
      permissions,                                             
      user: {
        id:             user.id,
        name:           user.name,
        email:          user.email,
        role:           normalisedRole,       
        is_super_admin: Boolean(user.is_super_admin),
      },
    });

  } catch (err) {
    console.error('Login core failure error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const [userRows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (!userRows.length)
      return res.status(404).json({ message: 'User not found' });

    const token   = crypto.randomBytes(20).toString('hex');
    const expires = new Date(Date.now() + 3600000);

    await pool.query(
      'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE email = ?',
      [token, expires, email]
    );
    return res.json({ success: true, message: 'Reset link generated.', token });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const [users] = await pool.query(
      'SELECT id, reset_password_expires FROM users WHERE reset_password_token = ?',
      [token]
    );
    if (!users.length)
      return res.status(400).json({ message: 'Invalid or expired link' });

    if (Date.now() > new Date(users[0].reset_password_expires).getTime())
      return res.status(400).json({ message: 'Link expired.' });

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
      [hashed, users[0].id]
    );
    return res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── USER MANAGEMENT ──────────────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, phone, role, status, last_login, designation, department FROM users ORDER BY id DESC'
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const createUser = async (req, res) => {
  const { name, email, phone, role, password, designation, department, status } = req.body;
  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length)
      return res.status(400).json({ success: false, message: 'Email already exists' });

    const dbRole  = mapUIToDBRole(role);
    const isSuper = dbRole === 'Super Admin' ? 1 : 0;
    const hashed  = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      `INSERT INTO users (name, email, phone, role, password, is_super_admin, designation, department, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone || null, dbRole, hashed, isSuper,
       designation || null, department || null, status || 'active']
    );
    return res.status(201).json({ success: true, userId: result.insertId });
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const updateUser = async (req, res) => {
  const { id }  = req.params;
  const { name, email, phone, role, password, designation, department, status } = req.body;
  try {
    const dbRole  = mapUIToDBRole(role);
    const isSuper = dbRole === 'Super Admin' ? 1 : 0;

    let sql    = `UPDATE users SET name=?, email=?, phone=?, role=?, is_super_admin=?, designation=?, department=?, status=?`;
    let params = [name, email, phone, dbRole, isSuper, designation, department, status];

    if (password) {
      sql += ', password=?';
      params.push(await bcrypt.hash(password, 10));
    }
    sql += ' WHERE id=?';
    params.push(id);

    await pool.execute(sql, params);
    return res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── SETTINGS & STAFF ─────────────────────────────────────────────────────────
const getSettings = async (req, res) => {
  try {
    const [comp] = await pool.execute(
      'SELECT id, name as company_name, phone as company_phone, email as company_email, address as company_address FROM branches LIMIT 1'
    );
    return res.status(200).json(comp[0] || {});
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getStaffList = async (req, res) => {
  try {
    const [staff] = await pool.query(
      "SELECT id, name, role FROM users WHERE role != 'Super Admin' ORDER BY name ASC"
    );
    return res.json({ success: true, data: staff });
  } catch (err) {
    console.error('getStaffList error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── EXPORTS ──────────────────────────────────────────────────────────────────
module.exports = {
  login,
  forgotPassword,
  resetPassword,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getSettings,
  updateSettings,
  getStaffList,
};