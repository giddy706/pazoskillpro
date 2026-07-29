const prisma = require('../config/prisma');

const insert = async (data) => {
    return prisma.traffic_logs.create({
        data: {
            session_id: data.sessionId,
            ip_address: data.ipAddress,
            page_url: data.pageUrl,
            page_title: data.pageTitle,
            referrer: data.referrer,
            user_agent: data.userAgent,
            user_id: data.userId ? parseInt(data.userId) : null
        }
    });
};

const getStats = async () => {
    const totalViews = await prisma.traffic_logs.count();
    const uniqueVisitorsResult = await prisma.$queryRaw`SELECT COUNT(DISTINCT session_id) as count FROM traffic_logs`;
    const uniqueVisitors = Number(uniqueVisitorsResult[0].count);

    const topPages = await prisma.$queryRaw`
        SELECT page_url as url, page_title as title, COUNT(*) as views, COUNT(DISTINCT session_id) as visitors
        FROM traffic_logs GROUP BY page_url ORDER BY views DESC LIMIT 10
    `;

    const referrers = await prisma.$queryRaw`
        SELECT referrer, COUNT(*) as count FROM traffic_logs
        GROUP BY referrer ORDER BY count DESC LIMIT 10
    `;

    const trafficOverTime = await prisma.$queryRaw`
        SELECT date(timestamp) as date, COUNT(*) as views, COUNT(DISTINCT session_id) as visitors
        FROM traffic_logs WHERE timestamp >= date('now', '-14 days')
        GROUP BY date(timestamp) ORDER BY date(timestamp) ASC
    `;

    return {
        totalViews,
        uniqueVisitors,
        topPages: topPages.map(r => ({ ...r, views: Number(r.views), visitors: Number(r.visitors) })),
        referrers: referrers.map(r => ({ ...r, count: Number(r.count) })),
        trafficOverTime: trafficOverTime.map(r => ({ ...r, views: Number(r.views), visitors: Number(r.visitors) })),
    };
};

const getLogs = async (limit = 100) => {
    return prisma.traffic_logs.findMany({
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit)
    });
};

module.exports = {
    insert,
    getStats,
    getLogs,
};
