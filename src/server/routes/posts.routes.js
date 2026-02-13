const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middlewares/auth');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const postsService = require('../services/posts.service');
const { isValidPostId } = require('../utils/paths');

router.get('/', (req, res) => {
    const posts = postsService.getAllPosts();
    res.json(posts);
});

router.post('/upload', requireAdmin, asyncHandler(async (req, res) => {
    const { title, id, date, tags, summary, content, cover, columnId } = req.body;
    
    if (!id) {
        throw new AppError('NO_POST_ID', 400);
    }
    
    console.log(`[API] Upload request received for ${id}.`);
    
    await postsService.savePost({ title, id, date, tags, summary, content, cover, columnId });
    console.log(`[SUCCESS] Article ${id} saved.`);
    
    res.json({ success: true, message: 'MISSION ACCOMPLISHED' });
}));

router.post('/delete', requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.body;
    
    if (!id) {
        throw new AppError('NO_POST_ID', 400);
    }
    
    if (!isValidPostId(id)) {
        throw new AppError('INVALID_POST_ID', 400);
    }
    
    console.log(`[API] Delete request for ${id}.`);
    
    postsService.deletePost(id);
    console.log(`[DELETED] Article ${id} removed.`);
    
    res.json({ success: true });
}));

router.get('/sitemap.xml', (req, res) => {
    const baseUrl = process.env.SITE_URL || 'https://youlainote.cn';
    const xml = postsService.generateSitemap(baseUrl);
    res.header('Content-Type', 'application/xml');
    res.send(xml);
});

module.exports = router;
