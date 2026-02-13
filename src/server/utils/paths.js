const path = require('path');

const POSTS_DIR = path.join(__dirname, '../../../public/posts');
const PUBLIC_DIR = path.join(__dirname, '../../../public');
const DATA_DIR = path.join(__dirname, '../../../data');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const VISIT_FILE = path.join(DATA_DIR, 'visits.json');
const COLUMNS_FILE = path.join(__dirname, '../../../public/columns.json');

function getPostPath(postId) {
    return path.join(POSTS_DIR, `${postId}.md`);
}

function isValidPostId(postId) {
    if (!postId || typeof postId !== 'string') return false;
    const safeId = postId.replace(/[\/\\]/g, '');
    if (safeId !== postId) return false;
    if (postId.includes('..')) return false;
    if (!/^[\w\-\.]+$/.test(postId)) return false;
    return true;
}

function resolvePublicPath(relativePath) {
    const resolved = path.resolve(PUBLIC_DIR, relativePath);
    if (!resolved.startsWith(PUBLIC_DIR)) {
        throw new Error('Path traversal detected');
    }
    return resolved;
}

module.exports = {
    POSTS_DIR,
    PUBLIC_DIR,
    COMMENTS_FILE,
    VISIT_FILE,
    COLUMNS_FILE,
    getPostPath,
    isValidPostId,
    resolvePublicPath
};
