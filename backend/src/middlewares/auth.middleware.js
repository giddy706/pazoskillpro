const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const { ROLES } = require('../constants');

async function loadUser(token) {
    const verified = jwt.verify(token, config.jwtSecret);
    const userModel = require('../models/user.model');
    const user = await userModel.findById(verified.id);
    if (!user) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role };
}

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

    // Load the freshest user record from the DB so role changes take effect
    // immediately and forged tokens cannot claim a role the user does not hold.
    loadUser(token)
        .then((user) => {
            if (!user) throw new UnauthorizedError('Invalid or expired session. Please log in again.');
            req.user = user;
            next();
        })
        .catch((err) => {
            if (err instanceof UnauthorizedError) return next(err);
            next(new UnauthorizedError('Invalid or expired session. Please log in again.'));
        });
}

function optionalAuth(req, res, next) {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) return next();

    loadUser(token)
        .then((user) => {
            if (user) req.user = user;
            next();
        })
        .catch(() => next());
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
    optionalAuth,
    authorizeRole,
    authorizeAdmin,
};
