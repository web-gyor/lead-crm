// ─── Timezone & Environment ──────────────────────────────────────────────────
process.env.TZ = "Asia/Kolkata";
require("dotenv").config();

// ─── Core Imports ─────────────────────────────────────────────────────────────
const express     = require("express");
const path        = require('path');
const cors        = require("cors");
const morgan      = require("morgan");
const helmet      = require("helmet");
const rateLimit   = require("express-rate-limit");
const cron        = require("node-cron");
const multer      = require("multer");

const { pool, testConnection } = require("./config/db");
const { authenticateToken }     = require("./middleware/auth");

// ─── Initialization ───────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5000;
const upload = multer({ dest: "uploads/" });

// 🚀 PROXIES OVERRIDE: Tells Express to look past Vercel's network nodes to read real client IPs
app.set("trust proxy", 1);

// ─── Global Body Parsers ──────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ─── Security & Middleware (PRODUCTION OPTIMIZED CORS FOR EXECUTIONS) ─────────
app.use(helmet({ crossOriginResourcePolicy: false }));

const envOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean) : [];
const allowedOrigins = [
  ...envOrigins, 
  "https://lead-crm-git-main-webgyors-projects.vercel.app", 
  "https://lead-crm-git-main-webgyors-projects.vercel.app/",
  "https://lead-crm-kappa-tawny.vercel.app",
  "https://lead-crm-kappa-tawny.vercel.app/",
  "https://lead-crm-sand.vercel.app",
  "https://lead-crm-sand.vercel.app/"
];

// Configure standard global options settings
app.use(cors({
  origin: (origin, callback) => {
    const cleanOrigin = origin ? origin.replace(/\/$/, "") : "";
    const cleanAllowed = allowedOrigins.map(o => o.replace(/\/$/, ""));

    if (!origin || cleanAllowed.includes(cleanOrigin) || (typeof origin === "string" && origin.includes(".vercel.app"))) {
      return callback(null, true);
    }
    console.error(`[CORS REJECTION]: Request from origin ${origin} blocked.`);
    return callback(new Error(`CORS Error: Origin ${origin} not permitted.`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// 🚀 SAFE PREFLIGHT MIDDLEWARE: Bypasses path-to-regexp string crashes completely
app.use(cors());

// 🛡️ ACCELERATED RATE LIMITER: Expanded windows to accommodate intense parallel multi-user logins
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 3000 : 10000, 
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS"
});

app.use("/api", apiLimiter);
app.use("/auth", apiLimiter);

// ─── Route Imports (🚀 RE-ESTABLISHED MODULE REFERENCES) ──────────────────────
const webhookRoutes         = require("./routes/webhookRoutes");
const archiveRoutes         = require("./routes/archiveRoutes");
const leadRoutes            = require("./routes/leadRoutes");
const dashboardRoutes       = require("./routes/dashboardRoutes");
const userRoutes            = require("./routes/userRoutes");
const logRoutes             = require("./routes/logRoutes");
const permissionsRouter     = require("./routes/permissionRoutes");
const activityRoutes        = require("./routes/activityRoutes");
const countryRoutes         = require("./routes/countryRoutes");
const courseRoutes          = require("./routes/courseRoutes");
const distributionRoutes    = require("./routes/distributionRoutes");
const attendanceRoutes      = require("./routes/attendanceRoutes");
const staffPerformanceRoutes = require("./routes/staffPerformanceRoutes");
const telephonyRoutes       = require("./routes/telephonyRoutes");
const integrationRoutes     = require("./routes/integrationRoutes"); 
const followupRoutes        = require("./routes/followupRoutes");
const communicationRoutes   = require("./routes/communicationRoutes");
const automationRoutes      = require("./routes/automationRoutes");
const analyticsRoutes       = require("./routes/analyticsRoutes");
const { runDatabaseBackup } = require('./utils/backupScheduler');

// ─── Static Uploads Route ─────────────────────────────────────────────────────
app.use('/uploads', (req, res) => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const filePath   = path.join(uploadsDir, req.path);

  if (!filePath.startsWith(uploadsDir)) return res.status(403).end();

  const fs = require('fs');
  if (!fs.existsSync(filePath)) return res.status(404).end();

  const fd  = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(8);
  fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);

  let contentType = 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) contentType = 'image/png';
  else if (buf[0] === 0x47 && buf[1] === 0x49) contentType = 'image/gif';
  else if (buf[0] === 0x52 && buf[1] === 0x49) contentType = 'image/webp';

  res.setHeader('Content-Type', contentType);
  res.sendFile(filePath);
});
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ─── Settings Routes ──────────────────────────────────────────────────────────
app.get("/api/settings", authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * FROM settings WHERE id = 1 LIMIT 1");
    const s = rows[0] ?? {};
    
    return res.json({
      success: true, 
      data: {
        company_name: s.company_name ?? "",
        company_phone: s.company_phone ?? "",
        company_email: s.company_email ?? "",
        company_address: s.company_address ?? "",
        company_website: s.company_website ?? "",
        logo_url: s.logo_url ?? "",
        agency_contact_name: s.agency_contact_name ?? "",
        agency_contact_email: s.agency_contact_email ?? "",
        is_call_recording_enabled: !!s.is_call_recording_enabled,
        telephony_provider: s.telephony_provider ?? "none",
        is_sms_template_enabled: !!s.is_sms_template_enabled,
        is_whatsapp_automation_enabled: !!s.is_whatsapp_automation_enabled,
        is_email_trigger_enabled: !!s.is_email_trigger_enabled
      }
    });
  } catch (err) {
    console.error("Settings load error:", err);
    return res.status(500).json({ success: false, message: "Settings load failed" });
  } finally {
    if (connection) connection.release();
  }
});

