const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const archiveController = require('../controllers/archiveController');
const checkPermission = require('../middleware/checkPermission');
const { authenticateToken } = require('../middleware/auth');
const pipelineController = require('../controllers/pipelineController');
const communicationController = require('../controllers/communicationController');
const webhookController = require('../controllers/webhookController');

// ─── SAFE HANDLER RESOLVER WRAPPER ───────────────────────────────────────────
const safe = (ctrl, method) => (req, res, next) => {
  if (ctrl && typeof ctrl[method] === 'function') {
    return ctrl[method](req, res, next);
  }
  console.error(`[Lead Route] Missing handler method reference: ${method}`);
  return res.status(500).json({ success: false, error: `Handler "${method}" not found` });
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. WEBHOOKS — Public Entry Gateways (No Session Token Verification Required)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/webhooks/meta/:clientId', safe(webhookController, 'handleMetaLead'));
router.get('/webhooks/whatsapp',        safe(webhookController, 'verifyWebhook'));
router.post('/webhooks/google',         safe(webhookController, 'handleGoogleLead'));
router.post('/capture',                 safe(leadController,    'captureLead'));

// ═══════════════════════════════════════════════════════════════════════════════
// 2. METADATA DICTIONARIES — Dropdown Population (No Permission Restriction Locks)
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/lead-sources',      authenticateToken, safe(leadController, 'getSources'));
router.get('/sources',           authenticateToken, safe(leadController, 'getSources'));
router.get('/courses',           authenticateToken, safe(leadController, 'getCourses'));
router.get('/masters/sources',   authenticateToken, safe(leadController, 'getSources'));
router.get('/masters/courses',   authenticateToken, safe(leadController, 'getCourses'));
router.get('/check-duplicate',   authenticateToken, safe(leadController, 'checkDuplicate'));

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ARCHIVE / COLD STORAGE — Database Matrix Slug: 'leads'
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/archive',           authenticateToken, checkPermission('leads', 'view'), safe(archiveController,  'getArchive'));
router.get('/archive-count',     authenticateToken, safe(archiveController,  'getArchiveCount'));

// ═══════════════════════════════════════════════════════════════════════════════
// 4. COMMUNICATION LAYERS — Database Matrix Slug: 'communication'
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/comm-logs',        authenticateToken, checkPermission('communication', 'create'), communicationController.createLog);
router.get('/comm-logs/:leadId', authenticateToken, checkPermission('communication', 'view'),   communicationController.getLogsByLead);
router.get('/comm-feed',         authenticateToken, checkPermission('communication', 'view'),   communicationController.getCommLogs);

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PIPELINE BOARD — Database Matrix Slug: 'pipeline'
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/pipeline',         authenticateToken, checkPermission('pipeline', 'view'), safe(pipelineController, 'getPipeline'));

// ═══════════════════════════════════════════════════════════════════════════════
// 6. EXPORT UTILITIES — Database Matrix Slug: 'leads' -> Action: export
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/export',           authenticateToken, checkPermission('leads', 'export'), safe(leadController, 'exportLeads'));

// ═══════════════════════════════════════════════════════════════════════════════
// 7. LEDGER BULK INGESTIONS — Database Matrix Slugs: 'import' / 'leads'
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/bulk',                authenticateToken, checkPermission('import',   'create'), safe(leadController,   'bulkImportLeads'));
router.put('/bulk-assign',         authenticateToken, checkPermission('leads',   'edit'),   safe(leadController,   'bulkAssignLeads'));
router.put('/bulk-update',         authenticateToken, checkPermission('leads',   'edit'),   safe(leadController,   'bulkUpdateLeads'));
router.post('/bulk-restore',       authenticateToken, checkPermission('leads',   'edit'),   safe(archiveController, 'restoreLead'));
router.post('/bulk-delete',         authenticateToken, checkPermission('leads',   'delete'), safe(leadController,   'bulkDeleteLeads'));
router.post('/bulk-delete-archive', authenticateToken, checkPermission('leads',   'delete'), safe(archiveController, 'bulkDeleteArchive'));

// ═══════════════════════════════════════════════════════════════════════════════
// 8. DATA CORE CRUD TRACKS — Database Matrix Slug: 'leads'
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/kpis',         authenticateToken, checkPermission('leads', 'view'), safe(require('../controllers/leadKpiController'), 'getLeadKpis'));
router.get('/status-stats', authenticateToken, checkPermission('leads', 'view'), safe(leadController, 'getStatusStats'));

// Your existing workspace data fetch engine follows right below:
router.get('/',                 authenticateToken, checkPermission('leads',  'view'),   safe(leadController, 'getAllLeads'));
router.post('/',                authenticateToken, checkPermission('leads',  'create'), safe(leadController, 'createLead'));
router.put('/update-status',    authenticateToken, checkPermission('leads',  'edit'),   safe(leadController, 'updateLeadStatus'));
// ═══════════════════════════════════════════════════════════════════════════════
// 9. DYNAMIC EXPRESS SPECIFIER ELEMENT PATHS (Absolute Last)
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id',              authenticateToken, checkPermission('leads',  'view'),   safe(leadController, 'getLeadById'));
router.put('/:id',              authenticateToken, checkPermission('leads',  'edit'),   safe(leadController, 'updateLead'));

// 🎯 UNIFIED DELETION DISPATCH MANAGER: Combines standard deletions with quick query-action toggles safely
router.delete('/:id', authenticateToken, checkPermission('leads', 'delete'), async (req, res, next) => {
  const action = String(req.query.action || '').toLowerCase().trim();
  if (action === 'restore') return safe(archiveController, 'restoreLead')(req, res, next);
  if (action === 'wipe')    return safe(archiveController, 'bulkDeleteArchive')(req, res, next);
  return safe(leadController, 'deleteLead')(req, res, next);
});

module.exports = router;