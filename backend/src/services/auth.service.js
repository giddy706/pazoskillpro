const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');
const userModel = require('../models/user.model');

async function register({ name, email, password, promoCode }) {
    const existing = await userModel.findByEmail(email);
    if (existing) {
        throw new BadRequestError('Email already registered');
    }

    // Validate the promo code BEFORE creating the account so a bad code
    // fails cleanly instead of silently creating a user with no promo.
    if (promoCode && String(promoCode).trim()) {
        await require('./affiliate.service').validateCode(promoCode);
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    const user = await userModel.create({ name, email, passwordHash });

    let promoApplied = null;
    if (promoCode && String(promoCode).trim()) {
        promoApplied = await require('./affiliate.service').applyAtRegistration(user.id, promoCode);
    }

    const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );

    return { user: { id: user.id, name: user.name, email: user.email, role: user.role, promoApplied }, token };
}

async function login({ email, password }) {
    const user = await userModel.findByEmail(email);
    if (!user) {
        throw new BadRequestError('Invalid email or password');
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
        throw new BadRequestError('Invalid email or password');
    }

    const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );

    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token };
}

async function adminLogin({ email, password }) {
    const user = await userModel.findByEmail(email);
    if (!user) {
        throw new BadRequestError('Invalid credentials');
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
        throw new BadRequestError('Invalid credentials');
    }
    if (user.role !== 'admin') {
        throw new UnauthorizedError('Access restricted to administrators');
    }

    const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.adminJwtExpiresIn }
    );

    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token };
}

function verifyToken(token) {
    return jwt.verify(token, config.jwtSecret);
}

module.exports = {
    register,
    login,
    adminLogin,
    verifyToken,
};
