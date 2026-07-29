const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const applicationController = require('../controllers/application.controller');

/**
 * @swagger
 * tags:
 *   name: Applications
 *   description: Job application management
 */

/**
 * @swagger
 * /applications:
 *   get:
 *     summary: List all applications (Admin only)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all applications
 */
router.get('/', applicationController.listAll);

/**
 * @swagger
 * /applications/my-applications:
 *   get:
 *     summary: Get current user's applications
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's submitted applications
 */
router.get('/my-applications', authenticateToken, applicationController.getMyApplications);

/**
 * @swagger
 * /applications/{id}/status:
 *   post:
 *     summary: Update application status (Admin only)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, reviewed, accepted, rejected]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.post('/:id/status', applicationController.updateStatus);

module.exports = router;
