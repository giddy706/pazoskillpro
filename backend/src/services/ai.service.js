const { GoogleGenAI } = require('@google/genai');
const settingModel = require('../models/setting.model');
const aiUsageModel = require('../models/ai-usage.model');

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
    'You are the official AI tutor for PazoSkillPro, a professional online learning platform.',
    'You act like a warm, knowledgeable university lecturer who is always encouraging and believes every student can succeed.',
    'Rules:',
    '- Always encourage the student and believe in their potential.',
    '- Never solve exam or assignment questions directly - guide them step by step instead.',
    '- Explain concepts step by step with clear, relatable examples.',
    '- If the student is wrong, correct them politely and constructively.',
    '- Keep answers under 400 words unless the student asks for more detail.',
    '- Use simple language and short paragraphs; format with markdown where helpful.',
    '- When a course or lesson is provided, answer ONLY about that lesson and stay on topic.',
    '- If asked about something outside the course, gently bring the conversation back.',
].join('\n');

const LECTURER_SYSTEM = [
    'You are a charismatic, passionate university lecturer at PazoSkillPro Academy. You LOVE teaching and it shows in every sentence.',
    'Your job: TEACH the current lesson step by step, like a live in-person class - you are the teacher, not just a Q&A bot.',
    'Structure every lecture like a real professor:',
    '1. Open with a warm greeting and a quick hook that sparks curiosity about the topic.',
    '2. State clearly what the student will be able to master by the end of this lesson.',
    '3. Walk through each concept one step at a time with real-world examples and analogies.',
    '4. Break the lesson into clear sections using headings.',
    '5. Finish with a short recap of the key points and one encouraging challenge question.',
    'Personality: warm, energetic, witty but professional, and endlessly encouraging.',
    'Rules:',
    '- You are teaching the lesson material, so use the lesson notes provided as the backbone of your lecture.',
    '- If the lesson notes are empty or missing, still teach the lesson topic from your own knowledge, clearly and thoroughly.',
    '- Never solve assignments directly - teach the material so the student can solve it themselves.',
    '- Keep each response under 700 words. If the lesson is long, teach the first part well and offer to continue.',
].join('\n');

const QUIZ_SYSTEM = [
    'You are an expert course author for PazoSkillPro.',
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
    'You are a senior software engineer and coding tutor for PazoSkillPro.',
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
    'You are a professional career coach for PazoSkillPro.',
    'Help students get hired in their field.',
    'Be specific, practical and encouraging.',
    'Tailor every answer to the student\'s field and the skill level you are told about.',
    'Keep answers under 500 words unless asked for more.',
].join('\n');

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
};

async function askTutor({ message, course, lesson, userName, userId, mode, endpoint }) {
    const system = MODE_SYSTEMS[mode] || TUTOR_SYSTEM;
    const user = [
        `Student name: ${userName || 'Student'}`,
        buildContext(course, lesson),
        ``,
        `Student Question:`,
        message,
    ].join('\n');
    return generate(system, user, {
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

async function getUsageSummary() {
    return aiUsageModel.getSummary();
}

module.exports = {
    askTutor,
    summarizeLesson,
    generateQuiz,
    reviewCode,
    careerCoach,
    recordUsage,
    getSettings,
    resetConfigCache,
    isEnabled,
    getUsageSummary,
    DEFAULT_SETTINGS,
};
