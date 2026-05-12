const axios      = require("axios");
const { pool }   = require("../config/db");

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_ID_MAP = {
  whatsapp: 1,
  meta:     2,
  website:  4,
  google:   5,
  linkedin: 6,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a collision-resistant lead UID.
 * Format: {prefix}{YY}-{4-digit random}  e.g. FB26-4821
 */
const generateLeadUid = (prefix = "L") => {
  const year   = new Date().getFullYear().toString().slice(-2);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${year}-${suffix}`;
};

/**
 * Normalise any phone string to last 10 digits.
 * Returns null if less than 10 digits remain after stripping non-numeric chars.
 */
const cleanPhone = (raw = "") => {
  const digits = String(raw).replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? digits : null;
};

/**
 * Fetch the active config object for a client + source from the DB.
 * config_data is a native JSON column — mysql2 returns it as an object already.
 */
const getClientConfig = async (clientId, sourceKey) => {
  const [rows] = await pool.query(
    `SELECT config_data
     FROM client_integrations
     WHERE client_id = ? AND source_key = ? AND is_active = 1
     LIMIT 1`,
    [clientId, sourceKey]
  );
  return rows.length ? (rows[0].config_data ?? {}) : null;
};

/**
 * Insert a lead row. Returns insertId or null on duplicate.
 * All webhook handlers funnel through here for consistency.
 */
const insertLead = async ({ full_name, phone, email, source_label, lead_uid, lead_source_id, notes }) => {
  try {
    const [result] = await pool.query(
      `INSERT INTO leads
         (full_name, phone, email, source, lead_uid, lead_status, lead_source_id, counselor_remarks)
       VALUES (?, ?, ?, ?, ?, 'New', ?, ?)`,
      [
        full_name    || "Unknown Lead",
        phone,
        email        || null,
        source_label || "Web",
        lead_uid,
        lead_source_id,
        notes        || null,
      ]
    );
    return result.insertId;
  } catch (err) {
    // Duplicate phone — silently skip, don't crash the webhook handler
    if (err.code === "ER_DUP_ENTRY") {
      console.warn(`⚠️  Duplicate phone skipped: ${phone}`);
      return null;
    }
    throw err; // re-throw anything else
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOK VERIFICATION  (GET — shared by Meta + WhatsApp)
// ═══════════════════════════════════════════════════════════════════════════════

exports.verifyWebhook = (req, res) => {
  const challenge    = req.query["hub.challenge"];
  const mode         = req.query["hub.mode"];
  const verifyToken  = req.query["hub.verify_token"];

  // Both fields must be present — we don't validate the token value here
  // because each client sets their own verify_token stored in the DB.
  // For tighter security, look up the client's verify_token and compare.
  if (mode && verifyToken && challenge) {
    return res.status(200).send(challenge);
  }

  console.warn("Webhook verification failed — missing hub params");
  res.sendStatus(403);
};

// ═══════════════════════════════════════════════════════════════════════════════
// META LEAD ADS  (POST /webhooks/meta/:clientId)
// ═══════════════════════════════════════════════════════════════════════════════

exports.handleMetaLead = async (req, res) => {
  // Respond 200 immediately — Meta retries if response is slow
  res.status(200).send("EVENT_RECEIVED");

  try {
    const { object, entry } = req.body;
    if (object !== "page") return;

    const { clientId } = req.params;

    for (const changeEntry of entry ?? []) {
      for (const change of changeEntry.changes ?? []) {
        if (change.field === "leadgen") {
          // Fire-and-forget with error capture so one failure doesn't block others
          fetchAndStoreMetaLead(change.value.leadgen_id, clientId).catch((err) =>
            console.error("fetchAndStoreMetaLead unhandled:", err.message)
          );
        }
      }
    }
  } catch (err) {
    // Response already sent — just log
    console.error("handleMetaLead error:", err.message);
  }
};

async function fetchAndStoreMetaLead(leadId, clientId) {
  const config = await getClientConfig(clientId, "meta");

  if (!config?.access_token) {
    console.warn(`⚠️  No Meta config for client ${clientId} — skipping lead ${leadId}`);
    return;
  }

  let full_name = "Meta Ad Lead";
  let phone     = null;
  let email     = null;

  // ── Simulation mode for local testing ──────────────────────────────────────
  // Pass a leadId starting with "SIM_" to test without hitting Graph API
  if (String(leadId).startsWith("SIM_")) {
    console.log("🧪 Simulation mode — using dummy Meta lead data");
    full_name = "Meta Sim Lead";
    phone     = cleanPhone("919988776655");
    email     = "sim@meta.test";
  } else {
    // ── Real Graph API call ─────────────────────────────────────────────────
    const { data } = await axios.get(
  `https://graph.facebook.com/v19.0/${leadId}`,
  { 
    params: { access_token: config.access_token },
    timeout: 5000 // 5 seconds safety timeout
  }
);

    const field = (name) =>
      data.field_data?.find((f) => f.name === name)?.values?.[0] ?? "";

    full_name = field("full_name")    || field("name") || "Meta Ad Lead";
    phone     = cleanPhone(field("phone_number") || field("phone"));
    email     = field("email") || null;
  }

  if (!phone) {
    console.warn(`⚠️  Meta lead ${leadId} has no valid phone — skipping`);
    return;
  }

  const insertId = await insertLead({
    full_name,
    phone,
    email,
    source_label:   "Meta Ads",
    lead_uid:       generateLeadUid("FB"),
    lead_source_id: SOURCE_ID_MAP.meta,
    notes:          `Meta Lead ID: ${leadId}`,
  });

  if (insertId) console.log(`✅ Meta lead stored — insertId: ${insertId}, client: ${clientId}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHATSAPP BUSINESS  (POST /webhooks/whatsapp/:clientId)
// ═══════════════════════════════════════════════════════════════════════════════

exports.handleWhatsAppLead = async (req, res) => {
  // Always 200 first — WhatsApp retries on anything else
  res.status(200).send("EVENT_RECEIVED");

  try {
    const { clientId } = req.params;
    const body = req.body;

    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value    = change.value;
        const messages = value?.messages ?? [];
        const contacts = value?.contacts ?? [];

        for (const msg of messages) {
          // Only process first text message — ignore media, reactions, etc.
          if (msg.type !== "text") continue;

          const phone = cleanPhone(msg.from);
          if (!phone) continue;

          const contact   = contacts.find((c) => c.wa_id === msg.from);
          const full_name = contact?.profile?.name || "WhatsApp Lead";
          const text      = msg.text?.body ?? "";

          const insertId = await insertLead({
            full_name,
            phone,
            email:          null,
            source_label:   "WhatsApp",
            lead_uid:       generateLeadUid("WA"),
            lead_source_id: SOURCE_ID_MAP.whatsapp,
            notes:          `First message: ${text.slice(0, 200)}`,
          });

          if (insertId) console.log(`✅ WhatsApp lead stored — phone: ${phone}, client: ${clientId}`);
        }
      }
    }
  } catch (err) {
    console.error("handleWhatsAppLead error:", err.message);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE ADS FORM  (POST /webhooks/google/:clientId)
// ═══════════════════════════════════════════════════════════════════════════════

exports.handleGoogleLead = async (req, res) => {
  // Google requires 200 immediately or it retries
  res.status(200).json({ success: true });

  try {
    const { clientId }                    = req.params;
    const { user_column_data, google_key } = req.body;

    // Verify webhook secret
    const config = await getClientConfig(clientId, "google");
    if (!config) {
      console.warn(`⚠️  No Google config for client ${clientId}`);
      return;
    }
    if (config.webhook_secret && google_key !== config.webhook_secret) {
      console.warn(`⚠️  Google secret mismatch for client ${clientId}`);
      return;
    }

    const extract = (colId) =>
      user_column_data?.find((c) => c.column_id === colId)?.string_value ?? null;

    const phone = cleanPhone(extract("PHONE_NUMBER"));
    if (!phone) {
      console.warn(`⚠️  Google lead has no valid phone — skipping`);
      return;
    }

    const insertId = await insertLead({
      full_name:      extract("FULL_NAME") || "Google Lead",
      phone,
      email:          extract("EMAIL"),
      source_label:   "Google Ads",
      lead_uid:       generateLeadUid("G"),
      lead_source_id: SOURCE_ID_MAP.google,
      notes:          `Google Ads Form | Client: ${clientId}`,
    });

    if (insertId) console.log(`✅ Google lead stored — phone: ${phone}, client: ${clientId}`);
  } catch (err) {
    console.error("handleGoogleLead error:", err.message);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// UNIVERSAL WEBHOOK  (POST /webhooks/capture/:clientId/:source)
// Used by: Website Forms (Elementor, WPForms), custom integrations
// ═══════════════════════════════════════════════════════════════════════════════

exports.handleLeadWebhook = async (req, res) => {
  try {
    const { source = "website", clientId } = req.params;

    // Optional: verify X-Secret header for website form submissions
    // const config = await getClientConfig(clientId, "website");
    // if (config?.secret_key && req.headers["x-secret"] !== config.secret_key) {
    //   return res.status(401).json({ error: "Invalid secret" });
    // }

    const phone = cleanPhone(req.body.phone);
    if (!phone) {
      return res.status(400).json({ success: false, message: "Valid phone number required" });
    }

    const lead_source_id = SOURCE_ID_MAP[source] ?? SOURCE_ID_MAP.website;

    const insertId = await insertLead({
      full_name:      (req.body.full_name || "").trim().slice(0, 255) || "Web Lead",
      phone,
      email:          (req.body.email || "").trim().slice(0, 255) || null,
      source_label:   source.charAt(0).toUpperCase() + source.slice(1),
      lead_uid:       generateLeadUid("W"),
      lead_source_id,
      notes:          `Web capture | source: ${source} | client: ${clientId || "unknown"}`,
    });

    if (!insertId) {
      return res.status(409).json({ success: false, message: "Lead with this phone already exists" });
    }

    console.log(`✅ Web lead stored — insertId: ${insertId}, source: ${source}`);
    res.status(201).json({ success: true, leadId: insertId });

  } catch (err) {
    console.error("handleLeadWebhook error:", err.message);
    res.status(500).json({ success: false, message: "Failed to capture lead" });
  }
};

// ─── Aliases ──────────────────────────────────────────────────────────────────
exports.verifyMetaWebhook  = exports.verifyWebhook;
exports.receiveMetaWebhook = exports.handleMetaLead;