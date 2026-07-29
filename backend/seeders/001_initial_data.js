const bcrypt = require('bcryptjs');

async function seed(db) {
    const adminCheck = await db.get("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
    if (adminCheck) return;

    const hash = await bcrypt.hash('Admin123!', 10);
    await db.run(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Administrator', 'admin@skillpath.com', hash, 'admin']
    );

    const initialCourses = [
        {
            title: "Full Stack Web Development",
            category: "IT & Programming",
            description: "Master HTML, CSS, JavaScript, React, Node.js and build real-world applications from scratch.",
            duration: "12 Weeks",
            price: 25000,
            image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop",
            instructor: "David Kariuki",
            level: "Beginner to Advanced",
            rating: 4.8,
            requirements: ["Basic computer skills", "Internet connection"],
            outcomes: ["Build full-stack web applications", "Create responsive websites", "Work with databases", "Deploy applications to production"],
            lessons: ["HTML5 & CSS3 Fundamentals", "JavaScript ES6+", "React.js & State Management", "Node.js & Express", "MongoDB Database", "RESTful APIs", "Authentication & Security", "Deployment & DevOps"]
        },
        {
            title: "Digital Marketing Mastery",
            category: "Marketing",
            description: "Learn SEO, social media marketing, email campaigns, and analytics to grow any business online.",
            duration: "8 Weeks",
            price: 18000,
            image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop",
            instructor: "Grace Wanjiru",
            level: "Beginner",
            rating: 4.7,
            requirements: ["Basic internet knowledge"],
            outcomes: ["Run successful marketing campaigns", "Increase online visibility", "Generate leads", "Analyze marketing data"],
            lessons: ["Digital Marketing Fundamentals", "SEO & Content Marketing", "Social Media Marketing", "Email Marketing", "Google Ads & PPC", "Analytics & Reporting", "Marketing Strategy", "Campaign Management"]
        },
        {
            title: "Data Analytics & Visualization",
            category: "Data Science",
            description: "Transform raw data into actionable insights using Excel, SQL, Python, and Power BI.",
            duration: "10 Weeks",
            price: 22000,
            image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop",
            instructor: "Peter Ochieng",
            level: "Intermediate",
            rating: 4.9,
            requirements: ["Basic Excel knowledge", "Analytical mindset"],
            outcomes: ["Analyze complex datasets", "Create interactive dashboards", "Make data-driven decisions", "Present insights effectively"],
            lessons: ["Excel for Data Analysis", "SQL Database Queries", "Python for Data Science", "Data Cleaning & Preparation", "Statistical Analysis", "Power BI Dashboards", "Data Visualization", "Business Intelligence"]
        },
        {
            title: "Graphic Design & Branding",
            category: "Design",
            description: "Master Adobe Creative Suite and create stunning visual designs for print and digital media.",
            duration: "8 Weeks",
            price: 20000,
            image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=200&fit=crop",
            instructor: "Ann Muthoni",
            level: "Beginner",
            rating: 4.6,
            requirements: ["Creative mindset", "Computer with Adobe software"],
            outcomes: ["Design professional graphics", "Create brand identities", "Work with clients", "Build design portfolio"],
            lessons: ["Design Principles", "Adobe Photoshop", "Adobe Illustrator", "Adobe InDesign", "Logo Design", "Brand Identity", "Print Design", "Digital Graphics"]
        },
        {
            title: "Mobile App Development",
            category: "IT & Programming",
            description: "Build native mobile applications for iOS and Android using React Native.",
            duration: "14 Weeks",
            price: 28000,
            image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=200&fit=crop",
            instructor: "Michael Kimani",
            level: "Intermediate",
            rating: 4.8,
            requirements: ["JavaScript knowledge", "React basics"],
            outcomes: ["Build cross-platform apps", "Publish to app stores", "Integrate APIs", "Monetize applications"],
            lessons: ["React Native Basics", "Mobile UI/UX Design", "Navigation & Routing", "State Management", "API Integration", "Push Notifications", "App Deployment", "App Store Optimization"]
        },
        {
            title: "Cybersecurity Fundamentals",
            category: "IT & Security",
            description: "Learn to protect systems, networks, and data from cyber threats and attacks.",
            duration: "10 Weeks",
            price: 24000,
            image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=200&fit=crop",
            instructor: "John Mwangi",
            level: "Intermediate",
            rating: 4.7,
            requirements: ["Basic networking knowledge", "IT fundamentals"],
            outcomes: ["Identify security threats", "Implement security measures", "Conduct security audits", "Respond to incidents"],
            lessons: ["Security Fundamentals", "Network Security", "Ethical Hacking", "Vulnerability Assessment", "Incident Response", "Security Tools", "Compliance & Standards", "Risk Management"]
        }
    ];

    for (const course of initialCourses) {
        const result = await db.run(
            `INSERT INTO courses (title, category, description, duration, price, image, instructor, level, rating, requirements, outcomes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                course.title, course.category, course.description, course.duration, course.price,
                course.image, course.instructor, course.level, course.rating,
                JSON.stringify(course.requirements), JSON.stringify(course.outcomes)
            ]
        );
        const courseId = result.lastID;
        for (let i = 0; i < course.lessons.length; i++) {
            await db.run(
                `INSERT INTO lessons (course_id, title, order_index) VALUES (?, ?, ?)`,
                [courseId, course.lessons[i], i + 1]
            );
        }
    }

    const initialJobs = [
        {
            title: "Junior Web Developer",
            company: "TechSolutions Kenya",
            location: "Nairobi, Kenya",
            type: "Full-time",
            salary: "KSH 60,000 - 80,000",
            category: "IT & Programming",
            description: "We're looking for a passionate junior web developer to join our growing team.",
            requirements: ["Proficiency in HTML, CSS, JavaScript", "Experience with React or Vue.js", "Good communication skills"],
            responsibilities: ["Develop and maintain web applications", "Collaborate with design team", "Write clean code"],
            benefits: ["Health insurance", "Professional development", "Flexible hours"],
            requiredCourseTitle: "Full Stack Web Development"
        },
        {
            title: "Digital Marketing Specialist",
            company: "GrowthHub Agency",
            location: "Nairobi, Kenya",
            type: "Full-time",
            salary: "KSH 50,000 - 70,000",
            category: "Marketing",
            description: "Join our dynamic marketing agency and help businesses grow their online presence.",
            requirements: ["2+ years in digital marketing", "SEO and SEM expertise", "Excellent writing skills"],
            responsibilities: ["Plan and execute marketing campaigns", "Manage social media accounts", "Optimize SEO strategies"],
            benefits: ["Performance bonuses", "Training opportunities", "Modern office"],
            requiredCourseTitle: "Digital Marketing Mastery"
        },
        {
            title: "Data Analyst",
            company: "DataInsights Ltd",
            location: "Nairobi, Kenya",
            type: "Full-time",
            salary: "KSH 70,000 - 90,000",
            category: "Data Science",
            description: "We need a detail-oriented data analyst to help our clients make data-driven business decisions.",
            requirements: ["Strong SQL skills", "Python or R programming", "Business acumen"],
            responsibilities: ["Analyze complex datasets", "Create data visualizations", "Generate insights and reports"],
            benefits: ["Competitive salary", "Health coverage", "Learning budget"],
            requiredCourseTitle: "Data Analytics & Visualization"
        }
    ];

    for (const job of initialJobs) {
        const courseRow = await db.get("SELECT id FROM courses WHERE title = ?", [job.requiredCourseTitle]);
        await db.run(
            `INSERT INTO jobs (title, company, location, type, salary, category, description, requirements, responsibilities, benefits, required_course_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                job.title, job.company, job.location, job.type, job.salary, job.category, job.description,
                JSON.stringify(job.requirements), JSON.stringify(job.responsibilities), JSON.stringify(job.benefits),
                courseRow ? courseRow.id : null
            ]
        );
    }
}

module.exports = { seed };
