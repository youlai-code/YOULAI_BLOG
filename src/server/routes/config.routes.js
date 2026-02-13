const express = require('express');
const router = express.Router();
const configService = require('../services/config.service');
const { requireAdmin } = require('../middlewares/auth');

router.get('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
        const [config, columns, comments, visits, env] = await Promise.all([
            configService.getConfig(),
            configService.getColumns(),
            configService.getComments(),
            configService.getVisits(),
            configService.getEnvTemplate()
        ]);

        const siteCommentsCount = (comments.site || []).length;
        const postCommentsCount = Object.values(comments.posts || {}).reduce((sum, arr) => sum + (arr?.length || 0), 0);

        const safeEnv = {
            DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY ? '******' + env.DEEPSEEK_API_KEY.slice(-4) : '',
            R2_ACCOUNT_ID: env.R2_ACCOUNT_ID ? '******' : '',
            R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID ? '******' : '',
            R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY ? '******' : '',
            R2_BUCKET_NAME: env.R2_BUCKET_NAME || '',
            R2_PUBLIC_DOMAIN: env.R2_PUBLIC_DOMAIN || '',
            ADMIN_PASSWORD: env.ADMIN_PASSWORD ? '******' : '',
            SITE_URL: env.SITE_URL || '',
            BASE_DOMAIN: env.BASE_DOMAIN || '',
            PORT: env.PORT || ''
        };

        res.json({
            success: true,
            data: {
                config,
                columnsCount: (columns || []).length,
                stats: {
                    visits: visits.count || 0,
                    siteComments: siteCommentsCount,
                    postComments: postCommentsCount
                },
                env: safeEnv
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'FAILED_TO_LOAD_SETTINGS' });
    }
});

router.post('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
        const raw = req.body?.config;
        if (!raw || typeof raw !== 'object') {
            return res.status(400).json({ success: false, message: 'INVALID_CONFIG' });
        }

        const normalized = configService.normalizeConfig(raw);
        await configService.saveConfig(normalized);

        res.json({ success: true, config: normalized });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'FAILED_TO_SAVE_SETTINGS' });
    }
});

module.exports = router;
