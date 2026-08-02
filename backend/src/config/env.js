const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

// Never fall back to a hardcoded secret. If JWT_SECRET is not configured we
// generate a strong random one per boot, which invalidates all old sessions
// (users simply log in again). Set JWT_SECRET in production for stable sessions.
const jwtSecret = process.env.JWT_SECRET
    ? process.env.JWT_SECRET
    : crypto.randomBytes(48).toString('hex');

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.warn('[SECURITY] JWT_SECRET is not set. A random secret was generated; all sessions will reset on restart. Set JWT_SECRET in your environment.');
}

const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    jwtSecret,
    jwtExpiresIn: '7d',
    adminJwtExpiresIn: '4h',
    bcryptRounds: 10,
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000, 10),
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100, 10),
    },
};

module.exports = config;
module.exports.config = config;
