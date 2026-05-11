const axios = require('axios');
const pool = require("../config/db");

// ─── HELPER: UID GENERATOR ──────────────────────────────────────────
const generateLeadUid = () => {
    const yearShort = new Date().getFullYear().toString().slice(-2);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `L${yearShort}-${randomSuffix}`;
};

// ─── 1. VERIFICATION HANDLER (REQUIRED BY YOUR ROUTER) ──────────────
// This fixes the crash for: router.get('/webhooks/whatsapp', ...)
exports.verifyWebhook = async (req, res) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    const challenge = req.query['hub.challenge'];
    // For verification, Meta/WhatsApp just need the challenge sent back
    if (challenge) {
        return res.status(200).send(challenge);
    }
    res.sendStatus(403);
};

// ─── 2. META LEAD HANDLER (POST) ────────────────────────────────────
// This fixes the crash for: router.post('/webhooks/meta/:clientId', ...)
exports.handleMetaLead = async (req, res) => {
    try {
        const { clientId } = req.params;
        const body = req.body;
        if (body.object === 'page') {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    if (change.field === 'leadgen') {
                        await fetchAndStoreMetaLead(change.value.leadgen_id, clientId);
                    }
                }
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
        res.sendStatus(500);
    }
};

// ─── 3. GOOGLE ADS HANDLER (POST) ───────────────────────────────────
// This fixes the crash for: router.post('/webhooks/google', ...)
exports.handleGoogleLead = async (req, res) => {
    try {
        const { user_column_data } = req.body;
        const leadData = {};
        user_column_data?.forEach(col => {
            if (col.column_id === 'FULL_NAME') leadData.full_name = col.string_value;
            if (col.column_id === 'PHONE_NUMBER') leadData.phone = col.string_value;
            if (col.column_id === 'EMAIL') leadData.email = col.string_value;
        });
        const query = `INSERT INTO leads (full_name, phone, email, lead_source_id, source_project, lead_uid, lead_status) VALUES (?, ?, ?, 5, 'Google Ads', ?, 'New')`;
        await pool.query(query, [leadData.full_name, leadData.phone, leadData.email, generateLeadUid()]);
        res.status(200).json({ success: true });
    } catch (error) {
        res.sendStatus(500);
    }
};

// ─── 4. UNIVERSAL WEBHOOK (REQUIRED BY OTHER PAGES) ────────────────
exports.handleLeadWebhook = async (req, res) => {
    const { source, clientId } = req.params;
    try {
        const leadUid = generateLeadUid();
        // Dynamic source mapping
        const sourceId = source === 'whatsapp' ? 1 : 4; 

        await pool.query(
            `INSERT INTO leads (full_name, phone, email, lead_source_id, source_project, lead_uid, lead_status) VALUES (?, ?, ?, ?, ?, ?, 'New')`,
            [req.body.full_name || "Web Lead", req.body.phone, req.body.email, sourceId, source, leadUid]
        );
        res.status(200).json({ success: true, leadUid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// ─── 5. META HELPER ────────────────────────────────────────────────
async function fetchAndStoreMetaLead(leadId, clientId) {
    try {
        const [rows] = await pool.query("SELECT config_data FROM client_integrations WHERE client_id = ? AND source_key = 'meta'", [clientId]);
        if (!rows.length) return;
        const config = typeof rows[0].config_data === 'string' ? JSON.parse(rows[0].config_data) : rows[0].config_data;
        const response = await axios.get(`https://graph.facebook.com/v20.0/${leadId}?access_token=${config.access_token}`);
        const extract = (name) => response.data.field_data?.find(f => f.name === name)?.values[0] || "";
        await pool.query(
            `INSERT INTO leads (full_name, phone, email, lead_source_id, source_project, lead_uid, lead_status) VALUES (?, ?, ?, 2, 'Meta Ads', ?, 'New')`,
            [extract('full_name') || "Meta Lead", extract('phone_number'), extract('email'), generateLeadUid()]
        );
    } catch (err) { console.error("Meta API Error:", err.message); }
}

// Aliases to prevent crashes if old names are used
exports.verifyMetaWebhook = exports.verifyWebhook;
exports.receiveMetaWebhook = exports.handleMetaLead;
exports.handleWhatsAppLead = exports.handleMetaLead;