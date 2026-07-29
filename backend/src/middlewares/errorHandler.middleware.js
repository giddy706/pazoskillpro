const { logError } = require('../utils/logger');
const { AppError } = require('../utils/errors');

function notFoundHandler(req, res) {
    res.status(404).json({ success: false, message: 'Route not found' });
}

function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    logError(err, req);

    const message =
        statusCode === 500
            ? process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : err.message || 'Internal server error'
            : err.message || 'Internal server error';

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}

module.exports = {
    notFoundHandler,
    errorHandler,
};
