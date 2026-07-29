const prisma = require('../config/prisma');

const listAll = async () => {
    return prisma.job_applications.findMany({
        include: {
            jobs: { select: { title: true, company: true } },
            users: { select: { name: true, email: true } }
        },
        orderBy: { applied_at: 'desc' }
    });
};

const findById = async (id) => {
    return prisma.job_applications.findUnique({
        where: { id: parseInt(id) }
    });
};

const findByUser = async (userId) => {
    return prisma.job_applications.findMany({
        where: { user_id: parseInt(userId) },
        include: {
            jobs: { select: { title: true, company: true, location: true } }
        },
        orderBy: { applied_at: 'desc' }
    });
};

const create = async (data) => {
    return prisma.job_applications.create({
        data: {
            job_id: parseInt(data.jobId),
            user_id: parseInt(data.userId),
            full_name: data.fullName,
            email: data.email,
            phone: data.phone,
            cover_letter: data.coverLetter
        }
    });
};

const updateStatus = async (id, status) => {
    return prisma.job_applications.update({
        where: { id: parseInt(id) },
        data: { status }
    });
};

const countAll = async () => {
    return prisma.job_applications.count();
};

const existsForJobAndUser = async (jobId, userId) => {
    const application = await prisma.job_applications.findUnique({
        where: {
            job_id_user_id: { job_id: parseInt(jobId), user_id: parseInt(userId) }
        }
    });
    return !!application;
};

module.exports = {
    listAll,
    findById,
    findByUser,
    create,
    updateStatus,
    countAll,
    existsForJobAndUser,
};
