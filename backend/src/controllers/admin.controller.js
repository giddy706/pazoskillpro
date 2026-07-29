const { getMetrics, getStats, getApplications, updateApplicationStatus, getTrafficStats, getTrafficLogs } = require('../services/admin.service');

exports.getMetrics = asyncHandler(async (req, res) => {
    const metrics = await getMetrics();
    return success(res, { metrics });
});

exports.getStats = asyncHandler(async (req, res) => {
    const stats = await getStats();
    return success(res, { stats });
});

exports.getApplications = asyncHandler(async (req, res) => {
    const applications = await getApplications();
    return success(res, { applications });
});

exports.updateApplicationStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await updateApplicationStatus(id, status);
    return success(res, { application: updated, message: `Status updated to ${status}` });
});

exports.getTrafficStats = asyncHandler(async (req, res) => {
    const stats = await getTrafficStats();
    const logs = await getTrafficLogs();
    return success(res, { stats, logs });
});
