const { getDB } = require('../config/database');

// ==================== AFFILIATES ====================

const findAffiliateById = async (id) => {
    const db = await getDB();
    return db.get(`SELECT * FROM affiliates WHERE id = ?`, [parseInt(id)]);
};

const findAffiliateByCode = async (code) => {
    const db = await getDB();
    return db.get(`SELECT * FROM affiliates WHERE UPPER(code) = UPPER(?)`, [code]);
};

const createAffiliate = async (data) => {
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO affiliates (name, email, code, commission_percent, is_partner)
         VALUES (?, ?, ?, ?, ?)`,
        [data.name, data.email || '', (data.code || '').trim().toUpperCase(),
         data.commission_percent != null ? data.commission_percent : 5,
         data.is_partner ? 1 : 0]
    );
    return findAffiliateById(result.lastID);
};

const updateAffiliate = async (id, updates) => {
    const db = await getDB();
    const fields = [];
    const values = [];
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
    if (updates.code !== undefined) { fields.push('code = ?'); values.push((updates.code || '').trim().toUpperCase()); }
    if (updates.commission_percent !== undefined) { fields.push('commission_percent = ?'); values.push(updates.commission_percent); }
    if (updates.is_partner !== undefined) { fields.push('is_partner = ?'); values.push(updates.is_partner ? 1 : 0); }
    if (!fields.length) return findAffiliateById(id);
    values.push(parseInt(id));
    await db.run(`UPDATE affiliates SET ${fields.join(', ')} WHERE id = ?`, values);
    return findAffiliateById(id);
};

const deleteAffiliate = async (id) => {
    const db = await getDB();
    await db.run(`DELETE FROM affiliates WHERE id = ?`, [parseInt(id)]);
};

const listAffiliates = async () => {
    const db = await getDB();
    return db.all(`SELECT * FROM affiliates ORDER BY id DESC`);
};

// ==================== PROMO CODES ====================

const findPromoById = async (id) => {
    const db = await getDB();
    return db.get(
        `SELECT pc.*, a.name as affiliateName, c.title as courseTitle
         FROM promo_codes pc
         LEFT JOIN affiliates a ON pc.affiliate_id = a.id
         LEFT JOIN courses c ON pc.course_id = c.id
         WHERE pc.id = ?`,
        [parseInt(id)]
    );
};

const findPromoByCode = async (code) => {
    const db = await getDB();
    return db.get(
        `SELECT pc.*, a.name as affiliateName, a.commission_percent as affiliateCommission, c.title as courseTitle
         FROM promo_codes pc
         LEFT JOIN affiliates a ON pc.affiliate_id = a.id
         LEFT JOIN courses c ON pc.course_id = c.id
         WHERE UPPER(pc.code) = UPPER(?)`,
        [code]
    );
};

const createPromo = async (data) => {
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO promo_codes (code, discount_type, discount_value, course_id, expires_at, usage_limit, affiliate_id, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [(data.code || '').trim().toUpperCase(),
         data.discount_type || 'percentage',
         data.discount_value != null ? data.discount_value : 0,
         data.course_id ? parseInt(data.course_id) : null,
         data.expires_at || null,
         data.usage_limit != null ? parseInt(data.usage_limit) : null,
         data.affiliate_id ? parseInt(data.affiliate_id) : null,
         data.active === undefined ? 1 : (data.active ? 1 : 0)]
    );
    return findPromoById(result.lastID);
};

const updatePromo = async (id, updates) => {
    const db = await getDB();
    const fields = [];
    const values = [];
    if (updates.code !== undefined) { fields.push('code = ?'); values.push((updates.code || '').trim().toUpperCase()); }
    if (updates.discount_type !== undefined) { fields.push('discount_type = ?'); values.push(updates.discount_type); }
    if (updates.discount_value !== undefined) { fields.push('discount_value = ?'); values.push(updates.discount_value); }
    if (updates.course_id !== undefined) { fields.push('course_id = ?'); values.push(updates.course_id ? parseInt(updates.course_id) : null); }
    if (updates.expires_at !== undefined) { fields.push('expires_at = ?'); values.push(updates.expires_at || null); }
    if (updates.usage_limit !== undefined) { fields.push('usage_limit = ?'); values.push(updates.usage_limit != null ? parseInt(updates.usage_limit) : null); }
    if (updates.affiliate_id !== undefined) { fields.push('affiliate_id = ?'); values.push(updates.affiliate_id ? parseInt(updates.affiliate_id) : null); }
    if (updates.active !== undefined) { fields.push('active = ?'); values.push(updates.active ? 1 : 0); }
    if (!fields.length) return findPromoById(id);
    values.push(parseInt(id));
    await db.run(`UPDATE promo_codes SET ${fields.join(', ')} WHERE id = ?`, values);
    return findPromoById(id);
};

const deletePromo = async (id) => {
    const db = await getDB();
    await db.run(`DELETE FROM promo_codes WHERE id = ?`, [parseInt(id)]);
};

const listPromos = async () => {
    const db = await getDB();
    return db.all(
        `SELECT pc.*, a.name as affiliateName, c.title as courseTitle
         FROM promo_codes pc
         LEFT JOIN affiliates a ON pc.affiliate_id = a.id
         LEFT JOIN courses c ON pc.course_id = c.id
         ORDER BY pc.id DESC`
    );
};

const incrementTimesUsed = async (id) => {
    const db = await getDB();
    await db.run(`UPDATE promo_codes SET times_used = COALESCE(times_used, 0) + 1 WHERE id = ?`, [parseInt(id)]);
};

// ==================== REFERRALS ====================

const findByUserId = async (userId) => {
    const db = await getDB();
    return db.get(`SELECT * FROM referrals WHERE user_id = ?`, [parseInt(userId)]);
};

const findReferralById = async (id) => {
    const db = await getDB();
    return db.get(`SELECT * FROM referrals WHERE id = ?`, [parseInt(id)]);
};

const createReferral = async (data) => {
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO referrals (user_id, affiliate_id, promo_code_id, code, enrollment_id, course_id,
                                course_price, discount_amount, paid_amount, commission_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [parseInt(data.userId), data.affiliateId ? parseInt(data.affiliateId) : null,
         parseInt(data.promoCodeId), data.code,
         data.enrollmentId ? parseInt(data.enrollmentId) : null,
         data.courseId ? parseInt(data.courseId) : null,
         data.coursePrice || 0, data.discountAmount || 0, data.paidAmount || 0,
         data.commissionAmount || 0, data.status || 'registered']
    );
    return findReferralById(result.lastID);
};

const updateReferral = async (id, updates) => {
    const db = await getDB();
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) continue;
        fields.push(`${key} = ?`);
        values.push(value);
    }
    if (!fields.length) return findReferralById(id);
    values.push(parseInt(id));
    await db.run(`UPDATE referrals SET ${fields.join(', ')} WHERE id = ?`, values);
    return findReferralById(id);
};

const listReferralsByAffiliate = async (affiliateId) => {
    const db = await getDB();
    return db.all(
        `SELECT r.*, u.name as studentName, u.email as studentEmail, c.title as courseTitle
         FROM referrals r
         LEFT JOIN users u ON r.user_id = u.id
         LEFT JOIN courses c ON r.course_id = c.id
         WHERE r.affiliate_id = ?
         ORDER BY r.created_at DESC`,
        [parseInt(affiliateId)]
    );
};

const listAllReferrals = async () => {
    const db = await getDB();
    return db.all(
        `SELECT r.*, u.name as studentName, u.email as studentEmail, a.name as affiliateName, a.code as affiliateCode, c.title as courseTitle
         FROM referrals r
         LEFT JOIN users u ON r.user_id = u.id
         LEFT JOIN affiliates a ON r.affiliate_id = a.id
         LEFT JOIN courses c ON r.course_id = c.id
         ORDER BY r.created_at DESC`
    );
};

const markAllUnpaidByAffiliate = async (affiliateId) => {
    const db = await getDB();
    await db.run(
        `UPDATE referrals SET status = 'paid', paid_at = CURRENT_TIMESTAMP
         WHERE affiliate_id = ? AND status = 'unpaid'`,
        [parseInt(affiliateId)]
    );
};

module.exports = {
    findAffiliateById,
    findAffiliateByCode,
    createAffiliate,
    updateAffiliate,
    deleteAffiliate,
    listAffiliates,
    findPromoById,
    findPromoByCode,
    createPromo,
    updatePromo,
    deletePromo,
    listPromos,
    incrementTimesUsed,
    findByUserId,
    findReferralById,
    createReferral,
    updateReferral,
    listReferralsByAffiliate,
    listAllReferrals,
    markAllUnpaidByAffiliate,
};
