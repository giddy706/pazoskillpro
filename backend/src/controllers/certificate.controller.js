const { asyncHandler } = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const certificateService = require('../services/certificate.service');
const enrollmentService = require('../services/enrollment.service');

exports.getMyCertificates = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const certificates = await certificateService.getByUser(userId);
    return success(res, { certificates });
});

exports.getCertificateById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const certificate = await certificateService.getById(id);
    return success(res, { certificate: sanitizeForViewer(certificate, req.user) });
});

exports.getCertificateByCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const certificate = await certificateService.getByUserAndCourse(req.user.id, courseId);
    return success(res, { certificate: sanitizeForViewer(certificate, req.user) });
});

exports.verifyCertificate = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const certificate = await certificateService.getByCode(code);
    return success(res, { certificate: sanitizeForViewer(certificate, req.user), valid: true });
});

exports.getDesign = asyncHandler(async (req, res) => {
    const design = await certificateService.getDesign();
    return success(res, { design });
});

function sanitizeForViewer(certificate, user) {
    if (!certificate) return certificate;
    if (user && (user.id === certificate.user_id || user.role === 'admin')) return certificate;
    const { userEmail, ...rest } = certificate;
    return rest;
}

exports.issueCertificateAdmin = asyncHandler(async (req, res) => {
    const { userId, courseId, issuerName } = req.body;
    if (!userId || !courseId) {
        return error(res, 'User ID and Course ID are required', 400);
    }
    const certificate = await certificateService.issueCertificate(userId, courseId, issuerName || 'pazoskill Academic Directorate');
    return success(res, { certificate, message: 'Certificate issued successfully' }, 201);
});

exports.listAllCertificatesAdmin = asyncHandler(async (req, res) => {
    const certificates = await certificateService.listAll();
    return success(res, { certificates });
});
