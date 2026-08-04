const { NotFoundError } = require('../utils/errors');
const courseModel = require('../models/course.model');

function parseJsonArray(value) {
    try {
        return JSON.parse(value || '[]');
    } catch {
        return [];
    }
}

function studentCount(course) {
    return course.students != null ? course.students : (course.students_count || 0);
}

async function listAll() {
    const courses = await courseModel.listAll();
    return courses.map((c) => ({
        ...c,
        requirements: parseJsonArray(c.requirements),
        outcomes: parseJsonArray(c.outcomes),
        students: studentCount(c),
    }));
}

async function listPublished() {
    const courses = await courseModel.listPublished();
    return courses.map((c) => ({
        ...c,
        requirements: parseJsonArray(c.requirements),
        outcomes: parseJsonArray(c.outcomes),
        students: studentCount(c),
    }));
}

async function findById(id) {
    const course = await courseModel.findById(id);
    if (!course) throw new NotFoundError('Course not found');

    let requirements = [];
    let outcomes = [];
    try {
        requirements = JSON.parse(course.requirements || '[]');
    } catch {
        requirements = [];
    }
    try {
        outcomes = JSON.parse(course.outcomes || '[]');
    } catch {
        outcomes = [];
    }

    return {
        ...course,
        requirements,
        outcomes,
        students: course.students_count,
    };
}

async function create({ title, category, description, duration, price, image, instructor, level, lessons, requirements = [], outcomes = [], published = 1 }) {
    const course = await courseModel.create({
        title,
        category,
        description,
        duration,
        price,
        image,
        instructor,
        level,
        requirements,
        outcomes,
        published,
    });

    if (Array.isArray(lessons)) {
        for (let i = 0; i < lessons.length; i++) {
            const t = lessons[i];
            if (t && t.title && String(t.title).trim()) {
                await require('../models/lesson.model').create(
                    course.id,
                    String(t.title).trim(),
                    i + 1,
                    t.video_url || '',
                    t.content || ''
                );
            }
        }
    }

    // Make sure every new course automatically gets a matching job listing.
    try {
        await require('./job.service').generateJobForCourse(course);
    } catch (err) {
        const { logger } = require('../utils/logger');
        logger.warn(`Failed to auto-generate job for course ${course.id}:`, err.message);
    }

    return course;
}

async function update(id, updates) {
    const course = await courseModel.findById(id);
    if (!course) throw new NotFoundError('Course not found');

    await courseModel.update(id, updates);
    return courseModel.findById(id);
}

async function remove(id) {
    const course = await courseModel.findById(id);
    if (!course) throw new NotFoundError('Course not found');
    return courseModel.remove(id);
}

async function countAll() {
    return courseModel.countAll();
}

module.exports = {
    listAll,
    listPublished,
    findById,
    create,
    update,
    remove,
    countAll,
};
