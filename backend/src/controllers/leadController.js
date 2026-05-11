const { pool } = require('../config/db'); 
const jwt = require('jsonwebtoken');
const activityController = require("./activityController");
const leadDistributor = require("../services/leadDistributor");
const { v4: uuidv4 } = require("uuid");
/**
 * Authentication Middleware
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: "Access Denied" });
  
 jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
  if (err) return res.status(403).json({ message: "Invalid Token" });
  req.user = user;
  next();
});
};



const getAllLeads = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    let whereClause = "1=1";
    let params = [];
    
    const { 
      search, 
      status, 
      lead_source_id, 
      source_id, 
      assigned_user_id, 
      startDate, 
      endDate, 
      range,
      localDate // ✅ Receive the YYYY-MM-DD from Kozhikode
    } = req.query;

const today = localDate || new Date().toLocaleDateString('en-CA');

    const finalSourceId = lead_source_id || source_id;

    // Permissions Check
    const userRole = (req.user?.role || "").toLowerCase();
    const [permResult] = await pool.query(
      "SELECT is_enabled FROM role_permissions WHERE LOWER(role) = ? AND feature_name = 'View All Leads'",
      [userRole]
    );

    const canViewAll =
      userRole === 'admin' ||
      userRole === 'superadmin' ||
      (permResult.length > 0 && permResult[0].is_enabled === 1);

    if (!canViewAll) {
      whereClause += " AND (l.assigned_user_id = ? OR l.created_by = ? OR l.created_by IS NULL)"; 
      params.push(req.user.id, req.user.id);
    }

    // Search logic
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      whereClause += " AND (l.full_name LIKE ? OR l.phone LIKE ? OR l.lead_uid LIKE ?)";
      params.push(term, term, term);
    }

    // Status logic
    if (status && !['all', 'leads', ''].includes(status.toLowerCase())) {
      let dbStatus = status;
      if (status === 'Won')       dbStatus = 'Converted';
      if (status === 'Rejected') dbStatus = 'Not Interested';
      whereClause += " AND l.lead_status = ?";
      params.push(dbStatus);
    }

    // Source Logic
    if (finalSourceId && !['all', '', 'undefined', 'null'].includes(String(finalSourceId).toLowerCase())) {
      whereClause += " AND l.lead_source_id = ?";
      params.push(finalSourceId);
    }

   

// --- UPDATE THIS BLOCK ---
if (assigned_user_id) {
  if (assigned_user_id === 'unassigned') {
    // This targets leads where no one is assigned (Anil, Madhu, or Shaji)
    whereClause += " AND (l.assigned_user_id IS NULL OR l.assigned_user_id = 0)";
  } else if (!['all', '', 'undefined', 'null'].includes(String(assigned_user_id).toLowerCase())) {
    // This targets a specific person (like Anil or Madhu)
    whereClause += " AND l.assigned_user_id = ?";
    params.push(assigned_user_id);
  }
}

    // Date Range Logic
  // Date Range Logic - REVISED TO STOP SNAP-BACK
    if (range === 'today') {
      // ✅ Use STR_TO_DATE with the localDate variable instead of CURDATE()
      whereClause += " AND DATE(l.created_at) = STR_TO_DATE(?, '%Y-%m-%d')";
      params.push(today);
    } 
    else if (range === 'this_week') {
      whereClause += " AND l.created_at >= DATE_SUB(STR_TO_DATE(?, '%Y-%m-%d'), INTERVAL 7 DAY)";
      params.push(today);
    } 
    else if (range === 'this_month') {
      whereClause += " AND l.created_at >= DATE_SUB(STR_TO_DATE(?, '%Y-%m-%d'), INTERVAL 30 DAY)";
      params.push(today);
    } 
    else if (range === 'this_year') {
      whereClause += " AND YEAR(l.created_at) = YEAR(STR_TO_DATE(?, '%Y-%m-%d'))";
      params.push(today);
    } 
    else if (startDate && endDate) {
      whereClause += " AND l.created_at >= ? AND l.created_at <= ?";
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    }

    // Final Queries
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM leads l WHERE ${whereClause}`,
      params
    );
    const totalItems = countResult[0].total;

const [leads] = await pool.query(`
  SELECT 
    l.*, 
    u.name AS counselor_name -- This pulls 'Shaji' directly from the users table
  FROM leads l 
  LEFT JOIN users u ON l.assigned_user_id = u.id
  WHERE ${whereClause} 
  ORDER BY l.created_at DESC 
  LIMIT ? OFFSET ?
`, [...params, limit, offset]);

    res.json({
      success: true,
      data: leads,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Critical Error in getAllLeads:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create New Lead and Log Activity
 */
