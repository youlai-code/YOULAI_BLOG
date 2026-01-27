const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const schedule = require('node-schedule');

// 配置
const BACKUP_DIR = path.join(__dirname, 'backups');
const SOURCE_DIR = path.join(__dirname, 'public', 'posts');
const MAX_BACKUPS = 7; // 保留最近7天的备份

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

// 执行备份函数
function performBackup() {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `posts_backup_${timestamp}.zip`;
        const output = fs.createWriteStream(path.join(BACKUP_DIR, filename));
        const archive = archiver('zip', {
            zlib: { level: 9 } // 最高压缩级别
        });

        console.log(`[BACKUP] Starting backup: ${filename}...`);

        output.on('close', function() {
            console.log(`[BACKUP] Success! ${archive.pointer()} total bytes.`);
            console.log(`[BACKUP] Saved to: ${path.join(BACKUP_DIR, filename)}`);
            cleanOldBackups();
            resolve(filename);
        });

        archive.on('warning', function(err) {
            if (err.code === 'ENOENT') {
                console.warn('[BACKUP] Warning:', err);
            } else {
                reject(err);
            }
        });

        archive.on('error', function(err) {
            reject(err);
        });

        archive.pipe(output);

        // 备份 public/posts 目录
        archive.directory(SOURCE_DIR, false);

        archive.finalize();
    });
}

// 清理旧备份
function cleanOldBackups() {
    fs.readdir(BACKUP_DIR, (err, files) => {
        if (err) {
            console.error('[BACKUP] Failed to read backup directory for cleanup.');
            return;
        }

        const zipFiles = files.filter(file => file.startsWith('posts_backup_') && file.endsWith('.zip'));
        
        if (zipFiles.length > MAX_BACKUPS) {
            // 按文件名排序（因为文件名包含时间戳，所以字典序即时间序）
            zipFiles.sort(); 
            
            const filesToDelete = zipFiles.slice(0, zipFiles.length - MAX_BACKUPS);
            
            filesToDelete.forEach(file => {
                const filePath = path.join(BACKUP_DIR, file);
                fs.unlink(filePath, err => {
                    if (err) console.error(`[BACKUP] Failed to delete old backup: ${file}`);
                    else console.log(`[BACKUP] Deleted old backup: ${file}`);
                });
            });
        }
    });
}

// 初始化定时任务
function initBackupTask() {
    // 每天 02:00 执行
    // Cron 格式: 分 时 日 月 周
    const job = schedule.scheduleJob('0 2 * * *', function() {
        console.log('[BACKUP] Triggered scheduled backup task.');
        performBackup()
            .catch(err => console.error('[BACKUP] Failed:', err));
    });
    
    console.log('[BACKUP] Backup task scheduled for 02:00 daily.');
}

// 导出
module.exports = {
    performBackup,
    initBackupTask
};

// 如果直接运行此脚本 (node backup_service.js)，则立即执行一次备份
if (require.main === module) {
    performBackup()
        .then(() => console.log('Manual backup completed.'))
        .catch(err => console.error('Manual backup failed:', err));
}
