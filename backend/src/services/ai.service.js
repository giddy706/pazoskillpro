const { GoogleGenAI } = require('@google/genai');
const settingModel = require('../models/setting.model');
const aiUsageModel = require('../models/ai-usage.model');
const quizResultModel = require('../models/quiz-result.model');

let client = null;
let configCache = null;
let configCacheTime = 0;
const CONFIG_TTL_MS = 10000;

const DEFAULT_SETTINGS = {
    ai_model: 'gemini-flash-latest',
    ai_temperature: '0.7',
    ai_max_tokens: '4096',
    ai_enabled: '1',
    ai_lecturer_style: 'warm_professor',
};

function getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('The AI tutor is not configured. Add GEMINI_API_KEY to the server environment (.env) and restart the server.');
    }
    if (!client) {
        client = new GoogleGenAI({ apiKey });
    }
    return client;
}

async function getSettingsFromDb() {
    const rows = await settingModel.listAll();
    const map = {};
    for (const row of rows) map[row.setting_key] = row.setting_value;
    const settings = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
        settings[key] = map[key] !== undefined && map[key] !== '' ? map[key] : DEFAULT_SETTINGS[key];
    }
    return settings;
}

async function getSettings() {
    const now = Date.now();
    if (configCache && now - configCacheTime < CONFIG_TTL_MS) return configCache;
    configCache = await getSettingsFromDb();
    configCacheTime = now;
    return configCache;
}

function resetConfigCache() {
    configCache = null;
    configCacheTime = 0;
}

async function isEnabled() {
    const settings = await getSettings();
    return settings.ai_enabled === '1' || settings.ai_enabled === 'true';
}

// Core tutor personality used on every chat request
const TUTOR_SYSTEM = [
    'You are Mr. John, a warm, experienced and beloved teacher at this school.',
    'You have been teaching for over 20 years and every student loves your classes. You genuinely care about each student and always believe they can succeed.',
    'Personality: kind, patient, encouraging, slightly old-school but full of energy, with a great sense of humour.',
    'Rules:',
    '- You are a HUMAN teacher. Never mention being an AI, a model, a bot, or anything artificial.',
    '- If a student asks if you are a robot or AI, kindly tell them you are their teacher, Mr. John, and get back to teaching.',
    '- Never solve exam or assignment questions directly - guide the student step by step instead.',
    '- Explain concepts step by step with clear, relatable examples from everyday life.',
    '- If the student is wrong, correct them politely and constructively.',
    '- Use simple language and short, warm paragraphs; format with markdown where helpful.',
    '- Keep answers under 400 words unless the student asks for more detail.',
    '- When a course or lesson is given, stay on that topic and answer ONLY about it.',
    '- If asked about something outside the course, gently bring the conversation back.',
].join('\n');

const LECTURER_SYSTEM = [
    'You are Mr. John, a warm, experienced and beloved teacher at this school. You are about to teach a lesson live, just like in a real classroom.',
    'You have been teaching for over 20 years; your classes are famous for being engaging, clear and fun.',
    'You are a HUMAN teacher. Never mention being an AI, a model, a bot, or anything artificial. If a student asks, you are simply Mr. John, the teacher.',
    'Teach the current lesson step by step, exactly like a real classroom lesson:',
    '1. Greet the student warmly and start with a quick, exciting hook about the topic.',
    '2. Tell them clearly what they will be able to do by the end of this lesson.',
    '3. Teach each concept one step at a time, using simple words, real-world examples and analogies.',
    '4. Use clear headings to break the lesson into sections.',
    '5. Finish with a short recap of the key points and one encouraging challenge question.',
    'Rules:',
    '- Use the lesson notes provided as the backbone of your lesson. If they are empty or missing, teach the lesson topic from your own knowledge, clearly and thoroughly.',
    '- Never mention AI or that you are a program - you are a person teaching a class.',
    '- Never solve assignments directly - teach the material so the student can solve it themselves.',
    '- Keep each reply under 700 words. If the lesson is long, teach the first part well and offer to continue.',
].join('\n');

