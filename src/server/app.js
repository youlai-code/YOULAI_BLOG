const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { requireAdmin } = require('./middlewares/auth');
const postsService = require('./services/posts.service');
const { isValidPostId } = require('./utils/paths');

const PUBLIC_DIR = path.join(__dirname, '../../public');
const DATA_DIR = path.join(__dirname, '../../data');
const VISIT_FILE = path.join(DATA_DIR, 'visits.json');

function createApp() {
    const app = express();

    app.use(cors());
    app.use(express.json({ limit: '50mb' }));

    app.get('/', async (req, res, next) => {
        try {
            const baseDomain = process.env.BASE_DOMAIN || 'youlainote.cn';
            const postId = extractPostIdFromSubdomain(req.hostname, baseDomain);
            
            if (postId) {
                const html = await postsService.renderPostPage(req, postId);
                if (html) {
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    return res.send(html);
                }
            }
            res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
        } catch (e) {
            next(e);
        }
    });

    app.use(express.static(PUBLIC_DIR));

    app.get('/posts.json', (req, res) => {
        const posts = postsService.getAllPosts();
        res.json(posts);
    });

    app.get('/sitemap.xml', (req, res) => {
        const baseUrl = process.env.SITE_URL || 'https://youlainote.cn';
        const xml = postsService.generateSitemap(baseUrl);
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    });

    app.get('/config.json', (req, res) => {
        res.sendFile(path.join(PUBLIC_DIR, 'config.json'));
    });

    app.get(['/columns', '/columns/'], (req, res) => {
        res.sendFile(path.join(PUBLIC_DIR, 'columns.html'));
    });

    app.get(['/message-board', '/message-board/'], (req, res) => {
        res.sendFile(path.join(PUBLIC_DIR, 'message-board.html'));
    });

    const adminRoutes = require('./routes/admin.routes');
    const postsRoutes = require('./routes/posts.routes');
    const commentsRoutes = require('./routes/comments.routes');
    const columnsRoutes = require('./routes/columns.routes');
    const portfolioRoutes = require('./routes/portfolio.routes');
    const uploadRoutes = require('./routes/upload.routes');
    const configRoutes = require('./routes/config.routes');

    app.use('/api/admin', adminRoutes);
    app.use('/api', postsRoutes);
    app.use('/api/comments', commentsRoutes);
    app.use('/api/columns', columnsRoutes);
    app.use('/api/portfolio', portfolioRoutes);
    app.use('/api', uploadRoutes);
    app.use('/', configRoutes);

    app.get('/posts/:id', async (req, res, next) => {
        const id = req.params.id;

        if (id.endsWith('.md')) {
            const filePath = path.join(PUBLIC_DIR, 'posts', id);
            if (fs.existsSync(filePath)) {
                return res.sendFile(filePath);
            } else {
                return res.status(404).send('Post not found');
            }
        }

        if (id.includes('.')) {
            return next();
        }

        if (!isValidPostId(id)) {
            return res.status(400).json({ success: false, message: 'INVALID_POST_ID' });
        }

        if (postsService.postExists(id)) {
            try {
                const html = await postsService.renderPostPage(req, id);
                if (html) {
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    return res.send(html);
                }
            } catch (e) {
                return next(e);
            }
        }
        
        next();
    });

    app.use('/posts', express.static(path.join(PUBLIC_DIR, 'posts')));

    app.get('/api/visit', (req, res) => {
        fs.readFile(VISIT_FILE, 'utf8', (err, data) => {
            let count = 0;
            if (!err && data) {
                try {
                    count = JSON.parse(data).count || 0;
                } catch (e) {}
            }
            
            count++;
            
            fs.writeFile(VISIT_FILE, JSON.stringify({ count }), (err) => {
                if (err) console.error('Write visit file failed:', err);
            });
            
            res.json({ count });
        });
    });

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}

function extractPostIdFromSubdomain(hostname, baseDomain) {
    if (!hostname || !baseDomain) return '';
    const host = hostname.toLowerCase();
    const base = baseDomain.toLowerCase();
    if (!host.endsWith(base)) return '';
    if (host === base) return '';
    const prefix = host.slice(0, -(base.length + 1));
    if (!prefix) return '';
    const first = prefix.split('.')[0];
    if (['www', 'img', 'static', 'api'].includes(first)) return '';
    return prefix;
}

module.exports = { createApp };
