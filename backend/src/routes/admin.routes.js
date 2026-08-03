const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const { NotFoundError } = require('../utils/errors');
const courseService = require('../services/course.service');
const lessonService = require('../services/lesson.service');
const jobService = require('../services/job.service');
const applicationService = require('../services/application.service');
const userService = require('../services/user.service');
const adminService = require('../services/admin.service');
const authService = require('../services/auth.service');
const quizModel = require('../models/quiz.model');
const affiliateService = require('../services/affiliate.service');
const affiliateModel = require('../models/affiliate.model');
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth.middleware');

router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return error(res, 'Email and password required', 400);
    const result = await authService.adminLogin({ email, password });
    return success(res, result);
}));

router.use(authenticateToken, authorizeAdmin);

// ==================== STATS & METRICS ====================
router.get('/stats', asyncHandler(async (req, res) => {
    const stats = await adminService.getStats();
    return success(res, { stats });
}));

router.get('/metrics', asyncHandler(async (req, res) => {
    const metrics = await adminService.getMetrics();
    return success(res, { metrics });
}));

// ==================== TRAFFIC ====================
router.get('/traffic', asyncHandler(async (req, res) => {
    const stats = await adminService.getTrafficStats();
    const logs = await adminService.getTrafficLogs();
    return success(res, { stats, logs });
}));

// ==================== COURSES ====================
router.get('/courses', asyncHandler(async (req, res) => {
    const courses = await courseService.listAll();
    return success(res, { courses });
}));

router.get('/courses/:id', asyncHandler(async (req, res) => {
    const course = await courseService.findById(req.params.id);
    const lessons = await lessonService.listByCourse(course.id);
    course.lessons = lessons;
    return success(res, { course });
}));

router.post('/courses', asyncHandler(async (req, res) => {
    const { title, category } = req.body;
    if (!title || !String(title).trim()) return error(res, 'Course title is required', 400);
    if (!category || !String(category).trim()) return error(res, 'Course category is required', 400);
    const payload = {
        title: String(title).trim(),
        category: String(category).trim(),
        description: req.body.description || '',
        duration: req.body.duration || '',
        price: Number(req.body.price) || 0,
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
}));

router.patch('/courses/:id', asyncHandler(async (req, res) => {
    const allowed = ['title', 'category', 'description', 'duration', 'price', 'image', 'instructor', 'level', 'requirements', 'outcomes', 'published'];
    const updates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const course = await courseService.update(req.params.id, updates);
    return success(res, { course });
}));

router.delete('/courses/:id', asyncHandler(async (req, res) => {
    await courseService.remove(req.params.id);
    return success(res, { message: 'Course deleted' });
}));

// Publish / Unpublish
router.patch('/courses/:id/publish', asyncHandler(async (req, res) => {
    const course = await adminService.setCoursePublished(req.params.id, true);
    return success(res, { course, message: 'Course published' });
}));

router.patch('/courses/:id/unpublish', asyncHandler(async (req, res) => {
    const course = await adminService.setCoursePublished(req.params.id, false);
    return success(res, { course, message: 'Course unpublished' });
}));

// ==================== LESSONS ====================
router.post('/courses/:id/lessons', asyncHandler(async (req, res) => {
    const courseId = req.params.id;
    const { title, video_url, content } = req.body;
    if (!title) return error(res, 'Lesson title required', 400);
    const lesson = await lessonService.addToCourse(courseId, title, video_url || '', content || '');
    return success(res, { lesson }, 201);
}));

router.patch('/courses/:id/lessons/:lessonId', asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    const { title, video_url, content } = req.body;
    const lesson = await lessonService.findById(lessonId);
    if (!lesson) return error(res, 'Lesson not found', 404);
    const updated = await lessonService.update(lessonId, {
        title: title || lesson.title,
        video_url: video_url || lesson.video_url,
        content: content || lesson.content,
    });
    return success(res, { lesson: updated });
}));

