/**
 * Secure Store
 *
 * Provides secure storage for sensitive tokens (e.g. WhatsApp API token).
 * - Primary: OS keychain via keytar (if available)
 * - Fallback: AES-256-CBC encrypted file in the user data directory
 */

import os from "os";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Lazy-load keytar (optional native dependency)
let keytar: {
    setPassword(service: string, account: string, password: string): Promise<void>;
    getPassword(service: string, account: string): Promise<string | null>;
} | null = null;

try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    keytar = require("keytar");
} catch {
    keytar = null;
}

const SERVICE_NAME = "SSMS_Secrets";
const WHATSAPP_TOKEN_KEY = "whatsapp_token";

/**
 * Fallback encrypted file location within userData
 */
function getFallbackFile(): string {
    const base =
        (global as unknown as Record<string, Record<string, string>>).appPaths?.userData || __dirname;
    return path.join(base, "secrets.json");
}

/**
 * AES-256-CBC encryption using SESSION_SECRET
 */
function encrypt(text: string): string {
    const secret = process.env.SESSION_SECRET || "unsafe-default-secret-change-in-production";
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        crypto.createHash("sha256").update(secret).digest(),
        iv
    );
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
}

/**
 * AES-256-CBC decryption
 */
function decrypt(enc: string): string | null {
    try {
        const secret = process.env.SESSION_SECRET || "unsafe-default-secret-change-in-production";
        const [ivHex, dataHex] = enc.split(":");
        const iv = Buffer.from(ivHex, "hex");
        const encrypted = Buffer.from(dataHex, "hex");
        const decipher = crypto.createDecipheriv(
            "aes-256-cbc",
            crypto.createHash("sha256").update(secret).digest(),
            iv
        );
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString("utf8");
    } catch (e) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require("./logger").error("Failed to decrypt secret fallback (the SESSION_SECRET might have changed, or the credentials file is corrupted):", e);
        } catch {
            /* ignore */
        }
        return null;
    }
}

/**
 * Store WhatsApp token in OS keychain or encrypted fallback
 */
async function setWhatsAppToken(token: string): Promise<boolean> {
    if (!token) throw new Error("Token missing");

    if (keytar) {
        await keytar.setPassword(SERVICE_NAME, WHATSAPP_TOKEN_KEY, token);
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require("./logger").info("WhatsApp token stored in OS keychain");
        } catch {
            /* ignore */
        }
        return true;
    }

    // fallback: write encrypted file within user data
    try {
        const f = getFallbackFile();
        let json: Record<string, string> = {};
        if (fs.existsSync(f)) json = JSON.parse(fs.readFileSync(f, "utf8") || "{}");
        json.whatsapp_token = encrypt(token);
        fs.writeFileSync(f, JSON.stringify(json, null, 2), { mode: 0o600 });
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require("./logger").warn(
                "Keytar not available. Token stored in encrypted fallback file. Please secure your userData folder."
            );
        } catch {
            /* ignore */
        }
        return true;
    } catch (err) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require("./logger").error("Failed to write fallback secret file:", err);
        } catch {
            /* ignore */
        }
        return false;
    }
}

/**
 * Retrieve WhatsApp token from OS keychain or encrypted fallback
 */
async function getWhatsAppToken(): Promise<string | null> {
    if (keytar) {
        const t = await keytar.getPassword(SERVICE_NAME, WHATSAPP_TOKEN_KEY);
        if (t) return t;
    }

    try {
        const f = getFallbackFile();
        if (fs.existsSync(f)) {
            const json = JSON.parse(fs.readFileSync(f, "utf8"));
            if (json.whatsapp_token) {
                const dec = decrypt(json.whatsapp_token);
                if (dec === null) {
                    try {
                        delete json.whatsapp_token;
                        fs.writeFileSync(f, JSON.stringify(json, null, 2), { mode: 0o600 });
                    } catch (e) {
                        /* ignore write errors */
                    }
                }
                return dec;
            }
        }
    } catch (err) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require("./logger").error("Failed to read fallback secret file:", err);
        } catch {
            /* ignore */
        }
    }

    return null;
}

const GOOGLE_DRIVE_TOKENS_KEY = "google_drive_tokens";

/**
 * Store Google Drive OAuth tokens in OS keychain or encrypted fallback
 */
