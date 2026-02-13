const express = require('express');
const router = express.Router();
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const commentsService = require('../services/comments.service');

router.get('/site', asyncHandler(async (req, res) => {
    const comments = await commentsService.getSiteComments('approved');
    res.json({ success: true, comments: comments.slice().reverse() });
}));

router.post('/site', asyncHandler(async (req, res) => {
    await commentsService.addSiteComment({
        name: req.body?.name,
        contact: req.body?.contact,
        content: req.body?.content
    });
    res.json({ success: true });
}));

router.get('/post/:id', asyncHandler(async (req, res) => {
    const postId = String(req.params.id || '').trim();
    
    if (!postId) {
        throw new AppError('NO_POST_ID', 400);
    }
    
    const comments = await commentsService.getPostComments(postId, 'approved');
    res.json({ success: true, comments: comments.slice().reverse() });
}));

router.post('/post/:id', asyncHandler(async (req, res) => {
    const postId = String(req.params.id || '').trim();
    
    if (!postId) {
        throw new AppError('NO_POST_ID', 400);
    }
    
    await commentsService.addPostComment(postId, {
        name: req.body?.name,
        contact: req.body?.contact,
        content: req.body?.content
    });
    res.json({ success: true });
}));

module.exports = router;
