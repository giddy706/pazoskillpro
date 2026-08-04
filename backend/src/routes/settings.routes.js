const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const settingModel = require('../models/setting.model');

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get public site settings (contact email, site name, etc.)
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Public settings
 */
router.get('/', asyncHandler(async (req, res) => {
    const rows = await settingModel.listAll();
    const settings = {};
    for (const row of rows) settings[row.setting_key] = row.setting_value;
    return success(res, { settings });
}));

module.exports = router;
