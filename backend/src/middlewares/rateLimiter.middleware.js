function rateLimiter(windowMs = 15 * 60 * 1000, maxRequests = 100) {
    const rateLimit = require('express-rate-limit');

    return rateLimit({
        windowMs,
        max: maxRequests,
        standardHeaders: true,
        legacyHeaders: false,
    });
}

module.exports = {
    rateLimiter,
};
