const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/contact.controller');

router.post('/', sendMessage);

module.exports = router;
