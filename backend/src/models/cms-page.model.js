const { getDB } = require('../config/database');

async function listAll() {
    const db = await getDB();
    return db.all(`SELECT * FROM cms_pages ORDER BY id DESC`);
}

async function findById(id) {
    const db = await getDB();
    return db.get(`SELECT * FROM cms_pages WHERE id = ?`, [parseInt(id)]);
}

async function findBySlug(slug) {
    const db = await getDB();
    return db.get(`SELECT * FROM cms_pages WHERE slug = ?`, [slug]);
}

async function create({ title, slug, content = '', published = 1 }) {
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO cms_pages (title, slug, content, published) VALUES (?, ?, ?, ?)`,
        [title, slug, content, published ? 1 : 0]
    );
    return findById(result.lastID);
}

async function update(id, updates) {
    const db = await getDB();
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }
    values.push(parseInt(id));
    if (fields.length > 0) {
        await db.run(`UPDATE cms_pages SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    }
    return findById(id);
}

async function remove(id) {
    const db = await getDB();
    await db.run(`DELETE FROM cms_pages WHERE id = ?`, [parseInt(id)]);
}

module.exports = { listAll, findById, findBySlug, create, update, remove };
