const { getDB } = require('../config/database');

async function create(data) {
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO payments (user_id, course_id, amount, currency, status, payment_method, transaction_ref)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.userId, data.courseId, data.amount, data.currency || 'KSH',
         data.status || 'completed', data.paymentMethod || '', data.transactionRef || '']
    );
    return findById(result.lastID);
}

async function findById(id) {
    const db = await getDB();
    return db.get(
        `SELECT p.*, u.name as userName, u.email as userEmail, cr.title as courseTitle
         FROM payments p
         JOIN users u ON p.user_id = u.id
         JOIN courses cr ON p.course_id = cr.id
         WHERE p.id = ?`,
        [id]
    );
}

async function listAll() {
    const db = await getDB();
    return db.all(
        `SELECT p.*, u.name as userName, u.email as userEmail, cr.title as courseTitle
         FROM payments p
         JOIN users u ON p.user_id = u.id
         JOIN courses cr ON p.course_id = cr.id
         ORDER BY p.paid_at DESC`
    );
}

async function getTotalRevenue() {
    const db = await getDB();
    const row = await db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'`);
    return row ? row.total : 0;
}

async function getRevenueByPeriod(days = 30) {
    const db = await getDB();
    return db.all(
        `SELECT date(paid_at) as date, SUM(amount) as amount, COUNT(*) as count
         FROM payments
         WHERE status = 'completed' AND paid_at >= date('now', '-' || ? || ' days')
         GROUP BY date(paid_at)
         ORDER BY date(paid_at) ASC`,
        [days]
    );
}

module.exports = {
    create,
    findById,
    listAll,
    getTotalRevenue,
    getRevenueByPeriod,
};