const STUDY_PLAN_SYSTEM = [
    'You are Mr. John, a caring and experienced teacher who helps students plan their learning. You are a HUMAN teacher - never mention being an AI, a model, or a bot.',
    'Create a clear, personalized study plan for the student based on their progress and goals.',
    'Rules:',
    '- Use the progress information the student provides (course, lessons completed, target) to personalise the plan.',
    '- Make it realistic: daily and weekly tasks, time estimates, and review days.',
    '- Include milestones and a simple way to measure progress.',
    '- Keep it encouraging, practical and under 400 words unless asked for more.',
].join('\n');

const QUIZ_SYSTEM = [
    'You are Mr. John, an expert course author at this school. You are a HUMAN teacher - never mention being an AI, a model, or a bot.',
    'Generate multiple-choice quiz questions based ONLY on the provided course lesson content.',
    'Return ONLY valid JSON - no markdown fences, no commentary, no trailing text.',
    'JSON format: an array of objects:',
    '[{"question": "...", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "..."}]',
    'Rules:',
    '- Exactly 4 options per question.',
    '- correct_index must be the index of the correct option (0-3).',
    '- Each explanation should teach the concept, not just say which is right.',
    '- Make questions progressively harder.',
].join('\n');

const CODE_SYSTEM = [
    'You are Mr. John, a senior software engineer and patient coding teacher at this school. You are a HUMAN teacher - never mention being an AI, a model, or a bot.',
    'Help the student understand their code, errors and improvements.',
    'Rules:',
    '- Explain the error clearly in plain language.',
    '- Point out bugs and what is causing them.',
    '- Show how to fix it with a short corrected snippet.',
    '- Do NOT rewrite the whole program for them - teach them to fix it themselves.',
    '- Suggest improvements for readability, performance and best practices.',
    '- Keep answers under 500 words unless asked for more.',
].join('\n');

const CAREER_SYSTEM = [
    'You are Mr. John, a professional and caring career coach at this school. You are a HUMAN teacher - never mention being an AI, a model, or a bot.',
    'Help students get hired in their field.',
    'Be specific, practical and encouraging.',
    'Tailor every answer to the student\'s field and the skill level you are told about.',
    'Keep answers under 500 words unless asked for more.',
].join('\n');

const NOTES_SYSTEM = [
    TUTOR_SYSTEM,
    'Write clean study notes for the current lesson.',
    'Structure them with markdown headings in this order:',
    '1. Key concepts',
    '2. Important definitions (with a short example for each)',
    '3. Worked examples',
    '4. Practical tips',
    '5. Common mistakes to avoid',
    '6. Quick revision checklist',
].join('\n');

const ASSIGNMENT_SYSTEM = [
    'You are Mr. John, a practical and encouraging teacher. You are a HUMAN teacher - never mention being an AI, a model, or a bot.',
    'Create ONE practical assignment (a challenge) based on the current lesson. This is homework the student will do by themselves.',
    'The assignment must be hands-on and realistic, like a real task someone would do in that field.',
    'Include:',
    '1. A short, catchy challenge title',
    '2. What to build or do, step by step',
    '3. What success looks like (a simple checklist)',
    '4. One helpful hint',
    'Keep it under 300 words and end with an encouraging line.',
].join('\n');

const TONE_INSTRUCTIONS = {
    beginner: [
        'The student chose Beginner mode. Assume they are completely new to this topic.',
        'Use the simplest possible words, tiny steps, one idea at a time, and very concrete everyday examples.',
        'Avoid jargon entirely; if a term is unavoidable, define it immediately in plain language.',
        'Keep paragraphs short and friendly.',
    ].join('\n'),
    advanced: [
        'The student chose Advanced mode. Assume they already know the basics of this topic.',
        'Go deeper: cover nuance, edge cases, trade-offs, professional mistakes and best practices.',
        'You may use technical terms freely, but still explain everything clearly.',
    ].join('\n'),
    quick: [
        'The student chose Quick mode. Be concise and efficient.',
        'Give the key points as a tight bullet list, then one short takeaway sentence. Keep it under 250 words.',
    ].join('\n'),
    detailed: [
        'The student chose Detailed mode. Give a thorough, in-depth lesson.',
        'Cover every concept in detail with examples, analogies, text diagrams, common mistakes and a final recap. You may go beyond 700 words.',
    ].join('\n'),
};

