const { BadRequestError, NotFoundError } = require('../utils/errors');
const affiliateModel = require('../models/affiliate.model');

function normalizeCode(code) {
    return String(code || '').trim().toUpperCase();
}

function discountLabel(promo) {
    if (!promo) return '';
    const value = promo.discount_value || 0;
    if (promo.discount_type === 'fixed') {
        return `KSH ${Number(value).toLocaleString()} off`;
    }
    return `${value}% off`;
}

async function findPromo(code) {
    const normalized = normalizeCode(code);
    if (!normalized) throw new BadRequestError('Referral / promo code is required');
    const promo = await affiliateModel.findPromoByCode(normalized);
    if (!promo) throw new BadRequestError('Invalid referral / promo code');
    if (promo.active !== 1) throw new BadRequestError('This promo code is no longer active');
    if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
        throw new BadRequestError('This promo code has expired');
    }
    if (promo.usage_limit != null && (promo.times_used || 0) >= promo.usage_limit) {
        throw new BadRequestError('This promo code has reached its usage limit');
    }
    return promo;
}

function validateCourseMatch(promo, courseId) {
    if (promo.course_id && parseInt(courseId) !== parseInt(promo.course_id)) {
        throw new BadRequestError('This promo code only applies to a specific course');
    }
}

function computeDiscount(promo, coursePrice) {
    const price = Number(coursePrice) || 0;
    let discountAmount = 0;
    if (promo.discount_type === 'fixed') {
        discountAmount = Math.min(Number(promo.discount_value) || 0, price);
    } else {
        discountAmount = Math.round((price * (Number(promo.discount_value) || 0)) / 100);
    }
    const paidAmount = Math.max(price - discountAmount, 0);
    return { discountAmount, paidAmount };
}

function computeCommission(promo, paidAmount) {
    if (!promo || !promo.affiliate_id) return 0;
    const rate = Number(promo.affiliateCommission != null ? promo.affiliateCommission : 0);
    return Math.round((paidAmount * rate) / 100);
}

// Validates a code against the given course (if provided) and returns friendly info.
async function validateCode(code, courseId) {
    const promo = await findPromo(code);
    if (courseId) validateCourseMatch(promo, courseId);
    let coursePrice = 0;
    if (courseId) {
        const courseModel = require('../models/course.model');
        const course = await courseModel.findById(courseId);
        coursePrice = course ? course.price : 0;
    }
    const { discountAmount, paidAmount } = computeDiscount(promo, coursePrice);
    return {
        valid: true,
        code: promo.code,
        discountType: promo.discount_type,
        discountValue: promo.discount_value,
        discountLabel: discountLabel(promo),
        discountAmount,
        paidAmount,
        affiliateId: promo.affiliate_id,
        affiliateName: promo.affiliateName || '',
        courseId: promo.course_id || null,
        appliedTo: promo.courseTitle || null,
    };
}

// Called during registration when the student supplies an optional promo code.
async function applyAtRegistration(userId, code) {
    const normalized = normalizeCode(code);
    if (!normalized) return null;

    const existing = await affiliateModel.findByUserId(userId);
    if (existing) throw new BadRequestError(`You have already used the referral code ${existing.code}`);

    const promo = await findPromo(normalized);
    await affiliateModel.createReferral({
        userId,
        affiliateId: promo.affiliate_id,
        promoCodeId: promo.id,
        code: promo.code,
        status: 'registered',
    });

    return {
        code: promo.code,
        discountLabel: discountLabel(promo),
        affiliateName: promo.affiliateName || '',
    };
}

// Called at enrollment time. Uses the provided code, or the code the student
// already locked in during registration. Enforces the one-code-per-account rule.
async function applyAtEnrollment(userId, courseId, code) {
    const provided = normalizeCode(code);
    const existing = await affiliateModel.findByUserId(userId);

    if (existing && existing.enrollment_id) {
        // Already redeemed their one code on a previous purchase.
        if (provided) throw new BadRequestError(`You have already used the referral code ${existing.code}`);
        return { applied: false, code: null, discountAmount: 0, paidAmount: null, commissionAmount: 0, affiliateName: null, discountLabel: '' };
    }

    if (existing && !provided) {
        // Locked in from registration — use it now.
    } else if (existing && provided && normalizeCode(provided) !== existing.code) {
        throw new BadRequestError(`You have already used the referral code ${existing.code}`);
    } else if (!existing && !provided) {
        return { applied: false, code: null, discountAmount: 0, paidAmount: null, commissionAmount: 0, affiliateName: null, discountLabel: '' };
    }

    const promoCode = provided ? provided : existing.code;
    const promo = await findPromo(promoCode);
    validateCourseMatch(promo, courseId);

    const courseModel = require('../models/course.model');
    const course = await courseModel.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    const { discountAmount, paidAmount } = computeDiscount(promo, course.price);
    const commissionAmount = computeCommission(promo, paidAmount);

    if (existing) {
        await affiliateModel.updateReferral(existing.id, {
            enrollment_id: null, // set by caller after enrollment is created
            course_id: parseInt(courseId),
            course_price: course.price,
            discount_amount: discountAmount,
            paid_amount: paidAmount,
            commission_amount: commissionAmount,
            status: 'unpaid',
        });
    } else {
        await affiliateModel.createReferral({
            userId,
            affiliateId: promo.affiliate_id,
            promoCodeId: promo.id,
            code: promo.code,
            courseId,
            coursePrice: course.price,
            discountAmount,
            paidAmount,
            commissionAmount,
            status: 'unpaid',
        });
    }
    await affiliateModel.incrementTimesUsed(promo.id);

    return {
        applied: true,
        code: promo.code,
        discountAmount,
        paidAmount,
        commissionAmount,
        affiliateName: promo.affiliateName || '',
        discountLabel: discountLabel(promo),
    };
}

