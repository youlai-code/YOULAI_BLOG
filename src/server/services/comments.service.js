const { readJsonFileSafe, writeJsonFileAtomic } = require('../utils/jsonFile');
const { COMMENTS_FILE } = require('../utils/paths');
const { normalizeText } = require('../utils/text');
const { generateId } = require('../utils/ids');

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
            status: ['pending', 'approved', 'rejected'].includes(status) ? status : 'approved',
            replies: Array.isArray(c?.replies) ? c.replies : []
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
                status: ['pending', 'approved', 'rejected'].includes(status) ? status : 'approved',
                replies: Array.isArray(c?.replies) ? c.replies : []
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

async function getSiteComments(status = 'approved') {
    const store = await getCommentsStore();
    const list = Array.isArray(store.site) ? store.site : [];
    
    if (status === 'approved') {
        return list.filter(c => c.status === 'approved').map(c => ({
            id: c.id,
            name: c.name,
            content: c.content,
            createdAt: c.createdAt,
            replies: c.replies || []
        }));
    }
    
    return list.filter(c => c.status === status);
}

async function addSiteComment(data) {
    const { name, contact, content } = data;
    
    if (!content || !content.trim()) {
        throw new Error('EMPTY_CONTENT');
    }

    const store = await getCommentsStore();
    const item = {
        id: generateId('site'),
        name: normalizeText(name, 24) || '匿名访客',
        content: normalizeText(content, 800),
        contact: normalizeText(contact, 80),
        createdAt: new Date().toISOString(),
        status: 'pending',
        replies: []
    };
    
    store.site = Array.isArray(store.site) ? store.site : [];
    store.site.push(item);
    await saveCommentsStore(store);
    
    return item;
}

async function addSiteReply(commentId, data) {
    const { name, contact, content } = data;
    
    if (!content || !content.trim()) {
        throw new Error('EMPTY_CONTENT');
    }
    if (!commentId) {
        throw new Error('NO_COMMENT_ID');
    }

    const store = await getCommentsStore();
    store.site = Array.isArray(store.site) ? store.site : [];
    
    let found = false;
    store.site = store.site.map(c => {
        if (c.id !== commentId) return c;
        found = true;
        const replies = Array.isArray(c.replies) ? c.replies : [];
        return {
            ...c,
            replies: [...replies, {
                id: generateId('reply'),
                name: normalizeText(name, 24) || '匿名访客',
                content: normalizeText(content, 800),
                contact: normalizeText(contact, 80),
                createdAt: new Date().toISOString(),
                status: 'pending'
            }]
        };
    });
    
    if (!found) {
        throw new Error('NOT_FOUND');
    }
    
    await saveCommentsStore(store);
    return true;
}

async function getPostComments(postId, status = 'approved') {
    const store = await getCommentsStore();
    const list = Array.isArray(store.posts?.[postId]) ? store.posts[postId] : [];
    
    if (status === 'approved') {
        return list.filter(c => c.status === 'approved').map(c => ({
            id: c.id,
            postId: c.postId,
            name: c.name,
            content: c.content,
            createdAt: c.createdAt
        }));
    }
    
    return list.filter(c => c.status === status);
}

async function addPostComment(postId, data) {
    const { name, contact, content } = data;
    
    if (!content || !content.trim()) {
        throw new Error('EMPTY_CONTENT');
    }

    const store = await getCommentsStore();
    
    if (!store.posts || typeof store.posts !== 'object') {
        store.posts = {};
    }
    if (!Array.isArray(store.posts[postId])) {
        store.posts[postId] = [];
    }

    const item = {
        id: generateId('post'),
        postId,
        name: normalizeText(name, 24) || '匿名访客',
        content: normalizeText(content, 800),
        contact: normalizeText(contact, 80),
        createdAt: new Date().toISOString(),
        status: 'pending'
    };
    
    store.posts[postId].push(item);
    await saveCommentsStore(store);
    
    return item;
}

async function moderateComment(scope, commentId, action, postId = null, replyId = null) {
    if (!['site', 'post'].includes(scope)) {
        throw new Error('INVALID_SCOPE');
    }
    if (!['approve', 'reject', 'delete'].includes(action)) {
        throw new Error('INVALID_ACTION');
    }
    if (!commentId) {
        throw new Error('NO_COMMENT_ID');
    }

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
        if (!postId) throw new Error('NO_POST_ID');
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

    if (!found) throw new Error('NOT_FOUND');
    await saveCommentsStore(store);
    return true;
}

async function moderateSiteReply(commentId, replyId, action) {
    if (!['approve', 'reject', 'delete'].includes(action)) {
        throw new Error('INVALID_ACTION');
    }
    if (!commentId || !replyId) {
        throw new Error('NO_COMMENT_ID');
    }

    const store = await getCommentsStore();
    store.site = Array.isArray(store.site) ? store.site : [];
    
    let commentFound = false;
    let replyFound = false;
    
    store.site = store.site.map(c => {
        if (c.id !== commentId) return c;
        commentFound = true;
        const replies = Array.isArray(c.replies) ? c.replies : [];
        
        const filteredReplies = replies.map(r => {
            if (r.id !== replyId) return r;
            replyFound = true;
            if (action === 'approve') return { ...r, status: 'approved' };
            if (action === 'reject') return { ...r, status: 'rejected' };
            return r;
        }).filter(r => !(replyFound && action === 'delete' && r.id === replyId));
        
        return { ...c, replies: filteredReplies };
    });
    
    if (!commentFound || !replyFound) {
        throw new Error('NOT_FOUND');
    }
    
    await saveCommentsStore(store);
    return true;
}

async function getAdminComments(scope = 'all', status = 'pending', postId = null) {
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
    
    return result;
}

module.exports = {
    getCommentsStore,
    saveCommentsStore,
    getSiteComments,
    addSiteComment,
    addSiteReply,
    getPostComments,
    addPostComment,
    moderateComment,
    moderateSiteReply,
    getAdminComments
};
