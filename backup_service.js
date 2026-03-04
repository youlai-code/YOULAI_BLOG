const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const schedule = require('node-schedule');

const BACKUP_DIR = path.join(__dirname, 'backups');
const POSTS_DIR = path.join(__dirname, 'public', 'posts');
const DATABASE_FILE = path.join(__dirname, 'data', 'database.sqlite');
const MAX_BACKUPS = 7;

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function performBackup() {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `backup_${timestamp}.zip`;
        const output = fs.createWriteStream(path.join(BACKUP_DIR, filename));
        const archive = archiver('zip', {
            zlib: { level: 9 }
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

        archive.directory(POSTS_DIR, 'posts');

        if (fs.existsSync(DATABASE_FILE)) {
            archive.file(DATABASE_FILE, { name: 'database.sqlite' });
        }

        archive.finalize();
    });
}

function cleanOldBackups() {
    fs.readdir(BACKUP_DIR, (err, files) => {
        if (err) {
            console.error('[BACKUP] Failed to read backup directory for cleanup.');
            return;
        }

        const zipFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.zip'));
        
        if (zipFiles.length > MAX_BACKUPS) {
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

function initBackupTask() {
    const job = schedule.scheduleJob('0 2 * * *', function() {
        console.log('[BACKUP] Triggered scheduled backup task.');
        performBackup()
            .catch(err => console.error('[BACKUP] Failed:', err));
    });
    
    console.log('[BACKUP] Backup task scheduled for 02:00 daily.');
}

module.exports = {
    performBackup,
    initBackupTask
};

if (require.main === module) {
    performBackup()
        .then(() => console.log('Manual backup completed.'))
        .catch(err => console.error('Manual backup failed:', err));
}
