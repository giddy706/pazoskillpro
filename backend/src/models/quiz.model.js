const { getDB } = require('../config/database');

async function findById(id) {
    const db = await getDB();
    return db.get(`SELECT * FROM quizzes WHERE id = ?`, [id]);
}

async function findByCourse(courseId) {
    const db = await getDB();
    return db.all(`SELECT * FROM quizzes WHERE course_id = ? ORDER BY id ASC`, [courseId]);
}

async function listAll() {
    const db = await getDB();
    return db.all(
        `SELECT q.*, cr.title as courseTitle
         FROM quizzes q
         JOIN courses cr ON q.course_id = cr.id
         ORDER BY q.id DESC`
    );
}

async function create(data) {
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO quizzes (course_id, lesson_id, title, description, passing_score, max_attempts, time_limit_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.course_id, data.lesson_id || null, data.title, data.description || '',
         data.passing_score || 70, data.max_attempts || 3, data.time_limit_minutes || 0]
    );
    return findById(result.lastID);
}

async function update(id, data) {
    const db = await getDB();
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }
    values.push(id);
    await db.run(`UPDATE quizzes SET ${fields.join(', ')} WHERE id = ?`, values);
    return findById(id);
}

async function remove(id) {
    const db = await getDB();
    await db.run(`DELETE FROM quiz_answers WHERE question_id IN (SELECT id FROM quiz_questions WHERE quiz_id = ?)`, [id]);
    await db.run(`DELETE FROM quiz_questions WHERE quiz_id = ?`, [id]);
    await db.run(`DELETE FROM quiz_attempts WHERE quiz_id = ?`, [id]);
    await db.run(`DELETE FROM quizzes WHERE id = ?`, [id]);
}

// Questions
async function getQuestions(quizId) {
    const db = await getDB();
    const questions = await db.all(`SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC`, [quizId]);
    for (const q of questions) {
        q.answers = await db.all(`SELECT * FROM quiz_answers WHERE question_id = ? ORDER BY order_index ASC`, [q.id]);
    }
    return questions;
}

async function addQuestion(data) {
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO quiz_questions (quiz_id, question, question_type, order_index, points)
         VALUES (?, ?, ?, ?, ?)`,
        [data.quiz_id, data.question, data.question_type || 'multiple_choice', data.order_index || 0, data.points || 1]
    );
    return db.get(`SELECT * FROM quiz_questions WHERE id = ?`, [result.lastID]);
}

async function updateQuestion(id, data) {
    const db = await getDB();
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }
    values.push(id);
    await db.run(`UPDATE quiz_questions SET ${fields.join(', ')} WHERE id = ?`, values);
    return db.get(`SELECT * FROM quiz_questions WHERE id = ?`, [id]);
}

async function removeQuestion(id) {
    const db = await getDB();
    await db.run(`DELETE FROM quiz_answers WHERE question_id = ?`, [id]);
    await db.run(`DELETE FROM quiz_questions WHERE id = ?`, [id]);
}

// Answers
async function addAnswer(data) {
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO quiz_answers (question_id, answer, is_correct, order_index) VALUES (?, ?, ?, ?)`,
        [data.question_id, data.answer, data.is_correct ? 1 : 0, data.order_index || 0]
    );
    return db.get(`SELECT * FROM quiz_answers WHERE id = ?`, [result.lastID]);
}

async function updateAnswer(id, data) {
    const db = await getDB();
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }
    values.push(id);
    await db.run(`UPDATE quiz_answers SET ${fields.join(', ')} WHERE id = ?`, values);
    return db.get(`SELECT * FROM quiz_answers WHERE id = ?`, [id]);
}

async function removeAnswer(id) {
    const db = await getDB();
    await db.run(`DELETE FROM quiz_answers WHERE id = ?`, [id]);
}

module.exports = {
    findById,
    findByCourse,
    listAll,
    create,
    update,
    remove,
    getQuestions,
    addQuestion,
    updateQuestion,
    removeQuestion,
    addAnswer,
    updateAnswer,
    removeAnswer,
};