app.put("/api/settings", authenticateToken, upload.single("logo"), async (req, res) => {
  const userRole = String(req.user?.role || "").toLowerCase().replace(/\s+|-/g, "");
  if (userRole !== "admin" && userRole !== "superadmin") {
    return res.status(403).json({ success: false, message: "Admin authorization access required" });
  }

  let connection;
  try {
    const data = req.body || {};
    connection = await pool.getConnection();
    
    const [currentRows] = await connection.query("SELECT * FROM settings WHERE id = 1 LIMIT 1");
    const current = currentRows[0] || {};

    let logo_url = current.logo_url || "";
    if (req.file) logo_url = `/uploads/${req.file.filename}`;

    const parseToggleValue = (key) => {
      if (data[key] === undefined) return current[key] !== undefined ? current[key] : 0;
      return (data[key] === true || data[key] === "true" || data[key] === 1 || data[key] === "1") ? 1 : 0;
    };

    const values = [
      data.company_name !== undefined ? String(data.company_name).trim() : (current.company_name || ""),
      data.company_phone !== undefined ? String(data.company_phone).trim() : (current.company_phone || ""),
      data.company_email !== undefined ? String(data.company_email).trim() : (current.company_email || ""),
      data.company_address !== undefined ? String(data.company_address).trim() : (current.company_address || ""),
      data.company_website !== undefined ? String(data.company_website).trim() : (current.company_website || ""),
      logo_url,
      data.agency_contact_name !== undefined ? String(data.agency_contact_name).trim() : (current.agency_contact_name || ""),
      data.agency_contact_email !== undefined ? String(data.agency_contact_email).trim() : (current.agency_contact_email || ""),
      parseToggleValue("is_call_recording_enabled"),
      data.telephony_provider !== undefined ? String(data.telephony_provider) : (current.telephony_provider || "none"),
      parseToggleValue("is_sms_template_enabled"),
      parseToggleValue("is_whatsapp_automation_enabled"),
      parseToggleValue("is_email_trigger_enabled")
    ];

    await connection.query(
      `INSERT INTO settings (id, company_name, company_phone, company_email, company_address, company_website, logo_url, agency_contact_name, agency_contact_email, is_call_recording_enabled, telephony_provider, is_sms_template_enabled, is_whatsapp_automation_enabled, is_email_trigger_enabled)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         company_name=VALUES(company_name), company_phone=VALUES(company_phone), company_email=VALUES(company_email), 
         company_address=VALUES(company_address), company_website=VALUES(company_website), logo_url=VALUES(logo_url), 
         agency_contact_name=VALUES(agency_contact_name), agency_contact_email=VALUES(agency_contact_email), is_call_recording_enabled=VALUES(is_call_recording_enabled), 
         telephony_provider=VALUES(telephony_provider), is_sms_template_enabled=VALUES(is_sms_template_enabled), 
         is_whatsapp_automation_enabled=VALUES(is_whatsapp_automation_enabled), is_email_trigger_enabled=VALUES(is_email_trigger_enabled)`,
      values
    );

    return res.json({ success: true, message: "Settings saved successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Settings save failed" });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/test-my-backup-now', async (req, res) => {
  try {
    const outcome = await runDatabaseBackup();
    return res.status(200).json({ success: true, message: "Local system pass!", outcome });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

const directBackupHandler = async (req, res) => {
  try {
    const outcome = await runDatabaseBackup();
    return res.status(200).json({ success: true, message: "Backup complete!", outcome });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

app.put('/api/settings/backup/trigger', authenticateToken, directBackupHandler);
app.put('/api/v1/settings/backup/trigger', authenticateToken, directBackupHandler);
app.put('/settings/backup/trigger', authenticateToken, directBackupHandler);

// ─── Route Mapping ────────────────────────────────────────────────────────────
app.use("/api/auth", userRoutes);
app.use("/api/users", userRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/api/leads/archive", archiveRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/followups", followupRoutes);
app.use("/api/communication-templates", communicationRoutes);
app.use("/api/automation-rules", automationRoutes);
require("./automationWorker");
app.use("/api/integrations", integrationRoutes); 
app.use("/api/telephony", telephonyRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/distribution", distributionRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/countries", countryRoutes);
app.use("/api/permissions", permissionsRouter);
app.use("/api/activity", activityRoutes);
app.use("/api/staff-performance", staffPerformanceRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/analytics", analyticsRoutes);

// Pipeline Alias
app.get("/api/pipeline", authenticateToken, async (req, res) => {
  let connection;
  try {
    const role = (req.user?.role || "").toLowerCase();
    const userId = req.user?.id;
    const where = ["deleted_at IS NULL", "lead_status IN ('New', 'Contacted', 'Interested', 'Follow-up')"];
    const params = [];
    
    if (role !== "admin" && role !== "super-admin" && role !== "super admin" && userId) { 
      where.push("(assigned_user_id = ? OR assigned_to = ?)"); 
      params.push(userId, userId); 
    }
    
    connection = await pool.getConnection();
    const sql = `SELECT * FROM leads WHERE ${where.join(" AND ")} ORDER BY updated_at DESC LIMIT 500`;
    const [rows] = await connection.query(sql, params);
    
    return res.json({ success: true, leads: rows });
  } catch (err) { 
    return res.status(500).json({ success: false, error: "Pipeline data load failed" }); 
  } finally {
    if (connection) connection.release();
  }
});

// ─── Archive Lifecycle Task ────────────────────────────────────────────────────
cron.schedule("0 0 * * *", async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.execute(`INSERT INTO archived_leads SELECT * FROM leads WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR) AND is_archived = 0`);
    await connection.execute(`DELETE FROM leads WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)`);
    await connection.commit();
  } catch (error) { 
    if (connection) await connection.rollback(); 
  } finally { 
    if (connection) connection.release(); 
  }
});

// ─── Server Start ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", project: "Project Sakshi 2026", ts: new Date().toISOString() }));

async function start() {
  try {
    await testConnection();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ CRM Server Active on Port ${PORT}`);
    });
  } catch (err) { process.exit(1); }
}
start();