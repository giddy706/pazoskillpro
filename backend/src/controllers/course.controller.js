const { asyncHandler } = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const { NotFoundError } = require('../utils/errors');
const courseService = require('../services/course.service');

exports.list = asyncHandler(async (req, res) => {
    const courses = await courseService.listAll();
    return success(res, { courses });
});

exports.getDetails = asyncHandler(async (req, res) => {
    const course = await courseService.findById(req.params.id);
    const lessons = await require('../services/lesson.service').listByCourse(course.id);
    course.curriculum = lessons;
    return success(res, { course });
});

exports.create = asyncHandler(async (req, res) => {
    const payload = {
        ...req.body,
        lessons: req.body.lessons || [],
    };
    const course = await courseService.create(payload);
    return success(res, { course }, 201);
});

exports.update = asyncHandler(async (req, res) => {
    const updates = { ...req.body };
    const course = await courseService.update(req.params.id, updates);
    return success(res, { course }, 200);
});

exports.remove = asyncHandler(async (req, res) => {
    await courseService.remove(req.params.id);
    return success(res, { message: 'Course deleted successfully' });
});
