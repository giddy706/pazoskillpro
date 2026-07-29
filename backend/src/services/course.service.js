const { NotFoundError } = require('../utils/errors');
const courseModel = require('../models/course.model');

function parseJsonArray(value) {
    try {
        return JSON.parse(value || '[]');
    } catch {
        return [];
    }
}

async function listAll() {
    const courses = await courseModel.listAll();
    return courses.map((c) => ({
        ...c,
        requirements: parseJsonArray(c.requirements),
        outcomes: parseJsonArray(c.outcomes),
        students: c.students_count,
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

async function create({ title, category, description, duration, price, image, instructor, level, lessons, requirements = [], outcomes = [] }) {
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
    findById,
    create,
    update,
    remove,
    countAll,
};
