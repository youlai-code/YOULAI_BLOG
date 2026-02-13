const fs = require('fs');
const path = require('path');

async function readJsonFileSafe(filePath, defaultValue) {
    try {
        const raw = await fs.promises.readFile(filePath, 'utf8');
        if (!raw) return defaultValue;
        return JSON.parse(raw);
    } catch (e) {
        if (e && e.code === 'ENOENT') return defaultValue;
        throw e;
    }
}

async function writeJsonFileAtomic(filePath, data) {
    const tmpPath = `${filePath}.tmp`;
    const json = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(tmpPath, json, 'utf8');
    await fs.promises.rename(tmpPath, filePath);
}

function readJsonFileSync(filePath, defaultValue) {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        if (!raw) return defaultValue;
        return JSON.parse(raw);
    } catch (e) {
        if (e && e.code === 'ENOENT') return defaultValue;
        throw e;
    }
}

module.exports = {
    readJsonFileSafe,
    writeJsonFileAtomic,
    readJsonFileSync
};
