const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const aiService = require('../services/ai.service');
const courseService = require('../services/course.service');
const lessonService = require('../services/lesson.service');
const quizModel = require('../models/quiz.model');
const { authenticateToken, authorizeAdmin } = require('../middlewares/auth.middleware');

async function loadCourseLesson(courseId, lessonId) {
    let course = null;
    let lesson = null;
    if (courseId) {
        try {
            course = await courseService.findById(courseId);
        } catch (e) {
            course = null;
        }
    }
    if (lessonId) {
        try {
            lesson = await lessonService.findById(lessonId);
        } catch (e) {
            lesson = null;
        }
    }
    return { course, lesson };
}

async function aiEnabledOrError(res) {
    const enabled = await aiService.isEnabled();
    if (!enabled) {
        error(res, 'The AI tutor is currently disabled by the administrator.', 403);
        return false;
    }
    return true;
}

// Record a failed call and return a readable error
async function aiError(res, req, mode, endpoint, err) {
    await aiService.recordUsage({
        userId: req.user && req.user.id,
        userName: req.user && req.user.name,
        mode,
        endpoint,
        status: 'error',
        errorMessage: err.message,
    });
    return error(res, 'AI service error: ' + err.message, 500);
}

/**
 * @swagger
 * /ai/chat:
 *   post:
 *     summary: Ask the AI tutor a question (course/lesson aware)
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *               course_id: { type: integer }
 *               lesson_id: { type: integer }
 *               mode: { type: string, enum: [tutor, explain, lecture, summarize, practice, interview, career] }
 *     responses:
 *       200:
 *         description: Tutor reply
 */
router.post('/chat', authenticateToken, asyncHandler(async (req, res) => {
    const { message, course_id, lesson_id, mode } = req.body;
    if (!message || !String(message).trim()) return error(res, 'Message is required', 400);
    if (!(await aiEnabledOrError(res))) return;

    const { course, lesson } = await loadCourseLesson(course_id, lesson_id);
    try {
        const reply = await aiService.askTutor({
            message: String(message).trim(),
            course,
            lesson,
            userName: req.user.name || 'Student',
            userId: req.user.id,
            mode,
        });
        return success(res, { reply, course: course ? course.title : null, lesson: lesson ? lesson.title : null });
    } catch (err) {
        return aiError(res, req, mode || 'tutor', 'chat', err);
    }
}));

/**
 * @swagger
 * /ai/summary:
 *   post:
 *     summary: Summarize a lesson
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               course_id: { type: integer }
 *               lesson_id: { type: integer }
 */
router.post('/summary', authenticateToken, asyncHandler(async (req, res) => {
    const { course_id, lesson_id } = req.body;
    if (!(await aiEnabledOrError(res))) return;
    const { course, lesson } = await loadCourseLesson(course_id, lesson_id);
    if (!lesson) return error(res, 'A valid lesson_id is required', 400);
    try {
        const reply = await aiService.summarizeLesson({ course, lesson, userId: req.user.id, userName: req.user.name });
        return success(res, { reply });
    } catch (err) {
        return aiError(res, req, 'summarize', 'summary', err);
    }
}));

/**
 * @swagger
 * /ai/quiz:
 *   post:
 *     summary: Generate a practice quiz from a lesson and save it
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               course_id: { type: integer }
 *               lesson_id: { type: integer }
 *               count: { type: integer }
 *               difficulty: { type: string }
 */
