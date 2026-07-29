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
    const payload = {
        title: req.body.title,
        category: req.body.category,
        description: req.body.description || '',
        duration: req.body.duration || '',
        price: req.body.price || 0,
        image: req.body.image || '',
        instructor: req.body.instructor || '',
        level: req.body.level || '',
        lessons: req.body.lessons || [],
    };
    const course = await courseService.create(payload);
    return success(res, { course }, 201);
}));

router.patch('/courses/:id', asyncHandler(async (req, res) => {
    const updates = { ...req.body };
    if (updates.requirements !== undefined) updates.requirements = Array.isArray(updates.requirements) ? updates.requirements : [];
    if (updates.outcomes !== undefined) updates.outcomes = Array.isArray(updates.outcomes) ? updates.outcomes : [];
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

router.patch('/settings/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { setting_value } = req.body;
    const setting = await adminService.updateSetting(id, setting_value);
    return success(res, { setting, message: 'Setting updated' });
}));

module.exports = router;
