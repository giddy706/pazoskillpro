const { GoogleGenAI } = require('@google/genai');

const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

let client = null;

function getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured. Add it to your .env file.');
    }
    if (!client) {
        client = new GoogleGenAI({ apiKey });
    }
    return client;
}

// Core tutor personality used on every chat request
const TUTOR_SYSTEM = [
    'You are the official AI tutor for PazoSkillPro, a professional online learning platform.',
    'You act like a warm, knowledgeable university lecturer who is always encouraging.',
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

async function generate(systemInstruction, userContent) {
    const response = await getClient().models.generateContent({
        model: MODEL,
        config: { systemInstruction, temperature: 0.7, maxOutputTokens: 4096 },
        contents: userContent,
    });
    const text = response.text;
    if (!text || !text.trim()) {
        throw new Error('Gemini returned an empty response.');
    }
    return text.trim();
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

async function askTutor({ message, course, lesson, userName, mode }) {
    const system = MODE_SYSTEMS[mode] || TUTOR_SYSTEM;
    const user = [
        `Student name: ${userName || 'Student'}`,
        buildContext(course, lesson),
        ``,
        `Student Question:`,
        message,
    ].join('\n');
    return generate(system, user);
}

async function summarizeLesson({ course, lesson }) {
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
    return generate(system, user);
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

async function generateQuiz({ course, lesson, count = 10, difficulty = 'mixed' }) {
    const prompt = [
        `Generate ${count} multiple-choice questions (difficulty: ${difficulty}).`,
        buildContext(course, lesson),
    ].join('\n\n');
    const raw = await generate(QUIZ_SYSTEM, prompt);
    return extractJsonArray(raw);
}

async function reviewCode({ code, language, question }) {
    const user = [
        `Programming language: ${language || 'Not specified'}`,
        `Student note/question: ${question || 'Why is my code not working?'}`,
        ``,
        `Student Code:`,
        '```' + (language || '') + '\n' + (code || '') + '\n```',
    ].join('\n');
    return generate(CODE_SYSTEM, user);
}

async function careerCoach({ topic, field, extra }) {
    const user = [
        `Career goal topic: ${topic || 'general'}`,
        `Field: ${field || 'Digital Skills'}`,
        extra ? `Extra details: ${extra}` : '',
        ``,
        'Please help me with this.',
    ].join('\n');
    return generate(CAREER_SYSTEM, user);
}

module.exports = {
    askTutor,
    summarizeLesson,
    generateQuiz,
    reviewCode,
    careerCoach,
};