router.post('/quiz', authenticateToken, asyncHandler(async (req, res) => {
    const { course_id, lesson_id, count = 10, difficulty = 'mixed' } = req.body;
    if (!(await aiEnabledOrError(res))) return;
    const { course, lesson } = await loadCourseLesson(course_id, lesson_id);
    if (!lesson) return error(res, 'A valid lesson_id is required', 400);

    let questions;
    try {
        questions = await aiService.generateQuiz({
            course, lesson,
            count: parseInt(count) || 10,
            difficulty,
            userId: req.user.id,
            userName: req.user.name,
        });
    } catch (err) {
        return aiError(res, req, 'quiz', 'quiz', err);
    }

    // Save the generated quiz into the quiz tables
    const title = 'AI Practice: ' + lesson.title;
    const quiz = await quizModel.create({
        course_id,
        lesson_id,
        title,
        description: 'Auto-generated by the PazoSkillPro AI tutor from ' + lesson.title,
        passing_score: 70,
        max_attempts: 3,
        time_limit_minutes: 0,
    });

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionRow = await quizModel.addQuestion({
            quiz_id: quiz.id,
            question: q.question,
            question_type: 'multiple_choice',
            order_index: i,
            points: 1,
        });
        const options = Array.isArray(q.options) ? q.options : [];
        for (let j = 0; j < options.length; j++) {
            await quizModel.addAnswer({
                question_id: questionRow.id,
                answer: String(options[j]),
                is_correct: j === (q.correct_index || 0),
                order_index: j,
            });
        }
    }

    return success(res, { quiz_id: quiz.id, questions, message: 'Quiz generated and saved.' }, 201);
}));

/**
 * @swagger
 * /ai/code-review:
 *   post:
 *     summary: Review student code
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string }
 *               language: { type: string }
 *               question: { type: string }
 */
router.post('/code-review', authenticateToken, asyncHandler(async (req, res) => {
    const { code, language, question } = req.body;
    if (!code || !String(code).trim()) return error(res, 'Code is required', 400);
    if (!(await aiEnabledOrError(res))) return;
    try {
        const reply = await aiService.reviewCode({
            code: String(code), language, question,
            userId: req.user.id,
            userName: req.user.name,
        });
        return success(res, { reply });
    } catch (err) {
        return aiError(res, req, 'code-review', 'code-review', err);
    }
}));

/**
 * @swagger
 * /ai/career:
 *   post:
 *     summary: Career coaching (CV, interviews, LinkedIn)
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topic: { type: string }
 *               field: { type: string }
 *               extra: { type: string }
 */
router.post('/career', authenticateToken, asyncHandler(async (req, res) => {
    const { topic, field, extra } = req.body;
    if (!(await aiEnabledOrError(res))) return;
    try {
        const reply = await aiService.careerCoach({ topic, field, extra, userId: req.user.id, userName: req.user.name });
        return success(res, { reply });
    } catch (err) {
        return aiError(res, req, 'career', 'career', err);
    }
}));

// ==================== ADMIN: AI CONTROL & USAGE ====================

/**
 * @swagger
 * /ai/usage:
 *   get:
 *     summary: AI token usage summary (Admin)
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/usage', authenticateToken, authorizeAdmin, asyncHandler(async (req, res) => {
    const usage = await aiService.getUsageSummary();
    return success(res, { usage });
}));

/**
 * @swagger
 * /ai/settings:
 *   get:
 *     summary: Get AI settings (Admin)
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/settings', authenticateToken, authorizeAdmin, asyncHandler(async (req, res) => {
    const settings = await aiService.getSettings();
    return success(res, { settings });
}));

/**
 * @swagger
 * /ai/settings:
 *   put:
 *     summary: Update AI settings (Admin)
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ai_model: { type: string }
 *               ai_temperature: { type: string }
 *               ai_max_tokens: { type: string }
 *               ai_enabled: { type: string }
 *               ai_lecturer_style: { type: string }
 */
router.put('/settings', authenticateToken, authorizeAdmin, asyncHandler(async (req, res) => {
    const allowed = ['ai_model', 'ai_temperature', 'ai_max_tokens', 'ai_enabled', 'ai_lecturer_style'];
    const values = req.body || {};
    for (const key of allowed) {
        if (values[key] !== undefined && values[key] !== '') {
            const settingModel = require('../models/setting.model');
            await settingModel.set(key, String(values[key]));
        }
    }
    aiService.resetConfigCache();
    const settings = await aiService.getSettings();
    return success(res, { settings, message: 'AI settings updated' });
}));

module.exports = router;
