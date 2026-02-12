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
            require("./logger").error("Failed to decrypt secret fallback:", e);
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
                return decrypt(json.whatsapp_token);
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

const secureStore = {
    setWhatsAppToken,
    getWhatsAppToken,
    WHATSAPP_TOKEN_KEY,
    SERVICE_NAME,
};

export default secureStore;
