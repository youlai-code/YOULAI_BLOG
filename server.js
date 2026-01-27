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

const app = express();
const PORT = 3000;
require('dotenv').config({ override: true });
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;



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

// --- 静态资源服务配置 ---
// 1. 将 public 目录作为根目录服务 (index.html, editor.html 等都在这里)
app.use(express.static(path.join(__dirname, 'public')));

// 数据文件路径
const POSTS_DIR = path.join(__dirname, 'public', 'posts');

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

// 5. 提供配置文件接口 (供 Admin Dashboard 使用)
app.get('/config.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'config.json'));
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
        // 返回查看器模板，前端会再请求内容
        // 注意：前端 post.html 需要逻辑去 fetch 对应的 md 文件内容并解析
        // 但目前 post.html 可能也是读 markdown？
        // 原来的逻辑是 serve static public/posts，所以前端可以直接 fetch /posts/id.md
        // 我们需要确保 /posts/id.md 能被访问到
        res.sendFile(path.join(__dirname, 'public', 'post.html'));
    } else {
        next(); // 404
    }
});

// 静态服务 /posts 目录，以便前端 fetch .md 文件
app.use('/posts', express.static(path.join(__dirname, 'public', 'posts')));

// --- 图片上传接口 (R2 Cloudflare) ---
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
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
app.post('/api/delete', (req, res) => {
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
app.post('/api/upload', (req, res) => {
    try {
        const { title, id, date, tags, summary, content, cover } = req.body;
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
            cover: cover || null
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
app.post('/api/ai-generate', async (req, res) => {
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

app.listen(PORT, () => {
    console.log('----------------------------------------------------------');
    console.log('   🃏 YOULAI NOTE | P5R 风格个人技术博客系统启动成功！');
    console.log('----------------------------------------------------------');
    console.log(`   📝 博客主页:      http://localhost:${PORT}/`);
    console.log('----------------------------------------------------------');

    // 初始化备份任务
    backupService.initBackupTask();

    console.log('----------------------------------------------------------');
    console.log('   Welcome to the Metaverse of Code!');
    console.log('----------------------------------------------------------');
});
