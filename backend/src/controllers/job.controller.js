const { asyncHandler } = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');
const {
    listAll,
    findById,
    create: createJob,
    update: updateJob,
    remove: removeJob,
} = require('../services/job.service');

exports.list = asyncHandler(async (req, res) => {
    const jobs = await listAll();
    return success(res, { jobs });
});

exports.getDetails = asyncHandler(async (req, res) => {
    const job = await findById(req.params.id);
    return success(res, { job });
});

exports.create = asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        requirements: req.body.requirements || [],
        responsibilities: req.body.responsibilities || [],
        benefits: req.body.benefits || [],
        requiredCourseId: req.body.requiredCourseId || req.body.required_course_id || null,
    };
    const job = await createJob(data);
    return success(res, { job }, 201);
});

exports.update = asyncHandler(async (req, res) => {
    const updates = { ...req.body };
    if (updates.requiredCourseId !== undefined) {
        updates.required_course_id = updates.requiredCourseId;
        delete updates.requiredCourseId;
    }
    if (updates.requirements) {
        updates.requirements = Array.isArray(updates.requirements) ? updates.requirements : [updates.requirements];
    }
    if (updates.responsibilities) {
        updates.responsibilities = Array.isArray(updates.responsibilities) ? updates.responsibilities : [updates.responsibilities];
    }
    if (updates.benefits) {
        updates.benefits = Array.isArray(updates.benefits) ? updates.benefits : [updates.benefits];
    }
    const job = await updateJob(req.params.id, updates);
    return success(res, { job }, 200);
});

exports.remove = asyncHandler(async (req, res) => {
    await removeJob(req.params.id);
    return success(res, { message: 'Job deleted successfully' });
});
