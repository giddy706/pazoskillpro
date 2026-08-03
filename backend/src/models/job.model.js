const { getDB } = require('../config/database');

const _SELECT = `SELECT j.*, c.title as course_title, c.category as course_category
    FROM jobs j
    LEFT JOIN courses c ON j.required_course_id = c.id`;

const listAll = async () => {
    const db = await getDB();
    const jobs = await db.all(`${_SELECT} ORDER BY j.created_at DESC`);
    return jobs.map(j => ({
        ...j,
        requirements: _parse(j.requirements),
        responsibilities: _parse(j.responsibilities),
        benefits: _parse(j.benefits),
    }));
};

const findById = async (id) => {
    const db = await getDB();
    const j = await db.get(`${_SELECT} WHERE j.id = ?`, [parseInt(id)]);
    if (!j) return null;
    return {
        ...j,
        requirements: _parse(j.requirements),
        responsibilities: _parse(j.responsibilities),
        benefits: _parse(j.benefits),
    };
};

const findByRequiredCourse = async (courseId) => {
    const db = await getDB();
    return db.get(`SELECT id FROM jobs WHERE required_course_id = ?`, [parseInt(courseId)]);
};

const create = async (data) => {
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO jobs (title, company, location, type, salary, category, description, requirements, responsibilities, benefits, required_course_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.title, data.company, data.location, data.type, data.salary,
            data.category, data.description,
            JSON.stringify(data.requirements || []),
            JSON.stringify(data.responsibilities || []),
            JSON.stringify(data.benefits || []),
            data.requiredCourseId ? parseInt(data.requiredCourseId) : null,
        ]
    );
    return findById(result.lastID);
};

const update = async (id, updates) => {
    const db = await getDB();
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
        if (['requirements', 'responsibilities', 'benefits'].includes(key)) {
            fields.push(`${key} = ?`);
            values.push(JSON.stringify(value));
        } else {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }
    values.push(parseInt(id));
    await db.run(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`, values);
    return findById(id);
};

const remove = async (id) => {
    const db = await getDB();
    await db.run(`DELETE FROM jobs WHERE id = ?`, [parseInt(id)]);
};

const countAll = async () => {
    const db = await getDB();
    const row = await db.get(`SELECT COUNT(*) as count FROM jobs`);
    return row.count;
};

function _parse(val) {
    try { return JSON.parse(val || '[]'); } catch { return []; }
}

module.exports = { listAll, findById, findByRequiredCourse, create, update, remove, countAll };
