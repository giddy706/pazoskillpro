const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/courses', require('./courses.routes'));
router.use('/jobs', require('./jobs.routes'));
router.use('/enrollments', require('./enrollments.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/applications', require('./applications.routes'));
router.use('/users', require('./users.routes'));
router.use('/traffic', require('./traffic.routes'));
router.use('/certificates', require('./certificates.routes'));
router.use('/ai', require('./ai.routes'));
router.use('/affiliates', require('./affiliates.routes'));

module.exports = router;
