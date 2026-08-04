const { NotFoundError } = require('../utils/errors');
const jobModel = require('../models/job.model');
const applicationModel = require('../models/application.model');
const courseModel = require('../models/course.model');

async function listAll() {
    const jobs = await jobModel.listAll();
    return jobs.map((job) => ({
        ...job,
        postedDate: job.created_at,
        courseTitle: job.course_title,
        requiredCourseTitle: job.course_title,
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
        courseTitle: job.course_title,
        requiredCourseTitle: job.course_title,
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

// Create a default job listing for a course that doesn't have one yet.
// This makes sure every course appears in the website's Jobs section.
async function generateJobForCourse(course) {
    const existing = await jobModel.findByRequiredCourse(course.id);
    if (existing) return existing;

    const category = course.category || 'Technology';
    return jobModel.create({
        title: `Junior ${course.title} Specialist`,
        company: 'pazoskill Partner Network',
        location: 'Remote',
        type: 'Full-time',
        salary: '$40k - $60k',
        category,
        description: `We are looking for a highly motivated individual who has completed the ${course.title} certification to join our partner network. You will apply the skills you learned to real-world projects.`,
        requirements: [
            `Must have completed the ${course.title} course on pazoskill`,
            'Strong problem-solving skills',
            'Ability to work independently in a remote environment',
        ],
        responsibilities: [
            'Apply course concepts to live business challenges',
            'Collaborate with senior team members',
            'Participate in daily stand-up meetings',
        ],
        benefits: [
            'Fully remote work',
            'Flexible hours',
            'Continuous learning stipend',
        ],
        requiredCourseId: course.id,
    });
}

// Create a default job for every course that doesn't already have one.
async function ensureAllCoursesHaveJobs() {
    const courses = await courseModel.listAll();
    let created = 0;
    for (const course of courses) {
        const existing = await jobModel.findByRequiredCourse(course.id);
        if (!existing) {
            await generateJobForCourse(course);
            created++;
        }
    }
    return created;
}

module.exports = {
    listAll,
    findById,
    create,
    update,
    remove,
    countAll,
    generateJobForCourse,
    ensureAllCoursesHaveJobs,
};
