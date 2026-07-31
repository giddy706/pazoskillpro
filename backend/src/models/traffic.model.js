const { getDB } = require('../config/database');

const insert = async (data) => {
    const db = await getDB();
    await db.run(
        `INSERT INTO traffic_logs (session_id, ip_address, page_url, page_title, referrer, user_agent, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.sessionId, data.ipAddress || null, data.pageUrl, data.pageTitle || null, data.referrer || null, data.userAgent || null, data.userId ? parseInt(data.userId) : null]
    );
};

const getStats = async () => {
    const db = await getDB();
    const totalRow = await db.get(`SELECT COUNT(*) as count FROM traffic_logs`);
    const totalViews = totalRow.count;

    const uniqueRow = await db.get(`SELECT COUNT(DISTINCT session_id) as count FROM traffic_logs`);
    const uniqueVisitors = uniqueRow.count;

    const topPages = await db.all(
        `SELECT page_url as url, page_title as title, COUNT(*) as views, COUNT(DISTINCT session_id) as visitors
         FROM traffic_logs GROUP BY page_url ORDER BY views DESC LIMIT 10`
    );

    const referrers = await db.all(
        `SELECT referrer, COUNT(*) as count FROM traffic_logs WHERE referrer IS NOT NULL AND referrer != ''
         GROUP BY referrer ORDER BY count DESC LIMIT 10`
    );

    const trafficOverTime = await db.all(
        `SELECT date(timestamp) as date, COUNT(*) as views, COUNT(DISTINCT session_id) as visitors
         FROM traffic_logs WHERE timestamp >= date('now', '-14 days')
         GROUP BY date(timestamp) ORDER BY date(timestamp) ASC`
    );

    return { totalViews, uniqueVisitors, topPages, referrers, trafficOverTime };
};

const getLogs = async (limit = 100) => {
    const db = await getDB();
    return db.all(`SELECT * FROM traffic_logs ORDER BY timestamp DESC LIMIT ?`, [parseInt(limit)]);
};

module.exports = { insert, getStats, getLogs };
