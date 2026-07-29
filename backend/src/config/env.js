const dotenv = require('dotenv');

dotenv.config();

const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'skillpath_super_secret_key_2026',
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