router.delete('/courses/:id/lessons/:lessonId', asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    await lessonService.remove(lessonId);
    return success(res, { message: 'Lesson deleted' });
}));

// Top-level lesson management
router.get('/lessons', asyncHandler(async (req, res) => {
    const lessons = await adminService.getLessons();
    return success(res, { lessons });
}));

router.get('/lessons/:id', asyncHandler(async (req, res) => {
    const lesson = await lessonService.findById(req.params.id);
    if (!lesson) return error(res, 'Lesson not found', 404);
    return success(res, { lesson });
}));

router.post('/lessons', asyncHandler(async (req, res) => {
    const { course_id, title, video_url, content, order_index } = req.body;
    if (!course_id || !title) return error(res, 'Course ID and lesson title required', 400);
    let lesson;
    if (order_index !== undefined && order_index !== null && order_index !== '') {
        lesson = await lessonService.create(course_id, title, parseInt(order_index) || 0, video_url || '', content || '');
    } else {
        lesson = await lessonService.addToCourse(course_id, title, video_url || '', content || '');
    }
    return success(res, { lesson }, 201);
}));

router.patch('/lessons/:id', asyncHandler(async (req, res) => {
    const lesson = await lessonService.findById(req.params.id);
    if (!lesson) return error(res, 'Lesson not found', 404);
    const updates = {};
    for (const key of ['course_id', 'title', 'video_url', 'content', 'order_index']) {
        if (req.body[key] !== undefined) updates[key] = key === 'order_index' ? (parseInt(req.body[key]) || 0) : req.body[key];
    }
    const updated = await lessonService.update(req.params.id, updates);
    return success(res, { lesson: updated });
}));

router.delete('/lessons/:id', asyncHandler(async (req, res) => {
    await lessonService.remove(req.params.id);
    return success(res, { message: 'Lesson deleted' });
}));

// ==================== JOBS ====================
router.get('/jobs', asyncHandler(async (req, res) => {
    const jobs = await jobService.listAll();
    return success(res, { jobs });
}));

router.post('/jobs', asyncHandler(async (req, res) => {
    const data = {
        title: req.body.title,
        company: req.body.company,
        location: req.body.location || '',
        type: req.body.type || 'Full-time',
        salary: req.body.salary || '',
        category: req.body.category || '',
        description: req.body.description,
        requirements: Array.isArray(req.body.requirements) ? req.body.requirements : [],
        responsibilities: Array.isArray(req.body.responsibilities) ? req.body.responsibilities : [],
        benefits: Array.isArray(req.body.benefits) ? req.body.benefits : [],
        requiredCourseId: req.body.required_course_id || req.body.requiredCourseId || null,
    };
    const job = await jobService.create(data);
    try {
        const careerService = require('../services/career.service');
        await careerService.notifyTalentPool({
            title: 'New job opportunity',
            message: `A new ${job.title} position at ${job.company} is now open.`,
            jobId: job.id,
        });
    } catch (err) {
        const logger = require('../utils/logger');
        logger.warn('Failed to notify talent pool:', err.message);
    }
    return success(res, { job }, 201);
}));

router.patch('/jobs/:id', asyncHandler(async (req, res) => {
    const updates = { ...req.body };
    if (updates.requiredCourseId !== undefined) {
        updates.required_course_id = updates.requiredCourseId;
        delete updates.requiredCourseId;
    }
    const job = await jobService.update(req.params.id, updates);
    return success(res, { job });
}));

router.delete('/jobs/:id', asyncHandler(async (req, res) => {
    await jobService.remove(req.params.id);
    return success(res, { message: 'Job deleted' });
}));

// ==================== APPLICATIONS ====================
router.get('/applications', asyncHandler(async (req, res) => {
    const applications = await applicationService.listAll();
    return success(res, { applications });
}));

router.post('/applications/:id/status', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await applicationService.updateStatus(id, status);
    return success(res, { application: updated, message: `Status updated to ${status}` });
}));

