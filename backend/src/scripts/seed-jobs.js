require('dotenv').config();
const path = require('path');
const dbConfig = require('../config/database');
const courseModel = require('../models/course.model');
const jobModel = require('../models/job.model');

async function seedJobs() {
    try {
        console.log('Connecting to database...');
        const db = await dbConfig.getDB();
        
        console.log('Fetching courses...');
        const courses = await courseModel.listAll();
        console.log(`Found ${courses.length} courses.`);

        let newJobs = 0;

        for (const course of courses) {
            // Check if a job already requires this course
            const existingJob = await db.get(`SELECT id FROM jobs WHERE required_course_id = ?`, [course.id]);
            if (!existingJob) {
                console.log(`Creating job for course: ${course.title}`);
                await jobModel.create({
                    title: `Junior ${course.title} Specialist`,
                    company: 'SkillPath Partner Network',
                    location: 'Remote',
                    type: 'Full-time',
                    salary: '$40k - $60k',
                    category: course.category || 'Technology',
                    description: `We are looking for a highly motivated individual who has completed the ${course.title} certification to join our partner network. You will apply the skills you learned to real-world projects.`,
                    requirements: [
                        `Must have completed the ${course.title} course on SkillPath Academy`,
                        'Strong problem-solving skills',
                        'Ability to work independently in a remote environment'
                    ],
                    responsibilities: [
                        'Apply course concepts to live business challenges',
                        'Collaborate with senior team members',
                        'Participate in daily stand-up meetings'
                    ],
                    benefits: [
                        'Fully remote work',
                        'Flexible hours',
                        'Continuous learning stipend'
                    ],
                    requiredCourseId: course.id
                });
                newJobs++;
            } else {
                console.log(`Job already exists for course: ${course.title} (Skipping)`);
            }
        }

        console.log(`\nSuccess! Created ${newJobs} new jobs.`);
        process.exit(0);
    } catch (err) {
        console.error('Error seeding jobs:', err);
        process.exit(1);
    }
}

seedJobs();
