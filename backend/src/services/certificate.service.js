const certificateModel = require('../models/certificate.model');
const settingModel = require('../models/setting.model');
const { NotFoundError, ConflictError } = require('../utils/errors');

async function issueCertificate(userId, courseId, issuerName) {
    return certificateModel.create(userId, courseId, issuerName);
}

async function getById(id) {
    const cert = await certificateModel.findById(id);
    if (!cert) throw new NotFoundError('Certificate not found');
    return cert;
}

async function getByCode(code) {
    const cert = await certificateModel.findByCode(code);
    if (!cert) throw new NotFoundError('Certificate not found');
    return cert;
}

async function getByUserAndCourse(userId, courseId) {
    const cert = await certificateModel.findByUserAndCourse(userId, courseId);
    if (!cert) throw new NotFoundError('Certificate not found for this course');
    return cert;
}

async function getByUser(userId) {
    return certificateModel.findByUser(userId);
}

async function listAll() {
    return certificateModel.listAll();
}

async function getDesign() {
    const row = await settingModel.get('certificate_design');
    if (!row || !row.setting_value) return null;
    try {
        return JSON.parse(row.setting_value);
    } catch (e) {
        return null;
    }
}

module.exports = {
    issueCertificate,
    getById,
    getByCode,
    getByUserAndCourse,
    getByUser,
    listAll,
    getDesign,
};
