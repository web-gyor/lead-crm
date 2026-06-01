const { pool } = require("../config/db");
const jwt = require("jsonwebtoken");
const activityController = require("./activityController");
const leadDistributor = require("../services/leadDistributor");

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

const sanitize = (val, maxLen = 255) => typeof val === "string" ? val.trim().slice(0, maxLen) : null;
const generateLeadUid = () => `L${new Date().getFullYear().toString().slice(-2)}-${Math.floor(1000 + Math.random() * 9000)}`;

const SOURCE_ID_MAP = { whatsapp: 1, meta: 2, website: 4, google: 5, linkedin: 6 };

// ═══════════════════════════════════════════════════════════════════════════════
// DATA CORE CRUD TRACKS — MASTER GET ALL LEADS WITH SINGLE-BRANCH HOOK
// ═══════════════════════════════════════════════════════════════════════════════

const getAllLeads = async (req, res) => {
  try {
    const page   = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit  = Math.min(parseInt(req.query.limit) || 15, 500);
    const offset = (page - 1) * limit;

    const userRoleLower = String(req.user?.role || "").trim().toLowerCase();
    
    // 👑 ADMINISTRATIVE VISIBILITY BYPASS: Super Admin, Admin, and Manager roles see all branch records
    const hasAdministrativeVisibility = 
      Boolean(req.user?.is_super_admin) || 
      userRoleLower === "super admin" || 
      userRoleLower === "admin" || 
      userRoleLower === "manager";

    let whereClause = "l.deleted_at IS NULL";
    let params = [];

    // 🎓 OPERATOR TIER BOUNDARY: Only lock data down if the user is a Counselor or Telecaller
    if (!hasAdministrativeVisibility) {
      whereClause += " AND (l.assigned_user_id = ? OR l.assigned_to = ?)";
      params.push(req.user.id, req.user.id);
    }

    const {
      search,
      status,
      lead_source_id,
      source_id,
      assigned_user_id,
      quality,          // ← old param name
      lead_quality,     // frontend sends this one
      startDate,        
      endDate,          
    } = req.query;

    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      whereClause += " AND (l.full_name LIKE ? OR l.phone LIKE ? OR l.lead_uid LIKE ?)";
      params.push(term, term, term);
    }

    // 🚀 FIXED: Upgraded status filters to use explicit, case-insensitive lowercase trimming matching properties
    if (status && status !== "all" && status !== "") {
      let dbStatus = status;
      const checkStatus = status.trim().toLowerCase();
      if (checkStatus === "won") dbStatus = "Converted";
      else if (checkStatus === "rejected") dbStatus = "Not Interested";

      whereClause += " AND LOWER(TRIM(l.lead_status)) = LOWER(?)";
      params.push(dbStatus.trim());
    }

    const sourceFilter = lead_source_id || source_id;
    if (sourceFilter) {
      whereClause += " AND l.lead_source_id = ?";
      params.push(Number(sourceFilter));
    }

    if (assigned_user_id) {
      if (assigned_user_id === 'unassigned') {
        whereClause += " AND (l.assigned_user_id IS NULL OR l.assigned_user_id = 0)";
      } else if (hasAdministrativeVisibility) {
        whereClause += " AND l.assigned_user_id = ?";
        params.push(Number(assigned_user_id));
      }
    }

    const qualityFilter = lead_quality || quality;
    if (qualityFilter && qualityFilter !== "all") {
      whereClause += " AND LOWER(l.lead_quality) = LOWER(?)";
      params.push(qualityFilter);
    }

    if (startDate) {
      whereClause += " AND DATE(l.created_at) >= ?";
      params.push(startDate);
    }
    if (endDate) {
      whereClause += " AND DATE(l.created_at) <= ?";
      params.push(endDate);
    }

    // 🚀 FIXED: Hardened explicit table schema declaration inside counts transaction to bypass identifier crashes
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM leads l WHERE ${whereClause}`,
      params,
    );
    const totalItems = Number(countResult[0].total) || 0;

    const [leads] = await pool.query(
      `SELECT l.*, u.name AS counselor_name, ls.name AS source_name
       FROM leads l
       LEFT JOIN users u  ON l.assigned_user_id = u.id
       LEFT JOIN lead_sources ls ON l.lead_source_id = ls.id
       WHERE ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
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
    console.error("getAllLeads error:", error.message);
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
      lead_source_id, assigned_user_id, interested_course, custom_course_name,
      counselor_remarks, lead_status,
    } = req.body;

    const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);

    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        error: `Phone number must be exactly 10 digits. Received: ${phone}`
      });
    }

    if (!/^[6-9]/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        error: "Phone number must start with 6, 7, 8 or 9"
      });
    }

    const [existing] = await pool.query(
      "SELECT id, full_name FROM leads WHERE phone = ? LIMIT 1",
      [cleanPhone]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Lead with this phone already exists: ${existing[0].full_name}`,
      });
    }

    const targetedCourseSelection = interested_course === "Other"
      ? (custom_course_name || "Not Specified")
      : interested_course;

    // ─── 🚀 AUTO-ASSIGNMENT & IMMEDIATE VISIBILITY ENGINE ───────────────────
    const creatorId = req.user?.id || null;
    const userRoleLower = String(req.user?.role || "").trim().toLowerCase();

    let finalAssignedUser = assigned_user_id;

    // Evaluate if the entry field is completely empty, zero, or unassigned string parameters
    if (!finalAssignedUser || finalAssignedUser === "" || Number(finalAssignedUser) === 0 || finalAssignedUser === "unassigned") {
      // Force auto-assign to self if created by front-line execution tiers
      if (userRoleLower === "counselor" || userRoleLower === "telecaller") {
        finalAssignedUser = creatorId;
      } else {
        finalAssignedUser = null;
      }
    }
    // ────────────────────────────────────────────────────────────────────────────

    // ✅ FIXED: Added assigned_to column field trace into query schema mapping 
    const [result] = await pool.query(
      `INSERT INTO leads (
           full_name, parent_name, parent_contact, phone, whatsapp_same,
           email, city, age, gender, qualification, year_of_passing,
           lead_source_id, assigned_user_id, assigned_to, interested_course,
           counselor_remarks, lead_status, urgency, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        (full_name || "N/A").trim(),
        parent_name || null,
        parent_contact || null,
        cleanPhone,
        Number(whatsapp_same) === 1 ? 1 : 0,
        email || null,
        city || null,
        age || null,
        gender || null,
        qualification || null,
        year_of_passing || null,
        lead_source_id || null,
        finalAssignedUser ? Number(finalAssignedUser) : null, // assigned_user_id
        finalAssignedUser ? Number(finalAssignedUser) : null, // assigned_to
        targetedCourseSelection || null,
        counselor_remarks || null,
        lead_status || "New",
        urgency?.trim() || "Just inquiring",
        creatorId, // Traceability: Permanently records who initially added the lead row string
      ]
    );

    const insertedId = result.insertId;
    const generatedDisplayCode = `L26-${String(insertedId).padStart(4, '0')}`;

    await pool.query(
      "UPDATE leads SET lead_uid = ? WHERE id = ?",
      [generatedDisplayCode, insertedId]
    );

    return res.status(201).json({
      success: true,
      leadId: insertedId,
      leadUid: generatedDisplayCode,
      message: "Lead created successfully"
    });

  } catch (error) {
    console.error("createLead error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to create lead" 
    });
  }
};
// ═══════════════════════════════════════════════════════════════════════════════
// GET SINGLE LEAD
// ═══════════════════════════════════════════════════════════════════════════════

