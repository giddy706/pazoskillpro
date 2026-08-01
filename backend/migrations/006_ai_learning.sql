PRAGMA foreign_keys = ON;

-- Per-question quiz results for weak-area tracking
CREATE TABLE IF NOT EXISTS student_quiz_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    quiz_id INTEGER,
    course_id INTEGER,
    lesson_id INTEGER,
    question TEXT DEFAULT '',
    topic TEXT DEFAULT '',
    correct INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_course ON student_quiz_results(user_id, course_id);
