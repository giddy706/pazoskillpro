const prisma = require('../config/prisma');

const listAll = async () => {
    return prisma.jobs.findMany({
        include: { courses: { select: { title: true } } },
        orderBy: { created_at: 'desc' }
    });
};

const findById = async (id) => {
    return prisma.jobs.findUnique({
        where: { id: parseInt(id) },
        include: { courses: { select: { title: true } } }
    });
};

const create = async (data) => {
    return prisma.jobs.create({
        data: {
            title: data.title,
            company: data.company,
            location: data.location,
            type: data.type,
            salary: data.salary,
            category: data.category,
            description: data.description,
            requirements: JSON.stringify(data.requirements || []),
            responsibilities: JSON.stringify(data.responsibilities || []),
            benefits: JSON.stringify(data.benefits || []),
            required_course_id: data.requiredCourseId ? parseInt(data.requiredCourseId) : null,
        }
    });
};

const update = async (id, updates) => {
    const data = { ...updates };
    if (updates.requirements) data.requirements = JSON.stringify(updates.requirements);
    if (updates.responsibilities) data.responsibilities = JSON.stringify(updates.responsibilities);
    if (updates.benefits) data.benefits = JSON.stringify(updates.benefits);
    if (updates.required_course_id !== undefined) {
        data.required_course_id = updates.required_course_id ? parseInt(updates.required_course_id) : null;
    }

    return prisma.jobs.update({
        where: { id: parseInt(id) },
        data
    });
};

const remove = async (id) => {
    return prisma.jobs.delete({
        where: { id: parseInt(id) }
    });
};

const countAll = async () => {
    return prisma.jobs.count();
};

module.exports = {
    listAll,
    findById,
    create,
    update,
    remove,
    countAll,
};
