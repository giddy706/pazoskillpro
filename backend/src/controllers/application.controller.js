const { asyncHandler } = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/errors');
const applicationService = require('../services/application.service');

exports.applyForJob = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const jobId = req.params.id;
    const { fullName, email, phone = '', coverLetter } = req.body;
    if (!fullName || !String(fullName).trim() || !email || !String(email).trim()) {
        throw new BadRequestError('Your name and email are required to apply');
    }
    const application = await applicationService.create({
        jobId,
        userId,
        fullName,
        email,
        phone,
        coverLetter,
    });
    return success(res, { application }, 201);
});

exports.getMyApplications = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const applications = await applicationService.findByUser(userId);
    return success(res, { applications });
});

exports.listAll = asyncHandler(async (req, res) => {
    const applications = await applicationService.listAll();
    return success(res, { applications });
});

exports.updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const app = await applicationService.updateStatus(id, status);
    return success(res, { application: app, message: `Status updated to ${status}` });
});
