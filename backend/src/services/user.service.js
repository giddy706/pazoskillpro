const { NotFoundError } = require('../utils/errors');
const userModel = require('../models/user.model');
const { ROLES } = require('../constants');

async function listAll() {
    return userModel.listStudents();
}

async function findById(id) {
    const user = await userModel.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
}

async function updateRole(id, role) {
    if (!Object.values(ROLES).includes(role)) {
        throw new Error('Invalid role');
    }
    return userModel.update(id, { role });
}

async function remove(id) {
    const user = await userModel.findById(id);
    if (!user) throw new NotFoundError('User not found');
    if (user.role === ROLES.ADMIN) {
        throw new Error('Cannot delete admin users');
    }
    return userModel.remove(id);
}

async function getMetrics() {
    const students = await userModel.listStudents();
    const admins = await userModel.listAdmins();
    return {
        totalStudents: students.length,
        totalAdmins: admins.length,
    };
}

module.exports = {
    listAll,
    findById,
    updateRole,
    remove,
    getMetrics,
};
