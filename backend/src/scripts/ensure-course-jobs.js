require('dotenv').config();
const dbConfig = require('../config/database');
const jobService = require('../services/job.service');

async function ensureCourseJobs() {
    try {
        await dbConfig.getDB();
        console.log('Connected to database. Checking courses...');
        const created = await jobService.ensureAllCoursesHaveJobs();
        console.log(`Done. Created ${created} new job listing(s) for courses that did not have one.`);
        process.exit(0);
    } catch (err) {
        console.error('Error ensuring course jobs:', err);
        process.exit(1);
    }
}

ensureCourseJobs();
