const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/asyncHandler');
const { authenticateToken } = require('../middlewares/auth.middleware');
const careerController = require('../controllers/career.controller');

router.get('/stats', asyncHandler(careerController.getStats));

router.use(authenticateToken);
router.get('/progress', asyncHandler(careerController.getProgress));
router.post('/talent-pool/join', asyncHandler(careerController.joinTalentPool));
router.post('/resume', asyncHandler(careerController.uploadResume));
router.post('/portfolio', asyncHandler(careerController.uploadPortfolio));
router.post('/actions', asyncHandler(careerController.recordAction));
router.get('/notifications', asyncHandler(careerController.getNotifications));
router.post('/notifications/read', asyncHandler(careerController.markNotificationsRead));

module.exports = router;
