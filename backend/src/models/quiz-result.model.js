const { getDB } = require('../config/database');

async function record({ user_id, quiz_id, course_id, lesson_id, question, topic, correct }) {
    const db = await getDB();
    await db.run(
        `INSERT INTO student_quiz_results (user_id, quiz_id, course_id, lesson_id, question, topic, correct)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user_id, quiz_id, course_id, lesson_id, question, topic || '', correct ? 1 : 0]
    );
}

async function getWeakAreas(userId, courseId) {
    const db = await getDB();
    return db.all(
        `SELECT topic, lesson_id,
                SUM(correct) AS correct_count,
                COUNT(*) AS total
         FROM student_quiz_results
         WHERE user_id = ? AND (? IS NULL OR course_id = ?)
         GROUP BY topic, lesson_id
         ORDER BY (COUNT(*) - SUM(correct)) DESC, COUNT(*) DESC
         LIMIT 8`,
        [parseInt(userId), courseId || null, courseId || null]
    );
}

async function getWeakAreasSummary(userId, courseId) {
    const rows = await getWeakAreas(userId, courseId);
    const weak = rows.filter((r) => r.total > 0 && (r.correct_count / r.total) < 0.7);
    if (!weak.length) return null;
    return weak.map((r) => `${r.topic} (${r.correct_count}/${r.total} correct)`).join(', ');
}

module.exports = { record, getWeakAreas, getWeakAreasSummary };
