const { checkStorageStatus } = require('../utils/storageHelper');

// Admin only route to check system health
router.get('/system/storage', authenticateToken, async (req, res) => {
    // Basic security: only admins should see disk space
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
    }

    const status = await checkStorageStatus();
    if (!status) return res.status(500).json({ message: "Could not check storage" });

    res.json(status);
});