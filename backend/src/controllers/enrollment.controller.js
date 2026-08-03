const { asyncHandler } = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const enrollmentService = require('../services/enrollment.service');

exports.enroll = asyncHandler(async (req, res) => {
    const promoCode = req.body.promo_code || req.body.promoCode || null;
    const transactionReference = req.body.transaction_reference || null;
    const result = await enrollmentService.create(req.user.id, req.params.id, promoCode, transactionReference);
    return success(res, { enrollment: result.enrollment, promo: result.promo || null }, 201);
});

exports.getMyEnrollments = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const enrollments = await enrollmentService.findAllByUser(userId);
    const enriched = await Promise.all(
        enrollments.map(async (enrollment) => {
            const lessons = await require('../models/enrollment.model').getEnrollmentLessons(enrollment.id, enrollment.course_id);
            const completed = enrollment.completed === 1;
            return {
                ...enrollment,
                courseTitle: enrollment.courses?.title || enrollment.courseTitle || '',
                lessons,
                enrolledDate: enrollment.enrolled_at,
                completed,
            };
        })
    );
    return success(res, { enrollments: enriched });
});

exports.completeLesson = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const courseId = req.params.id;
    const lessonId = req.params.lessonId;
    const enrollment = await enrollmentService.markLessonComplete(userId, courseId, lessonId);
    return success(res, { progress: enrollment.progress, completed: enrollment.completed === 1, completedAt: enrollment.completed_at });
});

exports.getCertificates = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const enrollments = await enrollmentService.findAllByUser(userId);
    const certificates = enrollments
        .filter((e) => e.completed === 1)
        .map((e) => ({
            id: e.id,
            courseId: e.course_id,
            issuedDate: e.completed_at,
            courseTitle: e.courses?.title || e.courseTitle || '',
        }));
    return success(res, { certificates });
});

exports.getAdminEnrollments = asyncHandler(async (req, res) => {
    const enrollments = await enrollmentService.getAdminEnrollments();
    return success(res, { enrollments });
});