// ==================== ENROLLMENTS ====================
router.get('/enrollments', asyncHandler(async (req, res) => {
    const enrollmentService = require('../services/enrollment.service');
    const enrollments = await enrollmentService.getAdminEnrollments();
    return success(res, { enrollments });
}));

// ==================== ATTEMPTS ====================
router.get('/attempts', asyncHandler(async (req, res) => {
    const attempts = await adminService.getAttempts();
    return success(res, { attempts });
}));

// ==================== USERS / STUDENTS ====================
router.get('/users', asyncHandler(async (req, res) => {
    const users = await userService.listAll();
    return success(res, { users });
}));

router.get('/students', asyncHandler(async (req, res) => {
    const students = await adminService.getStudentProgress();
    return success(res, { students });
}));

router.get('/students/:id', asyncHandler(async (req, res) => {
    const detail = await adminService.getStudentDetail(req.params.id);
    if (!detail) return error(res, 'Student not found', 404);
    return success(res, detail);
}));

router.patch('/users/:id/role', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const user = await userService.updateRole(id, role);
    return success(res, { user, message: 'Role updated' });
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    await userService.remove(id);
    return success(res, { message: 'User deleted' });
}));

// ==================== PAYMENTS ====================
router.get('/payments', asyncHandler(async (req, res) => {
    const payments = await adminService.getPayments();
    return success(res, { payments });
}));

router.get('/payments/stats', asyncHandler(async (req, res) => {
    const stats = await adminService.getPaymentStats();
    return success(res, { stats });
}));

// ==================== CERTIFICATES ====================
router.get('/certificates', asyncHandler(async (req, res) => {
    const certificates = await adminService.getCertificates();
    return success(res, { certificates });
}));

router.post('/certificates/issue', asyncHandler(async (req, res) => {
    const { userId, courseId, issuerName } = req.body;
    if (!userId || !courseId) return error(res, 'userId and courseId required', 400);
    const cert = await adminService.issueCertificate(userId, courseId, issuerName);
    return success(res, { certificate: cert, message: 'Certificate issued' }, 201);
}));

// ==================== QUIZZES ====================
router.get('/quizzes', asyncHandler(async (req, res) => {
    const quizzes = await adminService.getQuizzes();
    return success(res, { quizzes });
}));

router.get('/quizzes/:id', asyncHandler(async (req, res) => {
    const quiz = await adminService.getQuizDetail(req.params.id);
    if (!quiz) return error(res, 'Quiz not found', 404);
    return success(res, { quiz });
}));

router.post('/quizzes', asyncHandler(async (req, res) => {
    const quiz = await quizModel.create(req.body);
    return success(res, { quiz }, 201);
}));

router.patch('/quizzes/:id', asyncHandler(async (req, res) => {
    const quiz = await quizModel.update(req.params.id, req.body);
    return success(res, { quiz });
}));

router.delete('/quizzes/:id', asyncHandler(async (req, res) => {
    await quizModel.remove(req.params.id);
    return success(res, { message: 'Quiz deleted' });
}));

// Quiz questions
router.post('/quizzes/:id/questions', asyncHandler(async (req, res) => {
    const question = await quizModel.addQuestion({ ...req.body, quiz_id: req.params.id });
    return success(res, { question }, 201);
}));

router.patch('/quizzes/:id/questions/:questionId', asyncHandler(async (req, res) => {
    const question = await quizModel.updateQuestion(req.params.questionId, req.body);
    return success(res, { question });
}));

router.delete('/quizzes/:id/questions/:questionId', asyncHandler(async (req, res) => {
    await quizModel.removeQuestion(req.params.questionId);
    return success(res, { message: 'Question deleted' });
}));

// Quiz answers
router.post('/questions/:questionId/answers', asyncHandler(async (req, res) => {
    const answer = await quizModel.addAnswer({ ...req.body, question_id: req.params.questionId });
    return success(res, { answer }, 201);
}));

