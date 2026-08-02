const { getDB } = require('../config/database');

const findById = async (id) => {
    const db = await getDB();
    return db.get(`SELECT * FROM lessons WHERE id = ?`, [parseInt(id)]);
};

const listByCourse = async (courseId) => {
    const db = await getDB();
    return db.all(`SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index ASC`, [parseInt(courseId)]);
};

const listAll = async () => {
    const db = await getDB();
    return db.all(
        `SELECT l.*, c.title as courseTitle
         FROM lessons l
         LEFT JOIN courses c ON l.course_id = c.id
         ORDER BY l.course_id ASC, l.order_index ASC`
    );
};

const countAll = async () => {
    const db = await getDB();
    const row = await db.get(`SELECT COUNT(*) as count FROM lessons`);
    return row.count;
};

// alias used by some services
const findByCourseId = listByCourse;

const create = async (courseId, title, orderIndex, videoUrl = '', content = '') => {
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO lessons (course_id, title, order_index, video_url, content) VALUES (?, ?, ?, ?, ?)`,
        [parseInt(courseId), title, parseInt(orderIndex), videoUrl, content]
    );
    return findById(result.lastID);
};

const update = async (id, updates) => {
    const db = await getDB();
    const allowed = ['course_id', 'title', 'order_index', 'video_url', 'content'];
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
        if (!allowed.includes(key)) continue;
        fields.push(`${key} = ?`);
        values.push(value);
    }
    values.push(parseInt(id));
    if (fields.length > 0) {
        await db.run(`UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    return findById(id);
};

const remove = async (id) => {
    const db = await getDB();
    await db.run(`DELETE FROM lessons WHERE id = ?`, [parseInt(id)]);
};

const getNextOrderIndex = async (courseId) => {
    const db = await getDB();
    const row = await db.get(
        `SELECT MAX(order_index) as maxIdx FROM lessons WHERE course_id = ?`,
        [parseInt(courseId)]
    );
    return row && row.maxIdx !== null ? row.maxIdx + 1 : 1;
};

const count = async (courseId) => {
    const db = await getDB();
    const row = await db.get(`SELECT COUNT(*) as count FROM lessons WHERE course_id = ?`, [parseInt(courseId)]);
    return row.count;
};

module.exports = { findById, findByCourseId, listByCourse, listAll, countAll, create, update, remove, getNextOrderIndex, count };
