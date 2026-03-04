const db = require('../db');
const { normalizeText } = require('../utils/text');
const { generateId } = require('../utils/ids');

async function getSiteComments(status = 'approved') {
    try {
        let rows;
        if (status === 'all') {
            rows = db.prepare(`
                SELECT * FROM comments 
                WHERE type = 'site' AND parentId IS NULL 
                ORDER BY createdAt DESC
            `).all();
        } else {
            rows = db.prepare(`
                SELECT * FROM comments 
                WHERE type = 'site' AND parentId IS NULL AND status = ?
                ORDER BY createdAt DESC
            `).all(status);
        }
        
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            content: row.content,
            createdAt: row.createdAt,
            status: row.status,
            replies: getReplies(row.id)
        }));
    } catch (e) {
        console.error('DB Error getSiteComments:', e);
        return [];
    }
}

function getReplies(parentId) {
    try {
        const rows = db.prepare(`
            SELECT * FROM comments 
            WHERE parentId = ? 
            ORDER BY createdAt ASC
        `).all(parentId);
        
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            content: row.content,
            createdAt: row.createdAt,
            status: row.status
        }));
    } catch (e) {
        console.error('DB Error getReplies:', e);
        return [];
    }
}

async function addSiteComment(data) {
    const { name, contact, content } = data;
    
    if (!content || !content.trim()) {
        throw new Error('EMPTY_CONTENT');
    }

    const id = generateId('site');
    const now = new Date().toISOString();
    
    try {
        db.prepare(`
            INSERT INTO comments (id, type, name, content, contact, createdAt, status, parentId)
            VALUES (?, 'site', ?, ?, ?, ?, 'pending', NULL)
        `).run(id, normalizeText(name, 24) || '匿名访客', normalizeText(content, 800), normalizeText(contact, 80), now);
        
        return {
            id,
            name: normalizeText(name, 24) || '匿名访客',
            content: normalizeText(content, 800),
            createdAt: now,
            status: 'pending'
        };
    } catch (e) {
        console.error('DB Error addSiteComment:', e);
        throw e;
    }
}

async function addSiteReply(commentId, data) {
    const { name, contact, content } = data;
    
    if (!content || !content.trim()) {
        throw new Error('EMPTY_CONTENT');
    }
    if (!commentId) {
        throw new Error('NO_COMMENT_ID');
    }

    // 检查父评论是否存在
    const parent = db.prepare('SELECT id FROM comments WHERE id = ?').get(commentId);
    if (!parent) {
        throw new Error('NOT_FOUND');
    }

    const id = generateId('reply');
    const now = new Date().toISOString();
    
    try {
        db.prepare(`
            INSERT INTO comments (id, type, name, content, contact, createdAt, status, parentId)
            VALUES (?, 'site', ?, ?, ?, ?, 'pending', ?)
        `).run(id, normalizeText(name, 24) || '匿名访客', normalizeText(content, 800), normalizeText(contact, 80), now, commentId);
        
        return true;
    } catch (e) {
        console.error('DB Error addSiteReply:', e);
        throw e;
    }
}

async function getPostComments(postId, status = 'approved') {
    if (!postId) return [];
    
    try {
        let rows;
        if (status === 'all') {
            rows = db.prepare(`
                SELECT * FROM comments 
                WHERE type = 'post' AND postId = ? AND parentId IS NULL 
                ORDER BY createdAt DESC
            `).all(postId);
        } else {
            rows = db.prepare(`
                SELECT * FROM comments 
                WHERE type = 'post' AND postId = ? AND parentId IS NULL AND status = ?
                ORDER BY createdAt DESC
            `).all(postId, status);
        }
        
        return rows.map(row => ({
            id: row.id,
            postId: row.postId,
            name: row.name,
            content: row.content,
            createdAt: row.createdAt,
            status: row.status
        }));
    } catch (e) {
        console.error('DB Error getPostComments:', e);
        return [];
    }
}

async function addPostComment(postId, data) {
    const { name, contact, content } = data;
    
    if (!content || !content.trim()) {
        throw new Error('EMPTY_CONTENT');
    }
    if (!postId) {
        throw new Error('NO_POST_ID');
    }

    const id = generateId('post');
    const now = new Date().toISOString();
    
    try {
        db.prepare(`
            INSERT INTO comments (id, type, postId, name, content, contact, createdAt, status, parentId)
            VALUES (?, 'post', ?, ?, ?, ?, ?, 'pending', NULL)
        `).run(id, postId, normalizeText(name, 24) || '匿名访客', normalizeText(content, 800), normalizeText(contact, 80), now);
        
        return {
            id,
            postId,
            name: normalizeText(name, 24) || '匿名访客',
            content: normalizeText(content, 800),
            createdAt: now,
            status: 'pending'
        };
    } catch (e) {
        console.error('DB Error addPostComment:', e);
        throw e;
    }
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

    try {
        // 检查评论是否存在
        const comment = db.prepare('SELECT id FROM comments WHERE id = ?').get(commentId);
        if (!comment) {
            throw new Error('NOT_FOUND');
        }

        if (action === 'delete') {
            // 先删除所有回复
            db.prepare('DELETE FROM comments WHERE parentId = ?').run(commentId);
            // 再删除主评论
            db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
        } else {
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            db.prepare('UPDATE comments SET status = ? WHERE id = ?').run(newStatus, commentId);
        }
        
        return true;
    } catch (e) {
        console.error('DB Error moderateComment:', e);
        throw e;
    }
}

