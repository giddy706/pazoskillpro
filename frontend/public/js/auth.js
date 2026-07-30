// ============================================
// pazoskill - Authentication System (Backend Connected)
// ============================================

// --- Config ---
window.API_BASE_URL = window.API_BASE_URL || 'https://pazoskillpro-backend.onrender.com';

// --- Token Helpers ---
function getToken() {
    return localStorage.getItem('authToken');
}

function saveToken(token) {
    if (token) localStorage.setItem('authToken', token);
}

function clearToken() {
    localStorage.removeItem('authToken');
}

// Authenticated fetch - automatically attaches Bearer token
async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch((window.API_BASE_URL || '') + url, { ...options, headers });
}

// Helper to sync user session from backend to localStorage
async function syncUserSession() {
    try {
        const response = await authFetch('/api/auth/me');
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            return data.user;
        } else {
            localStorage.removeItem('currentUser');
            return null;
        }
    } catch (e) {
        // If offline or error, return cached user and ensure derived fields exist
        const cached = localStorage.getItem('currentUser');
        if (cached) {
            const user = JSON.parse(cached);
            // Initialise collections to avoid undefined errors
            user.enrolledCourses = user.enrolledCourses || [];
            user.completedCourses = (user.enrolledCourses).filter(c => c.completed);
            user.certificates = user.certificates || [];
            user.jobApplications = user.jobApplications || [];
            return user;
        }
        return null;
    }
}

// Sync session on load
document.addEventListener('DOMContentLoaded', () => {
    syncUserSession().then(() => {
        if (typeof updateNavigation === 'function') {
            updateNavigation();
        }
    });
});

