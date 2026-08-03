PRAGMA foreign_keys = ON;

-- Talent pool membership + resume/portfolio uploads
CREATE TABLE IF NOT EXISTS talent_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    resume_name TEXT DEFAULT '',
    resume_data TEXT DEFAULT '',
    portfolio_name TEXT DEFAULT '',
    portfolio_data TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Career readiness actions a student completes (resume review, interview practice, resources)
CREATE TABLE IF NOT EXISTS career_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    done_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, action),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Per-user notifications fired when a new opportunity becomes available
CREATE TABLE IF NOT EXISTS career_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT DEFAULT '',
    message TEXT DEFAULT '',
    job_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE SET NULL
);

-- Career outcome statistics (admin-editable via settings)
INSERT OR IGNORE INTO settings (setting_key, setting_value, description) VALUES
('career_students_graduated', '350', 'Career stats: students graduated'),
('career_students_seeking', '180', 'Career stats: students seeking employment'),
('career_employer_partners', '12', 'Career stats: employer partners'),
('career_interviews_scheduled', '25', 'Career stats: interviews scheduled'),
('career_students_placed', '8', 'Career stats: students placed');