const createLead = async (req, res) => {
  try {
         const allowedGenders = ["Male", "Female", "Other"];
    const {
      full_name, parent_name, parent_contact, phone, email, city, age, gender,
      qualification, year_of_passing,
      whatsapp_same,   // ✅ FIXED
      urgency,         // ✅ FIXED
      lead_source_id,
      assigned_user_id, interested_course,
      counselor_remarks, lead_status
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO leads (
        full_name, parent_name, parent_contact, phone, whatsapp_same,
        email, city, age, gender, qualification, year_of_passing,
        lead_source_id, assigned_user_id, interested_course,
        counselor_remarks, lead_status, urgency, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name || 'N/A',
        parent_name || null,
        parent_contact || null,
        phone,

        // ✅ FIXED
        Number(whatsapp_same) === 1 ? 1 : 0,

        email || null,
        city || null,
        age || null,
        gender || null,
        qualification || null,
        year_of_passing || null,
        lead_source_id || null,
        assigned_user_id || null,
        interested_course || null,
        counselor_remarks || null,
        lead_status || 'New',

        // ✅ FIXED
        urgency && urgency.trim() !== ""
          ? urgency
          : "Just inquiring",

        req.user?.id
      ]
    );

    res.status(201).json({ success: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};
/**
 * Fetch Single Lead by ID
 */
const getLeadById = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT l.* FROM leads l WHERE l.id = ?`, [req.params.id]);
    res.json(rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const updateLead = async (req, res) => {
  console.log("🔥 UPDATE LEAD HIT");
  console.log("ID:", req.params.id);
  console.log("BODY:", req.body);

  const { id } = req.params;
  const updates = req.body;

  try {
    // ─────────────────────────────
    // FETCH EXISTING
    // ─────────────────────────────
    const [current] = await pool.query(
      "SELECT * FROM leads WHERE id = ?",
      [id]
    );

    if (!current.length) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const old = current[0];

    // ─────────────────────────────
    // SAFE VALUE HANDLER
    // ─────────────────────────────
    const safe = (newVal, oldVal, type = "string") => {
      if (newVal === undefined) return oldVal;

      if (type === "number") {
        if (newVal === null || newVal === "") return oldVal;
        const n = Number(newVal);
        return isNaN(n) ? oldVal : n;
      }

      if (type === "string") {
        if (newVal === null) return oldVal;
        const val = String(newVal).trim();
        return val === "" ? null : val; // ✅ critical fix
      }

      return newVal;
    };

    // ─────────────────────────────
    // FIRST CONTACT LOGIC
    // ─────────────────────────────
    let firstContactedAt = old.first_contacted_at;

    if (
      (updates.lead_status === "Contacted" ||
        updates.lead_status === "Follow-up") &&
      !firstContactedAt
    ) {
      firstContactedAt = new Date();
    }

    // ─────────────────────────────
    // BUILD DATA OBJECT
    // ─────────────────────────────
    const data = {
      full_name:        safe(updates.full_name, old.full_name),
      phone:            safe(updates.phone, old.phone),
      email:            safe(updates.email, old.email),
      city:             safe(updates.city, old.city),
      age:              safe(updates.age, old.age, "number"),
      gender:           safe(updates.gender, old.gender, "string"),
      qualification:    safe(updates.qualification, old.qualification),
      year_of_passing:  safe(updates.year_of_passing, old.year_of_passing, "number"),
      parent_name:      safe(updates.parent_name, old.parent_name),
      parent_contact:   safe(updates.parent_contact, old.parent_contact),
      lead_status:      safe(updates.lead_status, old.lead_status || "New"),
      lead_source_id:   safe(updates.lead_source_id, old.lead_source_id, "number"),

      assigned_user_id:
        updates.assigned_user_id === ""
          ? null
          : safe(updates.assigned_user_id, old.assigned_user_id, "number"),

      interested_course: safe(updates.interested_course, old.interested_course),
      counselor_remarks: safe(updates.counselor_remarks, old.counselor_remarks),

      next_follow_up_date: updates.hasOwnProperty("next_follow_up_date")
        ? (updates.next_follow_up_date
            ? String(updates.next_follow_up_date).split("T")[0].trim()
            : null)
        : (() => {
            if (!old.next_follow_up_date) return null;
            if (old.next_follow_up_date instanceof Date) {
              return old.next_follow_up_date.toISOString().split("T")[0];
            }
            return String(old.next_follow_up_date).split("T")[0].trim();
          })(),

      urgency:      safe(updates.urgency, old.urgency),
      lead_quality: safe(updates.lead_quality, old.lead_quality),

      whatsapp_same: updates.hasOwnProperty("whatsapp_same")
        ? (updates.whatsapp_same ? 1 : 0)
        : (old.whatsapp_same ?? 0),

      first_contacted_at: firstContactedAt,
      updated_at: new Date(),
    };

    // ─────────────────────────────
    // VALIDATION (AFTER DATA BUILD)
    // ─────────────────────────────

    const allowedGenders = ["Male", "Female", "Other"];
    if (data.gender && !allowedGenders.includes(data.gender)) {
      data.gender = null;
    }

    if (data.age && (data.age < 1 || data.age > 100)) {
      data.age = old.age;
    }

    // ─────────────────────────────
    // BUSINESS RULES
    // ─────────────────────────────
    const terminalStatuses = ["Converted", "Lost", "Rejected", "Closed"];

    if (terminalStatuses.includes(data.lead_status)) {
      data.next_follow_up_date = null;
    }

    // ─────────────────────────────
    // UPDATE QUERY
    // ─────────────────────────────
    await pool.query(
      `
      UPDATE leads 
      SET 
        full_name=?,
        phone=?,
        email=?,
        city=?,
        age=?,
        gender=?,
        qualification=?,
        year_of_passing=?,
        parent_name=?,
        parent_contact=?,
        lead_status=?,
        lead_source_id=?,
        assigned_user_id=?,
        interested_course=?,
        counselor_remarks=?,
        next_follow_up_date=?,
        urgency=?,
        lead_quality=?,
        whatsapp_same=?,
        first_contacted_at=?,
        updated_at=?
      WHERE id=?
      `,
      [
        data.full_name,
        data.phone,
        data.email,
        data.city,
        data.age,
        data.gender,
        data.qualification,
        data.year_of_passing,
        data.parent_name,
        data.parent_contact,
        data.lead_status,
        data.lead_source_id,
        data.assigned_user_id,
        data.interested_course,
        data.counselor_remarks,
        data.next_follow_up_date,
        data.urgency,
        data.lead_quality,
        data.whatsapp_same,
        data.first_contacted_at,
        data.updated_at,
        id,
      ]
    );

    // ─────────────────────────────
    return res.json({
      success: true,
      message: "Updated successfully",
    });

  } catch (error) {
    console.error("🔥 FULL ERROR:", error);
    return res.status(500).json({
      error: error.message,
    });
  }
};

const bulkAssignLeads = async (req, res) => {
  const { leadIds, assigned_user_id, lead_status } = req.body;
  
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: "No leads selected" });
  }

  try {
    // 1. UPDATE
    await pool.query(
      `UPDATE leads SET assigned_user_id = ?, lead_status = ? WHERE id IN (?)`,
      [assigned_user_id, lead_status || 'New', leadIds]
    );

    // 2. FETCH NAMES FOR OPTIMISTIC UI
    const [updatedData] = await pool.query(
      `SELECT 
        (SELECT name FROM users WHERE id = ?) AS assigned_user_name,
        (SELECT name FROM lead_sources ls JOIN leads l ON l.lead_source_id = ls.id WHERE l.id = ?) AS lead_source_name
      `,
      [assigned_user_id, leadIds[0]]
    );

    // 3. RECORD ACTIVITIES (Existing Functionality)
    await Promise.all(leadIds.map(leadId =>
      activityController.record({
        userId:      req.user?.id,
        leadId,
        actionType:  'ASSIGNED',
        description: `Bulk assigned to ${updatedData[0]?.assigned_user_name || assigned_user_id} with status "${lead_status || 'New'}"`,
        oldValue:    null,
        newValue:    String(assigned_user_id),
      })
    ));

    // 4. RETURN DATA FOR OPTIMISTIC UI
  res.json({ 
      success: true,
      message: `Successfully updated ${leadIds.length} leads`,
      assigned_user_name: updatedData[0]?.assigned_user_name || 'Assigned',
      lead_source_name: updatedData[0]?.lead_source_name
    });
  } catch (error) {
    res.status(500).json({ error: "Bulk update failed" });
  }
};
/**
 * Bulk Import Leads
 */



const bulkImportLeads = async (req, res) => {
  const { leads, autoDistribute = true } = req.body;
  const createdBy = req.user?.id || 1;

  let inserted = 0;
  let assigned = 0;
  let duplicates = 0;
  let invalid = 0;
  let failed = 0;

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ success: false, message: "No leads provided" });
  }

  try {
    const [sourceRows] = await pool.query(
      "SELECT id FROM lead_sources WHERE name = 'Bulk Import' LIMIT 1"
    );
    const sourceId = sourceRows[0]?.id;

    if (!sourceId) throw new Error("Bulk Import source missing");

    // ─── 1. GLOBAL HEADER MAPPING (LOWERCASE) ───
    const headerMap = {
      "full name": "full_name",
      "name": "full_name",
      "phone number": "phone",
      "phone": "phone",
      "contact": "phone",
      "email": "email",
      "city": "city",
      "course": "interested_course",
      "interested course": "interested_course",
      "country": "country",
      "source": "source"
    };

    for (const rawRow of leads) {
      try {
        // ─── 2. PERMANENT NORMALIZATION LAYER ───
        // This handles "Full Name", "full_name", "FULL NAME", etc.
        const l = {};
Object.keys(rawRow).forEach(key => {
    const normalizedKey = key.trim().toLowerCase();
    const mappedKey = headerMap[normalizedKey];
    
    if (mappedKey) {
        l[mappedKey] = rawRow[key];
    } else {
        // PERMANENT FIX: Keep the original key if it's already technical
        // This prevents data loss if the frontend sends 'full_name'
        l[normalizedKey] = rawRow[key];
    }
});

        // ─── 3. DATA CLEANING & VALIDATION ───
        const fullName = String(l.full_name || "").trim();
        
        // Handle Excel's Scientific Notation (e.g., 9.85E+09)
        let phoneStr = String(l.phone || "");
        if (phoneStr.includes('E+') || phoneStr.includes('e+')) {
           phoneStr = Number(phoneStr).toLocaleString('fullwide', {useGrouping:false});
        }
        const cleanPhone = phoneStr.replace(/\D/g, "").slice(-10);

        // Skips rows that don't meet basic requirements
        if (!fullName || cleanPhone.length < 10) {
          invalid++;
          continue; 
        }

        // ─── 4. DUPLICATE CHECK ───
        const [existing] = await pool.query(
          "SELECT id FROM leads WHERE phone = ? LIMIT 1", 
          [cleanPhone]
        );
        if (existing.length > 0) {
          duplicates++;
          continue;
        }

        // ─── 5. UID GENERATION (PROJECT SAKSHI 2026) ───
        const leadUid = `L26-${Math.floor(1000 + Math.random() * 9000)}`;

        // ─── 6. DATABASE INSERT ───
        const [insertOp] = await pool.query(
          `INSERT INTO leads 
            (full_name, phone, email, city, country, interested_course, lead_source_id, lead_status, is_archived, lead_uid, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          [
            fullName, 
            cleanPhone, 
            l.email || null, 
            l.city || null, 
            l.country || "India", 
            l.interested_course || "Inquiry", 
            sourceId, 
            "New", 
            leadUid, 
            createdBy
          ]
        );

        if (insertOp.insertId) {
          inserted++;

          // ─── 7. AUTO-DISTRIBUTION ENGINE ───
          if (autoDistribute) {
            try {
              const distResult = await leadDistributor.distribute(
                { 
                  id: insertOp.insertId, 
                  full_name: fullName, 
                  phone: cleanPhone,
                  country: l.country || "India",
                  interested_course: l.interested_course || "Inquiry"
                }, 
                createdBy
              );
              if (distResult?.success) assigned++;
            } catch (distErr) {
              console.error(`Dist Error:`, distErr.message);
            }
          }
        }
      } catch (rowErr) {
        failed++;
      }
    }

    return res.status(200).json({
      success: true,
      inserted,
      assigned,
      duplicates,
      invalid,
      failed,
      message: `${inserted} leads processed successfully.`
    });

  } catch (masterErr) {
    return res.status(500).json({ success: false, message: masterErr.message });
  }
};
/**
 * Delete Individual Lead (Admin Only)
 */
