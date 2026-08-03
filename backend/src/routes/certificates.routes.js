const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificate.controller');
const { authenticateToken, optionalAuth } = require('../middlewares/auth.middleware');

router.get('/my-certificates', authenticateToken, certificateController.getMyCertificates);
router.get('/verify/:code', optionalAuth, certificateController.verifyCertificate);
router.get('/design', certificateController.getDesign);
router.get('/:id', optionalAuth, certificateController.getCertificateById);

module.exports = router;
