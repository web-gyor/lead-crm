const { pool }           = require("../config/db");
const { checkVpsStorage } = require("../utils/storageHelper");
const axios               = require("axios");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isAdmin = (user) => (user?.role || "").toLowerCase() === "admin";

/** Normalise to last 10 digits. Returns null if invalid. */
const cleanPhone = (raw = "") => {
  const digits = String(raw).replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? digits : null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// INITIATE CALL  (POST /api/telephony/call)
// ═══════════════════════════════════════════════════════════════════════════════

exports.initiateCall = async (req, res) => {
  // Fix #1 — auth guard
  if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    const { leadId, leadPhone } = req.body;
    const userId    = req.user.id;
    const userPhone = req.user.phone;

    if (!userPhone) {
      return res.status(400).json({
        success: false,
        message: "Your mobile number is missing in your profile. Update it in Account settings.",
      });
    }

    // Fix #2 — validate lead phone before sending to Exotel
    const cleanLeadPhone = cleanPhone(leadPhone);
    if (!cleanLeadPhone) {
      return res.status(400).json({ success: false, message: "Invalid lead phone number" });
    }

    // Fix #3 — storage check
    const storage = await checkVpsStorage();
    if (!storage.isSafe) {
      return res.status(507).json({
        success: false,
        message: "Server storage is full. Call recording temporarily disabled.",
      });
    }

    // Fix #4 — select only what you need, not SELECT *
    const [settingsRows] = await pool.query(
      `SELECT is_call_recording_enabled, telephony_provider,
              exotel_api_key, exotel_api_token, exotel_account_sid, exotel_virtual_number, exotel_subdomain
       FROM settings WHERE id = 1 LIMIT 1`
    );
    const settings = settingsRows[0];

    if (!settings?.is_call_recording_enabled || settings.telephony_provider !== "exotel") {
      return res.status(403).json({
        success: false,
        message: "Exotel call recording is not enabled. Enable it in Settings → Communications.",
      });
    }

    // Fix #5 — credentials from DB row (set via Settings page), fallback to ENV
    const API_KEY        = settings.exotel_api_key        || process.env.EXOTEL_API_KEY;
    const API_TOKEN      = settings.exotel_api_token      || process.env.EXOTEL_API_TOKEN;
    const ACCOUNT_SID    = settings.exotel_account_sid    || process.env.EXOTEL_ACCOUNT_SID;
    const VIRTUAL_NUMBER = settings.exotel_virtual_number || process.env.EXOTEL_VIRTUAL_NUMBER;
    const SUBDOMAIN      = settings.exotel_subdomain      || process.env.EXOTEL_SUBDOMAIN || "api.exotel.com";

    if (!API_KEY || !API_TOKEN || !ACCOUNT_SID || !VIRTUAL_NUMBER) {
      return res.status(500).json({
        success: false,
        message: "Exotel credentials are not configured. Check Settings → Communications.",
      });
    }

    // Fix #6 — StatusCallback uses ENV variable, not hardcoded domain
    const callbackUrl = `${process.env.API_BASE_URL}/api/telephony/webhook`;

    const params = new URLSearchParams();
    params.append("From",           userPhone);
    params.append("To",             `+91${cleanLeadPhone}`);
    params.append("CallerId",       VIRTUAL_NUMBER);
    params.append("Record",         "true");
    params.append("StatusCallback", callbackUrl);

    const exotelUrl = `https://${API_KEY}:${API_TOKEN}@${SUBDOMAIN}/v1/Accounts/${ACCOUNT_SID}/Calls/connect.json`;

    const response = await axios.post(exotelUrl, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10000, // 10s timeout — don't hang forever if Exotel is slow
    });

    const callSid = response.data?.Call?.Sid;
    if (!callSid) throw new Error("Exotel did not return a Call SID");

    // Create initial log — status updated later by webhook
    await pool.query(
      `INSERT INTO call_logs (lead_id, user_id, call_sid, direction, call_status)
       VALUES (?, ?, ?, 'outbound', 'in-progress')`,
      [leadId, userId, callSid]
    );

    res.json({
      success: true,
      message: "Connecting… Please answer your phone first.",
      callSid,
    });

  } catch (error) {
    console.error("initiateCall error:", error.response?.data ?? error.message);
    res.status(500).json({ success: false, message: "Failed to connect via Exotel" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXOTEL WEBHOOK  (POST /api/telephony/webhook)
// Called by Exotel when a call ends — no auth middleware on this route
// ═══════════════════════════════════════════════════════════════════════════════

exports.handleCallWebhook = async (req, res) => {
  // Always respond 200 fast — Exotel retries on failure
  res.status(200).send("OK");

  try {
    const { CallSid, Status, RecordingUrl, CallDuration } = req.body;

    if (!CallSid) {
      console.warn("Exotel webhook called without CallSid — ignoring");
      return;
    }

    // Fix #7 — don't overwrite created_at; use a separate completed_at column
    // If your table doesn't have completed_at yet, add it:
    // ALTER TABLE call_logs ADD COLUMN completed_at DATETIME DEFAULT NULL;
    await pool.query(
      `UPDATE call_logs
       SET call_status   = ?,
           recording_url = ?,
           duration      = ?,
           completed_at  = NOW()
       WHERE call_sid = ?`,
      [
        Status        || "completed",
        RecordingUrl  || null,
        parseInt(CallDuration) || 0,
        CallSid,
      ]
    );

    console.log(`✅ Call webhook processed: ${CallSid} | status: ${Status} | duration: ${CallDuration}s`);

    // TODO: Schedule a job to download RecordingUrl to your VPS before it
    // expires on Exotel's servers (~7 days). Use a queue (Bull, BeeQueue)
    // or a simple setTimeout for low volume:
    // if (RecordingUrl) scheduleRecordingDownload(CallSid, RecordingUrl);

  } catch (error) {
    console.error("handleCallWebhook error:", error.message);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET CALL LOGS  (GET /api/telephony/logs)
// ═══════════════════════════════════════════════════════════════════════════════

exports.getCallLogs = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ success: false, error: "Unauthorized" });

  try {
    const { id: userId } = req.user;
    const {
      page       = 1,
      limit      = 20,
      search     = "",
      counselorId = "",
      startDate  = "",
      endDate    = "",
      localDate  = "",
    } = req.query;

    const pageNum  = Math.max(parseInt(page)  || 1,  1);
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offset   = (pageNum - 1) * limitNum;

    const where  = [];
    const params = [];

    // 1. Role-based filter (isAdmin check)
    // Assuming isAdmin is a helper function available in your scope
    if (typeof isAdmin !== 'function' || !isAdmin(req.user)) {
      where.push("cl.user_id = ?");
      params.push(userId);
    } else if (counselorId) {
      where.push("cl.user_id = ?");
      params.push(parseInt(counselorId));
    }

    // 2. Search logic
    if (search.trim()) {
      where.push("(l.full_name LIKE ? OR l.phone LIKE ? OR u.name LIKE ?)");
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    // 3. Date logic
    if (startDate && endDate) {
      where.push("cl.created_at BETWEEN ? AND ?");
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    } else if (localDate || startDate) {
      where.push("DATE(cl.created_at) = ?");
      params.push(localDate || startDate);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const fromClause = `
      FROM call_logs cl
      LEFT JOIN leads l ON cl.lead_id = l.id
      LEFT JOIN users u ON cl.user_id = u.id
      ${whereClause}
    `;

    // 4. Get Total Count
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total ${fromClause}`,
      params
    );

    // 5. Get Rows (REMOVED cl.completed_at)
    const [rows] = await pool.query(
      `SELECT cl.id, cl.lead_id, cl.user_id, cl.direction, cl.duration,
              cl.recording_url, cl.call_status, cl.admin_feedback,
              cl.created_at, 
              l.full_name AS lead_name, l.phone AS lead_phone,
              u.name AS user_name
       ${fromClause}
       ORDER BY cl.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });

  } catch (err) {
    console.error("getCallLogs error:", err);
    return res.status(500).json({ success: false, error: "Failed to load call logs" });
  }
};
// ═══════════════════════════════════════════════════════════════════════════════
// SAVE FEEDBACK  (PUT /api/telephony/feedback)
// ═══════════════════════════════════════════════════════════════════════════════

exports.saveFeedback = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ success: false, error: "Unauthorized" });

  // Fix #9 — admin only
  if (!isAdmin(req.user)) {
    return res.status(403).json({ success: false, error: "Only admins can add performance feedback" });
  }

  const { logId, feedback } = req.body;

  if (!logId) {
    return res.status(400).json({ success: false, error: "logId is required" });
  }

  try {
    await pool.query(
      `UPDATE call_logs SET admin_feedback = ? WHERE id = ?`,
      [feedback?.trim() || "", logId]
    );

    return res.json({ success: true, message: "Feedback saved" });

  } catch (err) {
    console.error("saveFeedback error:", err);
    return res.status(500).json({ success: false, error: "Failed to save feedback" }); // Fix #8
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE CALL LOG  (POST /api/telephony/logs)
// Used for manual log entry or testing
// ═══════════════════════════════════════════════════════════════════════════════

exports.createCallLog = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ success: false, error: "Unauthorized" });

  const {
    lead_id,
    direction     = "outbound",
    duration      = 0,
    recording_url = null,
    call_status   = "completed",
  } = req.body;

  if (!lead_id) {
    return res.status(400).json({ success: false, error: "lead_id is required" });
  }

  // Whitelist valid values to prevent junk data
  const VALID_DIRECTIONS = ["inbound", "outbound"];
  const VALID_STATUSES   = ["completed", "missed", "busy", "no-answer", "in-progress"];

  if (!VALID_DIRECTIONS.includes(direction)) {
    return res.status(400).json({ success: false, error: `direction must be one of: ${VALID_DIRECTIONS.join(", ")}` });
  }
  if (!VALID_STATUSES.includes(call_status)) {
    return res.status(400).json({ success: false, error: `call_status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO call_logs (lead_id, user_id, direction, duration, recording_url, call_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [lead_id, req.user.id, direction, parseInt(duration) || 0, recording_url || null, call_status]
    );

    return res.status(201).json({
      success: true,
      message: "Call log created",
      logId:   result.insertId,
    });

  } catch (err) {
    console.error("createCallLog error:", err);
    return res.status(500).json({ success: false, error: "Failed to create call log" }); // Fix #8
  }
};