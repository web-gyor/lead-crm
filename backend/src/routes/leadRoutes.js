const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const leadController = require('../controllers/leadController');
const checkPermission = require('../middleware/checkPermission');
const { authenticateToken } = require('../middleware/auth');
const pipelineController = require('../controllers/pipelineController');
const communicationController = require('../controllers/communicationController');
const dashboardController = require('../controllers/dashboardController');
const webhookController = require('../controllers/webhookController');

const safe = (fn, name) => {
  if (typeof fn === 'function') return fn;
  console.error(`Missing Controller Function: ${name}`);
  return (req, res) => res.status(500).json({ error: `${name} not found` });
};

// --- Webhooks ---
router.post('/webhooks/meta/:clientId', safe(webhookController.handleMetaLead, 'handleMetaLead'));
router.get('/webhooks/whatsapp', safe(webhookController.verifyWebhook, 'verifyWebhook'));
router.post('/webhooks/google', safe(webhookController.handleGoogleLead, 'handleGoogleLead'));

// --- Analytics & Dashboard ---
router.get('/dashboard-data', authenticateToken, safe(dashboardController.getDashboardStats, 'getDashboardStats'));
router.get('/comm-logs', authenticateToken, checkPermission('logs.communication'), safe(communicationController.getCommLogs, 'getCommLogs'));
router.get('/pipeline', authenticateToken, checkPermission('leads.kanban'), safe(pipelineController.getPipeline, 'getPipeline'));

// --- Bulk Operations ---
router.post("/bulk", authenticateToken, checkPermission('data.import'), safe(leadController.bulkImportLeads, 'bulkImportLeads'));
router.put('/bulk-assign', authenticateToken, checkPermission('leads.assign'), safe(leadController.bulkAssignLeads, 'bulkAssignLeads'));
router.put('/bulk-update', authenticateToken, checkPermission('leads.edit'), safe(leadController.bulkUpdateLeads, 'bulkUpdateLeads'));
router.post('/bulk-delete', authenticateToken, checkPermission('leads.delete'), async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: "No IDs provided" });
  try {
    const [result] = await pool.query("DELETE FROM leads WHERE id IN (?)", [ids]);
    return res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Deletion failed" });
  }
});

// --- Lead CRUD ---
router.get('/export', authenticateToken, checkPermission('data.export'), safe(leadController.exportLeads, 'exportLeads'));
router.get('/check-duplicate', authenticateToken, safe(leadController.checkDuplicate, 'checkDuplicate'));
router.post('/capture', leadController.captureLead);

// This handles GET /api/leads
router.get('/', authenticateToken, checkPermission('leads.view'), safe(leadController.getAllLeads, 'getAllLeads'));
router.post('/', authenticateToken, checkPermission('leads.create'), safe(leadController.createLead, 'createLead'));

router.put("/update-status", authenticateToken, checkPermission('leads.edit'), safe(leadController.updateLeadStatus, 'updateLeadStatus'));
router.get('/:id', authenticateToken, checkPermission('leads.view'), safe(leadController.getLeadById, 'getLeadById'));
router.put('/:id', authenticateToken, checkPermission('leads.edit'), safe(leadController.updateLead, 'updateLead'));
router.delete('/:id', authenticateToken, checkPermission('leads.delete'), safe(leadController.deleteLead, 'deleteLead'));

// --- Metadata ---
router.get('/sources', authenticateToken, safe(leadController.getSources, 'getSources'));

router.get('/permissions-list', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT permission_key, is_enabled FROM role_permissions WHERE LOWER(role) = ?",
      [(req.user.role || "").toLowerCase()]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch permission list" });
  }
});

// Route for Sources
router.get('/masters/sources', authenticateToken, leadController.getSources || ((req, res) => res.json({data: []})));
router.get('/masters/courses', authenticateToken, (req, res) => res.json({data: []}));

module.exports = router;