router.patch('/answers/:id', asyncHandler(async (req, res) => {
    const answer = await quizModel.updateAnswer(req.params.id, req.body);
    return success(res, { answer });
}));

router.delete('/answers/:id', asyncHandler(async (req, res) => {
    await quizModel.removeAnswer(req.params.id);
    return success(res, { message: 'Answer deleted' });
}));

// ==================== SETTINGS ====================
router.get('/settings', asyncHandler(async (req, res) => {
    const settings = await adminService.getSettings();
    return success(res, { settings });
}));

router.put('/settings', asyncHandler(async (req, res) => {
    const values = req.body;
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
        return error(res, 'Settings object required', 400);
    }
    const settings = await adminService.bulkUpdateSettings(values);
    return success(res, { settings, message: 'Settings updated' });
}));

router.patch('/settings/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { setting_value } = req.body;
    const setting = await adminService.updateSetting(id, setting_value);
    return success(res, { setting, message: 'Setting updated' });
}));

// ==================== CMS PAGES ====================
router.get('/cms', asyncHandler(async (req, res) => {
    const pages = await adminService.getCMSPages();
    return success(res, { pages });
}));

router.get('/cms/:id', asyncHandler(async (req, res) => {
    const page = await adminService.getCMSPage(req.params.id);
    if (!page) return error(res, 'Page not found', 404);
    return success(res, { page });
}));

router.post('/cms', asyncHandler(async (req, res) => {
    const { title, slug, content } = req.body;
    if (!title || !slug) return error(res, 'Title and slug required', 400);
    const page = await adminService.createCMSPage({ title, slug, content: content || '' });
    return success(res, { page }, 201);
}));

router.patch('/cms/:id', asyncHandler(async (req, res) => {
    const { title, slug, content, published } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug;
    if (content !== undefined) updates.content = content;
    if (published !== undefined) updates.published = published ? 1 : 0;
    const page = await adminService.updateCMSPage(req.params.id, updates);
    if (!page) return error(res, 'Page not found', 404);
    return success(res, { page });
}));

router.delete('/cms/:id', asyncHandler(async (req, res) => {
    await adminService.deleteCMSPage(req.params.id);
    return success(res, { message: 'Page deleted' });
}));

// ==================== AFFILIATES / REFERRALS ====================
router.get('/affiliates', asyncHandler(async (req, res) => {
    const affiliates = await affiliateService.getAffiliates();
    return success(res, { affiliates });
}));

router.get('/affiliates/performance', asyncHandler(async (req, res) => {
    const result = await affiliateService.getPerformance();
    return success(res, result);
}));

router.get('/affiliates/:id', asyncHandler(async (req, res) => {
    const detail = await affiliateService.getAffiliateDetail(req.params.id);
    return success(res, detail);
}));

router.post('/affiliates', asyncHandler(async (req, res) => {
    const { name, code, email, commission_percent, is_partner, discount_type, discount_value, course_id, expires_at, usage_limit } = req.body;
    if (!name || !code) return error(res, 'Affiliate name and referral code required', 400);
    const affiliate = await affiliateService.createAffiliate({
        name,
        code,
        email,
        commission_percent,
        is_partner,
        discount_type,
        discount_value,
        course_id,
        expires_at,
        usage_limit,
    });
    return success(res, { affiliate }, 201);
}));

