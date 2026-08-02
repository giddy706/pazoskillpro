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

// Normalize the user object so both `name` and `fullName` always exist.
function normalizeUser(user) {
    if (!user) return user;
    return {
        ...user,
        fullName: user.fullName || user.name || '',
        name: user.name || user.fullName || '',
    };
}

// Store the current user (normalized) into localStorage.
function saveCurrentUser(user) {
    if (user) localStorage.setItem('currentUser', JSON.stringify(normalizeUser(user)));
}

// Authenticated fetch - automatically attaches Bearer token
async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}) };
    if (options.body) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch((window.API_BASE_URL || '') + url, { ...options, headers });
}

// Helper to sync user session from backend to localStorage
async function syncUserSession() {
    try {
        const response = await authFetch('/api/auth/me');
        const data = await response.json();
        if (data.success) {
            saveCurrentUser(data.user);
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
            saveCurrentUser(result.user);
            return { success: true, message: result.message, user: result.user };
        } else {
            return { success: false, message: result.message || 'Registration failed' };
        }
    } catch (err) {
        console.error('Registration failed:', err);
        return { success: false, message: 'Could not connect to the server. Please try again later.' };
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
            saveCurrentUser(result.user);
            return {
                success: true,
                message: result.message,
                user: result.user,
                token: result.token
            };
        } else {
            return { success: false, message: result.message || 'Login failed' };
        }
    } catch (err) {
        console.error('Backend login failed:', err);
        return { success: false, message: 'Could not connect to backend server. Please try again later.' };
    }
}

// Enroll in course
async function enrollInCourse(courseId, promoCode) {
    try {
        const body = promoCode ? { promo_code: promoCode } : {};
        const response = await authFetch(`/api/courses/${courseId}/enroll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
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
        console.error('Enrollment failed:', err);
        return { success: false, message: 'Could not connect to the server. Please try again later.' };
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
        console.error('Progress update failed:', err);
        return { success: false, message: 'Could not connect to the server. Please try again later.' };
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
        console.error('Job application failed:', err);
        return { success: false, message: 'Could not connect to the server. Please try again later.' };
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
    if (!userStr) return null;
    try { return normalizeUser(JSON.parse(userStr)); } catch { return null; }
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
