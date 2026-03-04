const configService = require('./config.service');

async function getPortfolio() {
    return await configService.getPortfolio();
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

    await configService.savePortfolio(normalized);
    return normalized;
}

module.exports = {
    getPortfolio,
    savePortfolio
};
