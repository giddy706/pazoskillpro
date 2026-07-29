const certificateModel = require('../models/certificate.model');
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

async function getByUser(userId) {
    return certificateModel.findByUser(userId);
}

async function listAll() {
    return certificateModel.listAll();
}

module.exports = {
    issueCertificate,
    getById,
    getByCode,
    getByUser,
    listAll,
};
