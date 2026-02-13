const { readJsonFileSafe, writeJsonFileAtomic } = require('../utils/jsonFile');
const path = require('path');

const PORTFOLIO_FILE = path.join(__dirname, '../../../public/portfolio.json');

async function getPortfolio() {
    const items = await readJsonFileSafe(PORTFOLIO_FILE, []);
    return Array.isArray(items) ? items : [];
}

async function savePortfolio(items) {
    if (!Array.isArray(items)) {
        throw new Error('INVALID_PORTFOLIO');
    }

    const normalized = items
        .map(item => {
            const id = String(item?.id || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 64);
            const name = String(item?.name || '').trim().slice(0, 100);
            const description = String(item?.description || '').trim().slice(0, 500);
            const cover = String(item?.cover || '').trim().slice(0, 500);
            const url = String(item?.url || '').trim().slice(0, 500);
            const tags = Array.isArray(item?.tags) ? item.tags.map(t => String(t).trim().slice(0, 30)).filter(Boolean) : [];
            const status = ['已上线', '开发中', '已下线'].includes(item?.status) ? item.status : '开发中';
            return { id, name, description, cover, url, tags, status };
        })
        .filter(item => item.id && item.name);

    await writeJsonFileAtomic(PORTFOLIO_FILE, normalized);
    return normalized;
}

module.exports = {
    getPortfolio,
    savePortfolio
};
