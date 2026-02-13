const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { POSTS_DIR, getPostPath, isValidPostId } = require('../utils/paths');
const { normalizeText, stripMarkdown, escapeHtml } = require('../utils/text');

let postsCache = null;
let cacheTime = 0;
const CACHE_TTL = 30000;

function clearCache() {
    postsCache = null;
    cacheTime = 0;
}

function getAllPosts() {
    const now = Date.now();
    if (postsCache && (now - cacheTime < CACHE_TTL)) {
        return postsCache;
    }

    if (!fs.existsSync(POSTS_DIR)) {
        postsCache = [];
        cacheTime = now;
        return [];
    }

    const files = fs.readdirSync(POSTS_DIR);
    postsCache = files
        .filter(file => file.endsWith('.md'))
        .map(file => {
            const filePath = path.join(POSTS_DIR, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = matter(content);

            return {
                id: file.replace('.md', ''),
                ...parsed.data
            };
        })
        .filter(post => post.title)
        .sort((a, b) => {
            const dateA = a.date ? new Date(a.date.replace(/\./g, '-')) : new Date(0);
            const dateB = b.date ? new Date(b.date.replace(/\./g, '-')) : new Date(0);
            return dateB - dateA;
        });

    cacheTime = now;
    return postsCache;
}

function getPostById(postId) {
    if (!isValidPostId(postId)) return null;
    
    const mdPath = getPostPath(postId);
    if (!fs.existsSync(mdPath)) return null;

    const raw = fs.readFileSync(mdPath, 'utf8');
    const parsed = matter(raw);
    
    return {
        id: postId,
        ...parsed.data,
        content: parsed.content
    };
}

async function savePost(postData) {
    const { title, id, date, tags, summary, content, cover, columnId } = postData;
    
    if (!isValidPostId(id)) {
        throw new Error('INVALID_POST_ID');
    }

    if (!fs.existsSync(POSTS_DIR)) {
        fs.mkdirSync(POSTS_DIR, { recursive: true });
    }

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
    const cleanContent = parsed.content;
    const newFileContent = matter.stringify(cleanContent, frontmatterData);

    const filePath = getPostPath(id);
    fs.writeFileSync(filePath, newFileContent, 'utf8');

    clearCache();

    return { id, title };
}

function deletePost(postId) {
    if (!isValidPostId(postId)) {
        throw new Error('INVALID_POST_ID');
    }

    const filePath = getPostPath(postId);
    if (!fs.existsSync(filePath)) {
        throw new Error('POST_NOT_FOUND');
    }

    fs.unlinkSync(filePath);
    clearCache();
    return true;
}

function postExists(postId) {
    if (!isValidPostId(postId)) return false;
    return fs.existsSync(getPostPath(postId));
}

async function renderPostPage(req, postId) {
    if (!isValidPostId(postId)) return null;
    
    const mdPath = getPostPath(postId);
    if (!fs.existsSync(mdPath)) return null;

    const PUBLIC_DIR = path.join(__dirname, '../../../public');
    const raw = await fs.promises.readFile(mdPath, 'utf8');
    const parsed = matter(raw);
    const title = normalizeText(parsed.data?.title, 200) || postId;
    const summary = normalizeText(parsed.data?.summary, 300);
    const fallbackDesc = stripMarkdown(parsed.content).slice(0, 160);
    const description = summary || fallbackDesc || title;

    const templatePath = path.join(PUBLIC_DIR, 'post.html');
    const template = await fs.promises.readFile(templatePath, 'utf8');
    
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString().split(',')[0].trim();
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;
    const canonical = `${baseUrl}/posts/${encodeURIComponent(postId)}`;

    const html = template
        .replaceAll('__POST_TITLE__', escapeHtml(title))
        .replaceAll('__POST_DESC__', escapeHtml(description))
        .replaceAll('__POST_CANONICAL__', escapeHtml(canonical))
        .replaceAll('__POST_ID_JSON__', JSON.stringify(postId));

    return html;
}

function generateSitemap(baseUrl) {
    const posts = getAllPosts();
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    xml += `    <url>
        <loc>${baseUrl}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>\n`;
    
    posts.forEach(post => {
        let lastmod = new Date().toISOString().split('T')[0];
        if (post.date) {
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
    return xml;
}

module.exports = {
    getAllPosts,
    getPostById,
    savePost,
    deletePost,
    postExists,
    renderPostPage,
    generateSitemap,
    clearCache
};