const deleteLead = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user?.role?.toLowerCase() !== 'admin') return res.status(403).json({ error: "Admin required." });
    await pool.query("DELETE FROM leads WHERE id = ?", [Number(id)]);
    res.json({ success: true, message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Delete Lead Error:", error.message);
    res.status(500).json({ error: "Database error" });
  }
};




/**
 * Export Leads to CSV
 */
const exportLeads = async (req, res) => {
  try {
    // 1. SQL Aliases match the headerMap in your bulkImportLeads
    const [leads] = await pool.query(`
      SELECT 
        full_name AS "Full Name", 
        phone AS "Phone Number", 
        email AS "Email", 
        city AS "City", 
        interested_course AS "Course", 
        country AS "Country"
      FROM leads 
      WHERE is_archived = 0
      ORDER BY created_at DESC
    `);

    if (leads.length === 0) {
      return res.status(404).json({ success: false, message: "No leads to export" });
    }

    // 2. Generate CSV with industry-standard escaping
    // This handles special characters and prevents column shifting
    const headers = Object.keys(leads[0]).join(",");
    const rows = leads.map(l => 
      Object.values(l).map(v => {
        let val = v === null ? '' : String(v);
        // Replace " with "" (standard CSV escaping) and wrap in quotes
        return `"${val.replace(/"/g, '""')}"`;
      }).join(",")
    );

    const csv = [headers, ...rows].join("\n");

    // 3. Set Response Headers for Download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads_template_2026.csv');
    
    return res.status(200).send(csv);

  } catch (error) {
    console.error("Export Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to generate export template" });
  }
};
/**
 * Check for Duplicate Leads by Phone or Email
 */
