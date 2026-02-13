function normalizeText(input, maxLen) {
    const text = String(input ?? '').replace(/\r\n/g, '\n').trim();
    if (!text) return '';
    if (text.length > maxLen) return text.slice(0, maxLen);
    return text;
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function stripMarkdown(md) {
    return String(md ?? '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/!\[[^\]]*\]\([^\)]*\)/g, ' ')
        .replace(/\[[^\]]*\]\([^\)]*\)/g, ' ')
        .replace(/[#>*_\-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

module.exports = {
    normalizeText,
    escapeHtml,
    stripMarkdown
};
