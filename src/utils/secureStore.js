let keytar;
try {
    keytar = require('keytar');
} catch (err) {
    // keytar may not be available in headless CI or some electron build scenarios
    keytar = null;
}
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
// Lazy load logger and config to avoid circular dependencies on startup

const SERVICE_NAME = 'SSMS_Secrets';
const WHATSAPP_TOKEN_KEY = 'whatsapp_token';

// fallback encrypted file location within userData
function getFallbackFile() {
    const base = (global.appPaths && global.appPaths.userData) || __dirname;
    return path.join(base, 'secrets.json');
}

// Simple AES fallback encryption using SESSION_SECRET (if available)
function encrypt(text) {
    const secret = process.env.SESSION_SECRET || 'unsafe-default-secret-change-in-production';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', crypto.createHash('sha256').update(secret).digest(), iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(enc) {
    try {
        const secret = process.env.SESSION_SECRET || 'unsafe-default-secret-change-in-production';
        const [ivHex, dataHex] = enc.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(dataHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.createHash('sha256').update(secret).digest(), iv);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (e) {
        try { require('./logger').error('Failed to decrypt secret fallback:', e); } catch (ee) { /* ignore */ }
        return null;
    }
}

async function setWhatsAppToken(token) {
    if (!token) throw new Error('Token missing');
    if (keytar) {
        await keytar.setPassword(SERVICE_NAME, WHATSAPP_TOKEN_KEY, token);
        try { require('./logger').info('WhatsApp token stored in OS keychain'); } catch (e) { /* ignore */ }
        return true;
    }

    // fallback: write encrypted file within user data
    try {
        const f = getFallbackFile();
        let json = {};
        if (fs.existsSync(f)) json = JSON.parse(fs.readFileSync(f, 'utf8') || '{}');
        json.whatsapp_token = encrypt(token);
        fs.writeFileSync(f, JSON.stringify(json, null, 2), { mode: 0o600 });
        try { require('./logger').warn('Keytar not available. Token stored in encrypted fallback file. Please secure your userData folder.'); } catch (e) { /* ignore */ }
        return true;
    } catch (err) {
        try { require('./logger').error('Failed to write fallback secret file:', err); } catch (e) { /* ignore */ }
        return false;
    }
}

async function getWhatsAppToken() {
    if (keytar) {
        const t = await keytar.getPassword(SERVICE_NAME, WHATSAPP_TOKEN_KEY);
        if (t) return t;
    }

    try {
        const f = getFallbackFile();
        if (fs.existsSync(f)) {
            const json = JSON.parse(fs.readFileSync(f, 'utf8'));
            if (json.whatsapp_token) {
                const pt = decrypt(json.whatsapp_token);
                return pt;
            }
        }
    } catch (err) {
        try { require('./logger').error('Failed to read fallback secret file:', err); } catch (e) { /* ignore */ }
    }

    return null;
}

module.exports = {
    setWhatsAppToken,
    getWhatsAppToken,
    WHATSAPP_TOKEN_KEY,
    SERVICE_NAME
};
