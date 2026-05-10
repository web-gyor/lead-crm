const axios = require('axios'); // You'll need this for the Graph API call
const { pool } = require("../config/db");

exports.handleLeadWebhook = async (req, res) => {
  const { source, clientId } = req.params;
  const leadData = req.body;

  try {
    // 1. Verify Integration (Matches our previous step)
const [integration] = await pool.query(
  "SELECT * FROM client_integrations WHERE client_id = ? AND source_key = ? AND is_active = 1",
  [clientId, source]
);

    if (integration.length === 0) {
      return res.status(403).json({ error: "Integration not active or invalid client" });
    }

    // 2. Normalize Data for YOUR specific table columns
    const finalLead = {
      full_name: leadData.name || leadData.full_name || "New Lead",
      phone: leadData.phone || leadData.mobile || "",
      email: leadData.email || "",
      lead_source_id: source === 'website' ? 1 : 2, // Map 'website' to your ID (usually 1)
      lead_source_detail: `Auto-captured from ${source}`,
      assigned_user_id: clientId,
      lead_status: "New",
      notes: leadData.notes || ""
    };

    // 3. The Corrected INSERT Query
    const query = `
      INSERT INTO leads (
        full_name, 
        phone, 
        email, 
        lead_source_id, 
        lead_source_detail, 
        assigned_user_id, 
        lead_status, 
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      finalLead.full_name,
      finalLead.phone,
      finalLead.email,
      finalLead.lead_source_id,
      finalLead.lead_source_detail,
      finalLead.assigned_user_id,
      finalLead.lead_status,
      finalLead.notes
    ];

    const [result] = await pool.query(query, values);

    res.status(200).json({ 
      success: true, 
      message: "Lead captured successfully", 
      leadId: result.insertId 
    });

  } catch (error) {
    console.error("WEBHOOK ERROR:", error); // This helps you see the error in VS Code Terminal
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};
// 1. Verification Handler (GET)
exports.verifyMetaWebhook = async (req, res) => {
    // 1. ADD THIS HEADER: This tells ngrok to skip the warning page
    res.setHeader('ngrok-skip-browser-warning', 'true');

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const { clientId } = req.params;

    try {
        const [rows] = await pool.query(
    "SELECT config_data FROM client_integrations WHERE client_id = ? AND source_key = 'meta'",
    [clientId]
);

// If no row or config_data is empty
if (!rows || rows.length === 0 || !rows[0].config_data) {
    console.log("❌ Token not found in database for this client");
    return res.status(404).send("Token not configured");
}

// Ensure we are parsing the JSON correctly
const config = typeof rows[0].config_data === 'string' 
    ? JSON.parse(rows[0].config_data) 
    : rows[0].config_data;

const savedToken = config.verifyToken;

  if (mode === 'subscribe' && token === savedToken) {
    console.log("✅ Meta Webhook Verified!");
    res.setHeader('ngrok-skip-browser-warning', 'true');
    res.setHeader('Content-Type', 'text/plain');
    // Using .end() ensures NO JSON formatting or extra characters
    return res.status(200).end(challenge);


        } else {
            return res.sendStatus(403);
        }
    } catch (error) {
        console.error("Webhook Error:", error);
        return res.sendStatus(500);
    }
};
// 2. Data Handler (POST) - This receives the actual leads
exports.receiveMetaWebhook = async (req, res) => {
    try {
        const { clientId } = req.params;
        const data = req.body;

        console.log(`📩 New Webhook Data received for Client ${clientId}:`, JSON.stringify(data, null, 2));

        // Meta expects a 200 OK immediately to know you received the data
        return res.status(200).send('EVENT_RECEIVED');
        
    } catch (error) {
        console.error("Error receiving webhook data:", error);
        return res.sendStatus(500);
    }
};
// 2. Lead Handler (POST)
exports.handleMetaLead = async (req, res) => {
    const { clientId } = req.params;
    const body = req.body;

    // Meta sends an array of changes
    if (body.object === 'page') {
        for (const entry of body.entry) {
            for (const change of entry.changes) {
                if (change.field === 'leadgen') {
                    const leadId = change.value.leadgen_id;
                    const pageId = change.value.page_id;

                    // Now we fetch the actual lead details using the Lead ID
                    await fetchAndStoreMetaLead(leadId, clientId);
                }
            }
        }
    }
    res.status(200).send('EVENT_RECEIVED');
};

// Helper function to call Meta Graph API
async function fetchAndStoreMetaLead(leadId, clientId) {
    try {
        // 1. Get the Page Access Token from your DB
        const [integration] = await pool.query(
          "SELECT config_data FROM client_integrations WHERE client_id = ? AND source_key = 'meta'",
          [clientId]
        );
        const accessToken = integration[0]?.config_data?.accessToken;

        // 2. Fetch Lead Details from Meta
        const response = await axios.get(`https://graph.facebook.com/v20.0/${leadId}?access_token=${accessToken}`);
        const metaLead = response.data; 

        // 3. Map Meta fields to YOUR table
        // Meta field_data looks like: [{name: "full_name", values: ["Arjun"]}, ...]
        const extractField = (name) => metaLead.field_data?.find(f => f.name === name)?.values[0] || "";

        const finalLead = {
            full_name: extractField('full_name') || extractField('name') || "Meta Lead",
            phone: extractField('phone_number') || extractField('phone') || "",
            email: extractField('email') || "",
            lead_source_id: 2, // Assuming 2 is Meta in your system
            assigned_user_id: clientId,
            lead_status: "New"
        };

        // 4. Insert into DB
        await pool.query(
            "INSERT INTO leads (full_name, phone, email, lead_source_id, assigned_user_id, lead_status) VALUES (?, ?, ?, ?, ?, ?)",
            [finalLead.full_name, finalLead.phone, finalLead.email, finalLead.lead_source_id, finalLead.assigned_user_id, finalLead.lead_status]
        );

        console.log(`🚀 Meta Lead ${leadId} captured successfully!`);
    } catch (err) {
        console.error("❌ Meta Fetch Error:", err.response?.data || err.message);
    }
};
// backend/src/controllers/webhookController.js

exports.handleWhatsAppWebhook = async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      const message = value.messages[0];
      const contact = value.contacts[0];

      const leadData = {
        name: contact.profile.name,
        phone: message.from,
        source: 'whatsapp',
        query: message.text?.body || "WhatsApp Inquiry",
        raw_data: JSON.stringify(req.body)
      };

      // ─── INSERT INTO YOUR CRM DATABASE ───
      const [result] = await pool.query(
        "INSERT INTO leads (name, phone, source, message) VALUES (?, ?, ?, ?)",
        [leadData.name, leadData.phone, leadData.source, leadData.query]
      );

      console.log(`✅ WhatsApp Lead Captured: ${leadData.name}`);
    }

    res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("WhatsApp Webhook Error:", error);
    res.sendStatus(500);
  }
};
exports.handleWhatsAppLead = async (req, res) => {
  try {
    const messageObj = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const contactObj = req.body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];

    if (messageObj) {
      const lead = {
        name: contactObj?.profile?.name || "WhatsApp User",
        phone: messageObj.from,
        source: 'whatsapp',
        message: messageObj.text?.body || "Inquiry from WhatsApp"
      };

      // Direct Database Insert
      await pool.query(
        "INSERT INTO leads (name, phone, source, message) VALUES (?, ?, ?, ?)",
        [lead.name, lead.phone, lead.source, lead.message]
      );
    }
    res.sendStatus(200); // Always tell Meta you received it
  } catch (err) {
    res.sendStatus(500);
  }
};