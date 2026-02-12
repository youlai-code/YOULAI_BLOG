// server.js - 你的后端控制中心
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const matter = require('gray-matter');
const backupService = require('./backup_service');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const VISIT_FILE = path.join(__dirname, 'visits.json');
const COMMENTS_FILE = path.join(__dirname, 'comments.json');
const app = express();
const PORT = 3000;
require('dotenv').config({ override: true });
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const adminTokens = new Map();
let cachedAdminPassword = null;
let cachedAdminPasswordAt = 0;



// 初始化 R2 Client
const r2Client = new S3Client({
    region: 'auto', // R2 必须填 auto
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// 配置图片上传存储 (改为内存模式，不再存本地)
const storage = multer.memoryStorage();


// 文件过滤器：只允许图片类型
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('只支持上传图片文件 (jpg, jpeg, png, gif, webp)'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

// 允许跨域和解析JSON
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 增加限制以防文章过长

// 数据文件路径
const POSTS_DIR = path.join(__dirname, 'public', 'posts');
const PUBLIC_DIR = path.join(__dirname, 'public');
const COLUMNS_FILE = path.join(__dirname, 'public', 'columns.json');

async function readJsonFileSafe(filePath, defaultValue) {
    try {
        const raw = await fs.promises.readFile(filePath, 'utf8');
        if (!raw) return defaultValue;
        return JSON.parse(raw);
    } catch (e) {
        if (e && e.code === 'ENOENT') return defaultValue;
        throw e;
    }
}

async function writeJsonFileAtomic(filePath, data) {
    const tmpPath = `${filePath}.tmp`;
    const json = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(tmpPath, json, 'utf8');
    await fs.promises.rename(tmpPath, filePath);
}

async function getAdminPassword() {
    if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim()) {
        return process.env.ADMIN_PASSWORD.trim();
    }

    const now = Date.now();
    if (cachedAdminPassword && now - cachedAdminPasswordAt < 30_000) {
        return cachedAdminPassword;
    }

    try {
        const raw = await fs.promises.readFile(path.join(PUBLIC_DIR, 'config.json'), 'utf8');
        const cfg = JSON.parse(raw);
        const pw = String(cfg?.features?.adminPassword || '').trim();
        cachedAdminPassword = pw;
        cachedAdminPasswordAt = now;
        return pw;
    } catch {
        cachedAdminPassword = '';
        cachedAdminPasswordAt = now;
        return '';
    }
}

function issueAdminToken() {
    const token = `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
    adminTokens.set(token, { expiresAt });
    return token;
}

function getAdminTokenFromReq(req) {
    const fromHeader = req.headers['x-admin-token'];
    if (fromHeader) return String(fromHeader);

    const auth = req.headers.authorization;
    if (auth && typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
        return auth.slice(7).trim();
    }
    return '';
}

function requireAdmin(req, res, next) {
    const token = getAdminTokenFromReq(req);
    const entry = token ? adminTokens.get(token) : null;
    if (!entry) return res.status(401).json({ success: false, message: 'UNAUTHORIZED' });
    if (Date.now() > entry.expiresAt) {
        adminTokens.delete(token);
        return res.status(401).json({ success: false, message: 'TOKEN_EXPIRED' });
    }
    next();
}

function normalizeText(input, maxLen) {
    const text = String(input ?? '').replace(/\r\n/g, '\n').trim();
    if (!text) return '';
    if (text.length > maxLen) return text.slice(0, maxLen);
    return text;
}

function generateId(prefix = 'c') {
    const rnd = Math.random().toString(16).slice(2, 10);
    return `${prefix}_${Date.now().toString(36)}_${rnd}`;
}

async function getCommentsStore() {
    const store = await readJsonFileSafe(COMMENTS_FILE, { site: [], posts: {} });
    const normalized = {
        site: Array.isArray(store.site) ? store.site : [],
        posts: store.posts && typeof store.posts === 'object' ? store.posts : {}
    };

    normalized.site = normalized.site.map(c => {
        const status = c?.status ? String(c.status) : 'approved';
        return {
            id: String(c?.id || generateId('site')),
            name: normalizeText(c?.name, 24) || '匿名访客',
            content: normalizeText(c?.content, 800),
            contact: normalizeText(c?.contact, 80),
            createdAt: c?.createdAt ? String(c.createdAt) : new Date().toISOString(),
            status: ['pending', 'approved', 'rejected'].includes(status) ? status : 'approved'
        };
    });

    Object.keys(normalized.posts).forEach(postId => {
        const list = normalized.posts[postId];
        if (!Array.isArray(list)) {
            normalized.posts[postId] = [];
            return;
        }
        normalized.posts[postId] = list.map(c => {
            const status = c?.status ? String(c.status) : 'approved';
            return {
                id: String(c?.id || generateId('post')),
                postId: String(c?.postId || postId),
                name: normalizeText(c?.name, 24) || '匿名访客',
                content: normalizeText(c?.content, 800),
                contact: normalizeText(c?.contact, 80),
                createdAt: c?.createdAt ? String(c.createdAt) : new Date().toISOString(),
                status: ['pending', 'approved', 'rejected'].includes(status) ? status : 'approved'
            };
        });
    });

    return normalized;
}

async function saveCommentsStore(store) {
    const safe = {
        site: Array.isArray(store.site) ? store.site : [],
        posts: store.posts && typeof store.posts === 'object' ? store.posts : {}
    };
    await writeJsonFileAtomic(COMMENTS_FILE, safe);
}

// Helper: 获取所有文章列表
function getAllPosts() {
    if (!fs.existsSync(POSTS_DIR)) return [];

    const files = fs.readdirSync(POSTS_DIR);
    const posts = files
        .filter(file => file.endsWith('.md'))
        .map(file => {
            const filePath = path.join(POSTS_DIR, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = matter(content);

            // 返回元数据 + ID (去掉扩展名)
            return {
                id: file.replace('.md', ''),
                ...parsed.data
            };
        })
        // 过滤掉没有标题的文章 (比如 about.md 如果没有 frontmatter)
        .filter(post => post.title)
        // 按日期降序排序 (处理 2026.01.26 格式)
        .sort((a, b) => {
            const dateA = a.date ? new Date(a.date.replace(/\./g, '-')) : new Date(0);
            const dateB = b.date ? new Date(b.date.replace(/\./g, '-')) : new Date(0);
            return dateB - dateA;
        });

    return posts;
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function stripMarkdown(md) {
    return String(md ?? '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/!\[[^\]]*\]\([^\)]*\)/g, ' ')
        .replace(/\[[^\]]*\]\([^\)]*\)/g, ' ')
        .replace(/[#>*_\-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getBaseUrl(req) {
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString().split(',')[0].trim();
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return `${proto}://${host}`;
}

async function renderPostPage(req, res, postId) {
    const mdPath = path.join(POSTS_DIR, `${postId}.md`);
    if (!fs.existsSync(mdPath)) return false;

    const raw = await fs.promises.readFile(mdPath, 'utf8');
    const parsed = matter(raw);
    const title = normalizeText(parsed.data?.title, 200) || postId;
    const summary = normalizeText(parsed.data?.summary, 300);
    const fallbackDesc = stripMarkdown(parsed.content).slice(0, 160);
    const description = summary || fallbackDesc || title;

    const templatePath = path.join(PUBLIC_DIR, 'post.html');
    const template = await fs.promises.readFile(templatePath, 'utf8');
    const canonical = `${getBaseUrl(req)}/posts/${encodeURIComponent(postId)}`;

    const html = template
        .replaceAll('__POST_TITLE__', escapeHtml(title))
        .replaceAll('__POST_DESC__', escapeHtml(description))
        .replaceAll('__POST_CANONICAL__', escapeHtml(canonical))
        .replaceAll('__POST_ID_JSON__', JSON.stringify(postId));

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    return true;
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

app.get('/', async (req, res, next) => {
    try {
        const baseDomain = process.env.BASE_DOMAIN || 'youlainote.cn';
        const postId = extractPostIdFromSubdomain(req.hostname, baseDomain);
        if (postId) {
            const ok = await renderPostPage(req, res, postId);
            if (ok) return;
        }
        res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
    } catch (e) {
        next(e);
    }
});

app.use(express.static(PUBLIC_DIR));

// 4. 提供文章数据接口 (供编辑器和首页使用) - 动态从 Frontmatter 读取
app.get('/posts.json', (req, res) => {
    try {
        const posts = getAllPosts();
        res.json(posts);
    } catch (error) {
        console.error("Error reading posts:", error);
        res.status(500).json({ error: "Failed to load posts" });
    }
});

// 5. 动态生成 Sitemap.xml
app.get('/sitemap.xml', (req, res) => {
    try {
        const baseUrl = process.env.SITE_URL || 'https://youlainote.cn';
        const posts = getAllPosts();
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
        // 首页
        xml += `    <url>
        <loc>${baseUrl}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>\n`;
        
        // 文章页
        posts.forEach(post => {
            // 处理日期格式: 2025.12.29 -> 2025-12-29
            let lastmod = new Date().toISOString().split('T')[0];
            if (post.date) {
                // 尝试解析日期
                try {
                     const datePart = post.date.replace(/\./g, '-').split(' ')[0];
                     if (datePart.length === 10) {
                         lastmod = datePart;
                     }
                } catch (e) {}
            }
            
            xml += `    <url>
        <loc>${baseUrl}/posts/${post.id}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>\n`;
        });
        
        xml += '</urlset>';
        
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error("Error generating sitemap:", error);
        res.status(500).send("Error generating sitemap");
    }
});

// 5. 提供配置文件接口 (供 Admin Dashboard 使用)
app.get('/config.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'config.json'));
});

app.get(['/columns', '/columns/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'columns.html'));
});

app.get(['/message-board', '/message-board/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'message-board.html'));
});

app.get('/api/columns', async (req, res) => {
    try {
        const columns = await readJsonFileSafe(COLUMNS_FILE, []);
        res.json({ success: true, columns: Array.isArray(columns) ? columns : [] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'FAILED_TO_LOAD_COLUMNS' });
    }
});

app.post('/api/columns', requireAdmin, async (req, res) => {
    try {
        const columns = req.body?.columns;
        if (!Array.isArray(columns)) {
            return res.status(400).json({ success: false, message: 'INVALID_COLUMNS' });
        }
        const normalized = columns
            .map(c => {
                const id = normalizeText(c?.id, 64);
                const name = normalizeText(c?.name, 64);
                const description = normalizeText(c?.description, 120);
                const cover = normalizeText(c?.cover, 500);
                return { id, name, description, cover };
            })
            .filter(c => c.id && c.name);

        await writeJsonFileAtomic(COLUMNS_FILE, normalized);
        res.json({ success: true, columns: normalized });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'FAILED_TO_SAVE_COLUMNS' });
    }
});