const checkDuplicate = async (req, res) => {
  const { phone, email } = req.query;
  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, lead_status FROM leads WHERE phone = ? OR (email = ? AND email != '') LIMIT 1",
      [phone, email]
    );
    res.json({ exists: rows.length > 0, lead: rows[0] || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Fetch All Lead Sources
 */
const getSources = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM lead_sources ORDER BY name ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to load lead sources" });
  }
};

/**
 * Log Manual Interaction and Schedule Follow-up
 */
const logInteraction = async (req, res) => {
  const { lead_id, type, outcome, remarks, next_follow_up } = req.body;
  try {
    await pool.query(
      "INSERT INTO lead_interactions (lead_id, interaction_type, outcome, remarks, created_by) VALUES (?, ?, ?, ?, ?)",
      [lead_id, type, outcome, remarks, req.user.id]
    );

    let statusUpdate = "";
    if (outcome === 'Replied' || outcome === 'Connected') statusUpdate = ", lead_status = 'Interested'";
    if (outcome === 'Not Reachable')                      statusUpdate = ", lead_status = 'Follow-up'";

    await pool.query(
      `UPDATE leads SET updated_at = NOW(), next_follow_up_date = ? ${statusUpdate} WHERE id = ?`,
      [next_follow_up || null, lead_id]
    );

    await activityController.record({
      userId:      req.user?.id,
      leadId:      lead_id,
      actionType:  'NOTE_ADDED',
      description: `Interaction logged — ${type}: ${outcome}. Remarks: "${remarks}"`,
      oldValue:    null,
      newValue:    outcome,
    });

    res.json({ success: true, message: "Interaction logged & Follow-up scheduled" });
  } catch (err) {
    console.error("Log Interaction Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Standalone Status Update and Activity Logging
 */
const updateLeadStatus = async (req, res) => {
    try {
        const { leadId, newStatus, oldStatus } = req.body;
        const userId = req.user?.id || 1; 

        await pool.query("UPDATE leads SET status = ? WHERE id = ?", [newStatus, leadId]);

        if (activityController && activityController.record) {
            await activityController.record({
                userId: userId,
                leadId: leadId,
                actionType: 'STATUS_UPDATE',
                description: `Status updated from ${oldStatus || 'Inquiry'} to ${newStatus}`,
                oldValue: oldStatus,
                newValue: newStatus
            });
        }

        res.json({ success: true, message: "Status updated and logged" });
    } catch (error) {
        console.error("Update Status Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};
const getNewLeadCount = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) as count FROM leads WHERE lead_status = 'New' AND assigned_user_id IS NULL"
    );
    res.json({ count: rows[0].count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const bulkUpdateLeads = async (req, res) => {
  const { leadIds, lead_source_id, lead_status } = req.body;

  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: "No leads selected" });
  }

  try {
    let updateFields = [];
    let params = [];

    if (lead_source_id) {
      updateFields.push("lead_source_id = ?");
      params.push(lead_source_id);
    }

    if (lead_status) {
      updateFields.push("lead_status = ?");
      params.push(lead_status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    // Build the query
    const query = `UPDATE leads SET ${updateFields.join(', ')} WHERE id IN (?)`;
    
    // IMPORTANT: mysql2 requires the array of IDs wrapped in another array for IN (?)
    params.push(leadIds); 

    const [result] = await pool.query(query, params);

    res.json({ 
      success: true, 
      message: `${result.affectedRows} leads updated successfully` 
    });
  } catch (error) {
    console.error("Bulk Update Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};


// ── controller ────────────────────────────────────────────────────────────────

const generateLeadUid = () => {
    const yearShort = new Date().getFullYear().toString().slice(-2); // "26"
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4 random digits
    return `L${yearShort}-${randomSuffix}`;
};
const sanitize = (val, maxLen = 255) =>
    typeof val === "string" ? val.trim().slice(0, maxLen) : null;
/**
 * Capture Lead Controller
 * Handles external POST requests from Web Forms, WhatsApp, etc.
 */
const captureLead = async (req, res) => {
    try {
        // 1. Extract and Sanitize Data
        const project_id = sanitize(req.query.project_id, 100);
        
        // Dynamic Source ID: Default to 4 (Website) if not provided in URL
        const lead_source_id = parseInt(req.query.source_id) || 4;

        const full_name = sanitize(req.body.full_name, 255);
        const phone = sanitize(req.body.phone, 20);
        const email = sanitize(req.body.email, 255);

        // 2. Validation
        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                message: "Phone number is required." 
            });
        }

        const leadUid = generateLeadUid();

        // 3. Database Insert
        // Using lead_source_id dynamically based on your lead_sources table
        const [result] = await pool.query(
            `INSERT INTO leads (
                full_name,
                phone,
                email,
                lead_status,
                lead_uid,
                source_project,
                lead_source_id,
                counselor_remarks
            ) VALUES (?, ?, ?, 'New', ?, ?, ?, ?)`,
            [
                full_name || "Web Inquiry",
                phone,
                email || null,
                leadUid,
                project_id || "webgyor_portal",
                lead_source_id,
                `System Capture | Source ID: ${lead_source_id} | Project: ${project_id || 'Direct'}`
            ]
        );

        console.log("✅ Lead Captured Successfully:", { 
            id: result.insertId, 
            uid: leadUid, 
            source_id: lead_source_id 
        });

        // 4. Success Response
        res.status(201).json({ 
            success: true, 
            leadId: result.insertId, 
            leadUid 
        });

    } catch (error) {
        console.error("❌ captureLead DB error:", error.sqlMessage || error.message);

        const isDuplicate = error.code === "ER_DUP_ENTRY";
        res.status(isDuplicate ? 409 : 500).json({
            success: false,
            message: isDuplicate
                ? "A lead with this phone number already exists."
                : `Failed to capture lead: ${error.sqlMessage || 'Check server logs'}`
        });
    }
};

module.exports = {
  authenticateToken,

  getAllLeads,
  createLead,
  getLeadById,
  updateLead,
  bulkAssignLeads,
  bulkImportLeads,
  deleteLead,
captureLead,

  checkDuplicate,
  exportLeads,
  getSources,
  logInteraction,

  updateLeadStatus,
  getNewLeadCount,
  bulkUpdateLeads,
};