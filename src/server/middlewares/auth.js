const crypto = require('crypto');

const adminTokens = new Map();
const TOKEN_VERSION = 'v1';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function getAdminPassword() {
    const pw = process.env.ADMIN_PASSWORD;
    if (!pw || !pw.trim()) {
        return '';
    }
    return pw.trim();
}

function getTokenSecret() {
    const fromEnv = String(process.env.ADMIN_TOKEN_SECRET || '').trim();
    if (fromEnv) return fromEnv;
    return getAdminPassword() || 'youlai-admin-token-secret';
}

function toBase64Url(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function fromBase64Url(input) {
    const normalized = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
    const mod = normalized.length % 4;
    const padded = normalized + (mod ? '='.repeat(4 - mod) : '');
    return Buffer.from(padded, 'base64').toString('utf8');
}

function signPayload(payloadPart) {
    return crypto
        .createHmac('sha256', getTokenSecret())
        .update(payloadPart)
        .digest('hex');
}

function safeEqual(a, b) {
    const x = Buffer.from(String(a || ''));
    const y = Buffer.from(String(b || ''));
    if (x.length !== y.length) return false;
    return crypto.timingSafeEqual(x, y);
}

function verifySignedToken(token) {
    const raw = String(token || '');
    const parts = raw.split('.');
    if (parts.length !== 3) return { ok: false };
    if (parts[0] !== TOKEN_VERSION) return { ok: false };

    const payloadPart = parts[1];
    const signature = parts[2];
    const expectedSig = signPayload(payloadPart);
    if (!safeEqual(signature, expectedSig)) return { ok: false };

    let payload;
    try {
        payload = JSON.parse(fromBase64Url(payloadPart));
    } catch {
        return { ok: false };
    }

    const exp = Number(payload?.exp || 0);
    if (!exp) return { ok: false };
    if (Date.now() > exp) return { ok: false, expired: true };

    return { ok: true, expiresAt: exp };
}

function issueAdminToken() {
    const now = Date.now();
    const expiresAt = now + TOKEN_TTL_MS;
    const payload = {
        iat: now,
        exp: expiresAt,
        nonce: crypto.randomBytes(8).toString('hex')
    };
    const payloadPart = toBase64Url(JSON.stringify(payload));
    const signature = signPayload(payloadPart);
    const token = `${TOKEN_VERSION}.${payloadPart}.${signature}`;
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
    if (!token) {
        return res.status(401).json({ success: false, message: 'UNAUTHORIZED' });
    }

    // Backward compatibility for old in-memory tokens.
    const legacy = adminTokens.get(token);
    if (legacy) {
        if (Date.now() > legacy.expiresAt) {
            adminTokens.delete(token);
            return res.status(401).json({ success: false, message: 'TOKEN_EXPIRED' });
        }
        return next();
    }

    const signed = verifySignedToken(token);
    if (!signed.ok) {
        return res.status(401).json({
            success: false,
            message: signed.expired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED'
        });
    }

    return next();
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