app.post('/api/admin/login', async (req, res) => {
    try {
        const password = normalizeText(req.body?.password, 200);
        const expected = await getAdminPassword();
        if (!expected) {
            return res.status(500).json({ success: false, message: 'ADMIN_PASSWORD_NOT_SET' });
        }
        if (!password || password !== expected) {
            return res.status(401).json({ success: false, message: 'INVALID_PASSWORD' });
        }
        const token = issueAdminToken();
        res.json({ success: true, token });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'LOGIN_FAILED' });
    }
});

app.get('/api/admin/me', requireAdmin, (req, res) => {
    res.json({ success: true });
});

app.get('/api/admin/comments', requireAdmin, async (req, res) => {
    try {
        const scope = String(req.query.scope || 'all');
        const status = String(req.query.status || 'pending');
        const postId = String(req.query.postId || '').trim();

        const store = await getCommentsStore();
        const statuses = ['pending', 'approved', 'rejected'];
        const st = statuses.includes(status) ? status : 'pending';

        const result = { site: [], posts: [] };
        if (scope === 'site' || scope === 'all') {
            result.site = (store.site || []).filter(c => c.status === st);
        }
        if (scope === 'post' || scope === 'all') {
            const keys = postId ? [postId] : Object.keys(store.posts || {});
            keys.forEach(pid => {
                const list = Array.isArray(store.posts?.[pid]) ? store.posts[pid] : [];
                list.filter(c => c.status === st).forEach(c => result.posts.push(c));
            });
        }
        res.json({ success: true, data: result });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'FAILED_TO_LOAD_COMMENTS' });
    }
});

