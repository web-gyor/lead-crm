const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const leadController = require('../controllers/leadController');
const checkPermission = require('../middleware/checkPermission'); // Updated middleware
const { authenticateToken } = require('../middleware/auth');

const followupController = require('../controllers/followupController');
const pipelineController = require('../controllers/pipelineController');
const communicationController = require('../controllers/communicationController');
const dashboardController = require('../controllers/dashboardController');

/**
 * Safe Wrapper: Ensures the controller function exists before routing.
 */
const safe = (fn, name) => {
  if (typeof fn === 'function') return fn;
  console.error(`Missing Controller Function: controller.${name}`);
  return (req, res) => res.status(500).json({ error: `${name} not found in controller` });
};

// --- Dashboard and Analytics ---


// Updated to use permission_key 'data.export'
router.get('/export', authenticateToken, checkPermission('data.export'), safe(leadController.exportLeads, 'exportLeads'));

router.get('/comm-logs',
  authenticateToken,
  checkPermission('logs.communication'), // Added permission enforcement
  safe(communicationController.getCommLogs, 'getCommLogs')
);

router.get('/pipeline',
  authenticateToken,
  checkPermission('leads.kanban'), // Added permission enforcement
  safe(pipelineController.getPipeline, 'getPipeline')
);

router.get('/followups',
  authenticateToken,
  // This route handles "Today's Tasks" logic aligned with IST
  safe(followupController.getTodayTasks, 'getTodayTasks')
);

router.get('/dashboard-data', 
  authenticateToken, 
  safe(dashboardController.getDashboardStats, 'getDashboardStats')
);

router.get('/check-duplicate', authenticateToken, safe(leadController.checkDuplicate, 'checkDuplicate'));

// --- Bulk Operations ---

// Use key 'data.import'
router.post("/bulk", authenticateToken, checkPermission('data.import'), safe(leadController.bulkImportLeads, 'bulkImportLeads'));

// Use key 'leads.assign'
router.put('/bulk-assign', authenticateToken, checkPermission('leads.assign'), safe(leadController.bulkAssignLeads, 'bulkAssignLeads'));

// Bulk update typically requires edit permission
router.put('/bulk-update', authenticateToken, checkPermission('leads.edit'), safe(leadController.bulkUpdateLeads, 'bulkUpdateLeads'));

// Bulk delete uses leads.delete key
router.post('/bulk-delete', authenticateToken, checkPermission('leads.delete'), async (req, res) => {
  const { ids } = req.body; 
  try {
    // Admin override is handled globally by checkPermission, 
    // but the key enforcement ensures Manager/Counselor restrictions
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No identifiers provided" });
    }

    const [result] = await pool.query("DELETE FROM leads WHERE id IN (?)", [ids]);
    return res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error("Bulk Delete Error:", err.message);
    return res.status(500).json({ success: false, error: "Deletion failed" });
  }
});


// --- Standard Lead CRUD ---

router.get('/', authenticateToken, checkPermission('leads.view'), safe(leadController.getAllLeads, 'getAllLeads'));
router.post('/', authenticateToken, checkPermission('leads.create'), safe(leadController.createLead, 'createLead'));

// Lead ID-specific and Status routes
router.put("/update-status", authenticateToken, checkPermission('leads.edit'), safe(leadController.updateLeadStatus, 'updateLeadStatus'));
router.get('/:id', authenticateToken, checkPermission('leads.view'), safe(leadController.getLeadById, 'getLeadById'));
router.put('/:id', authenticateToken, checkPermission('leads.edit'), safe(leadController.updateLead, 'updateLead'));

// Use structured key 'leads.delete'
router.delete('/:id', authenticateToken, checkPermission('leads.delete'), safe(leadController.deleteLead, 'deleteLead'));

// --- Meta-data and Permissions ---

router.get('/sources', authenticateToken, safe(leadController.getSources, 'getSources'));

// Updated to return structured keys for the frontend
router.get('/permissions-list', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT permission_key, is_enabled FROM role_permissions WHERE LOWER(role) = ?",
      [(req.user.role || "").toLowerCase()]
    );
    return res.json(rows);
  } catch (error) {
    console.error("Permission List Retrieval Error:", error.message);
    return res.status(500).json({ error: "Failed to fetch permission list" });
  }
});



module.exports = router;