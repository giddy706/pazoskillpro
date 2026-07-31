const { getDB } = require('../config/database');

const findByEmail = async (email) => {
    const db = await getDB();
    return db.get(`SELECT * FROM users WHERE email = ?`, [email]);
};

const findById = async (id) => {
    const db = await getDB();
    return db.get(
        `SELECT id, name, email, role, created_at FROM users WHERE id = ?`,
        [parseInt(id)]
    );
};

const create = async ({ name, email, passwordHash }) => {
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'student')`,
        [name, email, passwordHash]
    );
    return findById(result.lastID);
};

const update = async (id, updates) => {
    const db = await getDB();
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }
    values.push(parseInt(id));
    await db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return findById(id);
};

const remove = async (id) => {
    const db = await getDB();
    await db.run(`DELETE FROM users WHERE id = ?`, [parseInt(id)]);
};

const listStudents = async () => {
    const db = await getDB();
    return db.all(
        `SELECT id, name, email, role, created_at FROM users WHERE role = 'student' ORDER BY id DESC`
    );
};

const listAdmins = async () => {
    const db = await getDB();
    return db.all(
        `SELECT id, name, email, role, created_at FROM users WHERE role = 'admin' ORDER BY id DESC`
    );
};

const countAll = async () => {
    const db = await getDB();
    const row = await db.get(`SELECT COUNT(*) as count FROM users`);
    return row.count;
};

const setRole = async (id, role) => {
    const db = await getDB();
    await db.run(`UPDATE users SET role = ? WHERE id = ?`, [role, parseInt(id)]);
    return findById(id);
};

module.exports = {
    findByEmail,
    findById,
    create,
    update,
    remove,
    listStudents,
    listAdmins,
    countAll,
    setRole,
};
