process.env.TZ = 'Asia/Kolkata';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool, testConnection } = require('./config/db');

// Route Imports
const courseRoutes = require('./routes/courseRoutes');
const leadRoutes = require('./routes/leadRoutes');
const userRoutes = require('./routes/userRoutes');
const logRoutes = require('./routes/logRoutes');
const permissionsRouter = require('./routes/permissionRoutes');
const activityRoutes = require("./routes/activityRoutes");

// Controller Imports
const courseController = require('./controllers/courseController');
const analyticsController = require('./controllers/analyticsController');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 4000;

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '4mb' }));
app.use(morgan('dev'));

// Rate Limiter for Authentication
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- API ROUTES ---

// Auth & User Management (Mounted twice to handle both frontend URL structures)
app.use('/auth', userRoutes);       // Handles: POST /auth/login
app.use('/api/users', userRoutes);  // Handles: POST /api/users/forgot-password & reset-password

// Core Functional Routes
app.use('/api/courses', courseRoutes);
app.use('/api/permissions', permissionsRouter);
app.use('/api/masters', leadRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api', logRoutes);

// --- ANALYTICS & CUSTOM ENDPOINTS ---

app.get('/api/analytics/business-overview', authenticateToken, analyticsController.getBusinessOverview);

// Follow-ups
app.get('/api/followups', authenticateToken, async (req, res) => {
  try {
    const role = req.user?.role?.toLowerCase() || '';
    const userId = req.user?.id;

    let whereClause = "l.lead_status = 'Follow-up'";
    const params = [];

    if (role !== 'admin' && userId) {
      whereClause += " AND l.assigned_user_id = ?";
      params.push(userId);
    }

    const [rows] = await pool.query(`
      SELECT l.*, u.name as assigned_user_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_user_id = u.id
      WHERE ${whereClause}
      ORDER BY l.next_follow_up_date ASC
    `, params);

    return res.status(200).json(rows);
  } catch (err) {
    console.error("Follow-ups Error:", err.message);
    return res.status(500).json({ error: "Failed to load follow-ups" });
  }
});

// Pipeline
app.get('/api/pipeline', authenticateToken, async (req, res) => {
  try {
    const role = req.user?.role?.toLowerCase() || '';
    const userId = req.user?.id;

    let whereClause = "l.lead_status IN ('New', 'Contacted', 'Interested', 'Follow-up')";
    const params = [];

    if (role !== 'admin' && userId) {
      whereClause += " AND l.assigned_user_id = ?";
      params.push(userId);
    }

    const [rows] = await pool.query(`
      SELECT l.*, u.name as assigned_user_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_user_id = u.id
      WHERE ${whereClause}
      ORDER BY l.updated_at DESC
    `, params);

    return res.status(200).json({ leads: rows });
  } catch (err) {
    console.error("Pipeline Error:", err.message);
    return res.status(500).json({ error: "Pipeline failed" });
  }
});

// Staff Performance Stats
app.get('/api/staff-stats', authenticateToken, async (req, res) => {
  try {
    const { from, to, id, staffId } = req.query;
    const targetId = id || staffId;

    let query = `
      SELECT
        u.id, u.name, u.role,
        COUNT(l.id) as total_leads,
        SUM(CASE WHEN l.lead_status = 'Converted' THEN 1 ELSE 0 END) as conversions,
        ROUND((SUM(CASE WHEN l.lead_status = 'Converted' THEN 1 ELSE 0 END) / NULLIF(COUNT(l.id), 0)) * 100, 1) as performance
      FROM users u
      LEFT JOIN leads l ON u.id = l.assigned_user_id
    `;

    const whereClauses = ["u.role != 'admin'"];
    const queryParams = [];

    if (from && to) {
      whereClauses.push("l.created_at BETWEEN ? AND ?");
      queryParams.push(`${from} 00:00:00`, `${to} 23:59:59`);
    }

    if (targetId && targetId !== 'all') {
      whereClauses.push("u.id = ?");
      queryParams.push(targetId);
    }

    query += ` WHERE ` + whereClauses.join(" AND ");
    query += ` GROUP BY u.id ORDER BY total_leads DESC`;

    const [rows] = await pool.query(query, queryParams);
    return res.status(200).json(rows || []);
  } catch (err) {
    console.error("Staff Stats Error:", err.message);
    return res.status(500).json({ error: "Failed to fetch filtered stats" });
  }
});

// Miscellaneous Data
app.get('/api/lead-sources', async (req, res) => {
  const [rows] = await pool.query("SELECT id, name FROM lead_sources");
  res.json(rows);
});

app.get('/health', (req, res) => res.json({ status: 'ok', project: 'Project Sakshi 2026' }));

// Settings Management
app.get('/api/settings', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM settings WHERE id = 1");
    const s = rows[0];
    return res.status(200).json({
      company_name:    s?.company_name    || "",
      company_phone:   s?.company_phone   || "",
      company_email:   s?.company_email   || "",
      company_address: s?.company_address || "",
      company_website: s?.company_website || "",
      logo_url:        s?.logo_url        || "",
      admin_name:      s?.admin_name      || "",
      admin_email:     s?.admin_email     || ""
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const {
      company_name, company_phone, company_email,
      company_address, company_website, logo_url,
      admin_name, admin_email
    } = req.body;

    await pool.query(
      `INSERT INTO settings
          (id, company_name, company_phone, company_email, company_address, company_website, logo_url, admin_name, admin_email)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
          company_name    = VALUES(company_name),
          company_phone   = VALUES(company_phone),
          company_email   = VALUES(company_email),
          company_address = VALUES(company_address),
          company_website = VALUES(company_website),
          logo_url        = VALUES(logo_url),
          admin_name      = VALUES(admin_name),
          admin_email     = VALUES(admin_email)`,
      [company_name, company_phone, company_email, company_address, company_website, logo_url, admin_name, admin_email]
    );

    return res.status(200).json({ success: true, message: "Settings saved successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Server Initialization
async function start() {
  try {
    await testConnection();
    app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
  } catch (err) {
    console.error("Initialization Failed:", err.message);
    process.exit(1);
  }
}

start();