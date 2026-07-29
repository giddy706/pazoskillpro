const express = require('express');
const router = express.Router();
const trafficController = require('../controllers/traffic.controller');
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth.middleware');

router.post('/track', trafficController.track);

module.exports = router;
