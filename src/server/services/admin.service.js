const { getAdminPassword, issueAdminToken } = require('../middlewares/auth');
const { normalizeText } = require('../utils/text');

async function login(password) {
    const pwd = normalizeText(password, 200);
    const expected = getAdminPassword();
    
    if (!expected) {
        throw new Error('ADMIN_PASSWORD_NOT_SET');
    }
    
    if (!pwd || pwd !== expected) {
        throw new Error('INVALID_PASSWORD');
    }
    
    const token = issueAdminToken();
    return { token };
}

module.exports = {
    login
};
