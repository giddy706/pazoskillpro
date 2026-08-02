const { NotFoundError } = require('../utils/errors');
const jobModel = require('../models/job.model');
const applicationModel = require('../models/application.model');

async function listAll() {
    const jobs = await jobModel.listAll();
    return jobs.map((job) => ({
        ...job,
        postedDate: job.created_at,
        requirements: toArray(job.requirements),
        responsibilities: toArray(job.responsibilities),
        benefits: toArray(job.benefits),
    }));
}

async function findById(id) {
    const job = await jobModel.findById(id);
    if (!job) throw new NotFoundError('Job not found');

    return {
        ...job,
        postedDate: job.created_at,
        requirements: toArray(job.requirements),
        responsibilities: toArray(job.responsibilities),
        benefits: toArray(job.benefits),
    };
}

function toArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return []; }
    }
    return [];
}

async function create({ title, company, location, type, salary, category, description, requirements, responsibilities, benefits, requiredCourseId }) {
    return jobModel.create({
        title,
        company,
        location,
        type,
        salary,
        category,
        description,
        requirements,
        responsibilities,
        benefits,
        requiredCourseId,
    });
}

async function update(id, updates) {
    const job = await jobModel.findById(id);
    if (!job) throw new NotFoundError('Job not found');
    return jobModel.update(id, updates);
}

async function remove(id) {
    const job = await jobModel.findById(id);
    if (!job) throw new NotFoundError('Job not found');
    return jobModel.remove(id);
}

async function countAll() {
    return jobModel.countAll();
}

module.exports = {
    listAll,
    findById,
    create,
    update,
    remove,
    countAll,
};
