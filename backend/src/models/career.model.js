const { getDB } = require('../config/database');

// ==================== TALENT POOL ====================

async function findTalentPoolByUser(userId) {
    const db = await getDB();
    return db.get(`SELECT * FROM talent_pool WHERE user_id = ?`, [parseInt(userId)]);
}

async function upsertTalentPool(userId, fields) {
    const db = await getDB();
    const existing = await findTalentPoolByUser(userId);
    if (existing) {
        const sets = [];
        const values = [];
        for (const [key, value] of Object.entries(fields)) {
            if (value === undefined) continue;
            sets.push(`${key} = ?`);
            values.push(value);
        }
        if (sets.length) {
            values.push(existing.id);
            await db.run(`UPDATE talent_pool SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
        }
        return findTalentPoolByUser(userId);
    }
    const result = await db.run(
        `INSERT INTO talent_pool (user_id, resume_name, resume_data, portfolio_name, portfolio_data)
         VALUES (?, ?, ?, ?, ?)`,
        [parseInt(userId), fields.resume_name || '', fields.resume_data || '', fields.portfolio_name || '', fields.portfolio_data || '']
    );
    return findTalentPoolByUser(result.lastID);
}

async function listActiveTalentPoolUserIds() {
    const db = await getDB();
    const rows = await db.all(`SELECT user_id FROM talent_pool WHERE status = 'active'`);
    return rows.map((r) => r.user_id);
}

async function getTalentPoolStats() {
    const db = await getDB();
    const row = await db.get(`SELECT COUNT(*) as count FROM talent_pool WHERE status = 'active'`);
    return row.count;
}

// ==================== CAREER ACTIONS ====================

async function recordAction(userId, action) {
    const db = await getDB();
    await db.run(
        `INSERT OR IGNORE INTO career_actions (user_id, action) VALUES (?, ?)`,
        [parseInt(userId), action]
    );
    return db.get(`SELECT * FROM career_actions WHERE user_id = ? AND action = ?`, [parseInt(userId), action]);
}

async function listActions(userId) {
    const db = await getDB();
    return db.all(`SELECT action, done_at FROM career_actions WHERE user_id = ?`, [parseInt(userId)]);
}

// ==================== CAREER NOTIFICATIONS ====================

async function listNotifications(userId) {
    const db = await getDB();
    return db.all(
        `SELECT cn.*, j.title as jobTitle
         FROM career_notifications cn
         LEFT JOIN jobs j ON cn.job_id = j.id
         WHERE cn.user_id = ?
         ORDER BY cn.created_at DESC
         LIMIT 50`,
        [parseInt(userId)]
    );
}

async function countUnreadNotifications(userId) {
    const db = await getDB();
    const row = await db.get(`SELECT COUNT(*) as count FROM career_notifications WHERE user_id = ? AND is_read = 0`, [parseInt(userId)]);
    return row.count;
}

async function markAllNotificationsRead(userId) {
    const db = await getDB();
    await db.run(`UPDATE career_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`, [parseInt(userId)]);
}

async function notifyUsers(userIds, { title, message, jobId }) {
    const db = await getDB();
    const stmt = await db.prepare(
        `INSERT INTO career_notifications (user_id, title, message, job_id) VALUES (?, ?, ?, ?)`
    );
    for (const userId of userIds) {
        await stmt.run([parseInt(userId), title, message, jobId ? parseInt(jobId) : null]);
    }
    await stmt.finalize();
}

module.exports = {
    findTalentPoolByUser,
    upsertTalentPool,
    listActiveTalentPoolUserIds,
    getTalentPoolStats,
    recordAction,
    listActions,
    listNotifications,
    countUnreadNotifications,
    markAllNotificationsRead,
    notifyUsers,
};
