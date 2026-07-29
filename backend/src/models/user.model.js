const prisma = require('../config/prisma');

const findByEmail = async (email) => {
    return prisma.users.findUnique({ where: { email } });
};

const findById = async (id) => {
    return prisma.users.findUnique({
        where: { id: parseInt(id) },
        select: { id: true, name: true, email: true, role: true, created_at: true }
    });
};

const create = async ({ name, email, passwordHash }) => {
    return prisma.users.create({
        data: {
            name,
            email,
            password_hash: passwordHash
        },
        select: { id: true, name: true, email: true, role: true, created_at: true }
    });
};

const update = async (id, updates) => {
    return prisma.users.update({
        where: { id: parseInt(id) },
        data: updates,
        select: { id: true, name: true, email: true, role: true, created_at: true }
    });
};

const remove = async (id) => {
    return prisma.users.delete({ where: { id: parseInt(id) } });
};

const listStudents = async () => {
    return prisma.users.findMany({
        where: { role: 'student' },
        select: { id: true, name: true, email: true, role: true, created_at: true },
        orderBy: { id: 'desc' }
    });
};

const listAdmins = async () => {
    return prisma.users.findMany({
        where: { role: 'admin' },
        select: { id: true, name: true, email: true, role: true, created_at: true },
        orderBy: { id: 'desc' }
    });
};

module.exports = {
    findByEmail,
    findById,
    create,
    update,
    remove,
    listStudents,
    listAdmins,
};