const getLeadById = async (req, res) => {
  try {
    const userRoleLower = String(req.user?.role || "").trim().toLowerCase();
    const isSuper = req.user?.is_super_admin == 1 || userRoleLower === "admin" || userRoleLower === "manager";
    
    let query = `
      SELECT l.*, u.name AS counselor_name, ls.name AS source_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_user_id = u.id
      LEFT JOIN lead_sources ls ON l.lead_source_id = ls.id
      WHERE l.id = ? AND l.deleted_at IS NULL
    `;
    let params = [req.params.id];

    if (!isSuper) {
      query += " AND (l.assigned_user_id = ? OR l.assigned_to = ?)";
      params.push(req.user.id, req.user.id);
    }

    const [rows] = await pool.query(query, params);
    if (!rows.length) return res.status(404).json({ error: "Lead not found or access denied" });

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
  const userRoleLower = String(req.user?.role || "").trim().toLowerCase();
  const isSuper   = req.user?.is_super_admin == 1 || userRoleLower === "admin" || userRoleLower === "manager";

  try {
    let checkQuery = "SELECT * FROM leads WHERE id = ? AND deleted_at IS NULL";
    let checkParams = [id];

    if (!isSuper) {
      checkQuery += " AND (assigned_user_id = ? OR assigned_to = ?)";
      checkParams.push(req.user.id, req.user.id);
    }

    const [current] = await pool.query(checkQuery, checkParams);
    if (!current.length) return res.status(404).json({ error: "Lead not found or access denied" });

    const old = current[0];

    const safeVal = (newVal, oldVal, type = "string") => {
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

    let firstContactedAt = old.first_contacted_at;
    if (["Contacted", "Follow-up"].includes(updates.lead_status) && !firstContactedAt) {
      firstContactedAt = new Date();
    }

    let convertedAt = old.converted_at;
    if (["Converted", "Closed"].includes(updates.lead_status) && !convertedAt) {
      convertedAt = new Date();
    }

    let lostAt = old.lost_at;
    if (updates.lead_status === "Lost" && !lostAt) {
      lostAt = new Date();
    }

    const data = {
      full_name:           safeVal(updates.full_name,         old.full_name),
      phone:               safeVal(updates.phone,             old.phone),
      email:               safeVal(updates.email,             old.email),
      city:                safeVal(updates.city,              old.city),
      age:                 safeVal(updates.age,               old.age,               "number"),
      gender:              safeVal(updates.gender,            old.gender),
      qualification:       safeVal(updates.qualification,     old.qualification),
      year_of_passing:     safeVal(updates.year_of_passing,   old.year_of_passing,   "number"),
      parent_name:         safeVal(updates.parent_name,       old.parent_name),
      parent_contact:      safeVal(updates.parent_contact,    old.parent_contact),
      lead_status:         safeVal(updates.lead_status,       old.lead_status || "New"),
      lead_source_id:      safeVal(updates.lead_source_id,    old.lead_source_id,    "number"),
      assigned_user_id:    updates.assigned_user_id === ""
                           ? null
                           : safeVal(updates.assigned_user_id, old.assigned_user_id, "number"),
      interested_course:   safeVal(updates.interested_course, old.interested_course),
      counselor_remarks:   safeVal(updates.counselor_remarks, old.counselor_remarks),
      urgency:             safeVal(updates.urgency,           old.urgency),
      lead_quality:        safeVal(updates.lead_quality,      old.lead_quality),
      whatsapp_same:       updates.hasOwnProperty("whatsapp_same")
                           ? (updates.whatsapp_same ? 1 : 0)
                           : (old.whatsapp_same ?? 0),

      next_follow_up_date: (() => {
        if (["Converted", "Lost", "Rejected", "Closed", "Not Interested"].includes(updates.lead_status || old.lead_status)) return null;
        if (updates.hasOwnProperty("next_follow_up_date")) {
          return updates.next_follow_up_date ? String(updates.next_follow_up_date).split("T")[0] : null;
        }
        return old.next_follow_up_date ? new Date(old.next_follow_up_date).toISOString().split("T")[0] : null;
      })(),

      first_contacted_at: firstContactedAt,
      converted_at:       convertedAt,
      lost_at:            lostAt,
      status_updated_at:  updates.lead_status && updates.lead_status !== old.lead_status ? new Date() : old.status_updated_at,
      updated_at:         new Date(),
    };

    if (updates.lead_status && updates.lead_status !== old.lead_status) {
      await pool.query(
        "INSERT INTO lead_status_history (lead_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)",
        [id, old.lead_status, updates.lead_status, req.user?.id || null]
      );
    }

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
// BULK ASSIGN & UPDATE ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const bulkAssignLeads = async (req, res) => {
  const { leadIds, assigned_user_id, lead_status } = req.body;
  const userRoleLower = String(req.user?.role || "").trim().toLowerCase();
  
  // 🚀 CLEANED & LEAN: Stripped out "branch admin" completely.
  // Securely covers your actual core administrative tiers.
  const isSuper = 
    req.user?.is_super_admin == 1 || 
    req.user?.is_super_admin === true ||
    userRoleLower === "super admin" || 
    userRoleLower === "admin" || 
    userRoleLower === "manager";

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: "No leads selected" });
  }
  try {
    let checkQuery = "SELECT id FROM leads WHERE id IN (?) AND deleted_at IS NULL";
    let checkParams = [leadIds];

    if (!isSuper) {
      checkQuery += " AND (assigned_user_id = ? OR assigned_to = ?)";
      checkParams.push(req.user.id, req.user.id);
    }

    const [validRows] = await pool.query(checkQuery, checkParams);
    const authorizedIds = validRows.map(row => row.id);

    if (authorizedIds.length === 0) {
      return res.status(403).json({ error: "No authorized targets found" });
    }

    const updateFields = [];
    const params       = [];

    updateFields.push("assigned_user_id = ?");
    params.push(assigned_user_id === "" ? null : assigned_user_id);

    updateFields.push("assigned_to = ?");
    params.push(assigned_user_id === "" ? null : assigned_user_id);

    updateFields.push("lead_status = ?");
    params.push(lead_status || "New");

    if (lead_status === "Converted") updateFields.push("converted_at = NOW()");
    if (lead_status === "Lost")      updateFields.push("lost_at = NOW()");

    const TERMINAL = ["Converted", "Closed", "Lost", "Rejected", "Not Interested"];
    if (TERMINAL.includes(lead_status)) updateFields.push("next_follow_up_date = NULL");

    updateFields.push("updated_at = NOW()");

    const [oldLeads] = await pool.query("SELECT id, lead_status FROM leads WHERE id IN (?)", [authorizedIds]);
    await Promise.all(
      oldLeads.map(l =>
        pool.query(
          "INSERT INTO lead_status_history (lead_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)",
          [l.id, l.lead_status, lead_status, req.user?.id || null]
        )
      )
    );

    await pool.query(`UPDATE leads SET ${updateFields.join(", ")} WHERE id IN (?)`, [...params, authorizedIds]);

    const [[userData]] = await pool.query("SELECT name FROM users WHERE id = ?", [assigned_user_id]).catch(() => [[null]]);

    await Promise.all(
      authorizedIds.map(leadId =>
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
      message:            `Successfully updated ${authorizedIds.length} leads`,
      assigned_user_name: userData?.name || "Assigned",
    });

  } catch (error) {
    console.error("bulkAssignLeads error:", error);
    return res.status(500).json({ error: "Bulk assignment failed: " + error.message });
  }
};

