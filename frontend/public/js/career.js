// Career / Talent Pool helpers (shared by jobs.html and dashboard.html)
(function () {
    'use strict';

    const API = window.API_BASE_URL || 'https://pazoskillpro-backend.onrender.com';

    function token() {
        try {
            return localStorage.getItem('authToken') || localStorage.getItem('token') || '';
        } catch (e) {
            return '';
        }
    }

    function authHeaders(json) {
        const headers = {};
        if (json) headers['Content-Type'] = 'application/json';
        const t = token();
        if (t) headers['Authorization'] = 'Bearer ' + t;
        return headers;
    }

    async function careerFetch(path, options) {
        const res = await fetch(API + path, options);
        let data = {};
        try {
            data = await res.json();
        } catch (e) {
            data = {};
        }
        if (!res.ok) {
            throw new Error(data.message || ('Request failed (' + res.status + ')'));
        }
        return data;
    }

    function esc(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function isLoggedIn() {
        return !!token();
    }

    // ==================== PUBLIC STATS ====================

    async function loadCareerStats() {
        try {
            const res = await careerFetch('/api/career/stats');
            return res.success ? res.stats : null;
        } catch (e) {
            console.error('Failed to load career stats:', e);
            return null;
        }
    }

    function renderCareerStats(containerId, stats) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (!stats) {
            el.innerHTML = '<p style="color:var(--gray);text-align:center;">Career outcomes loading…</p>';
            return;
        }
        const items = [
            { label: 'Students Graduated', value: stats.students_graduated, icon: '🎓' },
            { label: 'Students Seeking Employment', value: stats.students_seeking, icon: '🧭' },
            { label: 'Employer Partners', value: stats.employer_partners, icon: '🤝' },
            { label: 'Interviews Scheduled', value: stats.interviews_scheduled, icon: '🗓️' },
            { label: 'Students Placed', value: stats.students_placed, icon: '✅' },
        ];
        el.innerHTML = items.map(function (item) {
            return `
                <div style="flex:1 1 160px; min-width:150px; text-align:center; padding:1.5rem 1rem; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.10); border-radius:1rem;">
                    <div style="font-size:1.6rem; margin-bottom:0.35rem;">${item.icon}</div>
                    <div style="font-size:2rem; font-weight:700; color:#fff; line-height:1.1;">${esc(item.value)}</div>
                    <div style="font-size:0.8rem; color:rgba(255,255,255,0.65); margin-top:0.3rem; text-transform:uppercase; letter-spacing:0.06em;">${esc(item.label)}</div>
                </div>`;
        }).join('');
    }

    // ==================== AUTHENTICATED PROGRESS ====================

    async function loadCareerProgress() {
        const data = await careerFetch('/api/career/progress', {
            headers: authHeaders(true),
        });
        return data.success ? data.progress : null;
    }

    function stepRow(label, done, waiting) {
        const marker = waiting ? '⏳' : (done ? '✓' : '○');
        return `
            <li style="display:flex; align-items:center; gap:0.6rem; padding:0.55rem 0; border-bottom:1px dashed rgba(128,128,128,0.25);">
                <span style="flex:0 0 auto; width:1.5rem; height:1.5rem; display:inline-flex; align-items:center; justify-content:center; border-radius:50%;
                    ${waiting ? 'background:rgba(255,193,7,0.15); color:#ffc107;' : done ? 'background:rgba(40,199,111,0.15); color:#28c76f;' : 'background:rgba(128,128,128,0.12); color:#888;'}
                    font-size:0.8rem; font-weight:700;">${marker}</span>
                <span style="${waiting ? 'color:#ffc107;' : done ? 'color:var(--text-color,#fff);' : 'color:var(--gray,#888);'}">${esc(label)}</span>
            </li>`;
    }

    // Checklist shown to graduates: career readiness track.
    function buildCareerProgressHtml(progress) {
        const s = progress.steps;
        const rows = [
            stepRow('Course Completed', s.course_completed),
            stepRow('Certificate Earned', s.certificate_earned),
            stepRow('Resume Uploaded', s.resume_uploaded),
            stepRow('Portfolio Uploaded', s.portfolio_uploaded),
            stepRow('Interview Practice', s.interview_practice),
        ];
        if (progress.opportunitiesAvailable) {
            rows.push(stepRow('Job Opportunities Available', true));
        } else {
            rows.push(stepRow('Waiting for Opportunities', progress.waitingForOpportunities, progress.waitingForOpportunities));
        }
        return `
            <div class="card">
                <div class="card-body">
                    <div class="flex-between" style="flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem;">
                        <h3 style="margin:0;">🎯 Career Progress</h3>
                        ${progress.opportunitiesAvailable
                            ? `<a href="jobs.html" class="btn btn-primary btn-small">View New Jobs (${esc(progress.availableJobs)})</a>`
                            : '<span class="badge badge-warning">No openings right now — we’re actively lining up new roles</span>'}
                    </div>
                    <p style="font-size:0.875rem; color:var(--gray); margin-bottom:0.75rem;">
                        Your career readiness track. We notify you the moment a matching opportunity opens.
                    </p>
                    <ul style="list-style:none; margin:0; padding:0;">${rows.join('')}</ul>
                </div>
            </div>`;
    }

    // ==================== TALENT POOL CONTROLS ====================

    async function joinTalentPool(buttonEl) {
        if (!isLoggedIn()) {
            window.location.href = 'login.html';
            return;
        }
        if (buttonEl) {
            buttonEl.disabled = true;
            buttonEl.textContent = 'Joining…';
        }
        try {
            await careerFetch('/api/career/talent-pool/join', {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify({}),
            });
            const progress = await loadCareerProgress();
            renderTalentPoolSection('careerPanel', progress);
            const band = document.getElementById('talentPoolJoinedNote');
            if (band) band.classList.remove('hidden');
        } catch (e) {
            alert('Could not join the talent pool: ' + e.message);
        } finally {
            if (buttonEl) {
                buttonEl.disabled = false;
                buttonEl.textContent = 'Join Talent Pool';
            }
        }
    }

    async function markCareerAction(action, buttonEl) {
        if (buttonEl) {
            buttonEl.disabled = true;
            buttonEl.textContent = 'Saving…';
        }
        try {
            await careerFetch('/api/career/actions', {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify({ action: action }),
            });
            const progress = await loadCareerProgress();
            renderTalentPoolSection('careerPanel', progress);
        } catch (e) {
            alert('Could not save progress: ' + e.message);
            if (buttonEl) {
                buttonEl.disabled = false;
                buttonEl.textContent = 'Mark as Done';
            }
        }
    }

    async function uploadCareerFile(inputEl, kind, statusEl) {
        if (!inputEl || !inputEl.files || !inputEl.files[0]) {
            if (statusEl) statusEl.textContent = 'Please choose a file first.';
            return;
        }
        const file = inputEl.files[0];
        if (file.size > 2 * 1024 * 1024) {
            if (statusEl) statusEl.textContent = 'File too large. Maximum size is 2 MB.';
            return;
        }
        if (statusEl) statusEl.textContent = 'Uploading…';
        const reader = new FileReader();
        reader.onload = async function () {
            try {
                const raw = String(reader.result || '');
                const base64 = raw.indexOf(',') > -1 ? raw.split(',')[1] : raw;
                await careerFetch('/api/career/' + kind, {
                    method: 'POST',
                    headers: authHeaders(true),
                    body: JSON.stringify({ name: file.name, data: base64 }),
                });
                const progress = await loadCareerProgress();
                renderTalentPoolSection('careerPanel', progress);
                if (statusEl) statusEl.textContent = 'Uploaded ✓';
            } catch (e) {
                if (statusEl) statusEl.textContent = 'Upload failed: ' + e.message;
            }
        };
        reader.onerror = function () {
            if (statusEl) statusEl.textContent = 'Could not read the file.';
        };
        reader.readAsDataURL(file);
    }

    function fileRow(label, uploaded, fileName, kind) {
        const hidden = uploaded ? ' style="display:none;"' : '';
        return `
            <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; padding:0.5rem 0; border-bottom:1px dashed rgba(128,128,128,0.25);">
                <span style="flex:1 1 130px; color:var(--gray,#888); font-size:0.9rem;">${esc(label)}</span>
                ${uploaded
                    ? '<span class="badge badge-success">Uploaded ✓</span>'
                    : '<span class="badge badge-warning">Pending</span>'}
                <input type="file" id="${kind}Input" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    style="flex:1 1 200px; font-size:0.8rem; color:var(--gray);"${hidden}>
                <button type="button" class="btn btn-secondary btn-small" id="${kind}Btn"${hidden}
                    onclick="window.careerUpload('${kind}', this)">Upload</button>
                <span id="${kind}Status" style="font-size:0.8rem; color:var(--gray);"></span>
            </div>`;
    }

    function actionButton(action, label, done) {
        if (done) {
            return '<span class="badge badge-success">' + esc(label) + ' ✓</span>';
        }
        return '<button type="button" class="btn btn-outline btn-small" onclick="window.careerMark(\'' + action + '\', this)">' + esc(label) + '</button>';
    }

    function buildTalentPoolHtml(progress, user) {
        const tp = progress.talentPool;
        const joined = !!(tp && tp.status === 'active');
        const s = progress.steps;

        let joinBlock;
        if (!joined) {
            joinBlock = `
                <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap; padding:1rem 0;">
                    <p style="flex:1 1 240px; margin:0; font-size:0.9rem; color:var(--gray);">
                        We're actively partnering with employers. Join the talent pool and we'll notify you the moment
                        opportunities become available.
                    </p>
                    <button type="button" class="btn btn-glow-green" id="joinTalentPoolBtn"
                        onclick="window.careerJoin(this)">Join Talent Pool</button>
                </div>`;
        } else {
            joinBlock = `
                <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap; padding:1rem 0;">
                    <p style="flex:1 1 240px; margin:0; font-size:0.9rem; color:var(--gray);">
                        You're in the talent pool 🎉 ${esc(user || '')}. Keep your profile ready — new roles notify you instantly.
                    </p>
                    <span class="badge badge-success">✓ Member</span>
                </div>`;
        }

        const steps = [
            stepRow('Join Talent Pool', joined),
            stepRow('Upload Resume', s.resume_uploaded),
            stepRow('Upload Portfolio', s.portfolio_uploaded),
            stepRow('AI Resume Review', s.ai_resume_review),
            stepRow('Interview Practice', s.interview_practice),
            stepRow('Career Resources', s.career_resources),
        ];
        if (progress.opportunitiesAvailable) {
            steps.push(stepRow('Available Jobs — apply now', true));
        } else {
            steps.push(stepRow('Available Jobs — currently no openings, we notify you', progress.waitingForOpportunities, true));
        }

        const uploads = [
            fileRow('Resume', s.resume_uploaded, tp && tp.resume_name, 'resume'),
            fileRow('Portfolio', s.portfolio_uploaded, tp && tp.portfolio_name, 'portfolio'),
        ];

        const extraActions = `
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap; padding:0.5rem 0;">
                ${actionButton('ai_resume_review', 'AI Resume Review', s.ai_resume_review)}
                ${actionButton('interview_practice', 'Interview Practice', s.interview_practice)}
                ${actionButton('career_resources', 'Career Resources', s.career_resources)}
            </div>`;

        return `
            <div class="card">
                <div class="card-body">
                    <h3 style="margin:0 0 0.25rem;">🌐 Talent Pool</h3>
                    <p style="font-size:0.875rem; color:var(--gray); margin-bottom:0.5rem;">
                        Get first access to new opportunities and employer outreach.
                    </p>
                    ${joinBlock}
                    <ul style="list-style:none; margin:0.5rem 0; padding:0;">${steps.join('')}</ul>
                    <h4 style="margin:1rem 0 0.25rem;">Prepare your profile</h4>
                    ${uploads.join('')}
                    ${extraActions}
                    <p style="font-size:0.8rem; color:var(--gray); margin-top:0.75rem;">
                        <a href="jobs.html" style="text-decoration:underline;">Browse current jobs</a> · We review resumes and
                        reach out as matching roles open.
                    </p>
                </div>
            </div>`;
    }

    // Full career panel (progress + talent pool) for the dashboard.
    async function renderTalentPoolSection(containerId, progress, user) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const startedCareerPath = progress.steps.course_completed || progress.steps.certificate_earned;
        const html = (startedCareerPath ? buildCareerProgressHtml(progress) : '')
            + buildTalentPoolHtml(progress, user);
        el.innerHTML = html;
    }

    async function initCareerPanel(containerId, user) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = '<p style="color:var(--gray);">Loading your career progress…</p>';
        try {
            const progress = await loadCareerProgress();
            await renderTalentPoolSection(containerId, progress, user);
        } catch (e) {
            el.innerHTML = '<p style="color:var(--gray);">Career progress is unavailable right now.</p>';
        }
    }

    async function initJobsStatsBand(containerId) {
        const stats = await loadCareerStats();
        renderCareerStats(containerId, stats);
    }

    async function loadCareerNotifications() {
        try {
            const data = await careerFetch('/api/career/notifications', {
                headers: authHeaders(true),
            });
            return data.success ? data.notifications : [];
        } catch (e) {
            return [];
        }
    }

    async function renderCareerNotifications(containerId) {
        const el = document.getElementById(containerId);
        if (!el) return;
        try {
            const notifications = await loadCareerNotifications();
            const unread = notifications.filter(function (n) { return n.is_read === 0; });
            if (unread.length) {
                const n = unread[0];
                el.innerHTML = `
                    <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; padding:0.9rem 1.1rem;
                        background:rgba(79,209,232,0.10); border:1px solid rgba(79,209,232,0.35); border-radius:0.75rem;">
                        <span style="font-size:1.3rem;">🔔</span>
                        <span style="flex:1 1 220px; font-size:0.9rem;">
                            <strong>${esc(n.title || 'New opportunity')}</strong> — ${esc(n.message || '')}
                            ${n.jobTitle ? ' (<a href="job-detail.html?id=' + esc(n.job_id) + '" style="text-decoration:underline;">View</a>)' : ''}
                        </span>
                        <button type="button" class="btn btn-outline btn-small" onclick="window.careerDismiss('${esc(containerId)}')">Got it</button>
                    </div>`;
            } else {
                el.innerHTML = '';
            }
        } catch (e) {
            el.innerHTML = '';
        }
    }

    async function dismissNotifications(containerId) {
        try {
            await careerFetch('/api/career/notifications/read', {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify({}),
            });
        } catch (e) { /* non-fatal */ }
        await renderCareerNotifications(containerId);
    }

    // Expose a tiny API for inline onclick handlers.
    window.career = {
        join: joinTalentPool,
        mark: markCareerAction,
        upload: uploadCareerFile,
        markNotificationsRead: renderCareerNotifications,
        dismiss: dismissNotifications,
    };
    window.careerJoin = joinTalentPool;
    window.careerMark = markCareerAction;
    window.careerUpload = uploadCareerFile;
    window.careerMarkNotificationsRead = renderCareerNotifications;
    window.careerDismiss = dismissNotifications;
    window.careerInit = initCareerPanel;
    window.careerInitStats = initJobsStatsBand;
    window.careerInitNotifications = renderCareerNotifications;
    window.loadCareerStats = loadCareerStats;
    window.renderCareerStats = renderCareerStats;
})();
