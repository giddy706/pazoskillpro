const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const aiService = require('../services/ai.service');
const courseService = require('../services/course.service');
const lessonService = require('../services/lesson.service');
const quizModel = require('../models/quiz.model');
const quizResultModel = require('../models/quiz-result.model');
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
    const { message, course_id, lesson_id, mode, tone, history, last_lesson } = req.body;
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
            tone,
            lastLesson: last_lesson,
            history: Array.isArray(history)
                ? history.map((h) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: String(h.content || '') }))
                : undefined,
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
        questions[i].question_id = questionRow.id;
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
 * /ai/quiz/{id}/submit:
 *   post:
 *     summary: Submit answers to an AI practice quiz and get an instant grade (also tracks weak areas)
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answers:
 *                 type: object
 *                 description: Map of question_id -> chosen answer index
 */
router.post('/quiz/:id/submit', authenticateToken, asyncHandler(async (req, res) => {
    const quiz = await quizModel.findById(req.params.id);
    if (!quiz) return error(res, 'Quiz not found', 404);

    const answers = (req.body && req.body.answers) || {};
    const questions = await quizModel.getQuestions(quiz.id);
    const total = questions.length;
    if (!total) return error(res, 'This quiz has no questions', 400);

    let correctCount = 0;
    let lessonTitle = null;
    if (quiz.lesson_id) {
        try {
            const lesson = await lessonService.findById(quiz.lesson_id);
            lessonTitle = lesson ? lesson.title : null;
        } catch (e) {
            lessonTitle = null;
        }
    }
    const topic = lessonTitle || quiz.title;

    const details = [];
    for (const q of questions) {
        const chosen = parseInt(answers[q.id], 10);
        const correctIdx = q.answers.findIndex((a) => a.is_correct === 1);
        const isCorrect = chosen === correctIdx;
        if (isCorrect) correctCount++;
        try {
            await quizResultModel.record({
                user_id: req.user.id,
                quiz_id: quiz.id,
                course_id: quiz.course_id,
                lesson_id: quiz.lesson_id,
                question: q.question,
                topic,
                correct: isCorrect ? 1 : 0,
            });
        } catch (e) {
            // Tracking must never break grading
        }
        details.push({ question_id: q.id, correct: isCorrect, correct_answer: correctIdx });
    }

    const score = Math.round((correctCount / total) * 100);
    const passing = quiz.passing_score || 70;
    const passed = score >= passing;

    await quizModel.saveAttempt({
        quiz_id: quiz.id,
        user_id: req.user.id,
        score,
        total_questions: total,
        passed,
    });

    return success(res, {
        quiz_id: quiz.id,
        score,
        passed,
        correct: correctCount,
        total,
        passing_score: passing,
        details,
        message: passed ? 'Passed' : 'Keep practicing',
    });
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
    const { code, language, question, tutor } = req.body;
    if (!code || !String(code).trim()) return error(res, 'Code is required', 400);
    if (!(await aiEnabledOrError(res))) return;
    try {
        const reply = await aiService.reviewCode({
            code: String(code), language, question, tutor,
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
    const { topic, field, extra, tutor } = req.body;
    if (!(await aiEnabledOrError(res))) return;
    try {
        const reply = await aiService.careerCoach({ topic, field, extra, tutor, userId: req.user.id, userName: req.user.name });
        return success(res, { reply });
    } catch (err) {
        return aiError(res, req, 'career', 'career', err);
    }
}));

/**
 * @swagger
 * /ai/weak-areas:
 *   get:
 *     summary: Lessons the current student scored below 70% on (weak areas)
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: course_id
 *         schema: { type: integer }
 */
router.get('/weak-areas', authenticateToken, asyncHandler(async (req, res) => {
    const courseId = req.query.course_id ? parseInt(req.query.course_id) : null;
    const weak_areas = await aiService.getWeakAreas(req.user.id, courseId);
    return success(res, { weak_areas });
}));

/**
 * @swagger
 * /ai/assignment:
 *   post:
 *     summary: Generate a practical assignment for a lesson
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
router.post('/assignment', authenticateToken, asyncHandler(async (req, res) => {
    const { course_id, lesson_id } = req.body;
    if (!(await aiEnabledOrError(res))) return;
    const { course, lesson } = await loadCourseLesson(course_id, lesson_id);
    if (!lesson) return error(res, 'A valid lesson_id is required', 400);
    try {
        const assignment = await aiService.generateAssignment({ course, lesson, userId: req.user.id, userName: req.user.name });
        return success(res, { assignment });
    } catch (err) {
        return aiError(res, req, 'assignment', 'assignment', err);
    }
}));

/**
 * @swagger
 * /ai/assignment/review:
 *   post:
 *     summary: AI feedback on a student's assignment (optional image upload)
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
 *               submission: { type: string }
 *               image_base64: { type: string }
 *               image_mime: { type: string }
 */
router.post('/assignment/review', authenticateToken, asyncHandler(async (req, res) => {
    const { course_id, lesson_id, submission, image_base64, image_mime } = req.body;
    if (!submission && !image_base64) return error(res, 'Please write an answer or attach an image of your work.', 400);
    if (!(await aiEnabledOrError(res))) return;
    if (image_base64 && image_base64.length > 4600000) {
        return error(res, 'The attached image is too large. Please use a photo under about 3.5MB.', 400);
    }
    const { course, lesson } = await loadCourseLesson(course_id, lesson_id);
    try {
        const reply = await aiService.reviewAssignment({
            course,
            lesson,
            submission: submission || '',
            imageData: image_base64,
            imageMime: image_mime,
            userId: req.user.id,
            userName: req.user.name,
        });
        return success(res, { reply });
    } catch (err) {
        return aiError(res, req, 'assignment-review', 'assignment-review', err);
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
