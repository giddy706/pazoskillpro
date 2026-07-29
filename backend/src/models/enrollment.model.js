const prisma = require('../config/prisma');

const create = async (userId, courseId) => {
    return prisma.enrollments.create({
        data: {
            user_id: parseInt(userId),
            course_id: parseInt(courseId),
        }
    });
};

const findById = async (id) => {
    return prisma.enrollments.findUnique({
        where: { id: parseInt(id) },
        include: { courses: true }
    });
};

const findByUserAndCourse = async (userId, courseId) => {
    return prisma.enrollments.findUnique({
        where: { user_id_course_id: { user_id: parseInt(userId), course_id: parseInt(courseId) } },
        include: { courses: true }
    });
};

const findAllByUser = async (userId) => {
    return prisma.enrollments.findMany({
        where: { user_id: parseInt(userId) },
        include: { courses: true },
        orderBy: { enrolled_at: 'desc' }
    });
};

const updateProgress = async (id, { progress, completed, completedAt }) => {
    const data = { progress };
    if (completed && completedAt) {
        data.completed = 1;
        data.completed_at = new Date(completedAt);
    }
    return prisma.enrollments.update({
        where: { id: parseInt(id) },
        data
    });
};

const countAll = async () => {
    return prisma.enrollments.count();
};

const getRevenue = async () => {
    const enrollments = await prisma.enrollments.findMany({
        include: { courses: { select: { price: true } } }
    });
    return enrollments.reduce((sum, e) => sum + (e.courses?.price || 0), 0);
};

const getEnrollmentLessons = async (enrollmentId, courseId) => {
    const lessons = await prisma.lessons.findMany({
        where: { course_id: parseInt(courseId) },
        include: {
            lesson_progress: {
                where: { enrollment_id: parseInt(enrollmentId) }
            }
        },
        orderBy: { order_index: 'asc' }
    });
    return lessons.map(l => ({
        id: l.id,
        title: l.title,
        order_index: l.order_index,
        completed: l.lesson_progress.length > 0 ? 1 : 0
    }));
};

module.exports = {
    create,
    findById,
    findByUserAndCourse,
    findAllByUser,
    updateProgress,
    countAll,
    getRevenue,
    getEnrollmentLessons,
};
