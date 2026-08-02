const { logError } = require('../utils/logger');
const { AppError } = require('../utils/errors');
const { config } = require('../config/env');

function notFoundHandler(req, res) {
    res.status(404).json({ success: false, message: 'Route not found' });
}

function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    logError(err, req);

    const isDev = config.env === 'development';
    const message =
        statusCode === 500
            ? isDev
                ? err.message || 'Internal server error'
                : 'Internal server error'
            : err.message || 'Internal server error';

    res.status(statusCode).json({
        success: false,
        message,
        ...(isDev && { stack: err.stack }),
    });
}

module.exports = {
    notFoundHandler,
    errorHandler,
};