async function setGoogleDriveTokens(tokens: any): Promise<boolean> {
    if (!tokens) throw new Error("Tokens missing");
    const tokenStr = typeof tokens === "string" ? tokens : JSON.stringify(tokens);

    if (keytar) {
        await keytar.setPassword(SERVICE_NAME, GOOGLE_DRIVE_TOKENS_KEY, tokenStr);
        try {
            require("./logger").info("Google Drive tokens stored in OS keychain");
        } catch { /* ignore */ }
        return true;
    }

    try {
        const f = getFallbackFile();
        let json: Record<string, string> = {};
        if (fs.existsSync(f)) json = JSON.parse(fs.readFileSync(f, "utf8") || "{}");
        json.google_drive_tokens = encrypt(tokenStr);
        fs.writeFileSync(f, JSON.stringify(json, null, 2), { mode: 0o600 });
        try {
            require("./logger").warn("Google tokens stored in encrypted fallback file.");
        } catch { /* ignore */ }
        return true;
    } catch (err) {
        try {
            require("./logger").error("Failed to write fallback Google tokens:", err);
        } catch { /* ignore */ }
        return false;
    }
}

/**
 * Retrieve Google Drive OAuth tokens from OS keychain or encrypted fallback
 */
async function getGoogleDriveTokens(): Promise<any | null> {
    if (keytar) {
        const t = await keytar.getPassword(SERVICE_NAME, GOOGLE_DRIVE_TOKENS_KEY);
        if (t) {
            try {
                return JSON.parse(t);
            } catch {
                return t;
            }
        }
    }

    try {
        const f = getFallbackFile();
        if (fs.existsSync(f)) {
            const json = JSON.parse(fs.readFileSync(f, "utf8"));
            if (json.google_drive_tokens) {
                const dec = decrypt(json.google_drive_tokens);
                if (dec === null) {
                    try {
                        delete json.google_drive_tokens;
                        fs.writeFileSync(f, JSON.stringify(json, null, 2), { mode: 0o600 });
                    } catch (e) { /* ignore */ }
                } else {
                    try {
                        return JSON.parse(dec);
                    } catch {
                        return dec;
                    }
                }
            }
        }
    } catch (err) {
        try {
            require("./logger").error("Failed to read fallback Google tokens:", err);
        } catch { /* ignore */ }
    }

    return null;
}

const GOOGLE_CREDENTIALS_KEY = "google_credentials";

/**
 * Store user-entered Google OAuth credentials (Client ID + Secret) securely
 */
async function setGoogleCredentials(creds: { clientId: string; clientSecret: string }): Promise<boolean> {
    const credStr = JSON.stringify(creds);

    if (keytar) {
        await keytar.setPassword(SERVICE_NAME, GOOGLE_CREDENTIALS_KEY, credStr);
        return true;
    }

    // Fallback: encrypted file
    try {
        const f = getFallbackFile();
        let json: Record<string, any> = {};
        if (fs.existsSync(f)) {
            try { json = JSON.parse(fs.readFileSync(f, "utf8")); } catch { /* ignore */ }
        }
        json[GOOGLE_CREDENTIALS_KEY] = encrypt(credStr);
        fs.writeFileSync(f, JSON.stringify(json, null, 2), { mode: 0o600 });
        return true;
    } catch (err) {
        try { require("./logger").error("Failed to save Google credentials fallback:", err); } catch { /* ignore */ }
        return false;
    }
}

/**
 * Retrieve stored Google OAuth credentials
 */
async function getGoogleCredentials(): Promise<{ clientId: string; clientSecret: string } | null> {
    if (keytar) {
        try {
            const val = await keytar.getPassword(SERVICE_NAME, GOOGLE_CREDENTIALS_KEY);
            if (val) return JSON.parse(val);
        } catch (err) {
            try { require("./logger").warn("Keychain read failed for Google credentials:", err); } catch { /* ignore */ }
        }
    }

    // Fallback: encrypted file
    try {
        const f = getFallbackFile();
        if (fs.existsSync(f)) {
            const json = JSON.parse(fs.readFileSync(f, "utf8"));
            if (json[GOOGLE_CREDENTIALS_KEY]) {
                const dec = decrypt(json[GOOGLE_CREDENTIALS_KEY]);
                if (dec) return JSON.parse(dec);
            }
        }
    } catch (err) {
        try { require("./logger").error("Failed to read Google credentials fallback:", err); } catch { /* ignore */ }
    }

    return null;
}

const secureStore = {
    setWhatsAppToken,
    getWhatsAppToken,
    setGoogleDriveTokens,
    getGoogleDriveTokens,
    setGoogleCredentials,
    getGoogleCredentials,
    WHATSAPP_TOKEN_KEY,
    GOOGLE_DRIVE_TOKENS_KEY,
    GOOGLE_CREDENTIALS_KEY,
    SERVICE_NAME,
};

export default secureStore;

// CommonJS compatibility for .js consumers
module.exports = secureStore;
module.exports.default = secureStore;

