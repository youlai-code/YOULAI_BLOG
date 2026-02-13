const adminTokens = new Map();

function getAdminPassword() {
    const pw = process.env.ADMIN_PASSWORD;
    if (!pw || !pw.trim()) {
        return '';
    }
    return pw.trim();
}

function issueAdminToken() {
    const token = `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
    adminTokens.set(token, { expiresAt });
    return token;
}

function getAdminTokenFromReq(req) {
    const fromHeader = req.headers['x-admin-token'];
    if (fromHeader) return String(fromHeader);

    const auth = req.headers.authorization;
    if (auth && typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
        return auth.slice(7).trim();
    }
    return '';
}

function requireAdmin(req, res, next) {
    const token = getAdminTokenFromReq(req);
    const entry = token ? adminTokens.get(token) : null;
    if (!entry) return res.status(401).json({ success: false, message: 'UNAUTHORIZED' });
    if (Date.now() > entry.expiresAt) {
        adminTokens.delete(token);
        return res.status(401).json({ success: false, message: 'TOKEN_EXPIRED' });
    }
    next();
}

function revokeToken(token) {
    adminTokens.delete(token);
}

module.exports = {
    getAdminPassword,
    issueAdminToken,
    getAdminTokenFromReq,
    requireAdmin,
    revokeToken
};