app.post('/api/admin/comments/moderate', requireAdmin, async (req, res) => {
    try {
        const scope = String(req.body?.scope || '').trim();
        const action = String(req.body?.action || '').trim();
        const commentId = String(req.body?.commentId || '').trim();
        const postId = String(req.body?.postId || '').trim();
        if (!['site', 'post'].includes(scope)) return res.status(400).json({ success: false, message: 'INVALID_SCOPE' });
        if (!['approve', 'reject', 'delete'].includes(action)) return res.status(400).json({ success: false, message: 'INVALID_ACTION' });
        if (!commentId) return res.status(400).json({ success: false, message: 'NO_COMMENT_ID' });

        const store = await getCommentsStore();
        let found = false;

        if (scope === 'site') {
            store.site = Array.isArray(store.site) ? store.site : [];
            store.site = store.site.map(c => {
                if (c.id !== commentId) return c;
                found = true;
                if (action === 'approve') return { ...c, status: 'approved' };
                if (action === 'reject') return { ...c, status: 'rejected' };
                return c;
            }).filter(c => !(found && action === 'delete' && c.id === commentId));
        }

        if (scope === 'post') {
            if (!postId) return res.status(400).json({ success: false, message: 'NO_POST_ID' });
            if (!store.posts || typeof store.posts !== 'object') store.posts = {};
            const list = Array.isArray(store.posts[postId]) ? store.posts[postId] : [];
            store.posts[postId] = list
                .map(c => {
                    if (c.id !== commentId) return c;
                    found = true;
                    if (action === 'approve') return { ...c, status: 'approved' };
                    if (action === 'reject') return { ...c, status: 'rejected' };
                    return c;
                })
                .filter(c => !(found && action === 'delete' && c.id === commentId));
        }

        if (!found) return res.status(404).json({ success: false, message: 'NOT_FOUND' });
        await saveCommentsStore(store);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'FAILED_TO_MODERATE' });
    }
});

