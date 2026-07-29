const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificate.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.get('/my-certificates', authenticateToken, certificateController.getMyCertificates);
router.get('/verify/:code', certificateController.verifyCertificate);
router.get('/:id', certificateController.getCertificateById);

module.exports = router;
