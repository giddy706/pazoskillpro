const { getDB } = require('../config/database');

const listAll = async () => {
    const db = await getDB();
    return db.all(
        `SELECT ja.*, j.title as "jobTitle", j.company as "jobCompany", u.name as "userName", u.email as "userEmail"
         FROM job_applications ja
         LEFT JOIN jobs j ON ja.job_id = j.id
         LEFT JOIN users u ON ja.user_id = u.id
         ORDER BY ja.applied_at DESC`
    );
};

const findById = async (id) => {
    const db = await getDB();
    return db.get(`SELECT * FROM job_applications WHERE id = ?`, [parseInt(id)]);
};

const findByUser = async (userId) => {
    const db = await getDB();
    return db.all(
        `SELECT ja.*, j.title as "jobTitle", j.company as "jobCompany", j.location as "jobLocation"
         FROM job_applications ja
         LEFT JOIN jobs j ON ja.job_id = j.id
         WHERE ja.user_id = ?
         ORDER BY ja.applied_at DESC`,
        [parseInt(userId)]
    );
};

const create = async (data) => {
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO job_applications (job_id, user_id, full_name, email, phone, cover_letter) VALUES (?, ?, ?, ?, ?, ?)`,
        [parseInt(data.jobId), parseInt(data.userId), data.fullName, data.email, data.phone, data.coverLetter]
    );
    return findById(result.lastID);
};

const updateStatus = async (id, status) => {
    const db = await getDB();
    await db.run(`UPDATE job_applications SET status = ? WHERE id = ?`, [status, parseInt(id)]);
    return findById(id);
};

const countAll = async () => {
    const db = await getDB();
    const row = await db.get(`SELECT COUNT(*) as count FROM job_applications`);
    return row.count;
};

const existsForJobAndUser = async (jobId, userId) => {
    const db = await getDB();
    const row = await db.get(
        `SELECT id FROM job_applications WHERE job_id = ? AND user_id = ?`,
        [parseInt(jobId), parseInt(userId)]
    );
    return !!row;
};

module.exports = { listAll, findById, findByUser, create, updateStatus, countAll, existsForJobAndUser };
