const { getDB } = require('../config/database');

async function listAll() {
    const db = await getDB();
    return db.all(`SELECT * FROM settings ORDER BY id ASC`);
}

async function get(key) {
    const db = await getDB();
    return db.get(`SELECT * FROM settings WHERE setting_key = ?`, [key]);
}

async function set(key, value) {
    const db = await getDB();
    await db.run(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
         ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
    );
    return get(key);
}

async function update(id, value) {
    const db = await getDB();
    await db.run(`UPDATE settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [value, id]);
    return db.get(`SELECT * FROM settings WHERE id = ?`, [id]);
}

module.exports = {
    listAll,
    get,
    set,
    update,
};
