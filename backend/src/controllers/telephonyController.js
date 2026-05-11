const { pool } = require('../config/db');
const { checkVpsStorage } = require("../utils/storageHelper");
const axios = require("axios");

/**
 * Initiates an Exotel Click-to-Call bridge
 */
exports.initiateCall = async (req, res) => {
    try {
        const { leadId, leadPhone } = req.body;
        const userId = req.user.id;
        const userPhone = req.user.phone; 

        if (!userPhone) {
            return res.status(400).json({ success: false, message: "Your mobile number is missing in your profile." });
        }

        // 1. Safety Check: Is VPS Storage OK?
        const storage = await checkVpsStorage();
        if (!storage.isSafe) {
            return res.status(507).json({ 
                success: false, 
                message: "Server storage is full. Call recording temporarily disabled." 
            });
        }

        // 2. Fetch Exotel Credentials from Settings
        // We assume you store keys in telephony_provider_config JSON or Environment Variables
        const [settingsRows] = await pool.query("SELECT * FROM settings WHERE id = 1");
        const settings = settingsRows[0];

        if (!settings?.is_call_recording_enabled || settings.telephony_provider !== 'exotel') {
            return res.status(403).json({ success: false, message: "Exotel recording is not enabled." });
        }

        // --- EXOTEL CONFIG (Replace with your actual keys or settings data) ---
        const API_KEY = "your_api_key";
        const API_TOKEN = "your_api_token";
        const ACCOUNT_SID = "your_account_sid";
        const VIRTUAL_NUMBER = "your_virtual_number"; 
        const SUBDOMAIN = "api.exotel.com"; // or your specific region subdomain

        // 3. Prepare Exotel API Request
        const exotelUrl = `https://${API_KEY}:${API_TOKEN}@${SUBDOMAIN}/v1/Accounts/${ACCOUNT_SID}/Calls/connect.json`;
        
        const params = new URLSearchParams();
        params.append('From', userPhone);
        params.append('To', leadPhone);
        params.append('CallerId', VIRTUAL_NUMBER);
        params.append('Record', 'true');
        // This URL must be publicly accessible so Exotel can hit it
        params.append('StatusCallback', `https://your-api-domain.com/api/telephony/webhook`); 

        const response = await axios.post(exotelUrl, params);

        // Exotel returns the Call Sid in Call.Sid
        const callSid = response.data.Call.Sid;

        // 4. Create Initial Log Entry
        await pool.query(
            "INSERT INTO call_logs (lead_id, user_id, call_sid, direction, call_status) VALUES (?, ?, ?, 'outbound', 'in-progress')",
            [leadId, userId, callSid]
        );

        res.json({ 
            success: true, 
            message: "Connecting... Please answer your phone first.",
            callSid: callSid
        });

    } catch (error) {
        console.error("Exotel API Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: "Failed to connect via Exotel" });
    }
};

/**
 * Webhook: Triggered by Exotel when the call finishes
 */
exports.handleCallWebhook = async (req, res) => {
    try {
        // Exotel sends data in the body (form-urlencoded)
        const { CallSid, Status, RecordingUrl, CallDuration, StartTime } = req.body;

        if (!CallSid) return res.sendStatus(400);

        // Update the database with the recording and duration
        // Status can be: 'completed', 'failed', 'busy', 'no-answer'
        await pool.query(
            `UPDATE call_logs 
             SET call_status = ?, 
                 recording_url = ?, 
                 duration = ?, 
                 created_at = COALESCE(?, created_at)
             WHERE call_sid = ?`,
            [Status, RecordingUrl, CallDuration, StartTime, CallSid]
        );

        // IMPORTANT: Later we will add logic here to download the file 
        // to our VPS so it doesn't expire on Exotel's servers.

        res.status(200).send("OK");
    } catch (error) {
        console.error("Webhook Logic Error:", error);
        res.sendStatus(500);
    }
};
exports.getCallLogs = async (req, res) => {
    try {
        // ─── AUTH CHECK ─────────────────────────────
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized"
            });
        }

        const { role, id: userId } = req.user;

        // ─── QUERY PARAMS ───────────────────────────
        const {
            page = 1,
            limit = 20,
            search = '',
            counselorId = '',
            startDate = '',
            endDate = '',
            localDate = ''
        } = req.query;

        const pageNum = Math.max(parseInt(page) || 1, 1);
        const limitNum = Math.max(parseInt(limit) || 20, 1);
        const offset = (pageNum - 1) * limitNum;

        // ─── DYNAMIC QUERY BUILDING ─────────────────
        let whereConditions = [];
        let params = [];

        // Role-based filtering
        if ((role || '').toLowerCase() !== 'admin') {
            whereConditions.push('cl.user_id = ?');
            params.push(userId);
        } else if (counselorId) {
            whereConditions.push('cl.user_id = ?');
            params.push(counselorId);
        }

        // Search filtering
        if (search?.trim()) {
            whereConditions.push(`
                (
                    l.full_name LIKE ?
                    OR l.phone LIKE ?
                    OR u.name LIKE ?
                )
            `);

            const searchValue = `%${search.trim()}%`;

            params.push(
                searchValue,
                searchValue,
                searchValue
            );
        }

        // Date filtering
        if (startDate && endDate) {
            whereConditions.push(
                'cl.created_at BETWEEN ? AND ?'
            );

            params.push(
                `${startDate} 00:00:00`,
                `${endDate} 23:59:59`
            );

        } else if (localDate || startDate) {

            const targetDate = startDate || localDate;

            whereConditions.push(
                'DATE(cl.created_at) = ?'
            );

            params.push(targetDate);
        }

        // Final WHERE clause
        const whereClause = whereConditions.length
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // ─── BASE FROM ──────────────────────────────
        const fromClause = `
            FROM call_logs cl
            LEFT JOIN leads l ON cl.lead_id = l.id
            LEFT JOIN users u ON cl.user_id = u.id
            ${whereClause}
        `;

        // ─── COUNT QUERY ────────────────────────────
        const countSql = `
            SELECT COUNT(*) AS total
            ${fromClause}
        `;

        const [countRows] = await pool.query(
            countSql,
            params
        );

        const total = countRows?.[0]?.total || 0;

        // ─── DATA QUERY ─────────────────────────────
        const dataSql = `
            SELECT
                cl.*,
                l.full_name AS lead_name,
                l.phone AS lead_phone,
                u.name AS user_name
            ${fromClause}
            ORDER BY cl.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const dataParams = [
            ...params,
            limitNum,
            offset
        ];

        const [rows] = await pool.query(
            dataSql,
            dataParams
        );

        // ─── SUCCESS RESPONSE ───────────────────────
        return res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });

    } catch (err) {

        console.error(
            "TELEPHONY_LOG_ERROR:",
            err.message
        );

        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

exports.saveFeedback = async (req, res) => {
    try {
        const { logId, feedback } = req.body;

        if (!logId) {
            return res.status(400).json({
                success: false,
                error: "logId is required"
            });
        }

        await pool.query(
            `
            UPDATE call_logs
            SET admin_feedback = ?
            WHERE id = ?
            `,
            [feedback || '', logId]
        );

        return res.json({
            success: true,
            message: "Feedback saved"
        });

    } catch (err) {
        console.error("SAVE_FEEDBACK_ERROR:", err);

        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
};