// Register new user
async function registerUser(userData) {
    try {
        const response = await fetch((window.API_BASE_URL || '') + '/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        const result = await response.json();
        if (result.success) {
            saveToken(result.token);
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            return { success: true, message: result.message, user: result.user };
        } else {
            return { success: false, message: result.message };
        }
    } catch (err) {
        console.warn('Backend unavailable, falling back to local storage mock');
        const mockUser = {
            id: Date.now(),
            name: userData.fullName || userData.email.split('@')[0],
            email: userData.email,
            role: 'student',
            enrolledCourses: [],
            certificates: [],
            jobApplications: []
        };
        localStorage.setItem('currentUser', JSON.stringify(mockUser));
        return { success: true, message: 'Registration successful (Offline Mode)', user: mockUser };
    }
}

// Login user
async function loginUser(email, password) {
    try {
        const response = await fetch((window.API_BASE_URL || '') + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        if (result.success) {
    saveToken(result.token);
    localStorage.setItem('currentUser', JSON.stringify(result.user));

    return {
        success: true,
        message: result.message,
        user: result.user,
        token: result.token
    };
}
    } catch (err) {
        console.warn('Backend unavailable, falling back to local storage mock');
        const mockUser = {
            id: Date.now(),
            name: email.split('@')[0],
            email: email,
            role: 'student',
            enrolledCourses: [],
            certificates: [],
            jobApplications: []
        };
        localStorage.setItem('currentUser', JSON.stringify(mockUser));
        return { success: true, message: 'Login successful (Offline Mode)', user: mockUser };
    }
}

// Enroll in course
async function enrollInCourse(courseId) {
    try {
        const response = await authFetch(`/api/courses/${courseId}/enroll`, {
            method: 'POST'
        });
        const result = await response.json();
        if (result.success) {
            // Re-sync profile to get updated enrollments
            await syncUserSession();
            return { success: true, message: result.message };
        } else {
            return { success: false, message: result.message };
        }
    } catch (err) {
        console.warn('Backend unavailable, falling back to local storage mock');
        const user = getCurrentUser();
        if (user) {
            if (!user.enrolledCourses) user.enrolledCourses = [];
            // Already enrolled? skip duplicate
            if (user.enrolledCourses.find(e => e.course_id == courseId)) {
                return { success: true, message: 'Already enrolled (Offline Mode)' };
            }
            // Look up real course title and curriculum from in-memory data or localStorage
            let courseTitle = 'Course';
            let lessons = [
                { id: 1, title: 'Introduction', completed: false },
                { id: 2, title: 'Core Concepts', completed: false },
                { id: 3, title: 'Final Assessment', completed: false }
            ];
            // coursesData is defined in data.js and loaded before auth.js
            if (typeof coursesData !== 'undefined') {
                const found = coursesData.find(c => c.id == courseId);
                if (found) {
                    courseTitle = found.title;
                    lessons = found.curriculum.map((item, i) => ({
                        id: i + 1,
                        title: typeof item === 'string' ? item : (item.title || `Lesson ${i + 1}`),
                        completed: false
                    }));
                }
            } else {
                // Fallback: try localStorage
                try {
                    const stored = JSON.parse(localStorage.getItem('courses') || '[]');
                    const found = stored.find(c => c.id == courseId);
                    if (found) {
                        courseTitle = found.title;
                        lessons = (found.curriculum || []).map((item, i) => ({
                            id: i + 1,
                            title: typeof item === 'string' ? item : (item.title || `Lesson ${i + 1}`),
                            completed: false
                        }));
                    }
                } catch (_) {}
            }
            user.enrolledCourses.push({
                id: Date.now(),
                course_id: courseId,
                courseTitle,
                enrolledDate: new Date().toISOString(),
                completed: false,
                progress: 0,
                lessons
            });
            updateCurrentUser(user);
        }
        return { success: true, message: 'Enrolled successfully (Offline Mode)' };
    }
}

// Update lesson progress
async function updateLessonProgress(courseId, lessonId) {
    try {
        const response = await authFetch(`/api/courses/${courseId}/lessons/${lessonId}/complete`, {
            method: 'POST'
        });
        const result = await response.json();
        if (result.success) {
            // Re-sync profile to get updated progress in localStorage
            const user = await syncUserSession();
            return { 
                success: true, 
                progress: result.progress, 
                completed: result.completed,
                user
            };
        } else {
            return { success: false, message: result.message };
        }
    } catch (err) {
        console.warn('Backend unavailable, falling back to local storage mock');
        let progress = 0;
        let completed = false;
        const user = getCurrentUser();
        if (user) {
            const enrollment = user.enrolledCourses && user.enrolledCourses.find(e => e.course_id == courseId);
            if (enrollment) {
                const lesson = enrollment.lessons.find(l => l.id == lessonId);
                if (lesson) lesson.completed = true;
                
                const completedCount = enrollment.lessons.filter(l => l.completed).length;
                progress = Math.round((completedCount / enrollment.lessons.length) * 100);
                enrollment.progress = progress;
                
                if (progress === 100 && !enrollment.completed) {
                    enrollment.completed = true;
                    completed = true;
                    if (!user.certificates) user.certificates = [];
                    user.certificates.push({
                        id: Date.now(),
                        courseId: courseId,
                        courseTitle: enrollment.courseTitle,
                        issuedDate: new Date().toISOString()
                    });
                }
                updateCurrentUser(user);
            }
        }
        return { success: true, progress, completed, user };
    }
}

// Apply for job
async function applyForJob(jobId, applicationData) {
    try {
        const response = await authFetch(`/api/jobs/${jobId}/apply`, {
            method: 'POST',
            body: JSON.stringify(applicationData)
        });
        const result = await response.json();
        if (result.success) {
            // Re-sync profile to get updated applications in localStorage
            await syncUserSession();
            return { success: true, message: result.message };
        } else {
            return { success: false, message: result.message };
        }
    } catch (err) {
        console.warn('Backend unavailable, falling back to local storage mock');
        const user = getCurrentUser();
        if (user) {
            if (!user.jobApplications) user.jobApplications = [];
            user.jobApplications.push({
                id: Date.now(),
                job_id: jobId,
                jobTitle: 'Job Application',
                company: 'Company',
                status: 'pending',
                appliedDate: new Date().toISOString()
            });
            updateCurrentUser(user);
        }
        return { success: true, message: 'Application submitted (Offline Mode)' };
    }
}

// Logout function
async function logout() {
    try {
        await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
        // Ignore network errors on logout
    }
    clearToken();
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Get user profile functions (sync wrappers around localStorage)
function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

function updateCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

function getEnrolledCourses() {
    const user = getCurrentUser();
    return user ? user.enrolledCourses : [];
}

function getCertificates() {
    const user = getCurrentUser();
    return user ? user.certificates : [];
}

function getJobApplications() {
    const user = getCurrentUser();
    return user ? user.jobApplications : [];
}
