require('./src/server');

const backupService = require('./backup_service');
backupService.initBackupTask();