app.get('/api/comments/site', async (req, res) => {
    try {
        const store = await getCommentsStore();
        const list = Array.isArray(store.site) ? store.site : [];
        const approved = list.filter(c => c.status === 'approved').map(c => ({
            id: c.id,
            name: c.name,
            content: c.content,
            createdAt: c.createdAt
        }));
        res.json({ success: true, comments: approved.slice().reverse() });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'FAILED_TO_LOAD_COMMENTS' });
    }
});

app.post('/api/comments/site', async (req, res) => {
    try {
        const name = normalizeText(req.body?.name, 24) || '匿名访客';
        const contact = normalizeText(req.body?.contact, 80);
        const content = normalizeText(req.body?.content, 800);
        if (!content) return res.status(400).json({ success: false, message: 'EMPTY_CONTENT' });

        const store = await getCommentsStore();
        const item = {
            id: generateId('site'),
            name,
            content,
            contact,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };
        store.site = Array.isArray(store.site) ? store.site : [];
        store.site.push(item);
        await saveCommentsStore(store);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'FAILED_TO_SAVE_COMMENT' });
    }
});

app.get('/api/comments/post/:id', async (req, res) => {
    try {
        const postId = String(req.params.id || '').trim();
        if (!postId) return res.status(400).json({ success: false, message: 'NO_POST_ID' });
        const store = await getCommentsStore();
        const list = Array.isArray(store.posts?.[postId]) ? store.posts[postId] : [];
        const approved = list.filter(c => c.status === 'approved').map(c => ({
            id: c.id,
            postId: c.postId,
            name: c.name,
            content: c.content,
            createdAt: c.createdAt
        }));
        res.json({ success: true, comments: approved.slice().reverse() });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'FAILED_TO_LOAD_COMMENTS' });
    }
});

