const express = require('express');
const router = express.Router();
const { config } = require('../config/env');

router.get('/paystack', (req, res) => {
    res.json({
        success: true,
        publicKey: config.paystack.publicKey
    });
});

module.exports = router;
