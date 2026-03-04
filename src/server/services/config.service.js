const fs = require('fs').promises;
const path = require('path');
const db = require('../db');

const DATA_DIR = path.join(__dirname, '../../data');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const ENV_FILE = path.join(__dirname, '../../.env');

async function readJsonFile(filePath, defaultValue) {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        if (!raw) return defaultValue;
        return JSON.parse(raw);
    } catch (e) {
        if (e && e.code === 'ENOENT') return defaultValue;
        throw e;
    }
}

async function writeJsonFile(filePath, data) {
    const tmpPath = `${filePath}.tmp`;
    const json = JSON.stringify(data, null, 4);
    await fs.writeFile(tmpPath, json, 'utf8');
    await fs.rename(tmpPath, filePath);
}

async function getConfig() {
    try {
        const row = db.prepare('SELECT value FROM config WHERE key = ?').get('site_config');
        if (row && row.value) {
            return JSON.parse(row.value);
        }
    } catch (e) {
        console.error('DB Error getConfig:', e);
    }
    return {};
}

async function saveConfig(config) {
    const value = JSON.stringify(config);
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run('site_config', value);
}

async function getColumns() {
    try {
        const row = db.prepare('SELECT value FROM config WHERE key = ?').get('columns');
        if (row && row.value) {
            return JSON.parse(row.value);
        }
    } catch (e) {
        console.error('DB Error getColumns:', e);
    }
    return [];
}

async function saveColumns(columns) {
    const value = JSON.stringify(columns);
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run('columns', value);
}

async function getPortfolio() {
    try {
        const row = db.prepare('SELECT value FROM config WHERE key = ?').get('portfolio');
        if (row && row.value) {
            return JSON.parse(row.value);
        }
    } catch (e) {
        console.error('DB Error getPortfolio:', e);
    }
    return [];
}

async function savePortfolio(items) {
    const value = JSON.stringify(items);
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run('portfolio', value);
}

async function getComments() {
    return await readJsonFile(COMMENTS_FILE, { site: [], posts: {} });
}

async function getVisits() {
    try {
        const row = db.prepare('SELECT count FROM visits WHERE id = 1').get();
        return { count: row ? row.count : 0 };
    } catch (e) {
        console.error('DB Error getVisits:', e);
        return { count: 0 };
    }
}

async function incrementVisit() {
    try {
        db.prepare('UPDATE visits SET count = count + 1 WHERE id = 1').run();
        return await getVisits();
    } catch (e) {
        console.error('DB Error incrementVisit:', e);
        return { count: 0 };
    }
}

async function getEnvTemplate() {
    const envExample = {
        DEEPSEEK_API_KEY: '',
        DOUBAO_IMAGE_API_KEY: '',
        DOUBAO_IMAGE_ENDPOINT: '',
        DOUBAO_IMAGE_MODEL: '',
        R2_ACCOUNT_ID: '',
        R2_ACCESS_KEY_ID: '',
        R2_SECRET_ACCESS_KEY: '',
        R2_BUCKET_NAME: '',
        R2_PUBLIC_DOMAIN: '',
        ADMIN_PASSWORD: '',
        SITE_URL: '',
        BASE_DOMAIN: '',
        PORT: ''
    };
    
    try {
        const raw = await fs.readFile(ENV_FILE, 'utf8');
        const lines = raw.split('\n');
        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1) return;
            const key = trimmed.slice(0, eqIdx).trim();
            const value = trimmed.slice(eqIdx + 1).trim();
            if (key in envExample) {
                envExample[key] = value;
            }
        });
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
    }
    
    return envExample;
}

function normalizeText(input, maxLen) {
    const text = String(input ?? '').replace(/\r\n/g, '\n').trim();
    if (!text) return '';
    if (text.length > maxLen) return text.slice(0, maxLen);
    return text;
}

function normalizeConfig(raw) {
    const owner = raw?.owner || {};
    const social = raw?.social || {};
    const footer = raw?.footer || {};
    const features = raw?.features || {};
    const seo = raw?.seo || {};

    return {
        owner: {
            name: normalizeText(owner.name, 50) || '博主',
            title: normalizeText(owner.title, 100) || '',
            avatar: normalizeText(owner.avatar, 500) || '/img/head.jpg',
            bio: normalizeText(owner.bio, 200) || ''
        },
        social: {
            github: normalizeSocialItem(social.github),
            douyin: normalizeSocialItem(social.douyin),
            qq: normalizeSocialItem(social.qq),
            email: normalizeSocialItem(social.email),
            bilibili: normalizeSocialItem(social.bilibili)
        },
        footer: {
            copyright: normalizeText(footer.copyright, 200) || '',
            marquee: normalizeText(footer.marquee, 500) || ''
        },
        features: {
            enableEditor: Boolean(features.enableEditor)
        },
        seo: {
            siteUrl: normalizeText(seo.siteUrl, 200) || '',
            postSubdomainBase: normalizeText(seo.postSubdomainBase, 100) || ''
        }
    };
}

function normalizeSocialItem(item) {
    if (!item || typeof item !== 'object') {
        return { url: '', icon: '', label: '' };
    }
    return {
        url: normalizeText(item.url, 500) || '',
        icon: normalizeText(item.icon, 100) || '',
        label: normalizeText(item.label, 50) || ''
    };
}

module.exports = {
    getConfig,
    saveConfig,
    getColumns,
    saveColumns,
    getPortfolio,
    savePortfolio,
    getComments,
    getVisits,
    incrementVisit,
    getEnvTemplate,
    normalizeConfig
};
