const { asyncHandler } = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const { NotFoundError } = require('../utils/errors');
const lessonService = require('../services/lesson.service');

exports.add = asyncHandler(async (req, res) => {
    const courseId = req.params.id;
    const { title, video_url, content } = req.body;
    const lesson = await lessonService.addToCourse(courseId, title, video_url, content);
    return success(res, { lesson }, 201);
});

exports.updateLesson = asyncHandler(async (req, res) => {
    const { id: courseId, lessonId } = req.params;
    const lesson = await lessonService.findById(lessonId);
    if (String(lesson.course_id) !== String(courseId)) {
        throw new NotFoundError('Lesson not found in this course');
    }
    const updates = { ...req.body };
    if (updates.order_index) updates.order_index = parseInt(updates.order_index, 10);
    const updated = await lessonService.update(lessonId, updates);
    return success(res, { lesson: updated });
});

exports.removeLesson = asyncHandler(async (req, res) => {
    const { id: courseId, lessonId } = req.params;
    const lesson = await lessonService.findById(lessonId);
    if (String(lesson.course_id) !== String(courseId)) {
        throw new NotFoundError('Lesson not found in this course');
    }
    await lessonService.remove(lessonId);
    return success(res, { message: 'Lesson deleted' });
});
