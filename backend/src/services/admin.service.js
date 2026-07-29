const courseModel = require('../models/course.model');
const enrollmentModel = require('../models/enrollment.model');
const jobModel = require('../models/job.model');
const applicationModel = require('../models/application.model');
const userModel = require('../models/user.model');
const trafficModel = require('../models/traffic.model');
const paymentModel = require('../models/payment.model');
const settingModel = require('../models/setting.model');
const quizModel = require('../models/quiz.model');
const certificateModel = require('../models/certificate.model');

async function getMetrics() {
    const students = await userModel.listStudents();
    const totalCourses = await courseModel.countAll();
    const totalJobs = await jobModel.countAll();
    const totalEnrollments = await enrollmentModel.countAll();
    const totalApplications = await applicationModel.countAll();

    return {
        totalStudents: students.length,
        totalCourses,
        totalJobs,
        totalEnrollments,
        totalApplications,
    };
}

async function getStats() {
    const metrics = await getMetrics();
    const totalRevenue = await enrollmentModel.getRevenue();
    return {
        totalStudents: metrics.totalStudents,
        totalCourses: metrics.totalCourses,
        totalJobs: metrics.totalJobs,
        totalEnrollments: metrics.totalEnrollments,
        totalApplications: metrics.totalApplications,
        totalRevenue,
    };
}

async function getApplications() {
    return applicationModel.listAll();
}

async function updateApplicationStatus(id, status) {
    return applicationModel.updateStatus(id, status);
}

async function getTrafficStats() {
    return trafficModel.getStats();
}

async function getTrafficLogs(limit = 100) {
    return trafficModel.getLogs(limit);
}

// Payment
async function getPayments() {
    return paymentModel.listAll();
}

async function getPaymentStats() {
    const totalRevenue = await paymentModel.getTotalRevenue();
    const revenueByPeriod = await paymentModel.getRevenueByPeriod(30);
    const allPayments = await paymentModel.listAll();
    return {
        totalRevenue,
        totalTransactions: allPayments.length,
        revenueByPeriod,
        recentPayments: allPayments.slice(0, 20),
    };
}

// Settings
async function getSettings() {
    return settingModel.listAll();
}

async function updateSetting(id, value) {
    return settingModel.update(id, value);
}

// Student progress
async function getStudentProgress() {
    const students = await userModel.listStudents();
    const result = [];
    for (const student of students) {
        const enrollments = await enrollmentModel.findAllByUser(student.id);
        let totalProgress = 0;
        let completed = 0;
        for (const e of enrollments) {
            totalProgress += e.progress || 0;
            if (e.completed) completed++;
        }
        const avgProgress = enrollments.length > 0 ? Math.round(totalProgress / enrollments.length) : 0;
        result.push({
            ...student,
            enrolledCourses: enrollments.length,
            completedCourses: completed,
            averageProgress: avgProgress,
        });
    }
    return result.sort((a, b) => b.enrolledCourses - a.enrolledCourses);
}

async function getStudentDetail(userId) {
    const user = await userModel.findById(userId);
    if (!user) return null;
    const enrollments = await enrollmentModel.findAllByUser(userId);
    const withLessons = [];
    for (const e of enrollments) {
        const lessons = await enrollmentModel.getEnrollmentLessons(e.id, e.course_id);
        withLessons.push({
            ...e,
            courseTitle: e.courses?.title || '',
            coursePrice: e.courses?.price || 0,
            lessons,
        });
    }
    const certificates = await certificateModel.findByUser(userId);
    return { user, enrollments: withLessons, certificates };
}

// Quiz
async function getQuizzes() {
    return quizModel.listAll();
}

async function getQuizDetail(quizId) {
    const quiz = await quizModel.findById(quizId);
    if (!quiz) return null;
    const questions = await quizModel.getQuestions(quizId);
    return { ...quiz, questions };
}

// Certificate
async function getCertificates() {
    return certificateModel.listAll();
}

async function issueCertificate(userId, courseId, issuerName) {
    const certService = require('./certificate.service');
    return certService.issueCertificate(userId, courseId, issuerName);
}

// Course publish
async function setCoursePublished(courseId, published) {
    const course = await courseModel.findById(courseId);
    if (!course) throw new Error('Course not found');
    return courseModel.setPublished(courseId, published);
}

module.exports = {
    getMetrics,
    getStats,
    getApplications,
    updateApplicationStatus,
    getTrafficStats,
    getTrafficLogs,
    getPayments,
    getPaymentStats,
    getSettings,
    updateSetting,
    getStudentProgress,
    getStudentDetail,
    getQuizzes,
    getQuizDetail,
    getCertificates,
    issueCertificate,
    setCoursePublished,
};