// Attaches the enrollment to the student's referral row (called after enrollment creation).
async function linkEnrollment(userId, enrollmentId) {
    const existing = await affiliateModel.findByUserId(userId);
    if (existing && !existing.enrollment_id) {
        await affiliateModel.updateReferral(existing.id, { enrollment_id: parseInt(enrollmentId) });
    }
}

// ==================== ADMIN ====================

async function getAffiliates() {
    const affiliates = await affiliateModel.listAffiliates();
    const referrals = await affiliateModel.listAllReferrals();
    return Promise.all(affiliates.map(async (a) => {
        const promo = await affiliateModel.findPromoByCode(a.code);
        const mine = referrals.filter((r) => r.affiliate_id === a.id);
        const purchases = mine.filter((r) => r.enrollment_id);
        const earned = purchases.reduce((sum, r) => sum + (r.commission_amount || 0), 0);
        const paid = mine.filter((r) => r.status === 'paid').reduce((sum, r) => sum + (r.commission_amount || 0), 0);
        return {
            ...a,
            promo: promo || null,
            referralCount: mine.length,
            payingReferrals: purchases.length,
            revenue: purchases.reduce((sum, r) => sum + (r.paid_amount || 0), 0),
            earned,
            paid,
            pending: earned - paid,
            referrals: mine,
        };
    }));
}

async function getAffiliateDetail(id) {
    const affiliate = await affiliateModel.findAffiliateById(id);
    if (!affiliate) throw new NotFoundError('Affiliate not found');
    const promo = await affiliateModel.findPromoByCode(affiliate.code);
    const referrals = await affiliateModel.listReferralsByAffiliate(id);
    const purchases = referrals.filter((r) => r.enrollment_id);
    const earned = purchases.reduce((sum, r) => sum + (r.commission_amount || 0), 0);
    const paid = referrals.filter((r) => r.status === 'paid').reduce((sum, r) => sum + (r.commission_amount || 0), 0);
    return {
        ...affiliate,
        promo: promo || null,
        referralCount: referrals.length,
        payingReferrals: purchases.length,
        revenue: purchases.reduce((sum, r) => sum + (r.paid_amount || 0), 0),
        earned,
        paid,
        pending: earned - paid,
        referrals,
    };
}

async function getPerformance() {
    const affiliates = await getAffiliates();
    const ranked = affiliates
        .filter((a) => a.referralCount > 0)
        .sort((a, b) => b.revenue - a.revenue);
    const totals = affiliates.reduce((acc, a) => ({
        affiliates: acc.affiliates + 1,
        referrals: acc.referrals + a.referralCount,
        payingReferrals: acc.payingReferrals + a.payingReferrals,
        revenue: acc.revenue + a.revenue,
        earned: acc.earned + a.earned,
        paid: acc.paid + a.paid,
        pending: acc.pending + a.pending,
    }), { affiliates: 0, referrals: 0, payingReferrals: 0, revenue: 0, earned: 0, paid: 0, pending: 0 });
    return { leaderboard: ranked, totals };
}

async function createAffiliate(data) {
    const code = normalizeCode(data.code);
    if (!code) throw new BadRequestError('Affiliate referral code is required');
    const existingAffiliate = await affiliateModel.findAffiliateByCode(code);
    if (existingAffiliate) throw new BadRequestError('That referral code is already taken');
    const existingPromo = await affiliateModel.findPromoByCode(code);
    if (existingPromo) throw new BadRequestError('That promo code is already in use');

    const affiliate = await affiliateModel.createAffiliate({
        name: data.name,
        email: data.email,
        code,
        commission_percent: data.commission_percent,
        is_partner: data.is_partner,
    });

    await affiliateModel.createPromo({
        code,
        discount_type: data.discount_type || 'percentage',
        discount_value: data.discount_value != null ? data.discount_value : 10,
        course_id: data.course_id || null,
        expires_at: data.expires_at || null,
        usage_limit: data.usage_limit || null,
        affiliate_id: affiliate.id,
        active: 1,
    });

    return getAffiliateDetail(affiliate.id);
}

async function markPaid(affiliateId) {
    const affiliate = await affiliateModel.findAffiliateById(affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate not found');
    await affiliateModel.markAllUnpaidByAffiliate(affiliateId);
    return getAffiliateDetail(affiliateId);
}

module.exports = {
    validateCode,
    applyAtRegistration,
    applyAtEnrollment,
    linkEnrollment,
    getAffiliates,
    getAffiliateDetail,
    getPerformance,
    createAffiliate,
    markPaid,
    discountLabel,
};
