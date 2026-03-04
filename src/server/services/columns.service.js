const configService = require('./config.service');

function normalizeText(input, maxLen) {
    const text = String(input ?? '').replace(/\r\n/g, '\n').trim();
    if (!text) return '';
    if (text.length > maxLen) return text.slice(0, maxLen);
    return text;
}

async function getColumns() {
    return await configService.getColumns();
}

async function saveColumns(columns) {
    if (!Array.isArray(columns)) {
        throw new Error('INVALID_COLUMNS');
    }

    const normalized = columns.map(c => {
        const id = normalizeText(c?.id, 64);
        const name = normalizeText(c?.name, 64);
        const description = normalizeText(c?.description, 120);
        const cover = normalizeText(c?.cover, 500);
        return { id, name, description, cover };
    }).filter(c => c.id && c.name);

    await configService.saveColumns(normalized);
    return normalized;
}

module.exports = {
    getColumns,
    saveColumns
};
