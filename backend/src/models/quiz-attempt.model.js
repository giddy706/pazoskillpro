const { getDB } = require('../config/database');

async function listAll() {
    const db = await getDB();
    return db.all(
        `SELECT a.*, u.name as user_name, u.email as user_email,
                q.title as quiz_title, q.course_id, q.lesson_id,
                l.title as lesson_title, cr.title as course_title
         FROM quiz_attempts a
         JOIN users u ON a.user_id = u.id
         JOIN quizzes q ON a.quiz_id = q.id
         LEFT JOIN lessons l ON q.lesson_id = l.id
         LEFT JOIN courses cr ON q.course_id = cr.id
         ORDER BY a.completed_at DESC, a.started_at DESC`
    );
}

async function countAll() {
    const db = await getDB();
    const row = await db.get(`SELECT COUNT(*) as count FROM quiz_attempts`);
    return row.count;
}

module.exports = { listAll, countAll };
