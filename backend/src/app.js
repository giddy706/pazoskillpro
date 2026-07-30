const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const xss = require('xss-clean');
const hpp = require('hpp');
const config = require('./config/env');
const { initDB } = require('./config/database');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler.middleware');
const { logHttp, logger } = require('./utils/logger');
const setupSwagger = require('./config/swagger');
const routes = require('./routes');

const app = express();

// Swagger Documentation
setupSwagger(app);

// Security headers
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    })
);

// Prevent XSS attacks
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

app.use(cors({ origin: true, credentials: true }));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging via Winston
app.use(logHttp);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth-specific rate limit
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Redirect old admin dashboard URL to admin panel
app.get('/admin-dashboard.html', (req, res) => {
    res.redirect('/admin-panel/');
});

async function start() {
    await initDB();
    logger.info('Database initialized successfully.');
    app.use('/api', routes);

    // Serve frontend static files (after API routes)
    const publicPath = path.join(__dirname, '..', '..', 'frontend', 'public');
    app.use(express.static(publicPath));

    // Serve admin dashboard at /admin-panel
    const adminPanelPath = path.join(__dirname, '..', '..', 'frontend', 'admin');
    app.use('/admin-panel', express.static(adminPanelPath));

    // Serve /js from frontend/public/js (needed by admin panel for auth.js)
    const publicJsPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'js');
    app.use('/js', express.static(publicJsPath));

    // Admin panel fallback — any unmatched /admin-panel* path serves index.html
    app.get('/admin-panel*', (req, res) => {
        res.sendFile(path.join(adminPanelPath, 'index.html'));
    });

    app.get("/", (req, res) => {
    res.json({
        message: "PazoSkillPro API is running",
        status: "online"
    });
});

    app.use(notFoundHandler);
    app.use(errorHandler);
}

module.exports = { app, start };
