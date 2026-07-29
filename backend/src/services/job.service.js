const { NotFoundError } = require('../utils/errors');
const jobModel = require('../models/job.model');
const applicationModel = require('../models/application.model');

async function listAll() {
    const jobs = await jobModel.listAll();
    return jobs.map((job) => {
        let requirements = [];
        let responsibilities = [];
        let benefits = [];
        try {
            requirements = JSON.parse(job.requirements);
        } catch {}
        try {
            responsibilities = JSON.parse(job.responsibilities);
        } catch {}
        try {
            benefits = JSON.parse(job.benefits);
        } catch {}

        return {
            ...job,
            postedDate: job.created_at,
            requirements,
            responsibilities,
            benefits,
        };
    });
}

async function findById(id) {
    const job = await jobModel.findById(id);
    if (!job) throw new NotFoundError('Job not found');

    let requirements = [];
    let responsibilities = [];
    let benefits = [];
    try {
        requirements = JSON.parse(job.requirements);
    } catch {}
    try {
        responsibilities = JSON.parse(job.responsibilities);
    } catch {}
    try {
        benefits = JSON.parse(job.benefits);
    } catch {}

    return {
        ...job,
        postedDate: job.created_at,
        requirements,
        responsibilities,
        benefits,
    };
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
