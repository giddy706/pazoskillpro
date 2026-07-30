// ============================================
// pazoskill - Main JavaScript
// ============================================

window.API_BASE_URL = window.API_BASE_URL || 'https://pazoskillpro-backend.onrender.com';

// ---- Traffic Tracking ----
document.addEventListener('DOMContentLoaded', function () {
    // Send page view to backend tracker
    fetch((window.API_BASE_URL || '') + '/api/traffic/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            page_url: window.location.pathname + window.location.search,
            page_title: document.title,
            referrer: document.referrer || ''
        })
    }).catch(() => {});
});

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            
            // Animate hamburger menu
            const spans = menuToggle.querySelectorAll('span');
            if (navMenu.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (navMenu && menuToggle) {
            if (!navMenu.contains(event.target) && !menuToggle.contains(event.target)) {
                navMenu.classList.remove('active');
                const spans = menuToggle.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        }
    });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar scroll effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    }
    
    lastScroll = currentScroll;
});

// Form validation helper
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[0-9]{10}$/;
    return re.test(phone.replace(/\s/g, ''));
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('currentUser') !== null;
}

// Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

// Logout function
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Update navigation based on login status
function updateNavigation() {
    const navMenu = document.getElementById('navMenu');
    if (!navMenu) return;
    
    const user = getCurrentUser();
    const loginBtn = navMenu.querySelector('a[href="login.html"]');
    const registerBtn = navMenu.querySelector('a[href="register.html"]');
    
    if (user && loginBtn && registerBtn) {
    loginBtn.parentElement.innerHTML = `<a href="dashboard.html" class="btn btn-primary btn-small">Dashboard</a>`;
        registerBtn.parentElement.innerHTML = `<a href="#" onclick="logout()" class="btn btn-outline btn-small">Logout</a>`;
    }
}

// Call on page load
document.addEventListener('DOMContentLoaded', updateNavigation);

// ============================================
// Tawk.to Live Chat Widget
// ============================================
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/6a638c89846c4d1d49b05bb2/1juadq0a9';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
if(s0) { s0.parentNode.insertBefore(s1,s0); }
else { document.head.appendChild(s1); }
})();

// ============================================
// Dark / Light Theme Toggle Widget
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('themePreference');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'theme-toggle-btn';
    toggleBtn.id = 'themeToggleBtn';
    toggleBtn.setAttribute('aria-label', 'Toggle Dark/Light Mode');
    toggleBtn.innerHTML = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
    
    document.body.appendChild(toggleBtn);

    toggleBtn.addEventListener('click', function() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        toggleBtn.innerHTML = isDark ? '☀️' : '🌙';
        localStorage.setItem('themePreference', isDark ? 'dark' : 'light');
    });
});

// ============================================
// Scroll Reveal Animation
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15
    });
    
    revealElements.forEach(element => {
        revealObserver.observe(element);
    });
});

