const { getDB } = require('../config/database');

const listAll = async () => {
    const db = await getDB();
    const jobs = await db.all(`SELECT * FROM jobs ORDER BY created_at DESC`);
    return jobs.map(j => ({
        ...j,
        requirements: _parse(j.requirements),
        responsibilities: _parse(j.responsibilities),
        benefits: _parse(j.benefits),
    }));
};

const findById = async (id) => {
    const db = await getDB();
    const j = await db.get(`SELECT * FROM jobs WHERE id = ?`, [parseInt(id)]);
    if (!j) return null;
    return {
        ...j,
        requirements: _parse(j.requirements),
        responsibilities: _parse(j.responsibilities),
        benefits: _parse(j.benefits),
    };
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

module.exports = { listAll, findById, create, update, remove, countAll };
