const fs = require('fs');
const path = require('path');
const db = require('../db');
const commentsService = require('../services/comments.service');

const COMMENTS_FILE = path.join(__dirname, '../../../data/comments.json');

async function migrateComments() {
    console.log('Starting comments migration...');
    
    // 检查是否存在 comments.json 文件
    if (!fs.existsSync(COMMENTS_FILE)) {
        console.log('No comments.json file found, skipping migration.');
        return;
    }
    
    try {
        // 读取 JSON 文件
        const raw = fs.readFileSync(COMMENTS_FILE, 'utf8');
        const jsonData = JSON.parse(raw);
        
        console.log('Loaded comments.json');
        console.log(`- Site comments: ${jsonData.site?.length || 0}`);
        console.log(`- Post comments: ${Object.keys(jsonData.posts || {}).length} posts`);
        
        // 执行迁移
        const success = await commentsService.migrateFromJson(jsonData);
        
        if (success) {
            // 备份原文件
            const backupPath = `${COMMENTS_FILE}.backup.${Date.now()}`;
            fs.renameSync(COMMENTS_FILE, backupPath);
            console.log(`Migration completed successfully!`);
            console.log(`Original file backed up to: ${backupPath}`);
        } else {
            console.error('Migration failed!');
            process.exit(1);
        }
    } catch (e) {
        console.error('Migration error:', e);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    migrateComments().then(() => {
        console.log('Done!');
        process.exit(0);
    }).catch(e => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = { migrateComments };
