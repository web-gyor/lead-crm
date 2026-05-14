// ─── Timezone must be set before anything else ────────────────────────────────
process.env.TZ = "Asia/Kolkata";

// ─── Core imports ─────────────────────────────────────────────────────────────
require("dotenv").config();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const express    = require("express");
const path = require('path');
const cors       = require("cors");
const morgan     = require("morgan");
const helmet     = require("helmet");           
const rateLimit  = require("express-rate-limit"); 

const { pool, testConnection } = require("./config/db");
const { authenticateToken }    = require("./middleware/auth");

// ─── Route imports ────────────────────────────────────────────────────────────
const webhookRoutes          = require("./routes/webhookRoutes");
const leadRoutes             = require("./routes/leadRoutes");
const userRoutes             = require("./routes/userRoutes");
const logRoutes              = require("./routes/logRoutes");
const permissionsRouter      = require("./routes/permissionRoutes");
const activityRoutes         = require("./routes/activityRoutes");
const countryRoutes          = require("./routes/countryRoutes");
const courseRoutes           = require("./routes/courseRoutes");
const distributionRoutes     = require("./routes/distributionRoutes");
const attendanceRoutes       = require("./routes/attendanceRoutes");
const staffPerformanceRoutes = require("./routes/staffPerformanceRoutes");
const telephonyRoutes        = require("./routes/telephonyRoutes");
const integrationRoutes      = require("./routes/integrationRoutes"); 
const followupRoutes         = require("./routes/followupRoutes"); // Fix: Added missing import
const settingsRoutes = require('./routes/settingsRoutes');
// ─── Controller imports ───────────────────────────────────────────────────────
const analyticsController = require("./controllers/analyticsController");

// ─── App init ─────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 4000;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

// --- Merged allowedOrigins logic ---
const envOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean) 
  : [];

const allowedOrigins = [
  ...envOrigins,
  "https://lead-crm-git-main-webgyors-projects.vercel.app",
  "https://lead-crm-kappa-tawny.vercel.app", // Added your primary production URL
  "https://lead-crm-tmz8.onrender.com"
];

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:5173", "http://localhost:3000");
}

// --- CORS Configuration ---
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app");

    if (isAllowed) {
      return callback(null, true);
    }

    console.error("CORS Blocked:", origin);
    return callback(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// --- Rate Limiter ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  message: { success: false, message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(apiLimiter);
// ═══════════════════════════════════════════════════════════════════════════════
// 2. BODY PARSERS & LOGGING
// ═══════════════════════════════════════════════════════════════════════════════
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.use("/auth", userRoutes);
app.use("/api/users", userRoutes);
app.use("/webhooks", webhookRoutes);

// Core modules
app.use("/api/leads", leadRoutes);
app.use("/api/followups", followupRoutes); // Fix: Explicitly mapped to followupRoutes
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
app.use('/api/settings', settingsRoutes);

// Fix: Direct Alias for Lead Sources (Frontend calls /api/lead-sources)
app.get('/api/lead-sources', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM lead_sources");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch sources" });
  }
});

// Analytics
app.get("/api/analytics/business-overview", authenticateToken, analyticsController.getBusinessOverview);

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/pipeline", authenticateToken, async (req, res) => {
  try {
    const role = (req.user?.role || "").toLowerCase();
    const userId = req.user?.id;
    const where = ["l.lead_status IN ('New', 'Contacted', 'Interested', 'Follow-up')"];
    const params = [];

    if (role !== "admin" && userId) {
      where.push("l.assigned_user_id = ?");
      params.push(userId);
    }

    const [rows] = await pool.query(
      `SELECT l.*, u.name AS assigned_user_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_user_id = u.id
       WHERE ${where.join(" AND ")}
       ORDER BY l.updated_at DESC LIMIT 500`,
      params
    );
    return res.json({ success: true, leads: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Pipeline failed" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/settings", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM settings WHERE id = 1 LIMIT 1");
    const s = rows[0] ?? {};
 return res.json({
  company_name: s.company_name ?? "",
  company_phone: s.company_phone ?? "",
  company_email: s.company_email ?? "",
  company_address: s.company_address ?? "",
  company_website: s.company_website ?? "",
  logo_url: s.logo_url ?? "",
  admin_name: s.admin_name ?? "",
  admin_email: s.admin_email ?? "",

  is_call_recording_enabled: !!s.is_call_recording_enabled,
  telephony_provider: s.telephony_provider ?? "none",

  is_sms_template_enabled: !!s.is_sms_template_enabled,
  is_whatsapp_automation_enabled: !!s.is_whatsapp_automation_enabled,
  is_email_trigger_enabled: !!s.is_email_trigger_enabled
});
  } catch (err) {
    return res.status(500).json({ success: false, message: "Settings load failed" });
  }
});

app.put(
  "/api/settings",
  authenticateToken,
  upload.single("logo"),
  async (req, res) => {
    if ((req.user?.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    try {
      const data = req.body || {};

      const logo_url = req.file
        ? `/uploads/${req.file.filename}`
        : (data.logo_url || "");

      const toBool = (v) =>
        v === true || v === "true" || v === 1 || v === "1";

      const values = [
        data.company_name || "",
        data.company_phone || "",
        data.company_email || "",
        data.company_address || "",
        data.company_website || "",
        logo_url,

        data.admin_name || "",
        data.admin_email || "",

        toBool(data.is_call_recording_enabled) ? 1 : 0,
        data.telephony_provider || "none",

        toBool(data.is_sms_template_enabled) ? 1 : 0,
        toBool(data.is_whatsapp_automation_enabled) ? 1 : 0,
        toBool(data.is_email_trigger_enabled) ? 1 : 0
      ];

      await pool.query(
        `INSERT INTO settings (
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
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          is_email_trigger_enabled = VALUES(is_email_trigger_enabled)`,
        values
      );

      return res.json({
        success: true,
        message: "Settings saved successfully"
      });

    } catch (err) {
      console.error("Settings save failed:", err);
      return res.status(500).json({
        success: false,
        message: "Settings save failed"
      });
    }
  }
);

app.get("/health", (req, res) => res.json({ status: "ok", project: "Project Sakshi 2026", ts: new Date().toISOString() }));

app.use((err, req, res, _next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({ success: false, message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

async function start() {
  try {
    await testConnection();
    app.listen(PORT, "0.0.0.0", () => console.log(`✅ CRM Server Active: http://0.0.0.0:${PORT}`));
  } catch (err) {
    console.error("Init failed:", err.message);
    process.exit(1);
  }
}
start();