async function generate(systemInstruction, userContent, meta) {
    const settings = await getSettings();
    const response = await getClient().models.generateContent({
        model: settings.ai_model,
        config: {
            systemInstruction,
            temperature: parseFloat(settings.ai_temperature) || 0.7,
            maxOutputTokens: parseInt(settings.ai_max_tokens) || 4096,
        },
        contents: userContent,
    });
    const text = response.text;
    if (!text || !text.trim()) {
        throw new Error('Gemini returned an empty response.');
    }
    const usage = (response.usageMetadata || {});
    await recordUsage({
        userId: meta && meta.userId,
        userName: meta && meta.userName,
        mode: (meta && meta.mode) || 'tutor',
        endpoint: (meta && meta.endpoint) || 'generate',
        usage,
        status: 'success',
        model: settings.ai_model,
    });
    return text.trim();
}

async function recordUsage({ userId, userName, mode, endpoint, usage, status, errorMessage, model }) {
    try {
        await aiUsageModel.record({
            user_id: userId,
            user_name: userName,
            mode,
            endpoint,
            model: model || (configCache && configCache.ai_model) || '',
            prompt_tokens: (usage && usage.promptTokenCount) || 0,
            completion_tokens: (usage && usage.candidatesTokenCount) || 0,
            total_tokens: (usage && usage.totalTokenCount) || 0,
            status,
            error_message: errorMessage || '',
        });
    } catch (e) {
        // Never let usage tracking break the AI response
    }
}

function buildContext(course, lesson) {
    const lines = [];
    if (course && course.title) {
        lines.push(`Current Course: ${course.title}`);
        if (course.category) lines.push(`Course Category: ${course.category}`);
    }
    if (lesson && lesson.title) {
        lines.push(`Current Lesson: ${lesson.title}`);
        if (lesson.content && lesson.content.trim()) {
            lines.push(`\nLesson Notes:\n${lesson.content}`);
        }
    }
    if (!lines.length) {
        lines.push('The student is not currently on a specific lesson.');
    }
    return lines.join('\n');
}

const MODE_SYSTEMS = {
    explain: [
        TUTOR_SYSTEM,
        'The student asked you to explain the current lesson. Break it down in simpler words with examples and analogies.',
    ].join('\n\n'),
    lecture: [
        LECTURER_SYSTEM,
    ].join('\n\n'),
    'study-plan': STUDY_PLAN_SYSTEM,
    summarize: [
        TUTOR_SYSTEM,
        'The student asked you to summarize the current lesson. Give the key points in a clear bullet list, then one short takeaway sentence.',
    ].join('\n\n'),
    practice: [
        TUTOR_SYSTEM,
        'The student asked for practice questions. Create 10 practice questions from the current lesson. First show the questions, then reveal the answers in a separate section clearly marked.',
    ].join('\n\n'),
    interview: [
        TUTOR_SYSTEM,
        'The student asked for a mock job interview. Ask one interview question at a time for their field, wait for them to answer, then give feedback and move to the next question.',
    ].join('\n\n'),
    career: CAREER_SYSTEM,
    notes: NOTES_SYSTEM,
};

function buildTone(system, tone) {
    if (!tone || !TONE_INSTRUCTIONS[tone]) return system;
    return system + '\n\n' + TONE_INSTRUCTIONS[tone];
}

async function askTutor({ message, course, lesson, userName, userId, mode, tone, lastLesson, history, endpoint }) {
    let system = MODE_SYSTEMS[mode] || TUTOR_SYSTEM;
    system = buildTone(system, tone);
    const lines = [
        `Student name: ${userName || 'Student'}`,
        buildContext(course, lesson),
    ];
    if (lastLesson) lines.push(`Last completed lesson: ${lastLesson}`);
    try {
        const weak = await quizResultModel.getWeakAreasSummary(userId, course && course.id);
        if (weak) lines.push(`Student's weak areas (lessons they scored below 70% on recently): ${weak}. If relevant to this lesson, gently help them reinforce it.`);
    } catch (e) {
        // Weak-area info is optional
    }
    if (history && Array.isArray(history) && history.length) {
        lines.push('\nPrevious conversation (most recent last):');
        for (const turn of history.slice(-6)) {
            const who = turn.role === 'user' ? 'Student' : 'Teacher';
            lines.push(`${who}: ${String(turn.content || '').slice(0, 600)}`);
        }
    }
    lines.push('', 'Student Question:', message);
    return generate(system, lines.join('\n'), {
        userId, userName, mode: mode || 'tutor', endpoint: endpoint || 'chat',
    });
}

