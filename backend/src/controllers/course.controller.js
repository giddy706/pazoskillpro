const { asyncHandler } = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const { NotFoundError } = require('../utils/errors');
const courseService = require('../services/course.service');

exports.list = asyncHandler(async (req, res) => {
    const courses = await courseService.listPublished();
    return success(res, { courses });
});

exports.getDetails = asyncHandler(async (req, res) => {
    const course = await courseService.findById(req.params.id);
    if (!course.published) {
        const canView =
            req.user &&
            (req.user.role === 'admin' ||
                (await require('../services/enrollment.service').findByUserAndCourse(req.user.id, course.id)));
        if (!canView) throw new NotFoundError('Course not found');
    }
    const lessons = await require('../services/lesson.service').listByCourse(course.id);
    course.curriculum = lessons;
    return success(res, { course });
});

exports.create = asyncHandler(async (req, res) => {
    const payload = {
        title: req.body.title,
        category: req.body.category,
        description: req.body.description || '',
        duration: req.body.duration || '',
        price: req.body.price || 0,
        image: req.body.image || '',
        instructor: req.body.instructor || '',
        level: req.body.level || '',
        requirements: Array.isArray(req.body.requirements) ? req.body.requirements : [],
        outcomes: Array.isArray(req.body.outcomes) ? req.body.outcomes : [],
        published: req.body.published === undefined ? 1 : (req.body.published ? 1 : 0),
        lessons: req.body.lessons || [],
    };
    const course = await courseService.create(payload);
    return success(res, { course }, 201);
});

exports.update = asyncHandler(async (req, res) => {
    const allowed = ['title', 'category', 'description', 'duration', 'price', 'image', 'instructor', 'level', 'requirements', 'outcomes', 'published'];
    const updates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const course = await courseService.update(req.params.id, updates);
    return success(res, { course }, 200);
});

exports.remove = asyncHandler(async (req, res) => {
    await courseService.remove(req.params.id);
    return success(res, { message: 'Course deleted successfully' });
});
