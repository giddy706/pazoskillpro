const ROLES = {
    STUDENT: 'student',
    ADMIN: 'admin',
};

module.exports = {
    ROLES,
    roles: ROLES,
    applicationStatus: {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected',
    },
    enrollmentStatus: {
        ACTIVE: 'active',
        COMPLETED: 'completed',
    },
    jobType: {
        FULL_TIME: 'Full-time',
        PART_TIME: 'Part-time',
        CONTRACT: 'Contract',
        REMOTE: 'Remote',
        INTERNSHIP: 'Internship',
    },
};