router.patch('/affiliates/:id', asyncHandler(async (req, res) => {
    const current = await affiliateModel.findAffiliateById(req.params.id);
    if (!current) return error(res, 'Affiliate not found', 404);

    const updates = {};
    for (const key of ['name', 'email', 'code', 'commission_percent', 'is_partner']) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.code !== undefined) {
        const newCode = String(updates.code).trim().toUpperCase();
        if (!newCode) return error(res, 'Affiliate referral code is required', 400);
        if (newCode !== String(current.code).trim().toUpperCase()) {
            const takenAffiliate = await affiliateModel.findAffiliateByCode(newCode);
            if (takenAffiliate && takenAffiliate.id !== parseInt(req.params.id)) {
                return error(res, 'That referral code is already taken', 400);
            }
            const takenPromo = await affiliateModel.findPromoByCode(newCode);
            if (takenPromo) return error(res, 'That promo code is already in use', 400);
        }
        updates.code = newCode;
    }

    const affiliate = await affiliateModel.updateAffiliate(req.params.id, updates);

    const promoUpdates = {};
    for (const key of ['discount_type', 'discount_value', 'course_id', 'expires_at', 'usage_limit']) {
        if (req.body[key] !== undefined) promoUpdates[key] = req.body[key];
    }
    if (updates.code !== undefined) promoUpdates.code = updates.code;
    if (Object.keys(promoUpdates).length) {
        const promo = await affiliateModel.findPromoByCode(current.code);
        if (promo) {
            await affiliateModel.updatePromo(promo.id, promoUpdates);
        } else {
            await affiliateModel.createPromo({
                code: updates.code,
                discount_type: req.body.discount_type || 'percentage',
                discount_value: req.body.discount_value != null ? req.body.discount_value : 10,
                course_id: req.body.course_id || null,
                expires_at: req.body.expires_at || null,
                usage_limit: req.body.usage_limit || null,
                affiliate_id: affiliate.id,
                active: 1,
            });
        }
    }
    const detail = await affiliateService.getAffiliateDetail(req.params.id);
    return success(res, { affiliate: detail });
}));

router.delete('/affiliates/:id', asyncHandler(async (req, res) => {
    await affiliateModel.deleteAffiliate(req.params.id);
    return success(res, { message: 'Affiliate deleted' });
}));

router.post('/affiliates/:id/mark-paid', asyncHandler(async (req, res) => {
    const detail = await affiliateService.markPaid(req.params.id);
    return success(res, { affiliate: detail, message: 'Commissions marked as paid' });
}));

// ==================== PROMO CODES ====================
router.get('/promo-codes', asyncHandler(async (req, res) => {
    const promos = await affiliateModel.listPromos();
    return success(res, { promos });
}));

router.post('/promo-codes', asyncHandler(async (req, res) => {
    const { code, discount_type, discount_value, course_id, expires_at, usage_limit, active, affiliate_id } = req.body;
    if (!code) return error(res, 'Promo code required', 400);
    const promo = await affiliateModel.createPromo({
        code,
        discount_type,
        discount_value,
        course_id,
        expires_at,
        usage_limit,
        affiliate_id,
        active,
    });
    return success(res, { promo }, 201);
}));

router.patch('/promo-codes/:id', asyncHandler(async (req, res) => {
    const promo = await affiliateModel.updatePromo(req.params.id, req.body);
    if (!promo) return error(res, 'Promo code not found', 404);
    return success(res, { promo });
}));

router.delete('/promo-codes/:id', asyncHandler(async (req, res) => {
    await affiliateModel.deletePromo(req.params.id);
    return success(res, { message: 'Promo code deleted' });
}));

// ==================== CERTIFICATES ====================
const certificateModel = require('../models/certificate.model');

router.get('/certificates', asyncHandler(async (req, res) => {
    const certs = await certificateModel.listAll();
    return success(res, { certificates: certs });
}));

router.post('/certificates', asyncHandler(async (req, res) => {
    const { user_id, course_id, issuer_name } = req.body;
    if (!user_id || !course_id) return error(res, 'user_id and course_id are required', 400);
    const cert = await certificateModel.create(
        parseInt(user_id),
        parseInt(course_id),
        issuer_name || 'PazoSkill Academic Directorate'
    );
    return success(res, { certificate: cert }, 201);
}));

router.delete('/certificates/:id', asyncHandler(async (req, res) => {
    const db = await (require('../config/database').getDB());
    await db.run(`DELETE FROM certificates WHERE id = ?`, [parseInt(req.params.id)]);
    return success(res, { message: 'Certificate revoked' });
}));

module.exports = router;

