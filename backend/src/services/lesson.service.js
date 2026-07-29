const { NotFoundError } = require('../utils/errors');
const lessonModel = require('../models/lesson.model');

async function findById(id) {
    const lesson = await lessonModel.findById(id);
    if (!lesson) throw new NotFoundError('Lesson not found');
    return lesson;
}

async function listByCourse(courseId) {
    return lessonModel.findByCourseId(courseId);
}

async function create(courseId, title, orderIndex, videoUrl = '', content = '') {
    return lessonModel.create(courseId, title, orderIndex, videoUrl, content);
}

async function addToCourse(courseId, title, videoUrl = '', content = '') {
    const nextIndex = await lessonModel.getNextOrderIndex(courseId);
    return create(courseId, title, nextIndex, videoUrl, content);
}

async function update(id, updates) {
    const lesson = await findById(id);
    return lessonModel.update(id, updates);
}

async function remove(id) {
    const lesson = await findById(id);
    return lessonModel.remove(id);
}

module.exports = {
    findById,
    listByCourse,
    create,
    addToCourse,
    update,
    remove,
};
