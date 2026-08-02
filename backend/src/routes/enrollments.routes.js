const express = require('express');
const router = express.Router();
const enrollmentService = require('../services/enrollment.service');
const lessonService = require('../services/lesson.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const { authenticateToken } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Enrollments
 *   description: Course enrollment operations
 */

/**
 * @swagger
 * /enrollments/my-enrollments:
 *   get:
 *     summary: Get current user's enrollments with lesson progress
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of enrolled courses with lesson data
 */
router.get('/my-enrollments', authenticateToken, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const enrollments = await enrollmentService.findAllByUser(userId);
    const enriched = await Promise.all(
        enrollments.map(async (enrollment) => {
            const lessons = await lessonService.listByCourse(enrollment.course_id);
            return { ...enrollment, lessons };
        })
    );
    return success(res, { enrollments: enriched });
}));

/**
 * @swagger
 * /enrollments/{id}/enroll:
 *   post:
 *     summary: Enroll in a course
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Course ID
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Successfully enrolled
 *       200:
 *         description: Already enrolled (returns existing enrollment)
 */
router.post('/:id/enroll', authenticateToken, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const courseId = req.params.id;
    const { promo_code } = req.body || {};
    const existing = await enrollmentService.findByUserAndCourse(userId, courseId);
    if (existing) {
        return success(res, { enrollment: existing });
    }
    const result = await enrollmentService.create(userId, courseId, promo_code);
    return success(res, { enrollment: result.enrollment, promo: result.promo }, 201);
}));

/**
 * @swagger
 * /enrollments/certificates:
 *   get:
 *     summary: Get current user's earned certificates
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of certificates for completed courses
 */
router.get('/certificates', authenticateToken, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const enrollments = await enrollmentService.findAllByUser(userId);
    const certificates = enrollments
        .filter((e) => e.completed === 1)
        .map((e) => ({
            id: e.id,
            courseId: e.course_id,
            issuedDate: e.completed_at,
            courseTitle: e.courseTitle,
        }));
    return success(res, { certificates });
}));

/**
 * @swagger
 * /enrollments/{id}/lessons/{lessonId}/complete:
 *   post:
 *     summary: Mark a lesson as complete and update progress
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Course ID
 *         schema:
 *           type: integer
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lesson completed, progress updated
 */
router.post('/:id/lessons/:lessonId/complete', authenticateToken, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const courseId = req.params.id;
    const lessonId = req.params.lessonId;
    const enrollment = await enrollmentService.markLessonComplete(userId, courseId, lessonId);
    return success(res, {
        progress: enrollment.progress,
        completed: enrollment.completed === 1,
        completedAt: enrollment.completed_at,
    });
}));

module.exports = router;
