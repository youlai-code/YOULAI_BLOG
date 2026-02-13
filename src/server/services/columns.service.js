const { readJsonFileSafe, writeJsonFileAtomic } = require('../utils/jsonFile');
const { COLUMNS_FILE } = require('../utils/paths');
const { normalizeText } = require('../utils/text');

async function getColumns() {
    const columns = await readJsonFileSafe(COLUMNS_FILE, []);
    return Array.isArray(columns) ? columns : [];
}

async function saveColumns(columns) {
    if (!Array.isArray(columns)) {
        throw new Error('INVALID_COLUMNS');
    }

    const normalized = columns
        .map(c => {
            const id = normalizeText(c?.id, 64);
            const name = normalizeText(c?.name, 64);
            const description = normalizeText(c?.description, 120);
            const cover = normalizeText(c?.cover, 500);
            return { id, name, description, cover };
        })
        .filter(c => c.id && c.name);

    await writeJsonFileAtomic(COLUMNS_FILE, normalized);
    return normalized;
}

module.exports = {
    getColumns,
    saveColumns
};
