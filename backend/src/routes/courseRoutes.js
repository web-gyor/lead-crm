const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Routes for Course Management
 * All endpoints require a valid authentication token.
 */

// Retrieve list of all available courses
router.get('/', authenticateToken, courseController.getAllCourses);

// Register a new course in the system
router.post('/', authenticateToken, courseController.createCourse);

// Update details for an existing course by ID
router.put('/:id', authenticateToken, courseController.updateCourse);

// Permanently remove a course record by ID
router.delete('/:id', authenticateToken, courseController.deleteCourse);

module.exports = router;