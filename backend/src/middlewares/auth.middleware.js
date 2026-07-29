const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const { ROLES } = require('../constants');

function authenticateToken(req, res, next) {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        throw new UnauthorizedError('Access denied. No token provided.');
    }

    try {
        const verified = jwt.verify(token, config.jwtSecret);
        req.user = verified;
        next();
    } catch (err) {
        throw new UnauthorizedError('Invalid or expired session. Please log in again.');
    }
}

function authorizeRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            throw new ForbiddenError('Access restricted to authorized users only.');
        }
        next();
    };
}

function authorizeAdmin(req, res, next) {
    return authorizeRole(ROLES.ADMIN)(req, res, next);
}

module.exports = {
    authenticateToken,
    authorizeRole,
    authorizeAdmin,
};
