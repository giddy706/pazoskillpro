const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');
const applicationModel = require('../models/application.model');
const jobModel = require('../models/job.model');
const enrollmentModel = require('../models/enrollment.model');

async function listAll() {
    return applicationModel.listAll();
}

async function findById(id) {
    const app = await applicationModel.findById(id);
    if (!app) throw new NotFoundError('Application not found');
    return app;
}

async function findByUser(userId) {
    return applicationModel.findByUser(userId);
}

async function create({ jobId, userId, fullName, email, phone, coverLetter }) {
    const job = await jobModel.findById(jobId);
    if (!job) throw new NotFoundError('Job not found');

    if (job.required_course_id) {
        const completed = await enrollmentModel.findByUserAndCourse(userId, job.required_course_id);
        if (!completed || completed.completed !== 1) {
            throw new BadRequestError('You must complete the required course before applying');
        }
    }

    const existing = await applicationModel.existsForJobAndUser(jobId, userId);
    if (existing) {
        throw new ConflictError('You have already applied for this job');
    }

    return applicationModel.create({ jobId, userId, fullName, email, phone, coverLetter });
}

async function updateStatus(id, status) {
    const app = await applicationModel.findById(id);
    if (!app) throw new NotFoundError('Application not found');
    if (!['pending', 'approved', 'rejected'].includes(status)) {
        throw new BadRequestError('Invalid status');
    }
    await applicationModel.updateStatus(id, status);
    return app;
}

async function countAll() {
    return applicationModel.countAll();
}

module.exports = {
    listAll,
    findById,
    findByUser,
    create,
    updateStatus,
    countAll,
};