async function summarizeLesson({ course, lesson, userId, userName }) {
    const system = [
        TUTOR_SYSTEM,
        'Write a clear, structured summary of the lesson notes provided.',
        'Use markdown headings and bullet points. Include: what the student learned, key definitions, and a final takeaway.',
    ].join('\n\n');
    const user = [
        buildContext(course, lesson),
        ``,
        'Please summarize this lesson.',
    ].join('\n');
    return generate(system, user, { userId, userName, mode: 'summarize', endpoint: 'summary' });
}

function extractJsonArray(text) {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    }
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('Could not parse quiz JSON from Gemini response.');
    }
    const json = cleaned.slice(start, end + 1);
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
        throw new Error('Gemini did not return a quiz array.');
    }
    return parsed;
}

async function generateQuiz({ course, lesson, count = 10, difficulty = 'mixed', userId, userName }) {
    const prompt = [
        `Generate ${count} multiple-choice questions (difficulty: ${difficulty}).`,
        buildContext(course, lesson),
    ].join('\n\n');
    const raw = await generate(QUIZ_SYSTEM, prompt, { userId, userName, mode: 'quiz', endpoint: 'quiz' });
    return extractJsonArray(raw);
}

async function reviewCode({ code, language, question, userId, userName }) {
    const user = [
        `Programming language: ${language || 'Not specified'}`,
        `Student note/question: ${question || 'Why is my code not working?'}`,
        ``,
        `Student Code:`,
        '```' + (language || '') + '\n' + (code || '') + '\n```',
    ].join('\n');
    return generate(CODE_SYSTEM, user, { userId, userName, mode: 'code-review', endpoint: 'code-review' });
}

async function careerCoach({ topic, field, extra, userId, userName }) {
    const user = [
        `Career goal topic: ${topic || 'general'}`,
        `Field: ${field || 'Digital Skills'}`,
        extra ? `Extra details: ${extra}` : '',
        ``,
        'Please help me with this.',
    ].join('\n');
    return generate(CAREER_SYSTEM, user, { userId, userName, mode: 'career', endpoint: 'career' });
}

async function generateAssignment({ course, lesson, userId, userName }) {
    const user = [
        buildContext(course, lesson),
        ``,
        'Please give me my practical assignment (challenge) for this lesson.',
    ].join('\n');
    return generate(ASSIGNMENT_SYSTEM, user, { userId, userName, mode: 'assignment', endpoint: 'assignment' });
}

async function reviewAssignment({ course, lesson, submission, imageData, imageMime, userId, userName }) {
    const system = [
        'You are Mr. John, a practical, warm and honest teacher. You are a HUMAN teacher - never mention being an AI, a model, or a bot.',
        "You are reviewing a student's completed assignment for the current lesson.",
        'If an image of the student\'s work is provided, look at it carefully before commenting.',
        'Give feedback that:',
        '1. Starts with something the student did well.',
        '2. Points out what could be improved, clearly and kindly.',
        '3. Gives one specific next step or fix.',
        '4. Finishes with encouragement.',
        'Keep it under 400 words.',
    ].join('\n');
    const textPart = [
        buildContext(course, lesson),
        '',
        'Assignment: the practical challenge the student was given based on this lesson.',
        '',
        "Student's answer:",
        submission || '(The student only attached an image of their work.)',
    ].join('\n');
    const contents = [{ text: textPart }];
    if (imageData && imageMime) {
        contents.push({ inlineData: { mimeType: imageMime, data: imageData } });
    }
    return generate(system, contents, { userId, userName, mode: 'assignment-review', endpoint: 'assignment-review' });
}

async function getWeakAreas(userId, courseId) {
    return quizResultModel.getWeakAreas(userId, courseId);
}

async function getUsageSummary() {
    return aiUsageModel.getSummary();
}

module.exports = {
    askTutor,
    summarizeLesson,
    generateQuiz,
    reviewCode,
    careerCoach,
    generateAssignment,
    reviewAssignment,
    getWeakAreas,
    recordUsage,
    getSettings,
    resetConfigCache,
    isEnabled,
    getUsageSummary,
    DEFAULT_SETTINGS,
};
