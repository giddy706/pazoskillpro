const { getDB } = require('../config/database');
const prisma = require('../config/prisma');
const crypto = require('crypto');

function generateCertificateCode() {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `PAZO-CERT-${Date.now().toString().slice(-4)}-${randomHex}`;
}

async function findById(id) {
    const db = await getDB();
    return db.get(
        `SELECT c.*, u.name as userName, u.email as userEmail, cr.title as courseTitle, cr.image as courseImage 
         FROM certificates c 
         JOIN users u ON c.user_id = u.id 
         JOIN courses cr ON c.course_id = cr.id 
         WHERE c.id = ?`,
        [id]
    );
}

async function findByCode(code) {
    const db = await getDB();
    return db.get(
        `SELECT c.*, u.name as userName, u.email as userEmail, cr.title as courseTitle, cr.image as courseImage 
         FROM certificates c 
         JOIN users u ON c.user_id = u.id 
         JOIN courses cr ON c.course_id = cr.id 
         WHERE c.certificate_code = ?`,
        [code]
    );
}

async function findByUserAndCourse(userId, courseId) {
    const db = await getDB();
    return db.get(
        `SELECT c.*, u.name as userName, u.email as userEmail, cr.title as courseTitle, cr.image as courseImage 
         FROM certificates c 
         JOIN users u ON c.user_id = u.id 
         JOIN courses cr ON c.course_id = cr.id 
         WHERE c.user_id = ? AND c.course_id = ?`,
        [userId, courseId]
    );
}

async function findByUser(userId) {
    const db = await getDB();
    return db.all(
        `SELECT c.*, cr.title as courseTitle, cr.image as courseImage, cr.category as courseCategory 
         FROM certificates c 
         JOIN courses cr ON c.course_id = cr.id 
         WHERE c.user_id = ? 
         ORDER BY c.issued_at DESC`,
        [userId]
    );
}

async function create(userId, courseId, issuerName = 'pazoskill Academic Directorate') {
    const existing = await findByUserAndCourse(userId, courseId);
    if (existing) return existing;

    const code = generateCertificateCode();
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO certificates (certificate_code, user_id, course_id, issuer_name) VALUES (?, ?, ?, ?)`,
        [code, userId, courseId, issuerName]
    );
    return findById(result.lastID);
}

async function listAll() {
    const db = await getDB();
    return db.all(
        `SELECT c.*, u.name as userName, u.email as userEmail, cr.title as courseTitle 
         FROM certificates c 
         JOIN users u ON c.user_id = u.id 
         JOIN courses cr ON c.course_id = cr.id 
         ORDER BY c.issued_at DESC`
    );
}

module.exports = {
    generateCertificateCode,
    findById,
    findByCode,
    findByUserAndCourse,
    findByUser,
    create,
    listAll,
};
