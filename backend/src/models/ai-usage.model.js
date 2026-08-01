const { getDB } = require('../config/database');

async function record(data) {
    const db = await getDB();
    const result = await db.run(
        `INSERT INTO ai_usage (user_id, user_name, mode, model, endpoint, prompt_tokens, completion_tokens, total_tokens, status, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.user_id || null, data.user_name || '', data.mode || 'tutor', data.model || '',
         data.endpoint || '', data.prompt_tokens || 0, data.completion_tokens || 0,
         data.total_tokens || 0, data.status || 'success', data.error_message || '']
    );
    return result.lastID;
}

async function getSummary() {
    const db = await getDB();
    const totals = await db.get(`SELECT
        COUNT(*) as total_calls,
        COALESCE(SUM(prompt_tokens),0) as total_prompt_tokens,
        COALESCE(SUM(completion_tokens),0) as total_completion_tokens,
        COALESCE(SUM(total_tokens),0) as total_tokens,
        COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END),0) as successful,
        COALESCE(SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END),0) as failed
        FROM ai_usage`);

    const perUser = await db.all(`SELECT
        COALESCE(user_name, 'Unknown') as user_name,
        COUNT(*) as calls,
        COALESCE(SUM(total_tokens),0) as tokens,
        COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END),0) as successful
        FROM ai_usage
        GROUP BY user_id, user_name
        ORDER BY tokens DESC LIMIT 15`);

    const byMode = await db.all(`SELECT
        mode,
        COUNT(*) as calls,
        COALESCE(SUM(total_tokens),0) as tokens
        FROM ai_usage
        GROUP BY mode
        ORDER BY calls DESC`);

    const daily = await db.all(`SELECT
        date(created_at) as date,
        COUNT(*) as calls,
        COALESCE(SUM(total_tokens),0) as tokens
        FROM ai_usage
        GROUP BY date(created_at)
        ORDER BY date DESC LIMIT 14`);

    const recent = await db.all(`SELECT * FROM ai_usage ORDER BY id DESC LIMIT 25`);

    return { totals, perUser, byMode, daily, recent };
}

module.exports = { record, getSummary };