app.post('/api/comments/post/:id', async (req, res) => {
    try {
        const postId = String(req.params.id || '').trim();
        if (!postId) return res.status(400).json({ success: false, message: 'NO_POST_ID' });

        const name = normalizeText(req.body?.name, 24) || '匿名访客';
        const contact = normalizeText(req.body?.contact, 80);
        const content = normalizeText(req.body?.content, 800);
        if (!content) return res.status(400).json({ success: false, message: 'EMPTY_CONTENT' });

        const store = await getCommentsStore();
        if (!store.posts || typeof store.posts !== 'object') store.posts = {};
        if (!Array.isArray(store.posts[postId])) store.posts[postId] = [];

        const item = {
            id: generateId('post'),
            postId,
            name,
            content,
            contact,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };
        store.posts[postId].push(item);
        await saveCommentsStore(store);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'FAILED_TO_SAVE_COMMENT' });
    }
});

// 路由处理：如果是文件请求(有扩展名)交给 static，否则返回 post.html
app.get('/posts/:id', (req, res, next) => {
    const id = req.params.id;

    // 优先处理 .md 文件请求 (修复 404 问题)
    if (id.endsWith('.md')) {
        const filePath = path.join(POSTS_DIR, id);
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        } else {
            return res.status(404).send('Post not found');
        }
    }

    // 如果请求包含 . (例如 images/xxx.png)，则视为静态资源请求
    if (id.includes('.')) {
        return next();
    }

    // 检查是否存在对应的 .md 文件 (用于无后缀访问，返回 post.html)
    const filePath = path.join(POSTS_DIR, `${id}.md`);
    if (fs.existsSync(filePath)) {
        renderPostPage(req, res, id).catch(next);
    } else {
        next(); // 404
    }
});

// 静态服务 /posts 目录，以便前端 fetch .md 文件
app.use('/posts', express.static(path.join(__dirname, 'public', 'posts')));

// --- 图片上传接口 (R2 Cloudflare) ---
app.post('/api/upload-image', requireAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '没有上传文件' });
        }

        // 1. 生成唯一文件名 (保留原扩展名)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(req.file.originalname);
        const filename = `blog-images/${uniqueSuffix}${ext}`; // 建议加个文件夹前缀

        // 2. 准备上传命令
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: filename,
            Body: req.file.buffer, // 文件内容
            ContentType: req.file.mimetype, // 必须设置，否则浏览器可能会直接下载而不是预览
        });

        // 3. 发送到 R2
        await r2Client.send(command);

        // 4. 拼接公开访问链接
        // 最终格式: https://img.yourblog.com/blog-images/xxx.jpg
        const imageUrl = `${process.env.R2_PUBLIC_DOMAIN}/${filename}`;

        console.log(`[R2 UPLOAD] Success: ${imageUrl}`);

        res.json({
            success: true,
            url: imageUrl,
            filename: filename
        });
    } catch (error) {
        console.error('R2 上传错误:', error);
        res.status(500).json({ success: false, message: '上传云端失败: ' + error.message });
    }
});

