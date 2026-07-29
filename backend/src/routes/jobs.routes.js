const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const applicationController = require('../controllers/application.controller');
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job listings and applications
 */

/**
 * @swagger
 * /jobs:
 *   get:
 *     summary: List all available jobs
 *     tags: [Jobs]
 *     responses:
 *       200:
 *         description: A list of job listings
 */
router.get('/', jobController.list);

/**
 * @swagger
 * /jobs/{id}:
 *   get:
 *     summary: Get job details
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Job details
 *       404:
 *         description: Job not found
 */
router.get('/:id', jobController.getDetails);

/**
 * @swagger
 * /jobs/{id}/apply:
 *   post:
 *     summary: Apply for a job
 *     tags: [Jobs]
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
 *               coverLetter:
 *                 type: string
 *               resumeUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Application submitted
 */
router.post('/:id/apply', authenticateToken, applicationController.applyForJob);

/**
 * @swagger
 * /jobs/my-applications:
 *   get:
 *     summary: Get current user's job applications
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's applications
 */
router.get('/my-applications', authenticateToken, applicationController.getMyApplications);

/**
 * @swagger
 * /jobs:
 *   post:
 *     summary: Create a new job listing (Admin only)
 *     tags: [Jobs]
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
 *               - company
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               company:
 *                 type: string
 *               location:
 *                 type: string
 *               type:
 *                 type: string
 *               salary:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Job created
 */
router.post('/', authenticateToken, authorizeAdmin, jobController.create);

/**
 * @swagger
 * /jobs/{id}:
 *   patch:
 *     summary: Update a job listing (Admin only)
 *     tags: [Jobs]
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
 *         description: Job updated
 */
router.patch('/:id', authenticateToken, authorizeAdmin, jobController.update);

/**
 * @swagger
 * /jobs/{id}:
 *   delete:
 *     summary: Delete a job listing (Admin only)
 *     tags: [Jobs]
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
 *         description: Job deleted
 */
router.delete('/:id', authenticateToken, authorizeAdmin, jobController.remove);

module.exports = router;
