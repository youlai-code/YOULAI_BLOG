const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAdmin } = require('../middlewares/auth');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const r2Service = require('../services/r2.service');
const aiService = require('../services/ai.service');

const PUBLIC_DIR = path.join(__dirname, '../../public');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files allowed (jpg, jpeg, png, gif, webp)'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

router.post('/upload-image', requireAdmin, upload.single('image'), asyncHandler(async (req, res) => {
    const result = await r2Service.uploadImage(req.file);
    res.json({
        success: true,
        url: result.url,
        filename: result.filename
    });
}));

router.post('/ai-generate', requireAdmin, asyncHandler(async (req, res) => {
    const { content } = req.body;
    
    if (!content) {
        throw new AppError('NO_CONTENT', 400);
    }
    
    const metaData = await aiService.generateMetadata(content);
    res.json({
        success: true,
        data: metaData
    });
}));

router.post('/ai-image', requireAdmin, asyncHandler(async (req, res) => {
    const { prompt, size, n, model } = req.body;
    
    if (!prompt) {
        throw new AppError('NO_PROMPT', 400);
    }
    
    const result = await aiService.generateImage(prompt, { size, n, model });
    res.json({
        success: true,
        data: result
    });
}));

router.get('/ai-models', requireAdmin, asyncHandler(async (req, res) => {
    const models = aiService.getAvailableModels();
    res.json({
        success: true,
        data: models
    });
}));

router.get('/images', requireAdmin, asyncHandler(async (req, res) => {
    const imgDir = path.join(PUBLIC_DIR, 'img');
    const images = [];
    
    if (fs.existsSync(imgDir)) {
        const files = fs.readdirSync(imgDir);
        const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        
        files.forEach(file => {
            const ext = path.extname(file).toLowerCase();
            if (allowedExts.includes(ext)) {
                const filePath = path.join(imgDir, file);
                const stats = fs.statSync(filePath);
                images.push({
                    name: file,
                    url: `/img/${file}`,
                    size: stats.size,
                    modified: stats.mtime
                });
            }
        });
    }
    
    images.sort((a, b) => b.modified - a.modified);
    
    res.json({
        success: true,
        data: images
    });
}));

module.exports = router;
