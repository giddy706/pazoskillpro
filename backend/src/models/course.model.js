const { getDB } = require('../config/database');

const UPDATABLE_COLUMNS = new Set([
    'title', 'category', 'description', 'duration', 'price', 'image',
    'instructor', 'level', 'rating', 'requirements', 'outcomes', 'published',
]);

const listAll = async () => {
    const db = await getDB();
    return db.all(`SELECT c.*, (SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id = c.id) AS students
                   FROM courses c ORDER BY c.id DESC`);
};

const listPublished = async () => {
    const db = await getDB();
    return db.all(`SELECT c.*, (SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id = c.id) AS students
                   FROM courses c WHERE c.published = 1 ORDER BY c.id DESC`);
};

const findById = async (id) => {
    const db = await getDB();
    return db.get(`SELECT c.*, (SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id = c.id) AS students
                   FROM courses c WHERE c.id = ?`, [parseInt(id)]);
};

const create = async (data) => {
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO courses (title, category, description, duration, price, image, instructor, level, rating, requirements, outcomes, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.title, data.category, data.description, data.duration, data.price,
         data.image, data.instructor, data.level,
         data.rating || 0,
         JSON.stringify(data.requirements || []),
         JSON.stringify(data.outcomes || []),
         data.published === undefined ? 1 : (data.published ? 1 : 0)]
    );
    return findById(result.lastID);
};

const update = async (id, updates) => {
    const db = await getDB();
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
        if (!UPDATABLE_COLUMNS.has(key)) continue;
        if (key === 'requirements' || key === 'outcomes') {
            fields.push(`${key} = ?`);
            values.push(JSON.stringify(value));
        } else if (key === 'published') {
            fields.push(`${key} = ?`);
            values.push(value ? 1 : 0);
        } else {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }
    if (fields.length === 0) return findById(id);
    values.push(parseInt(id));
    await db.run(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`, values);
    return findById(id);
};

const remove = async (id) => {
    const db = await getDB();
    await db.run(`DELETE FROM courses WHERE id = ?`, [parseInt(id)]);
};

const incrementStudents = async (id) => {
    const db = await getDB();
    await db.run(`UPDATE courses SET students_count = COALESCE(students_count, 0) + 1 WHERE id = ?`, [parseInt(id)]);
    return findById(id);
};

const countAll = async () => {
    const db = await getDB();
    const row = await db.get(`SELECT COUNT(*) as count FROM courses`);
    return row.count;
};

const setPublished = async (id, published) => {
    const db = await getDB();
    await db.run(`UPDATE courses SET published = ? WHERE id = ?`, [published ? 1 : 0, parseInt(id)]);
    return findById(id);
};

module.exports = {
    listAll,
    listPublished,
    findById,
    create,
    update,
    remove,
    incrementStudents,
    countAll,
    setPublished,
};
