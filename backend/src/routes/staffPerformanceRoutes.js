const express = require('express');
const router = express.Router();
// 1. Check this import path
const staffPerfController = require('../controllers/staffPerformanceController'); 

// 2. Ensure staffPerfController.getStaffDropdown is actually a function
router.get('/dropdown', staffPerfController.getStaffDropdown);

// 3. Ensure staffPerfController.getPerformanceComparison is actually a function
router.get('/comparison', staffPerfController.getPerformanceComparison);

module.exports = router;