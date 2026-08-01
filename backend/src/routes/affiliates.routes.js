const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const affiliateService = require('../services/affiliate.service');

/**
 * POST /api/affiliates/validate
 * Body: { code, courseId? }
 * Returns promo code info + computed discount for the given course (or code info only).
 */
router.post('/validate', asyncHandler(async (req, res) => {
    const { code, courseId } = req.body;
    if (!code || !String(code).trim()) return error(res, 'Referral / promo code is required', 400);
    const info = await affiliateService.validateCode(code, courseId || null);
    return success(res, { promo: info });
}));

module.exports = router;
