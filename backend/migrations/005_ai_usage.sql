PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ai_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT DEFAULT '',
    mode TEXT DEFAULT 'tutor',
    model TEXT DEFAULT '',
    endpoint TEXT DEFAULT '',
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    status TEXT DEFAULT 'success',
    error_message TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

INSERT OR IGNORE INTO settings (setting_key, setting_value, description) VALUES
('ai_model', 'gemini-flash-latest', 'Gemini model used by the AI tutor'),
('ai_temperature', '0.7', 'AI creativity / temperature (0.0 - 1.0)'),
('ai_max_tokens', '4096', 'Max tokens per AI response'),
('ai_enabled', '1', 'Enable the AI tutor (1 = on, 0 = off)'),
('ai_lecturer_style', 'warm_professor', 'Personality style of the AI lecturer');