const bulkUpdateLeads = async (req, res) => {
  const { leadIds, lead_source_id, lead_status } = req.body;
  const userRoleLower = String(req.user?.role || "").trim().toLowerCase();
  const isSuper = req.user?.is_super_admin == 1 || userRoleLower === "admin" || userRoleLower === "manager";

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: "No leads selected" });
  }

  try {
    let checkQuery = "SELECT id FROM leads WHERE id IN (?) AND deleted_at IS NULL";
    let checkParams = [leadIds];

    if (!isSuper) {
      checkQuery += " AND (assigned_user_id = ? OR assigned_to = ?)";
      checkParams.push(req.user.id, req.user.id);
    }

    const [validRows] = await pool.query(checkQuery, checkParams);
    const authorizedIds = validRows.map(row => row.id);

    if (authorizedIds.length === 0) {
      return res.status(403).json({ error: "No authorized record targets found" });
    }

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

    if (updateFields.length === 0) return res.status(400).json({ error: "Nothing to update" });
    updateFields.push("updated_at = NOW()");

    if (lead_status) {
      const [oldLeads] = await pool.query("SELECT id, lead_status FROM leads WHERE id IN (?)", [authorizedIds]);
      await Promise.all(
        oldLeads.map(l =>
          pool.query(
            "INSERT INTO lead_status_history (lead_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)",
            [l.id, l.lead_status, lead_status, req.user?.id || null]
          )
        )
      );
    }

    await pool.query(`UPDATE leads SET ${updateFields.join(", ")} WHERE id IN (?)`, [...params, authorizedIds]);
    return res.json({ success: true, message: `${authorizedIds.length} leads updated` });
  } catch (error) {
    return res.status(500).json({ error: "Bulk update failed: " + error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// NEW DEDICATED ARCHIVE BALANCERS (BULK DELETE)
// ═══════════════════════════════════════════════════════════════════════════════

const bulkDeleteLeads = async (req, res) => {
  const { ids } = req.body;
  const userRoleLower = String(req.user?.role || "").trim().toLowerCase();
  const isSuper = req.user?.is_super_admin == 1 || userRoleLower === 'admin' || userRoleLower === 'manager';

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "No IDs provided" });
  }

  try {
    let checkQ = "SELECT id FROM leads WHERE id IN (?) AND deleted_at IS NULL";
    let queryParams = [ids];

    if (!isSuper) {
      checkQ += " AND (assigned_user_id = ? OR assigned_to = ?)";
      queryParams.push(req.user.id, req.user.id);
    }

    const [validRows] = await pool.query(checkQ, queryParams);
    const cleanIds = validRows.map(row => row.id);

    if (cleanIds.length === 0) {
      return res.status(403).json({ success: false, error: "Access denied or no live records match scope" });
    }

    const deleteUpdateQ = `
      UPDATE leads 
      SET deleted_at = NOW(), 
          is_archived = 1, 
          lead_status = 'Cold Storage',
          updated_at = NOW() 
      WHERE id IN (?)
    `;
    await pool.query(deleteUpdateQ, [cleanIds]);
    
    return res.json({ success: true, message: `Successfully moved ${cleanIds.length} leads to cold storage` });
  } catch (err) {
    console.error("Pipeline Bulk delete failure:", err.message);
    return res.status(500).json({ success: false, error: "Bulk deletion transaction failed" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE LEAD (Single Restore & Wipe Dynamic Processor)
// ═══════════════════════════════════════════════════════════════════════════════

const deleteLead = async (req, res) => {
  const { id } = req.params;
  const userRole = String(req.user?.role || '').toLowerCase();
  const actionType = String(req.query.action || '').toLowerCase(); 
  const isSuper = req.user?.is_super_admin == 1 || userRole === 'admin' || userRole === 'super admin' || userRole === 'manager';

  try {
    if (actionType !== 'restore' && !isSuper) {
      let hasDeletePermission = false;

      const [perms] = await pool.query(
        "SELECT can_delete FROM permissions WHERE LOWER(name) = ? AND slug = 'leads.delete'",
        [userRole]
      );
      hasDeletePermission = perms.length > 0 && perms[0].can_delete === 1;

      if (!hasDeletePermission) {
        return res.status(403).json({ error: "Insufficient role permissions to drop this record" });
      }
    }

    let checkQuery = "SELECT id FROM leads WHERE id = ?";
    let checkParams = [Number(id)];
    
    if (!isSuper) {
      checkQuery += " AND (assigned_user_id = ? OR assigned_to = ?)";
      checkParams.push(req.user.id, req.user.id);
    }
    
    const [exists] = await pool.query(checkQuery, checkParams);
    if (!exists.length) {
      return res.status(404).json({ error: "Record not found or access unauthorized" });
    }

    if (actionType === 'restore') {
      const restoreQ = `
        UPDATE leads 
        SET deleted_at = NULL, 
            is_archived = 0, 
            lead_status = 'New',
            updated_at = NOW() 
        WHERE id = ?
      `;
      await pool.query(restoreQ, [Number(id)]);
      return res.json({ success: true, message: "Lead successfully restored to pipeline loops" });
    }

    if (actionType === 'wipe') {
      await pool.query("DELETE FROM leads WHERE id = ?", [Number(id)]);
      return res.json({ success: true, message: "Lead permanently deleted from database registry" });
    }

    const softDeleteQ = `
      UPDATE leads 
      SET deleted_at = NOW(), 
          is_archived = 1, 
          lead_status = 'Cold Storage', 
          updated_at = NOW() 
      WHERE id = ?
    `;
    await pool.query(softDeleteQ, [Number(id)]);
    return res.json({ success: true, message: "Lead moved to cold storage metrics archive views" });

  } catch (error) {
    console.error("deleteLead execution trace error:", error);
    return res.status(500).json({ error: "Failed to process single lead profile structural modification" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// WORKSPACE STATUS CARD ANALYTICS NODE — FIXED & REINFORCED
// ═══════════════════════════════════════════════════════════════════════════════

const getStatusStats = async (req, res) => {
  try {
    const { is_super_admin, id, role } = req.user;
    const userRoleLower = String(role || "").trim().toLowerCase();

    const hasAdministrativeVisibility = 
      Boolean(is_super_admin) || 
      userRoleLower === "super admin" || 
      userRoleLower === "admin" || 
      userRoleLower === "manager";
    
    let whereClause = "deleted_at IS NULL AND is_archived = 0";
    let params = [];

    if (!hasAdministrativeVisibility) {
      whereClause += " AND (assigned_user_id = ? OR assigned_to = ?)";
      params.push(id, id);
    }

    const [rows] = await pool.query(`SELECT LOWER(TRIM(lead_status)) as lead_status, COUNT(*) as total FROM leads WHERE ${whereClause} GROUP BY lead_status`, params);
    const rawStats = rows.reduce((acc, row) => { acc[String(row.lead_status).toLowerCase().trim()] = Number(row.total); return acc; }, {});

    const [[totalRow]] = await pool.query(`SELECT COUNT(*) as total FROM leads WHERE ${whereClause}`, params);
    const totalLeads = Number(totalRow.total || 0);

    const [mainColdRes] = await pool.query("SELECT COUNT(*) as total FROM leads WHERE (deleted_at IS NOT NULL OR is_archived = 1)" + (hasAdministrativeVisibility ? "" : " AND (assigned_user_id = ? OR assigned_to = ?)"), hasAdministrativeVisibility ? [] : [id, id]);
    const [separateArchiveRes] = await pool.query("SELECT COUNT(*) as total FROM archived_leads");
    
    const trueColdCount = Number((mainColdRes[0]?.total || 0) + (separateArchiveRes[0]?.total || 0));

    return res.json({
      success: true,
      totalLeads,
      highIntentLeads: (rawStats["interested"] || 0) + (rawStats["converted"] || 0),
      pendingFollowUps: rawStats["follow-up"] || rawStats["followup"] || 0,
      conversionRate: totalLeads > 0 ? Number(((rawStats["converted"] || 0) / totalLeads * 100).toFixed(1)) : 0,
      statusStats: {
        new: rawStats["new"] || 0,
        contacted: (rawStats["contacted"] || 0) + (rawStats["called"] || 0),
        interested: rawStats["interested"] || 0,
        followup: rawStats["follow-up"] || rawStats["followup"] || 0,
        converted: rawStats["converted"] || 0,
        lost: rawStats["lost"] || 0, 
        "not interested": rawStats["not interested"] || rawStats["notinterested"] || 0,
        "cold storage": trueColdCount
      }
    });
  } catch (error) {
    console.error("getStatusStats error:", error);
    return res.status(500).json({ success: false, error: "Failed to load stats" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACT DETAILS FOR DICTIONARIES & SUMMARY STATS center
// ═══════════════════════════════════════════════════════════════════════════════

const getSummaryStats = async (req, res) => {
  const userRoleLower = String(req.user?.role || "").trim().toLowerCase();
  const isSuper = req.user?.is_super_admin == 1 || userRoleLower === "admin" || userRoleLower === "manager";
  try {
    let activeQ = "SELECT COUNT(*) as activeCount FROM leads WHERE deleted_at IS NULL AND is_archived = 0";
    let mainTableColdQ = "SELECT COUNT(*) as coldStorageCount FROM leads WHERE (deleted_at IS NOT NULL OR is_archived = 1)";
    let separateTableArchiveQ = "SELECT COUNT(*) as total FROM archived_leads";

    if (!isSuper) {
      activeQ += " AND (assigned_user_id = ? OR assigned_to = ?)";
      mainTableColdQ += " AND (assigned_user_id = ? OR assigned_to = ?)";
      separateTableArchiveQ += " WHERE 1=1 AND (assigned_user_id = ? OR assigned_to = ?)";
    }

    const isSuperParams = isSuper ? [] : [req.user.id, req.user.id];

    const [activeResult] = await pool.query(activeQ, isSuperParams);
    const [mainColdResult] = await pool.query(mainTableColdQ, isSuperParams);
    const [separateArchiveResult] = await pool.query(separateTableArchiveQ, isSuperParams);

    const trueTotalColdCount = Number((mainColdResult[0]?.coldStorageCount || 0) + (separateArchiveResult[0]?.total || 0));

    return res.json({
      success: true,
      stats: {
        all: activeResult[0].activeCount,
        coldStorage: trueTotalColdCount, 
      }
    });
  } catch (error) {
    console.error("Summary statistics calculation failed:", error.message);
    return res.status(500).json({ error: "Failed to fetch dashboard numbers" });
  }
};

const bulkImportLeads = async (req, res) => {
  const { leads, autoDistribute = true } = req.body;
  const createdBy = req.user?.id || 1;

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ success: false, message: "No leads provided" });
  }

  let inserted = 0, assigned = 0, duplicates = 0, invalid = 0, failed = 0;

  try {
    const [sourceRows] = await pool.query("SELECT id FROM lead_sources WHERE name = 'Bulk Import' LIMIT 1");
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
        const l = {};
        Object.keys(rawRow).forEach(key => {
          const norm   = key.trim().toLowerCase();
          const mapped = headerMap[norm];
          l[mapped || norm] = rawRow[key];
        });

        const fullName = String(l.full_name || "").trim();

        let phoneStr = String(l.phone || "");
        if (phoneStr.includes("E+") || phoneStr.includes("e+")) {
          phoneStr = Number(phoneStr).toLocaleString("fullwide", { useGrouping: false });
        }
        const cleanPhone = phoneStr.replace(/\D/g, "").slice(-10);

        if (!fullName || cleanPhone.length < 10) { invalid++;    continue; }

        const [existing] = await pool.query("SELECT id FROM leads WHERE phone = ? LIMIT 1", [cleanPhone]);
        if (existing.length > 0) { duplicates++; continue; }

        const leadUid = generateLeadUid();

        const [insertOp] = await pool.query(
          `INSERT INTO leads
              (full_name, phone, email, city, country, interested_course,
               lead_source_id, lead_status, is_archived, lead_uid, created_by, assigned_to)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'New', 0, ?, ?, ?)`,
          [fullName, cleanPhone, l.email || null, l.city || null, l.country || "India", l.interested_course || "Inquiry", sourceId, leadUid, createdBy, createdBy]
        );

        if (insertOp.insertId) {
          inserted++;
          if (autoDistribute) {
            try {
              const distResult = await leadDistributor.distribute({ id: insertOp.insertId, full_name: fullName, phone: cleanPhone, country: l.country || "India", interested_course: l.interested_course || "Inquiry" }, createdBy);
              if (distResult?.success) assigned++;
            } catch (distErr) {
              console.error("Distribution error:", distErr.message);
            }
          }
        }
      } catch (rowErr) { failed++; }
    }

    return res.json({ success: true, inserted, assigned, duplicates, invalid, failed, message: `${inserted} leads imported successfully` });
  } catch (masterErr) {
    console.error("bulkImportLeads error:", masterErr);
    return res.status(500).json({ success: false, message: masterErr.message });
  }
};

const captureLead = async (req, res) => {
  try {
    const { full_name, email, phone: phoneRaw } = req.body;
    const sourceKey  = sanitize(req.query.source, 20)?.toLowerCase() || "website";
    const project_id = sanitize(req.query.project_id, 100)           || "direct";

    if (!phoneRaw) return res.status(400).json({ success: false, message: "Phone number is required" });

    const cleanedPhone = String(phoneRaw).replace(/\D/g, "").slice(-10);
    if (cleanedPhone.length !== 10) return res.status(400).json({ success: false, message: "Valid 10-digit mobile number required" });

    const safeName       = sanitize(full_name, 255) || "Web Inquiry";
    const safeEmail      = sanitize(email, 255)     || null;
    const MathUid        = generateLeadUid();
    const lead_source_id = SOURCE_ID_MAP[sourceKey] ?? SOURCE_ID_MAP.website;
    const sourceLabel    = sourceKey.charAt(0).toUpperCase() + sourceKey.slice(1);

    const [result] = await pool.query(
      `INSERT INTO leads (full_name, phone, email, lead_status, lead_uid, source_project, lead_source_id, counselor_remarks) VALUES (?, ?, ?, 'New', ?, ?, ?, ?)`,
      [safeName, cleanedPhone, safeEmail, MathUid, project_id, lead_source_id, `Web capture | source: ${sourceLabel} | project: ${project_id}`]
    );

    return res.status(201).json({ success: true, leadId: result.insertId, leadUid: MathUid });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "A lead with this phone number already exists" });
    return res.status(500).json({ success: false, message: "Failed to capture lead" });
  }
};

const checkDuplicate = async (req, res) => {
  const { phone, email } = req.query;
  const userRoleLower = String(req.user?.role || "").trim().toLowerCase();
  const isSuper = req.user?.is_super_admin == 1 || userRoleLower === "admin" || userRoleLower === "manager";
  try {
    let checkStr = "SELECT id, full_name, lead_status FROM leads WHERE (phone = ? OR (email = ? AND email != '' AND email IS NOT NULL))";
    let params = [phone, email || ""];

    if (!isSuper && req.user?.id) {
      checkStr += " AND (assigned_user_id = ? OR assigned_to = ?)";
      params.push(req.user.id, req.user.id);
    }
    checkStr += " LIMIT 1";

    const [rows] = await pool.query(checkStr, params);
    return res.json({ exists: rows.length > 0, duplicate: rows[0] || null, lead: rows[0] || null });
  } catch (error) {
    return res.status(500).json({ error: "Duplicate check failed" });
  }
};

const exportLeads = async (req, res) => {
  const userRoleLower = String(req.user?.role || "").trim().toLowerCase();
  const isSuper = req.user?.is_super_admin == 1 || userRoleLower === "admin" || userRoleLower === "manager";
  try {
    let qStr = 'SELECT full_name AS "Full Name", phone AS "Phone Number", email AS "Email", city AS "City", interested_course AS "Course", country AS "Country" FROM leads WHERE is_archived = 0 AND deleted_at IS NULL';
    let params = [];

    if (!isSuper) {
      qStr += " AND (assigned_user_id = ? OR assigned_to = ?)";
      params.push(req.user.id, req.user.id);
    }
    qStr += " ORDER BY created_at DESC";

    const [leads] = await pool.query(qStr, params);
    if (!leads.length) return res.status(404).json({ success: false, message: "No leads to export" });

    const headers = Object.keys(leads[0]).join(",");
    const rows    = leads.map(l => Object.values(l).map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=leads_export.csv");
    return res.status(200).send([headers, ...rows].join("\n"));
  } catch (error) {
    return res.status(500).json({ success: false, message: "Export failed" });
  }
};

const getSources = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, is_active FROM lead_sources ORDER BY name ASC");
    return res.status(200).json({ success: true, data: rows, sources: rows, channels: rows, rows: rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getCourses = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM courses ORDER BY name ASC");
    return res.status(200).json({ success: true, data: rows, courses: rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const logInteraction = async (req, res) => {
  const { lead_id, type, outcome, remarks, next_follow_up } = req.body;
  const userRoleLower = String(req.user?.role || "").trim().toLowerCase();
  const isSuper = req.user?.is_super_admin == 1 || userRoleLower === "admin" || userRoleLower === "manager";

  try {
    let checkQ = "SELECT id FROM leads WHERE id = ?";
    let checkP = [lead_id];
    if (!isSuper) { checkQ += " AND (assigned_user_id = ? OR assigned_to = ?)"; checkP.push(req.user.id, req.user.id); }
    const [ok] = await pool.query(checkQ, checkP);
    if (!ok.length) return res.status(403).json({ error: "Access denied to modify this record" });

    await pool.query("INSERT INTO lead_interactions (lead_id, interaction_type, outcome, remarks, created_by) VALUES (?, ?, ?, ?, ?)", [lead_id, type, outcome, remarks, req.user.id]);

    let statusUpdate = "";
    if (["Replied", "Connected"].includes(outcome)) statusUpdate = ", lead_status = 'Interested'";
    if (outcome === "Not Reachable")                 statusUpdate = ", lead_status = 'Follow-up'";

    await pool.query(`UPDATE leads SET next_follow_up_date = ?, last_interaction_at = NOW() ${statusUpdate} WHERE id = ?`, [next_follow_up || null, lead_id]);

    await activityController.record({ userId: req.user?.id, leadId: lead_id, actionType: "NOTE_ADDED", description: `Interaction logged — ${type}: ${outcome}. Remarks: "${remarks}"`, oldValue: null, newValue: outcome });
    return res.json({ success: true, message: "Interaction logged & follow-up scheduled" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to log interaction" });
  }
};

const updateLeadStatus = async (req, res) => {
  try {
    const { leadId, newStatus, oldStatus } = req.body;
    const userId = req.user?.id;
    const userRoleLower = String(req.user?.role || "").trim().toLowerCase();
    const isSuper = req.user?.is_super_admin == 1 || userRoleLower === "admin" || userRoleLower === "manager";

    let checkQ = "SELECT id FROM leads WHERE id = ?";
    let checkP = [leadId];
    if (!isSuper) { checkQ += " AND (assigned_user_id = ? OR assigned_to = ?)"; checkP.push(req.user.id, req.user.id); }
    const [ok] = await pool.query(checkQ, checkP);
    if (!ok.length) return res.status(403).json({ error: "Unauthorized operation within context boundary" });

    await pool.query("UPDATE leads SET lead_status = ?, status_updated_at = NOW() WHERE id = ?", [newStatus, leadId]);
    await pool.query("INSERT INTO lead_status_history (lead_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)", [leadId, oldStatus || null, newStatus, userId || null]);

    if (activityController?.record) {
      await activityController.record({ userId, leadId, actionType: "STATUS_UPDATE", description: `Status updated from ${oldStatus || "Unknown"} to ${newStatus}`, oldValue: oldStatus, newValue: newStatus });
    }
    return res.json({ success: true, message: "Status updated" });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to update status" });
  }
};

const getNewLeadCount = async (req, res) => {
  try {
    const userRoleLower = String(req.user?.role || "").trim().toLowerCase();
    const isSuper = req.user?.is_super_admin == 1 || userRoleLower === "admin" || userRoleLower === "manager";
    let q = "SELECT COUNT(*) AS count FROM leads WHERE lead_status = 'New' AND assigned_user_id IS NULL AND deleted_at IS NULL";
    let p = [];
    if (!isSuper) { q += " AND (assigned_user_id = ? OR assigned_to = ?)"; p.push(req.user.id, req.user.id); }
    const [[{ count }]] = await pool.query(q, p);
    return res.json({ count });
  } catch (error) {
    return res.status(500).json({ error: "Failed to get count" });
  }
};

const fetchAll = async (req, res) => getAllLeads(req, res);
const loadLeads = async (req, res) => getAllLeads(req, res);

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED MODULE EXPORTS
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
  bulkDeleteLeads, 
  getSummaryStats,  
  getStatusStats,
  loadLeads,
  fetchAll
};