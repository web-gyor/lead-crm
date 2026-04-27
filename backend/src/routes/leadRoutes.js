const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const checkPermission = require('../middleware/checkPermission');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/db');

/**
 * Safe Wrapper: Ensures the controller function exists before routing.
 */
const safe = (fn, name) => {
  if (typeof fn === 'function') return fn;
  console.error(`Missing Controller Function: leadController.${name}`);
  return (req, res) => res.status(500).json({ error: `${name} not found in controller` });
};

// Dashboard and Analytics
router.get('/dashboard-data', authenticateToken, safe(leadController.getDashboardStats, 'getDashboardStats'));
router.get('/stats', authenticateToken, safe(leadController.getDashboardStats, 'getDashboardStats'));
router.get('/export', authenticateToken, checkPermission('Export Data'), safe(leadController.exportLeads, 'exportLeads'));

// Workflow and Utility
router.get('/pipeline', authenticateToken, safe(leadController.getPipeline, 'getPipeline'));
router.get('/followups', authenticateToken, safe(leadController.getTodayTasks, 'getTodayTasks'));
router.get('/communication', authenticateToken, safe(leadController.getCommLogs, 'getCommLogs'));
router.get('/check-duplicate', authenticateToken, safe(leadController.checkDuplicate, 'checkDuplicate'));

// Bulk Operations
router.post("/bulk", authenticateToken, safe(leadController.bulkImportLeads, 'bulkImportLeads'));
router.put('/bulk-assign', authenticateToken, safe(leadController.bulkAssignLeads, 'bulkAssignLeads'));

router.put('/bulk-update', authenticateToken, safe(leadController.bulkUpdateLeads, 'bulkUpdateLeads'));
router.post('/bulk-delete', authenticateToken, async (req, res) => {
  const { ids } = req.body; 
  try {
    const userRole = (req.user?.role || "").toLowerCase();
    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }
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

// Standard Lead CRUD
router.get('/', authenticateToken, safe(leadController.getAllLeads, 'getAllLeads'));
router.post('/', authenticateToken, safe(leadController.createLead, 'createLead'));

// Lead ID-specific and Status routes
router.put("/update-status", authenticateToken, safe(leadController.updateLeadStatus, 'updateLeadStatus'));
router.get('/:id', authenticateToken, safe(leadController.getLeadById, 'getLeadById'));
router.put('/:id', authenticateToken, safe(leadController.updateLead, 'updateLead'));
router.delete('/:id', authenticateToken, checkPermission('Delete Leads'), safe(leadController.deleteLead, 'deleteLead'));

// Meta-data and Permissions
router.get('/sources', authenticateToken, safe(leadController.getSources, 'getSources'));
router.get('/permissions-list', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT feature_name, is_enabled FROM role_permissions WHERE role = ?",
      [req.user.role]
    );
    return res.json(rows);
  } catch (error) {
    console.error("Permission List Retrieval Error:", error.message);
    return res.status(500).json({ error: "Failed to fetch permission list" });
  }
});

module.exports = router;