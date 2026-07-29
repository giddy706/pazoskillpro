const { asyncHandler } = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const authService = require('../services/auth.service');
const { BadRequestError } = require('../utils/errors');

exports.register = asyncHandler(async (req, res) => {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
        throw new BadRequestError('All fields are required');
    }
    const result = await authService.register({ name: fullName, email, password });
    return success(res, { user: result.user, token: result.token }, 201);
});

exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new BadRequestError('Email and password are required');
    }
    const result = await authService.login({ email, password });
    return success(res, { user: result.user, token: result.token });
});

exports.adminLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new BadRequestError('Email and password are required');
    }
    const result = await authService.adminLogin({ email, password });
    return success(res, result);
});
exports.getMe = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const certificateService = require('../services/certificate.service');
    const [user, enrollments, applications, userCertificates] = await Promise.all([
        require('../models/user.model').findById(userId),
        require('../services/enrollment.service').findAllByUser(userId),
        require('../services/application.service').findByUser(userId),
        certificateService.getByUser(userId),
    ]);

    if (!user) {
        throw new Error('User not found');
    }

    const completedCourses = [];
    const lessonsPromises = enrollments.map((enrollment) =>
        require('../models/lesson.model')
            .findByCourseId(enrollment.course_id)
            .then((lessons) => {
                const completed = enrollment.completed === 1;
                if (completed) {
                    completedCourses.push(enrollment);
                }
                return {
                    ...enrollment,
                    courseTitle: enrollment.courses?.title || enrollment.courseTitle || '',
                    lessons,
                };
            })
    );

    const enrollmentsWithLessons = await Promise.all(lessonsPromises);

    const formattedCertificates = userCertificates.map(c => ({
        id: c.id,
        certificateCode: c.certificate_code,
        courseId: c.course_id,
        courseTitle: c.courseTitle,
        issuedDate: c.issued_at,
        issuerName: c.issuer_name
    }));

    return success(res, {
        user: {
            id: user.id,
            fullName: user.name,
            email: user.email,
            role: user.role,
            enrolledCourses: enrollmentsWithLessons,
            completedCourses,
            certificates: formattedCertificates,
            jobApplications: applications,
        },
    });
});

exports.logout = asyncHandler(async (req, res) => {
    res.clearCookie('token');
    return success(res, { message: 'Logged out successfully' });
});
