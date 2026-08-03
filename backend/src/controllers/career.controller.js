const careerService = require('../services/career.service');

async function getStats(req, res) {
    const stats = await careerService.getStats();
    return res.json({ success: true, stats });
}

async function getProgress(req, res) {
    const progress = await careerService.getProgress(req.user.id);
    return res.json({ success: true, progress });
}

async function joinTalentPool(req, res) {
    const talentPool = await careerService.joinTalentPool(req.user.id);
    return res.json({ success: true, talentPool });
}

async function uploadResume(req, res) {
    const { name, data } = req.body || {};
    if (!data) {
        return res.status(400).json({ success: false, message: 'Resume file is required.' });
    }
    const talentPool = await careerService.uploadResume(req.user.id, { name, data });
    await careerService.recordAction(req.user.id, 'resume_uploaded');
    return res.json({ success: true, talentPool });
}

async function uploadPortfolio(req, res) {
    const { name, data } = req.body || {};
    if (!data) {
        return res.status(400).json({ success: false, message: 'Portfolio file is required.' });
    }
    const talentPool = await careerService.uploadPortfolio(req.user.id, { name, data });
    await careerService.recordAction(req.user.id, 'portfolio_uploaded');
    return res.json({ success: true, talentPool });
}

async function recordAction(req, res) {
    const { action } = req.body || {};
    const careerAction = await careerService.recordAction(req.user.id, action);
    return res.json({ success: true, careerAction });
}

async function getNotifications(req, res) {
    const notifications = await careerService.getNotifications(req.user.id);
    return res.json({ success: true, notifications });
}

async function markNotificationsRead(req, res) {
    await careerService.markNotificationsRead(req.user.id);
    return res.json({ success: true, message: 'Notifications marked as read' });
}

module.exports = {
    getStats,
    getProgress,
    joinTalentPool,
    uploadResume,
    uploadPortfolio,
    recordAction,
    getNotifications,
    markNotificationsRead,
};
