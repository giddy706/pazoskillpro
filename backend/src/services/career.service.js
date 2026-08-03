const careerModel = require('../models/career.model');
const enrollmentModel = require('../models/enrollment.model');
const certificateModel = require('../models/certificate.model');
const jobModel = require('../models/job.model');
const settingModel = require('../models/setting.model');
const { getDB } = require('../config/database');

const STAT_KEYS = [
    ['career_students_graduated', 350],
    ['career_students_seeking', 180],
    ['career_employer_partners', 12],
    ['career_interviews_scheduled', 25],
    ['career_students_placed', 8],
];

async function getStats() {
    const stats = {};
    for (const [key, fallback] of STAT_KEYS) {
        const row = await settingModel.get(key);
        const parsed = parseInt(row ? row.setting_value : '', 10);
        stats[key.replace('career_', '')] = Number.isFinite(parsed) ? parsed : fallback;
    }
    stats.talentPoolSize = await careerModel.getTalentPoolStats();
    const jobs = await jobModel.listAll();
    stats.availableJobs = jobs.length;
    return stats;
}

async function getProgress(userId) {
    const [enrollments, certificates, talentPool, actions, jobs] = await Promise.all([
        enrollmentModel.findAllByUser(userId),
        certificateModel.findByUser(userId),
        careerModel.findTalentPoolByUser(userId),
        careerModel.listActions(userId),
        jobModel.listAll(),
    ]);

    const doneActions = new Set(actions.map((a) => a.action));

    // Interview practice counts if the student used the AI interview coach OR marked the step.
    let interviewPractice = doneActions.has('interview_practice');
    if (!interviewPractice) {
        const db = await getDB();
        const row = await db.get(
            `SELECT COUNT(*) as count FROM ai_usage WHERE user_id = ? AND mode = 'interview' AND status = 'success'`,
            [parseInt(userId)]
        );
        interviewPractice = row && row.count > 0;
    }

    const steps = {
        course_completed: enrollments.some((e) => e.completed === 1),
        certificate_earned: certificates.length > 0,
        resume_uploaded: !!(talentPool && talentPool.resume_name),
        portfolio_uploaded: !!(talentPool && talentPool.portfolio_name),
        ai_resume_review: doneActions.has('ai_resume_review'),
        interview_practice: interviewPractice,
        career_resources: doneActions.has('career_resources'),
        talent_pool_joined: !!talentPool,
    };

    const availableJobs = jobs.length;
    const waitingForOpportunities = steps.talent_pool_joined && availableJobs === 0;
    const opportunitiesAvailable = availableJobs > 0;

    return {
        steps,
        availableJobs,
        waitingForOpportunities,
        opportunitiesAvailable,
        talentPool,
        unreadNotifications: await careerModel.countUnreadNotifications(userId),
    };
}

async function joinTalentPool(userId) {
    return careerModel.upsertTalentPool(userId, {});
}

async function uploadResume(userId, { name, data }) {
    return careerModel.upsertTalentPool(userId, { resume_name: name || '', resume_data: data || '' });
}

async function uploadPortfolio(userId, { name, data }) {
    return careerModel.upsertTalentPool(userId, { portfolio_name: name || '', portfolio_data: data || '' });
}

async function recordAction(userId, action) {
    const allowed = new Set(['ai_resume_review', 'interview_practice', 'career_resources', 'portfolio_uploaded', 'resume_uploaded']);
    if (!allowed.has(action)) {
        const { BadRequestError } = require('../utils/errors');
        throw new BadRequestError('Unknown career action');
    }
    return careerModel.recordAction(userId, action);
}

async function getNotifications(userId) {
    return careerModel.listNotifications(userId);
}

async function markNotificationsRead(userId) {
    return careerModel.markAllNotificationsRead(userId);
}

// Fired whenever a new job is published so talent pool members see it immediately.
async function notifyTalentPool({ title, message, jobId }) {
    const userIds = await careerModel.listActiveTalentPoolUserIds();
    if (!userIds.length) return;
    await careerModel.notifyUsers(userIds, { title, message, jobId });
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
    notifyTalentPool,
};