async function moderateSiteReply(commentId, replyId, action) {
    if (!['approve', 'reject', 'delete'].includes(action)) {
        throw new Error('INVALID_ACTION');
    }
    if (!commentId || !replyId) {
        throw new Error('NO_COMMENT_ID');
    }

    try {
        // 检查回复是否存在
        const reply = db.prepare('SELECT id FROM comments WHERE id = ? AND parentId = ?').get(replyId, commentId);
        if (!reply) {
            throw new Error('NOT_FOUND');
        }

        if (action === 'delete') {
            db.prepare('DELETE FROM comments WHERE id = ?').run(replyId);
        } else {
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            db.prepare('UPDATE comments SET status = ? WHERE id = ?').run(newStatus, replyId);
        }
        
        return true;
    } catch (e) {
        console.error('DB Error moderateSiteReply:', e);
        throw e;
    }
}

async function getAdminComments(scope = 'all', status = 'pending', postId = null) {
    const result = { site: [], posts: [] };
    
    try {
        if (scope === 'site' || scope === 'all') {
            const rows = db.prepare(`
                SELECT * FROM comments 
                WHERE type = 'site' AND parentId IS NULL AND status = ?
                ORDER BY createdAt DESC
            `).all(status);
            
            result.site = rows.map(row => ({
                id: row.id,
                name: row.name,
                content: row.content,
                contact: row.contact,
                createdAt: row.createdAt,
                status: row.status,
                replies: getReplies(row.id)
            }));
        }
        
        if (scope === 'post' || scope === 'all') {
            let query = `
                SELECT * FROM comments 
                WHERE type = 'post' AND parentId IS NULL AND status = ?
            `;
            const params = [status];
            
            if (postId) {
                query += ' AND postId = ?';
                params.push(postId);
            }
            
            query += ' ORDER BY createdAt DESC';
            
            const rows = db.prepare(query).all(...params);
            
            result.posts = rows.map(row => ({
                id: row.id,
                postId: row.postId,
                name: row.name,
                content: row.content,
                contact: row.contact,
                createdAt: row.createdAt,
                status: row.status
            }));
        }
        
        return result;
    } catch (e) {
        console.error('DB Error getAdminComments:', e);
        return result;
    }
}

// 数据迁移函数 - 从JSON文件迁移到数据库
async function migrateFromJson(jsonData) {
    try {
        // 迁移网站留言
        if (jsonData.site && Array.isArray(jsonData.site)) {
            for (const comment of jsonData.site) {
                const { id, name, content, contact, createdAt, status } = comment;
                
                // 插入主评论
                db.prepare(`
                    INSERT OR IGNORE INTO comments (id, type, name, content, contact, createdAt, status, parentId)
                    VALUES (?, 'site', ?, ?, ?, ?, ?, NULL)
                `).run(id, name, content, contact || '', createdAt, status || 'approved');
                
                // 迁移回复
                if (comment.replies && Array.isArray(comment.replies)) {
                    for (const reply of comment.replies) {
                        db.prepare(`
                            INSERT OR IGNORE INTO comments (id, type, name, content, contact, createdAt, status, parentId)
                            VALUES (?, 'site', ?, ?, ?, ?, ?, ?)
                        `).run(reply.id, reply.name, reply.content, reply.contact || '', reply.createdAt, reply.status || 'approved', id);
                    }
                }
            }
        }
        
        // 迁移文章评论
        if (jsonData.posts && typeof jsonData.posts === 'object') {
            for (const [postId, comments] of Object.entries(jsonData.posts)) {
                if (Array.isArray(comments)) {
                    for (const comment of comments) {
                        const { id, name, content, contact, createdAt, status } = comment;
                        
                        db.prepare(`
                            INSERT OR IGNORE INTO comments (id, type, postId, name, content, contact, createdAt, status, parentId)
                            VALUES (?, 'post', ?, ?, ?, ?, ?, ?, NULL)
                        `).run(id, postId, name, content, contact || '', createdAt, status || 'approved');
                    }
                }
            }
        }
        
        console.log('Comments migration completed successfully');
        return true;
    } catch (e) {
        console.error('Migration error:', e);
        return false;
    }
}

module.exports = {
    getSiteComments,
    addSiteComment,
    addSiteReply,
    getPostComments,
    addPostComment,
    moderateComment,
    moderateSiteReply,
    getAdminComments,
    migrateFromJson
};
