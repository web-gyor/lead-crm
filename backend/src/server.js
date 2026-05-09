process.env.TZ = 'Asia/Kolkata';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool, testConnection } = require('./config/db');

// --- Route Imports ---
const webhookRoutes = require("./routes/webhookRoutes");
const leadRoutes = require('./routes/leadRoutes');
const { authenticateToken: protect, authenticateToken } = require("./middleware/auth");
const userRoutes = require('./routes/userRoutes');
const logRoutes = require('./routes/logRoutes');
const permissionsRouter = require('./routes/permissionRoutes');
const activityRoutes = require("./routes/activityRoutes");
const countryRoutes = require('./routes/countryRoutes');
const courseRoutes = require('./routes/courseRoutes');
const distributionRoutes = require('./routes/distributionRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const staffPerformanceRoutes = require('./routes/staffPerformanceRoutes');
// --- Controller Imports ---
const analyticsController = require('./controllers/analyticsController');

const app = express();
const PORT = process.env.PORT || 4000;

// Logging Middleware
app.use((req, res, next) => {
    console.log(`Incoming Request: ${req.method} ${req.url}`);
    next();
});

// --- Global Middleware ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://lead-crm-alpha.vercel.app',
  'https://lead-ihn4a2w61-webgyors-projects.vercel.app' // Added from your logs
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
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

// --- API ROUTES (ORDER MATTERS) ---

// 1. Auth & User Management
app.use('/auth', userRoutes);       // Handles: POST /auth/login
app.use('/api/users', userRoutes);  // Handles: Password resets

// 2. SPECIFIC MODULES (Must be above general /api)
app.use('/api/attendance', attendanceRoutes);
app.use('/api/distribution', distributionRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/permissions', permissionsRouter);
app.use('/api/masters', leadRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/staff-performance', staffPerformanceRoutes);
// 3. GENERAL LOGGING / CATCH-ALL (Moved down to prevent 404s)
app.use('/api', logRoutes); 

// 4. VERSIONED WEBHOOKS
app.use("/api/v1/webhooks", webhookRoutes);
app.use("/api/v1/leads", protect, leadRoutes);

// --- FEATURE ENDPOINTS ---

app.get('/api/analytics/business-overview', authenticateToken, analyticsController.getBusinessOverview);

// Follow-ups Logic
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

// Pipeline Logic
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



app.get('/api/lead-sources', async (req, res) => {
  const [rows] = await pool.query("SELECT id, name FROM lead_sources");
  res.json(rows);
});

app.get('/health', (req, res) => res.json({ status: 'ok', project: 'Project Sakshi 2026' }));

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM settings WHERE id = 1");
    const s = rows[0];
    return res.status(200).json({
      company_name: s?.company_name || "",
      company_phone: s?.company_phone || "",
      company_email: s?.company_email || "",
      company_address: s?.company_address || "",
      company_website: s?.company_website || "",
      logo_url: s?.logo_url || "",
      admin_name: s?.admin_name || "",
      admin_email: s?.admin_email || ""
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const { company_name, company_phone, company_email, company_address, company_website, logo_url, admin_name, admin_email } = req.body;
    await pool.query(
      `INSERT INTO settings (id, company_name, company_phone, company_email, company_address, company_website, logo_url, admin_name, admin_email)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       company_name = VALUES(company_name), company_phone = VALUES(company_phone), company_email = VALUES(company_email),
       company_address = VALUES(company_address), company_website = VALUES(company_website), logo_url = VALUES(logo_url),
       admin_name = VALUES(admin_name), admin_email = VALUES(admin_email)`,
      [company_name, company_phone, company_email, company_address, company_website, logo_url, admin_name, admin_email]
    );
    return res.status(200).json({ success: true, message: "Settings saved" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// --- Server Initialization ---
async function start() {
  try {
    await testConnection();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ CRM Server Active: http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("Initialization Failed:", err.message);
    process.exit(1);
  }
}

start();