// --- 删除文章接口 ---
app.post('/api/delete', requireAdmin, (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.json({ success: false, message: "No ID provided" });

        // 删除对应的 .md 文件
        const filePath = path.join(POSTS_DIR, `${id}.md`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[DELETED] Article ${id} removed.`);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: "File not found" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "DELETE FAILED" });
    }
});

// --- 核心功能：接收文章上传 ---
app.post('/api/upload', requireAdmin, (req, res) => {
    try {
        const { title, id, date, tags, summary, content, cover, columnId } = req.body;
        console.log(`[API] Upload request received for ${id}.`);

        // 1. 检查 posts 文件夹是否存在
        if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });

        // 2. 准备 Frontmatter 数据
        // 确保 tags 是数组
        let tagsArray = [];
        if (Array.isArray(tags)) {
            tagsArray = tags;
        } else if (typeof tags === 'string') {
            tagsArray = tags.split('/').map(t => t.trim()).filter(Boolean);
        }

        const frontmatterData = {
            title,
            date,
            tags: tagsArray,
            summary,
            cover: cover || null,
            columnId: columnId || ''
        };

        const parsed = matter(content);
        const cleanContent = parsed.content; // 获取去头后的内容

        const newFileContent = matter.stringify(cleanContent, frontmatterData);

        // 4. 写入 .md 文件
        const filePath = path.join(POSTS_DIR, `${id}.md`);
        fs.writeFileSync(filePath, newFileContent, 'utf8');

        console.log(`[SUCCESS] Article ${id} saved with Frontmatter.`);
        res.json({ success: true, message: 'MISSION ACCOMPLISHED' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// --- AI 辅助生成接口 (接入 DeepSeek) ---
app.post('/api/ai-generate', requireAdmin, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.json({ success: false, message: "NO CONTENT" });

        console.log("正在呼叫 DeepSeek...");

        const systemPrompt = `
        你是一个专业的技术博客助手。请分析用户输入的 Markdown 文章内容，并提取/生成以下元数据。
        请严格按照 JSON 格式返回，不要包含 markdown 代码块标记（如 \`\`\`json）。
        JSON 结构如下：
        {
            "title": "提取或生成一个吸引人的标题",
            "summary": "生成一段80字以内的精炼摘要",
            "tags": "提取1-3个相关技术标签(优先单标签)，首字母大写，用 ' / ' 分隔 (例如: Unity / Shader / C#)"
        }
        `;

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: content }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("DeepSeek API Error:", errText);
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const aiContent = data.choices[0].message.content.trim();

        let cleanJson = aiContent.replace(/```json/g, '').replace(/```/g, '').trim();

        let metaData;
        try {
            metaData = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON Parse Error. AI returned:", aiContent);
            metaData = {
                title: "AI Parsing Error",
                summary: aiContent,
                tags: "ERROR"
            };
        }

        console.log("DeepSeek 响应成功:", metaData);

        res.json({
            success: true,
            data: {
                title: metaData.title,
                summary: metaData.summary,
                tags: metaData.tags
            }
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ success: false, message: "AI CONNECTION FAILED" });
    }
});

// 路由: 获取并增加访问量
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

app.listen(PORT, () => {
    console.log('----------------------------------------------------------');
    console.log('   🃏 YOULAI NOTE | P5R 风格个人技术博客系统启动成功！');
    console.log('----------------------------------------------------------');
    console.log(`   🚀 服务地址:      http://localhost:${PORT}`);
    console.log(`   📝 博客主页:      http://localhost:${PORT}/`);
    console.log(`   🔐 后台登录:      http://localhost:${PORT}/login.html`);
    console.log('----------------------------------------------------------');

    // 初始化备份任务
    backupService.initBackupTask();

    console.log('----------------------------------------------------------');
    console.log('   Welcome to the Metaverse of Code!');
    console.log('----------------------------------------------------------');
});
