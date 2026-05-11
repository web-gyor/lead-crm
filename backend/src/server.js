process.env.TZ = 'Asia/Kolkata';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { pool, testConnection } = require('./config/db');

// --- Route Imports ---
const webhookRoutes = require("./routes/webhookRoutes");
const leadRoutes = require('./routes/leadRoutes');
const userRoutes = require('./routes/userRoutes');
const logRoutes = require('./routes/logRoutes');
const permissionsRouter = require('./routes/permissionRoutes');
const activityRoutes = require("./routes/activityRoutes");
const countryRoutes = require('./routes/countryRoutes');
const courseRoutes = require('./routes/courseRoutes');
const distributionRoutes = require('./routes/distributionRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const staffPerformanceRoutes = require('./routes/staffPerformanceRoutes');
const telephonyRoutes = require('./routes/telephonyRoutes');
// --- Controller Imports ---
const analyticsController = require('./controllers/analyticsController');
const { authenticateToken } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 4000;

// --- 1. Global Middleware & CORS ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || 
                     origin.startsWith('http://localhost') || 
                     origin.endsWith('.vercel.app');
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

// Body Parsers (MUST be before routes)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan('dev'));

// --- 2. API Routes ---

// Auth & User Management
app.use('/auth', userRoutes); 
app.use('/api/users', userRoutes);

// Core Modules
app.use('/api/leads', leadRoutes);
app.use('/api/v1/webhooks', webhookRoutes); // Handlers for Meta/WhatsApp/Google
app.use('/api/attendance', attendanceRoutes);
app.use('/api/distribution', distributionRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/permissions', permissionsRouter);
app.use('/api/activity', activityRoutes);
app.use('/api/staff-performance', staffPerformanceRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/telephony', telephonyRoutes);
// --- 3. Feature Endpoints (Inline Logic) ---

app.get('/api/analytics/business-overview', authenticateToken, analyticsController.getBusinessOverview);

// Pipeline logic for Kanban/Dashboard
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
    return res.status(500).json({ error: "Pipeline failed" });
  }
});

// Settings Management
// Settings Management (Updated for Call Recording)
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
      admin_email: s?.admin_email || "",
      // New Call Recording Fields
      is_call_recording_enabled: !!s?.is_call_recording_enabled, // Converts 1/0 to true/false
      telephony_provider: s?.telephony_provider || "none"
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const { 
      company_name, company_phone, company_email, company_address, 
      company_website, logo_url, admin_name, admin_email,
      is_call_recording_enabled, telephony_provider 
    } = req.body;

    await pool.query(
      `INSERT INTO settings (
        id, company_name, company_phone, company_email, company_address, 
        company_website, logo_url, admin_name, admin_email, 
        is_call_recording_enabled, telephony_provider
      )
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
       telephony_provider = VALUES(telephony_provider)`,
      [
        company_name, company_phone, company_email, company_address, 
        company_website, logo_url, admin_name, admin_email,
        is_call_recording_enabled ? 1 : 0, // SQL tinyint handle
        telephony_provider || 'none'
      ]
    );
    return res.status(200).json({ success: true, message: "Settings saved" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', project: 'Project Sakshi 2026' }));

// --- 4. Server Initialization ---
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