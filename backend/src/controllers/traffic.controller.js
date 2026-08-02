const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { asyncHandler } = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const trafficModel = require('../models/traffic.model');

exports.track = asyncHandler(async (req, res) => {
    const { page_url, page_title, referrer } = req.body;
    let session_id = req.cookies?.session_id;
    if (!session_id) {
        session_id = Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15);
        res.cookie('session_id', session_id, {
            maxAge: 1000 * 60 * 60 * 24 * 365,
            httpOnly: true,
        });
    }

    let userId = null;
    const token = req.cookies?.token;
    if (token) {
        try {
            const verified = jwt.verify(token, config.jwtSecret);
            userId = verified.id;
        } catch {
            // Ignore
        }
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const userAgent = req.headers['user-agent'];

    await trafficModel.insert({
        sessionId: session_id,
        ipAddress: ip,
        pageUrl: page_url,
        pageTitle: page_title,
        referrer,
        userAgent,
        userId,
    });

    return success(res, {});
});
