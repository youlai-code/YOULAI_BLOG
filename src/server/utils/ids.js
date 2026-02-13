function generateId(prefix = 'c') {
    const rnd = Math.random().toString(16).slice(2, 10);
    return `${prefix}_${Date.now().toString(36)}_${rnd}`;
}

module.exports = {
    generateId
};
