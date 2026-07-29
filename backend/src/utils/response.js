function success(res, data, statusCode = 200) {
    return res.status(statusCode).json({ success: true, ...data });
}

function error(res, message, statusCode = 400) {
    if (typeof statusCode === 'undefined') statusCode = 400;
    return res.status(statusCode).json({ success: false, message });
}

function serverError(res, message = 'Server error') {
    return res.status(500).json({ success: false, message });
}

module.exports = {
    success,
    error,
    serverError,
};
