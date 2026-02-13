const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const adminService = require('../services/admin.service');
const commentsService = require('../services/comments.service');
const postsService = require('../services/posts.service');
const configService = require('../services/config.service');

router.post('/login', asyncHandler(async (req, res) => {
    const { token } = await adminService.login(req.body?.password);
    res.json({ success: true, token });
}));

router.get('/me', requireAdmin, (req, res) => {
    res.json({ success: true });
});

router.get('/comments', requireAdmin, asyncHandler(async (req, res) => {
    const scope = String(req.query.scope || 'all');
    const status = String(req.query.status || 'pending');
    const postId = String(req.query.postId || '').trim();
    
    const data = await commentsService.getAdminComments(scope, status, postId);
    res.json({ success: true, data });
}));

router.post('/comments/moderate', requireAdmin, asyncHandler(async (req, res) => {
    const scope = String(req.body?.scope || '').trim();
    const action = String(req.body?.action || '').trim();
    const commentId = String(req.body?.commentId || '').trim();
    const postId = String(req.body?.postId || '').trim();
    
    await commentsService.moderateComment(scope, commentId, action, postId || null);
    res.json({ success: true });
}));

router.get('/dashboard', requireAdmin, asyncHandler(async (req, res) => {
    const [posts, columns, comments, visits] = await Promise.all([
        postsService.getAllPosts(),
        configService.getColumns(),
        commentsService.getCommentsStore(),
        configService.getVisits()
    ]);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const postsByMonth = {};
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        last12Months.push(key);
        postsByMonth[key] = 0;
    }

    posts.forEach(post => {
        if (post.date) {
            try {
                const dateStr = post.date.replace(/\./g, '-').split(' ')[0];
                const monthKey = dateStr.substring(0, 7);
                if (postsByMonth.hasOwnProperty(monthKey)) {
                    postsByMonth[monthKey]++;
                }
            } catch (e) {}
        }
    });

    const siteComments = comments.site || [];
    const postComments = Object.values(comments.posts || {}).flat();

    const recentComments = [...siteComments, ...postComments]
        .filter(c => c.createdAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .map(c => ({
            id: c.id,
            postId: c.postId || null,
            name: c.name,
            content: c.content?.substring(0, 100),
            createdAt: c.createdAt,
            status: c.status,
            scope: c.postId ? 'post' : 'site'
        }));

    const pendingSiteComments = siteComments.filter(c => c.status === 'pending').length;
    const pendingPostComments = postComments.filter(c => c.status === 'pending').length;

    const postsByColumn = {};
    const columnMap = {};
    columns.forEach(col => {
        postsByColumn[col.id] = 0;
        columnMap[col.id] = col.name;
    });
    postsByColumn[''] = 0;
    columnMap[''] = '未分类';

    posts.forEach(post => {
        const colId = post.columnId || '';
        if (postsByColumn.hasOwnProperty(colId)) {
            postsByColumn[colId]++;
        } else {
            postsByColumn['']++;
        }
    });

    const recentPosts = posts.slice(0, 5).map(p => ({
        id: p.id,
        title: p.title,
        date: p.date,
        columnId: p.columnId
    }));

    const columnStats = Object.entries(postsByColumn)
        .filter(([id, count]) => count > 0)
        .map(([id, count]) => ({
            id,
            name: columnMap[id] || id,
            count
        }))
        .sort((a, b) => b.count - a.count);

    res.json({
        success: true,
        data: {
            overview: {
                totalPosts: posts.length,
                totalColumns: columns.length,
                totalVisits: visits.count || 0,
                totalSiteComments: siteComments.length,
                totalPostComments: postComments.length,
                pendingComments: pendingSiteComments + pendingPostComments
            },
            postsByMonth: last12Months.map(month => ({
                month,
                count: postsByMonth[month]
            })),
            columnStats,
            recentPosts,
            recentComments
        }
    });
}));

module.exports = router;
