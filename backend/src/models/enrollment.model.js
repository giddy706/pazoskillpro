const { getDB } = require('../config/database');

const create = async (userId, courseId) => {
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)`,
        [parseInt(userId), parseInt(courseId)]
    );
    return findById(result.lastID);
};

const findById = async (id) => {
    const db = await getDB();
    const e = await db.get(`SELECT e.*, c.title as courseTitle, c.image as courseImage, c.price as coursePrice FROM enrollments e LEFT JOIN courses c ON e.course_id = c.id WHERE e.id = ?`, [parseInt(id)]);
    return e;
};

const findByUserAndCourse = async (userId, courseId) => {
    const db = await getDB();
    return db.get(
        `SELECT e.*, c.title as courseTitle, c.image as courseImage, c.price as coursePrice FROM enrollments e LEFT JOIN courses c ON e.course_id = c.id WHERE e.user_id = ? AND e.course_id = ?`,
        [parseInt(userId), parseInt(courseId)]
    );
};

const findAllByUser = async (userId) => {
    const db = await getDB();
    const rows = await db.all(
        `SELECT e.*, c.title as courseTitle, c.image as courseImage, c.price as coursePrice, c.category as courseCategory FROM enrollments e LEFT JOIN courses c ON e.course_id = c.id WHERE e.user_id = ? ORDER BY e.enrolled_at DESC`,
        [parseInt(userId)]
    );
    return rows;
};

const updateProgress = async (id, { progress, completed, completedAt }) => {
    const db = await getDB();
    if (completed && completedAt) {
        await db.run(`UPDATE enrollments SET progress = ?, completed = 1, completed_at = ? WHERE id = ?`, [progress, completedAt, parseInt(id)]);
    } else {
        await db.run(`UPDATE enrollments SET progress = ? WHERE id = ?`, [progress, parseInt(id)]);
    }
    return findById(id);
};

const countAll = async () => {
    const db = await getDB();
    const row = await db.get(`SELECT COUNT(*) as count FROM enrollments`);
    return row.count;
};

const getRevenue = async () => {
    const db = await getDB();
    const row = await db.get(
        `SELECT COALESCE(SUM(c.price), 0) as total FROM enrollments e LEFT JOIN courses c ON e.course_id = c.id`
    );
    return row.total || 0;
};

const getEnrollmentLessons = async (enrollmentId, courseId) => {
    const db = await getDB();
    const lessons = await db.all(
        `SELECT l.id, l.title, l.order_index, l.video_url, l.content,
                CASE WHEN lp.id IS NOT NULL THEN 1 ELSE 0 END as completed
         FROM lessons l
         LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.enrollment_id = ?
         WHERE l.course_id = ?
         ORDER BY l.order_index ASC`,
        [parseInt(enrollmentId), parseInt(courseId)]
    );
    return lessons;
};

module.exports = {
    create,
    findById,
    findByUserAndCourse,
    findAllByUser,
    updateProgress,
    countAll,
    getRevenue,
    getEnrollmentLessons,
};
