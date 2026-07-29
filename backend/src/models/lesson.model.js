const prisma = require('../config/prisma');

const findById = async (id) => {
    return prisma.lessons.findUnique({
        where: { id: parseInt(id) }
    });
};

const findByCourseId = async (courseId) => {
    return prisma.lessons.findMany({
        where: { course_id: parseInt(courseId) },
        orderBy: { order_index: 'asc' }
    });
};

const create = async (courseId, title, orderIndex, videoUrl = '', content = '') => {
    return prisma.lessons.create({
        data: {
            course_id: parseInt(courseId),
            title,
            order_index: parseInt(orderIndex),
            video_url: videoUrl,
            content
        }
    });
};

const update = async (id, updates) => {
    return prisma.lessons.update({
        where: { id: parseInt(id) },
        data: updates
    });
};

const remove = async (id) => {
    return prisma.lessons.delete({
        where: { id: parseInt(id) }
    });
};

const getNextOrderIndex = async (courseId) => {
    const maxLesson = await prisma.lessons.findFirst({
        where: { course_id: parseInt(courseId) },
        orderBy: { order_index: 'desc' },
        select: { order_index: true }
    });
    return (maxLesson && maxLesson.order_index !== null) ? maxLesson.order_index + 1 : 1;
};

module.exports = {
    findById,
    findByCourseId,
    create,
    update,
    remove,
    getNextOrderIndex,
};
