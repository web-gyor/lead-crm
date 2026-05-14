const { pool }             = require("../config/db");
const jwt                  = require("jsonwebtoken");
const activityController   = require("./activityController");
const leadDistributor      = require("../services/leadDistributor");

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token      = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access Denied: No Token Provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid Token" });
    req.user = user;
    next();
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const sanitize = (val, maxLen = 255) =>
  typeof val === "string" ? val.trim().slice(0, maxLen) : null;

const generateLeadUid = () => {
  const year   = new Date().getFullYear().toString().slice(-2);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `L${year}-${suffix}`;
};

// Keep in sync with SOURCE_ID_MAP in webhookController.js
const SOURCE_ID_MAP = {
  whatsapp: 1,
  meta:     2,
  website:  4,
  google:   5,
  linkedin: 6,
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET ALL LEADS
// ═══════════════════════════════════════════════════════════════════════════════

const getAllLeads = async (req, res) => {
  try {
    const page   = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit  = Math.min(parseInt(req.query.limit) || 15, 500); // cap at 500
    const offset = (page - 1) * limit;

    let whereClause = "l.deleted_at IS NULL";
    let params      = [];

    const {
      search,
      status,
      lead_source_id,
      source_id,
      assigned_user_id,
      startDate,
      endDate,
      range,
      quality,
      localDate,
    } = req.query;

    // Use client-sent local date (Kozhikode) or fallback to server date
    const today = localDate || new Date().toLocaleDateString("en-CA");

    const finalSourceId = lead_source_id || source_id;

    // ── Role-based visibility ──────────────────────────────────────────────
    const userRole = (req.user?.role || "").toLowerCase();

    const [permResult] = await pool.query(
      "SELECT is_enabled FROM role_permissions WHERE LOWER(role) = ? AND feature_name = 'View All Leads'",
      [userRole]
    );

    const canViewAll =
      userRole === "admin" ||
      userRole === "superadmin" ||
      (permResult.length > 0 && permResult[0].is_enabled === 1);

    if (!canViewAll) {
      whereClause += " AND (l.assigned_user_id = ? OR l.created_by = ? OR l.created_by IS NULL)";
      params.push(req.user.id, req.user.id);
    }

    // ── Search ────────────────────────────────────────────────────────────
    if (search?.trim()) {
      const rawSearch  = search.trim();
      const term       = `%${rawSearch}%`;
      const numericId  = rawSearch.replace(/L26-/i, "").replace(/-/g, "").replace(/^0+/, "");
      const cleanUid   = rawSearch.replace(/[^a-zA-Z0-9]/g, "");

      whereClause += `
        AND (
          l.full_name LIKE ?
          OR l.phone LIKE ?
          OR l.lead_uid LIKE ?
          OR REPLACE(l.lead_uid, '-', '') LIKE ?
          ${numericId ? "OR l.id = ?" : ""}
        )`;

      params.push(term, term, term, `%${cleanUid}%`);
      if (numericId) params.push(numericId);
    }

    // ── Status ────────────────────────────────────────────────────────────
    if (status && !["all", "leads", ""].includes(status.toLowerCase())) {
      let dbStatus = status;
      if (status === "Won")      dbStatus = "Converted";
      if (status === "Rejected") dbStatus = "Not Interested";
      whereClause += " AND l.lead_status = ?";
      params.push(dbStatus);
    }

    // ── Source ────────────────────────────────────────────────────────────
    if (finalSourceId && !["all", "", "undefined", "null"].includes(String(finalSourceId).toLowerCase())) {
      whereClause += " AND l.lead_source_id = ?";
      params.push(finalSourceId);
    }

    // ── Quality ───────────────────────────────────────────────────────────
    if (quality && quality !== "all") {
      whereClause += " AND LOWER(l.lead_quality) = ?";
      params.push(quality.toLowerCase());
    }

    // ── Assigned user ─────────────────────────────────────────────────────
    if (assigned_user_id) {
      if (assigned_user_id === "unassigned") {
        whereClause += " AND (l.assigned_user_id IS NULL OR l.assigned_user_id = 0)";
      } else if (!["all", "", "undefined", "null"].includes(String(assigned_user_id).toLowerCase())) {
        whereClause += " AND l.assigned_user_id = ?";
        params.push(assigned_user_id);
      }
    }

    // ── Date range ────────────────────────────────────────────────────────
    if (range === "today") {
      whereClause += " AND DATE(l.created_at) = STR_TO_DATE(?, '%Y-%m-%d')";
      params.push(today);
    } else if (range === "this_week") {
      whereClause += " AND l.created_at >= DATE_SUB(STR_TO_DATE(?, '%Y-%m-%d'), INTERVAL 7 DAY)";
      params.push(today);
    } else if (range === "this_month") {
      whereClause += " AND l.created_at >= DATE_SUB(STR_TO_DATE(?, '%Y-%m-%d'), INTERVAL 30 DAY)";
      params.push(today);
    } else if (range === "this_year") {
      whereClause += " AND YEAR(l.created_at) = YEAR(STR_TO_DATE(?, '%Y-%m-%d'))";
      params.push(today);
    } else if (startDate && endDate) {
      whereClause += " AND l.created_at >= ? AND l.created_at <= ?";
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    }

    // ── Count query ───────────────────────────────────────────────────────
    const [[{ total: totalItems }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM leads l WHERE ${whereClause}`,
      params
    );

    // ── Data query ────────────────────────────────────────────────────────
    const [leads] = await pool.query(
      `SELECT
         l.*,
         u.name  AS counselor_name,
         ls.name AS source_name
       FROM leads l
       LEFT JOIN users       u  ON l.assigned_user_id = u.id
       LEFT JOIN lead_sources ls ON l.lead_source_id   = ls.id
       WHERE ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: leads,
      pagination: {
        totalItems,
        totalPages:  Math.ceil(totalItems / limit),
        currentPage: page,
        limit,
      },
    });

  } catch (error) {
    console.error("getAllLeads error:", error);
    return res.status(500).json({ success: false, error: "Failed to load leads" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE LEAD
// ═══════════════════════════════════════════════════════════════════════════════

const createLead = async (req, res) => {
  try {
    const {
      full_name, parent_name, parent_contact, phone, email, city,
      age, gender, qualification, year_of_passing, whatsapp_same, urgency,
      lead_source_id, assigned_user_id, interested_course,
      counselor_remarks, lead_status,
    } = req.body;

    const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: "Valid 10-digit phone required" });
    }

    const leadUid = generateLeadUid();

    const [result] = await pool.query(
      `INSERT INTO leads (
         full_name, parent_name, parent_contact, phone, whatsapp_same,
         email, city, age, gender, qualification, year_of_passing,
         lead_source_id, assigned_user_id, interested_course,
         counselor_remarks, lead_status, urgency, lead_uid, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        (full_name || "N/A").trim(),
        parent_name          || null,
        parent_contact       || null,
        cleanPhone,
        Number(whatsapp_same) === 1 ? 1 : 0,
        email                || null,
        city                 || null,
        age                  || null,
        gender               || null,
        qualification        || null,
        year_of_passing      || null,
        lead_source_id       || null,
        assigned_user_id     || null,
        interested_course    || null,
        counselor_remarks    || null,
        lead_status          || "New",
        urgency?.trim()      || "Researching",
        leadUid,
        req.user?.id         || null,
      ]
    );

    return res.status(201).json({ success: true, leadId: result.insertId, leadUid });

  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, error: "A lead with this phone number already exists" });
    }
    console.error("createLead error:", error);
    return res.status(500).json({ success: false, error: "Failed to create lead" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET SINGLE LEAD
// ═══════════════════════════════════════════════════════════════════════════════

const getLeadById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.*, u.name AS counselor_name, ls.name AS source_name
       FROM leads l
       LEFT JOIN users        u  ON l.assigned_user_id = u.id
       LEFT JOIN lead_sources ls ON l.lead_source_id   = ls.id
       WHERE l.id = ? AND l.deleted_at IS NULL`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: "Lead not found" });

    const lead = rows[0];

    const [history] = await pool.query(
      `SELECT h.*, u.name AS user_name
       FROM lead_status_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.lead_id = ?
       ORDER BY h.changed_at DESC`,
      [req.params.id]
    );

    lead.history = history;

    return res.json({ success: true, data: lead });

  } catch (error) {
    console.error("getLeadById error:", error);
    return res.status(500).json({ error: "Failed to fetch lead" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE LEAD
// ═══════════════════════════════════════════════════════════════════════════════

const updateLead = async (req, res) => {
  const { id }    = req.params;
  const updates   = req.body;

  try {
    const [current] = await pool.query(
      "SELECT * FROM leads WHERE id = ? AND deleted_at IS NULL",
      [id]
    );
    if (!current.length) return res.status(404).json({ error: "Lead not found" });

    const old = current[0];

    // Safe value resolver — never overwrite with undefined, never accept blank strings as values
    const safe = (newVal, oldVal, type = "string") => {
      if (newVal === undefined) return oldVal;
      if (type === "number") {
        if (newVal === null || newVal === "") return oldVal;
        const n = Number(newVal);
        return isNaN(n) ? oldVal : n;
      }
      if (newVal === null) return oldVal;
      const val = String(newVal).trim();
      return val === "" ? null : val;
    };

    // ── First contact tracking ─────────────────────────────────────────────
    let firstContactedAt = old.first_contacted_at;
    if (
      ["Contacted", "Follow-up"].includes(updates.lead_status) &&
      !firstContactedAt
    ) {
      firstContactedAt = new Date();
    }

    // ── Conversion tracking — controller owns these, never trust frontend ──
    let convertedAt = old.converted_at;
    if (
      ["Converted", "Closed"].includes(updates.lead_status) &&
      !convertedAt
    ) {
      convertedAt = new Date();
    }

    let lostAt = old.lost_at;
    if (updates.lead_status === "Lost" && !lostAt) {
      lostAt = new Date();
    }

    // ── Build update payload ───────────────────────────────────────────────
    const data = {
      full_name:           safe(updates.full_name,         old.full_name),
      phone:               safe(updates.phone,             old.phone),
      email:               safe(updates.email,             old.email),
      city:                safe(updates.city,              old.city),
      age:                 safe(updates.age,               old.age,               "number"),
      gender:              safe(updates.gender,            old.gender),
      qualification:       safe(updates.qualification,     old.qualification),
      year_of_passing:     safe(updates.year_of_passing,   old.year_of_passing,   "number"),
      parent_name:         safe(updates.parent_name,       old.parent_name),
      parent_contact:      safe(updates.parent_contact,    old.parent_contact),
      lead_status:         safe(updates.lead_status,       old.lead_status || "New"),
      lead_source_id:      safe(updates.lead_source_id,    old.lead_source_id,    "number"),
      assigned_user_id:    updates.assigned_user_id === ""
                             ? null
                             : safe(updates.assigned_user_id, old.assigned_user_id, "number"),
      interested_course:   safe(updates.interested_course, old.interested_course),
      counselor_remarks:   safe(updates.counselor_remarks, old.counselor_remarks),
      urgency:             safe(updates.urgency,           old.urgency),
      lead_quality:        safe(updates.lead_quality,      old.lead_quality),
      whatsapp_same:       updates.hasOwnProperty("whatsapp_same")
                             ? (updates.whatsapp_same ? 1 : 0)
                             : (old.whatsapp_same ?? 0),

      // ── Date fields ──────────────────────────────────────────────────────
      next_follow_up_date: (() => {
        // Terminal statuses — clear follow-up
        if (["Converted", "Lost", "Rejected", "Closed", "Not Interested"].includes(
          updates.lead_status || old.lead_status
        )) return null;
        // Explicit value sent from frontend
        if (updates.hasOwnProperty("next_follow_up_date")) {
          return updates.next_follow_up_date
            ? String(updates.next_follow_up_date).split("T")[0]
            : null;
        }
        // Keep existing
        return old.next_follow_up_date
          ? new Date(old.next_follow_up_date).toISOString().split("T")[0]
          : null;
      })(),

      // ── Timestamps — controller owns, never from frontend ─────────────
      first_contacted_at: firstContactedAt,
      converted_at:       convertedAt,
      lost_at:            lostAt,
      status_updated_at:  updates.lead_status && updates.lead_status !== old.lead_status
                            ? new Date()
                            : old.status_updated_at,
      updated_at:         new Date(),
    };

    // ── Status history log ────────────────────────────────────────────────
    if (updates.lead_status && updates.lead_status !== old.lead_status) {
      await pool.query(
        "INSERT INTO lead_status_history (lead_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)",
        [id, old.lead_status, updates.lead_status, req.user?.id || null]
      );
    }

    // ── Main update ───────────────────────────────────────────────────────
    await pool.query(
      `UPDATE leads SET
         full_name=?, phone=?, email=?, city=?, age=?, gender=?,
         qualification=?, year_of_passing=?, parent_name=?, parent_contact=?,
         lead_status=?, lead_source_id=?, assigned_user_id=?, interested_course=?,
         counselor_remarks=?, next_follow_up_date=?, urgency=?, lead_quality=?,
         whatsapp_same=?, first_contacted_at=?, converted_at=?, lost_at=?,
         status_updated_at=?, updated_at=?
       WHERE id=?`,
      [
        data.full_name,         data.phone,            data.email,
        data.city,              data.age,              data.gender,
        data.qualification,     data.year_of_passing,  data.parent_name,
        data.parent_contact,    data.lead_status,      data.lead_source_id,
        data.assigned_user_id,  data.interested_course, data.counselor_remarks,
        data.next_follow_up_date, data.urgency,         data.lead_quality,
        data.whatsapp_same,     data.first_contacted_at, data.converted_at,
        data.lost_at,           data.status_updated_at, data.updated_at,
        id,
      ]
    );

    return res.json({ success: true, message: "Updated successfully" });

  } catch (error) {
    console.error("updateLead error:", error);
    return res.status(500).json({ error: "Failed to update lead" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// BULK ASSIGN
// ═══════════════════════════════════════════════════════════════════════════════

const bulkAssignLeads = async (req, res) => {
  const { leadIds, assigned_user_id, lead_status } = req.body;

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: "No leads selected" });
  }

  try {
    const updateFields = [];
    const params       = [];

    updateFields.push("assigned_user_id = ?");
    params.push(assigned_user_id === "" ? null : assigned_user_id);

    updateFields.push("lead_status = ?");
    params.push(lead_status || "New");

    if (lead_status === "Converted") updateFields.push("converted_at = NOW()");
    if (lead_status === "Lost")      updateFields.push("lost_at = NOW()");

    const TERMINAL = ["Converted", "Closed", "Lost", "Rejected", "Not Interested"];
    if (TERMINAL.includes(lead_status)) updateFields.push("next_follow_up_date = NULL");

    updateFields.push("updated_at = NOW()");

    params.push(leadIds);

    // Status history
    const [oldLeads] = await pool.query(
      "SELECT id, lead_status FROM leads WHERE id IN (?)",
      [leadIds]
    );
    await Promise.all(
      oldLeads.map(l =>
        pool.query(
          "INSERT INTO lead_status_history (lead_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)",
          [l.id, l.lead_status, lead_status, req.user?.id || null]
        )
      )
    );

    await pool.query(
      `UPDATE leads SET ${updateFields.join(", ")} WHERE id IN (?)`,
      params
    );

    // Fetch assigned user name for response
    const [[userData]] = await pool.query(
      "SELECT name FROM users WHERE id = ?",
      [assigned_user_id]
    ).catch(() => [[null]]);

    // Activity logs
    await Promise.all(
      leadIds.map(leadId =>
        activityController.record({
          userId:      req.user?.id,
          leadId,
          actionType:  "ASSIGNED",
          description: `Bulk assigned to ${userData?.name || assigned_user_id} with status "${lead_status || "New"}"`,
          oldValue:    null,
          newValue:    String(assigned_user_id),
        })
      )
    );

    return res.json({
      success:            true,
      message:            `Successfully updated ${leadIds.length} leads`,
      assigned_user_name: userData?.name || "Assigned",
    });

  } catch (error) {
    console.error("bulkAssignLeads error:", error);
    return res.status(500).json({ error: "Bulk update failed" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// BULK IMPORT
// ═══════════════════════════════════════════════════════════════════════════════

const bulkImportLeads = async (req, res) => {
  const { leads, autoDistribute = true } = req.body;
  const createdBy = req.user?.id || 1;

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ success: false, message: "No leads provided" });
  }

  let inserted = 0, assigned = 0, duplicates = 0, invalid = 0, failed = 0;

  try {
    const [sourceRows] = await pool.query(
      "SELECT id FROM lead_sources WHERE name = 'Bulk Import' LIMIT 1"
    );
    const sourceId = sourceRows[0]?.id;
    if (!sourceId) throw new Error("Bulk Import source missing from lead_sources table");

    const headerMap = {
      "full name":        "full_name",
      "name":             "full_name",
      "phone number":     "phone",
      "phone":            "phone",
      "contact":          "phone",
      "email":            "email",
      "city":             "city",
      "course":           "interested_course",
      "interested course":"interested_course",
      "country":          "country",
      "source":           "source",
    };

    for (const rawRow of leads) {
      try {
        // Normalise header keys
        const l = {};
        Object.keys(rawRow).forEach(key => {
          const norm   = key.trim().toLowerCase();
          const mapped = headerMap[norm];
          l[mapped || norm] = rawRow[key];
        });

        const fullName = String(l.full_name || "").trim();

        // Handle Excel scientific notation (e.g. 9.85E+09)
        let phoneStr = String(l.phone || "");
        if (phoneStr.includes("E+") || phoneStr.includes("e+")) {
          phoneStr = Number(phoneStr).toLocaleString("fullwide", { useGrouping: false });
        }
        const cleanPhone = phoneStr.replace(/\D/g, "").slice(-10);

        if (!fullName || cleanPhone.length < 10) { invalid++;    continue; }

        const [existing] = await pool.query(
          "SELECT id FROM leads WHERE phone = ? LIMIT 1",
          [cleanPhone]
        );
        if (existing.length > 0) { duplicates++; continue; }

        const leadUid = generateLeadUid();

        const [insertOp] = await pool.query(
          `INSERT INTO leads
             (full_name, phone, email, city, country, interested_course,
              lead_source_id, lead_status, is_archived, lead_uid, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'New', 0, ?, ?)`,
          [
            fullName,
            cleanPhone,
            l.email             || null,
            l.city              || null,
            l.country           || "India",
            l.interested_course || "Inquiry",
            sourceId,
            leadUid,
            createdBy,
          ]
        );

        if (insertOp.insertId) {
          inserted++;

          if (autoDistribute) {
            try {
              const distResult = await leadDistributor.distribute(
                {
                  id:                insertOp.insertId,
                  full_name:         fullName,
                  phone:             cleanPhone,
                  country:           l.country           || "India",
                  interested_course: l.interested_course || "Inquiry",
                },
                createdBy
              );
              if (distResult?.success) assigned++;
            } catch (distErr) {
              console.error("Distribution error:", distErr.message);
            }
          }
        }
      } catch (rowErr) {
        failed++;
      }
    }

    return res.json({
      success:    true,
      inserted,
      assigned,
      duplicates,
      invalid,
      failed,
      message:    `${inserted} leads imported successfully`,
    });

  } catch (masterErr) {
    console.error("bulkImportLeads error:", masterErr);
    return res.status(500).json({ success: false, message: masterErr.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE LEAD (soft delete — admin only)
// ═══════════════════════════════════════════════════════════════════════════════

const deleteLead = async (req, res) => {
  const { id } = req.params;
  try {
    if ((req.user?.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    await pool.query("UPDATE leads SET deleted_at = NOW() WHERE id = ?", [Number(id)]);
    return res.json({ success: true, message: "Lead deleted" });
  } catch (error) {
    console.error("deleteLead error:", error);
    return res.status(500).json({ error: "Failed to delete lead" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CAPTURE LEAD  (public webhook endpoint)
// Fix: removed non-existent 'source' column from INSERT
// ═══════════════════════════════════════════════════════════════════════════════

const captureLead = async (req, res) => {
  try {
    const { full_name, email, phone: phoneRaw } = req.body;

    const sourceKey  = sanitize(req.query.source, 20)?.toLowerCase() || "website";
    const project_id = sanitize(req.query.project_id, 100)           || "direct";

    if (!phoneRaw) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    const cleanedPhone = String(phoneRaw).replace(/\D/g, "").slice(-10);
    if (cleanedPhone.length !== 10) {
      return res.status(400).json({ success: false, message: "Valid 10-digit mobile number required" });
    }

    const safeName       = sanitize(full_name, 255) || "Web Inquiry";
    const safeEmail      = sanitize(email, 255)     || null;
    const leadUid        = generateLeadUid();
    const lead_source_id = SOURCE_ID_MAP[sourceKey] ?? SOURCE_ID_MAP.website;
    const sourceLabel    = sourceKey.charAt(0).toUpperCase() + sourceKey.slice(1);

    // Fix: removed non-existent 'source' column — use source_project and lead_source_id
    const [result] = await pool.query(
      `INSERT INTO leads
         (full_name, phone, email, lead_status, lead_uid, source_project, lead_source_id, counselor_remarks)
       VALUES (?, ?, ?, 'New', ?, ?, ?, ?)`,
      [
        safeName,
        cleanedPhone,
        safeEmail,
        leadUid,
        project_id,
        lead_source_id,
        `Web capture | source: ${sourceLabel} | project: ${project_id}`,
      ]
    );

    console.log("✅ Lead captured:", { insertId: result.insertId, uid: leadUid, phone: cleanedPhone, source: sourceLabel });

    return res.status(201).json({ success: true, leadId: result.insertId, leadUid });

  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "A lead with this phone number already exists" });
    }
    console.error("captureLead error:", error);
    return res.status(500).json({ success: false, message: "Failed to capture lead — check server logs" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK DUPLICATE
// ═══════════════════════════════════════════════════════════════════════════════

const checkDuplicate = async (req, res) => {
  const { phone, email } = req.query;
  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, lead_status FROM leads WHERE phone = ? OR (email = ? AND email != '' AND email IS NOT NULL) LIMIT 1",
      [phone, email || ""]
    );
    return res.json({ exists: rows.length > 0, lead: rows[0] || null });
  } catch (error) {
    console.error("checkDuplicate error:", error);
    return res.status(500).json({ error: "Duplicate check failed" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT CSV
// ═══════════════════════════════════════════════════════════════════════════════

const exportLeads = async (req, res) => {
  try {
    const [leads] = await pool.query(
      `SELECT
         full_name   AS "Full Name",
         phone       AS "Phone Number",
         email       AS "Email",
         city        AS "City",
         interested_course AS "Course",
         country     AS "Country"
       FROM leads
       WHERE is_archived = 0 AND deleted_at IS NULL
       ORDER BY created_at DESC`
    );

    if (!leads.length) {
      return res.status(404).json({ success: false, message: "No leads to export" });
    }

    const headers = Object.keys(leads[0]).join(",");
    const rows    = leads.map(l =>
      Object.values(l).map(v =>
        `"${String(v ?? "").replace(/"/g, '""')}"`
      ).join(",")
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=leads_export.csv");
    return res.status(200).send([headers, ...rows].join("\n"));

  } catch (error) {
    console.error("exportLeads error:", error);
    return res.status(500).json({ success: false, message: "Export failed" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET SOURCES  (Fix: single definition, consistent response shape)
// ═══════════════════════════════════════════════════════════════════════════════

const getSources = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM lead_sources ORDER BY name ASC");
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("getSources error:", error);
    return res.status(500).json({ success: false, error: "Failed to load lead sources" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET COURSES
// ═══════════════════════════════════════════════════════════════════════════════

const getCourses = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM courses ORDER BY name ASC");
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("getCourses error:", error);
    return res.status(500).json({ success: false, error: "Failed to load courses" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOG INTERACTION
// ═══════════════════════════════════════════════════════════════════════════════

const logInteraction = async (req, res) => {
  const { lead_id, type, outcome, remarks, next_follow_up } = req.body;
  try {
    await pool.query(
      "INSERT INTO lead_interactions (lead_id, interaction_type, outcome, remarks, created_by) VALUES (?, ?, ?, ?, ?)",
      [lead_id, type, outcome, remarks, req.user.id]
    );

    let statusUpdate = "";
    if (["Replied", "Connected"].includes(outcome)) statusUpdate = ", lead_status = 'Interested'";
    if (outcome === "Not Reachable")                statusUpdate = ", lead_status = 'Follow-up'";

    await pool.query(
      `UPDATE leads SET next_follow_up_date = ?, last_interaction_at = NOW() ${statusUpdate} WHERE id = ?`,
      [next_follow_up || null, lead_id]
    );

    await activityController.record({
      userId:      req.user?.id,
      leadId:      lead_id,
      actionType:  "NOTE_ADDED",
      description: `Interaction logged — ${type}: ${outcome}. Remarks: "${remarks}"`,
      oldValue:    null,
      newValue:    outcome,
    });

    return res.json({ success: true, message: "Interaction logged & follow-up scheduled" });
  } catch (err) {
    console.error("logInteraction error:", err);
    return res.status(500).json({ error: "Failed to log interaction" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE LEAD STATUS (standalone)
// ═══════════════════════════════════════════════════════════════════════════════

const updateLeadStatus = async (req, res) => {
  try {
    const { leadId, newStatus, oldStatus } = req.body;
    const userId = req.user?.id;

    await pool.query("UPDATE leads SET lead_status = ?, status_updated_at = NOW() WHERE id = ?", [newStatus, leadId]);

    await pool.query(
      "INSERT INTO lead_status_history (lead_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)",
      [leadId, oldStatus || null, newStatus, userId || null]
    );

    if (activityController?.record) {
      await activityController.record({
        userId,
        leadId,
        actionType:  "STATUS_UPDATE",
        description: `Status updated from ${oldStatus || "Unknown"} to ${newStatus}`,
        oldValue:    oldStatus,
        newValue:    newStatus,
      });
    }

    return res.json({ success: true, message: "Status updated" });
  } catch (error) {
    console.error("updateLeadStatus error:", error);
    return res.status(500).json({ success: false, error: "Failed to update status" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET NEW LEAD COUNT
// ═══════════════════════════════════════════════════════════════════════════════

const getNewLeadCount = async (req, res) => {
  try {
    const [[{ count }]] = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE lead_status = 'New' AND assigned_user_id IS NULL AND deleted_at IS NULL"
    );
    return res.json({ count });
  } catch (error) {
    console.error("getNewLeadCount error:", error);
    return res.status(500).json({ error: "Failed to get count" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// BULK UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

const bulkUpdateLeads = async (req, res) => {
  const { leadIds, lead_source_id, lead_status } = req.body;

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: "No leads selected" });
  }

  try {
    const updateFields = [];
    const params       = [];

    if (lead_source_id) {
      updateFields.push("lead_source_id = ?");
      params.push(lead_source_id);
    }

    if (lead_status) {
      updateFields.push("lead_status = ?");
      params.push(lead_status);
      if (lead_status === "Converted") updateFields.push("converted_at = NOW()");
      if (lead_status === "Lost")      updateFields.push("lost_at = NOW()");
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    updateFields.push("updated_at = NOW()");

    // Status history
    if (lead_status) {
      const [oldLeads] = await pool.query(
        "SELECT id, lead_status FROM leads WHERE id IN (?)",
        [leadIds]
      );
      await Promise.all(
        oldLeads.map(l =>
          pool.query(
            "INSERT INTO lead_status_history (lead_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)",
            [l.id, l.lead_status, lead_status, req.user?.id || null]
          )
        )
      );
    }

    params.push(leadIds);
    const [result] = await pool.query(
      `UPDATE leads SET ${updateFields.join(", ")} WHERE id IN (?)`,
      params
    );

    return res.json({ success: true, message: `${result.affectedRows} leads updated` });

  } catch (error) {
    console.error("bulkUpdateLeads error:", error);
    return res.status(500).json({ error: "Bulk update failed" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

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
  getCourses,
  logInteraction,
  updateLeadStatus,
  getNewLeadCount,
  bulkUpdateLeads,
};