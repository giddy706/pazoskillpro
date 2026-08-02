const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const enrollmentController = require('../controllers/enrollment.controller');
const { authenticateToken, authorizeAdmin, optionalAuth } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createCourse } = require('../validations/course.validation');

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Course management
 */

/**
 * @swagger
 * /courses:
 *   get:
 *     summary: List all available courses
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: A list of courses
 */
router.get('/', courseController.list);

/**
 * @swagger
 * /courses/my-enrollments:
 *   get:
 *     summary: Get current user's enrollments
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's enrolled courses
 */
router.get('/my-enrollments', authenticateToken, enrollmentController.getMyEnrollments);

/**
 * @swagger
 * /courses/certificates:
 *   get:
 *     summary: Get current user's earned certificates
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of earned certificates
 */
router.get('/certificates', authenticateToken, enrollmentController.getCertificates);

/**
 * @swagger
 * /courses/{id}/enroll:
 *   post:
 *     summary: Enroll in a course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully enrolled
 */
router.post('/:id/enroll', authenticateToken, enrollmentController.enroll);

/**
 * @swagger
 * /courses/{id}/lessons/{lessonId}/complete:
 *   post:
 *     summary: Mark a lesson as complete
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lesson marked as complete
 */
router.post('/:id/lessons/:lessonId/complete', authenticateToken, enrollmentController.completeLesson);

/**
 * @swagger
 * /courses/{id}:
 *   get:
 *     summary: Get course details
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Course details with lessons
 *       404:
 *         description: Course not found
 */
router.get('/:id', optionalAuth, courseController.getDetails);

/**
 * @swagger
 * /courses:
 *   post:
 *     summary: Create a new course (Admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               duration:
 *                 type: string
 *               level:
 *                 type: string
 *               instructor:
 *                 type: string
 *     responses:
 *       201:
 *         description: Course created successfully
 */
router.post('/', authenticateToken, authorizeAdmin, validate(createCourse), courseController.create);

/**
 * @swagger
 * /courses/{id}:
 *   delete:
 *     summary: Delete a course (Admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Course deleted
 */
router.delete('/:id', authenticateToken, authorizeAdmin, courseController.remove);

module.exports = router;
