const { NotFoundError, ConflictError } = require('../utils/errors');
const enrollmentModel = require('../models/enrollment.model');
const lessonModel = require('../models/lesson.model');
const { getDB } = require('../config/database');

async function findById(id) {
    const enrollment = await enrollmentModel.findById(id);
    if (!enrollment) throw new NotFoundError('Enrollment not found');
    return enrollment;
}

async function findByUserAndCourse(userId, courseId) {
    return enrollmentModel.findByUserAndCourse(userId, courseId);
}

async function findAllByUser(userId) {
    return enrollmentModel.findAllByUser(userId);
}

async function create(userId, courseId, promoCode, transactionReference = null) {
    const existing = await enrollmentModel.findByUserAndCourse(userId, courseId);
    if (existing) {
        throw new ConflictError('Already enrolled in this course');
    }

    const courseModel = require('../models/course.model');
    const course = await courseModel.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (!course.published) throw new NotFoundError('Course not found');

    const affiliateService = require('./affiliate.service');
    const promo = await affiliateService.applyAtEnrollment(userId, courseId, promoCode);

    const paidAmount = promo && promo.applied && promo.paidAmount != null
        ? promo.paidAmount
        : (course.price || 0);

    // Verify Paystack Payment
    if (paidAmount > 0) {
        if (!transactionReference) {
            throw new BadRequestError('Payment transaction reference is required');
        }
        
        const { config } = require('../config/env');
        try {
            // Using native fetch, available in Node 18+
            const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(transactionReference)}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${config.paystack.secretKey}`
                }
            });
            const data = await response.json();
            
            if (!data.status || data.data.status !== 'success') {
                throw new BadRequestError('Payment verification failed');
            }

            // Paystack amounts are in kobo/cents. Ensure the paid amount matches what we expect.
            const expectedAmountInKobo = paidAmount * 100;
            if (data.data.amount < expectedAmountInKobo) {
                throw new BadRequestError('Payment amount is less than the required amount');
            }
        } catch (error) {
            if (error instanceof BadRequestError) throw error;
            console.error('Paystack API error:', error);
            throw new BadRequestError('Could not verify payment with Paystack');
        }
    }

    const enrollment = await enrollmentModel.create(userId, courseId);
    await courseModel.incrementStudents(courseId);

    if (promo && promo.applied) {
        await affiliateService.linkEnrollment(userId, enrollment.id);
    }
    
    const paymentModel = require('../models/payment.model');
    const actualTxRef = (paidAmount > 0) ? transactionReference : ('PAY-' + Date.now() + '-' + enrollment.id);
    await paymentModel.create({
        userId,
        courseId,
        amount: paidAmount,
        currency: 'KSH',
        status: 'completed',
        paymentMethod: (paidAmount > 0) ? 'paystack' : (promo && promo.applied ? 'promo' : 'free'),
        transactionRef: actualTxRef,
    });

    return { enrollment, promo };
}

async function markLessonComplete(userId, courseId, lessonId) {
    const enrollment = await enrollmentModel.findByUserAndCourse(userId, courseId);
    if (!enrollment) throw new NotFoundError('Enrollment not found');

    const lesson = await lessonModel.findById(lessonId);
    if (!lesson || lesson.course_id !== parseInt(courseId)) {
        throw new NotFoundError('Lesson not found in this course');
    }

    // Insert lesson progress if not exists using raw SQLite
    const db = await getDB();
    await db.run(
        `INSERT OR IGNORE INTO lesson_progress (enrollment_id, lesson_id) VALUES (?, ?)`,
        [enrollment.id, parseInt(lessonId)]
    );

    const totalRow = await db.get(`SELECT COUNT(*) as count FROM lessons WHERE course_id = ?`, [parseInt(courseId)]);
    const completedRow = await db.get(`SELECT COUNT(*) as count FROM lesson_progress WHERE enrollment_id = ?`, [enrollment.id]);

    const total = totalRow.count || 1;
    const completed = completedRow.count || 0;
    const progress = Math.round((completed / total) * 100);

    if (progress >= 100 && !enrollment.completed) {
        const completedDate = new Date();
        await enrollmentModel.updateProgress(enrollment.id, { progress: 100, completed: true, completedAt: completedDate });
        enrollment.progress = 100;
        enrollment.completed = 1;
        enrollment.completed_at = completedDate;
        try {
            const certificateService = require('./certificate.service');
            await certificateService.issueCertificate(userId, courseId);
        } catch (err) {
            console.warn('Certificate auto-generation note:', err.message);
        }
        return enrollment;
    }

    await enrollmentModel.updateProgress(enrollment.id, { progress });
    enrollment.progress = progress;
    return enrollment;
}

async function countAll() {
    return enrollmentModel.countAll();
}

async function getAdminEnrollments() {
    const db = await getDB();
    return db.all(
        `SELECT e.*, u.name as "userName", u.email as "userEmail", c.title as "courseTitle", c.price as "coursePrice"
         FROM enrollments e
         LEFT JOIN users u ON e.user_id = u.id
         LEFT JOIN courses c ON e.course_id = c.id
         ORDER BY e.enrolled_at DESC`
    );
}

module.exports = {
    findById,
    findByUserAndCourse,
    findAllByUser,
    create,
    markLessonComplete,
    countAll,
    getAdminEnrollments,
};
