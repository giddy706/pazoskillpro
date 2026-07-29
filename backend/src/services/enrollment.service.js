const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');
const enrollmentModel = require('../models/enrollment.model');
const lessonModel = require('../models/lesson.model');
const prisma = require('../config/prisma');

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

async function create(userId, courseId) {
    const existing = await enrollmentModel.findByUserAndCourse(userId, courseId);
    if (existing) {
        throw new ConflictError('Already enrolled in this course');
    }

    const enrollment = await enrollmentModel.create(userId, courseId);
    await require('../models/course.model').incrementStudents(courseId);
    return enrollment;
}

async function markLessonComplete(userId, courseId, lessonId) {
    const enrollment = await enrollmentModel.findByUserAndCourse(userId, courseId);
    if (!enrollment) throw new NotFoundError('Enrollment not found');

    const lesson = await lessonModel.findById(lessonId);
    if (!lesson || lesson.course_id !== parseInt(courseId)) {
        throw new NotFoundError('Lesson not found in this course');
    }

    // Use Prisma to insert lesson progress if not exists
    await prisma.lesson_progress.upsert({
        where: {
            enrollment_id_lesson_id: {
                enrollment_id: enrollment.id,
                lesson_id: parseInt(lessonId)
            }
        },
        create: {
            enrollment_id: enrollment.id,
            lesson_id: parseInt(lessonId)
        },
        update: {}
    });

    const total = await prisma.lessons.count({ where: { course_id: parseInt(courseId) } }) || 1;
    const completed = await prisma.lesson_progress.count({ where: { enrollment_id: enrollment.id } }) || 0;
    
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
    return prisma.enrollments.findMany({
        include: {
            users: { select: { name: true, email: true } },
            courses: { select: { title: true, price: true } }
        },
        orderBy: { enrolled_at: 'desc' }
    }).then(enrollments => enrollments.map(e => ({
        ...e,
        userName: e.users?.name,
        userEmail: e.users?.email,
        courseTitle: e.courses?.title,
        coursePrice: e.courses?.price,
    })));
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
