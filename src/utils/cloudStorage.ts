/**
 * Cloud Storage Utility for PDF Documents
 * Uploads PDFs to Cloudinary for WhatsApp accessibility
 *
 * Setup:
 * 1. Create free Cloudinary account at https://cloudinary.com
 * 2. Configure via Settings UI or add to .env file:
 *    CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    CLOUDINARY_API_KEY=your_api_key
 *    CLOUDINARY_API_SECRET=your_api_secret
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const cloudinary = require("cloudinary").v2;
import fs from "fs";
import crypto from "crypto";
import logger from "./logger";

let cloudinaryConfigured = false;
let configChecked = false;

interface UploadResult {
    success: boolean;
    url?: string;
    publicId?: string;
    error?: string;
    useLocal?: boolean;
}

interface DeleteResult {
    success: boolean;
    error?: string;
}

/**
 * Load Cloudinary credentials from database if not in environment
 */
async function loadCloudinaryFromDB(): Promise<boolean> {
    if (configChecked) return cloudinaryConfigured;

    try {
        // Check if already configured via env
        if (
            process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
        ) {
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
            });
            cloudinaryConfigured = true;
            configChecked = true;
            return true;
        }

        // Try to load from database
        const { SettingsModel } = await import("../models/Settings.model");
        const settings = await SettingsModel.findOne();

        if (
            settings?.cloudinary?.configured &&
            settings.cloudinary.cloud_name &&
            settings.cloudinary.api_key &&
            settings.cloudinary.api_secret_encrypted
        ) {
            // Decrypt the API secret
            const secret =
                process.env.SESSION_SECRET || "unsafe-default-secret-change-in-production";
            const [ivHex, dataHex] = settings.cloudinary.api_secret_encrypted.split(":");
            const iv = Buffer.from(ivHex, "hex");
            const encrypted = Buffer.from(dataHex, "hex");
            const decipher = crypto.createDecipheriv(
                "aes-256-cbc",
                crypto.createHash("sha256").update(secret).digest(),
                iv
            );
            const apiSecret = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
                "utf8"
            );

            // Configure cloudinary
            cloudinary.config({
                cloud_name: settings.cloudinary.cloud_name,
                api_key: settings.cloudinary.api_key,
                api_secret: apiSecret,
            });

            // Also set env vars for other modules
            process.env.CLOUDINARY_CLOUD_NAME = settings.cloudinary.cloud_name;
            process.env.CLOUDINARY_API_KEY = settings.cloudinary.api_key;
            process.env.CLOUDINARY_API_SECRET = apiSecret;

            cloudinaryConfigured = true;
            logger.info("Cloudinary configured from database settings");
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn("Failed to load Cloudinary settings from database:", { error: message });
    }

    configChecked = true;
    return cloudinaryConfigured;
}

// Initial configuration from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Check if Cloudinary is configured (synchronous)
 */
export function isConfigured(): boolean {
    return !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
}

/**
 * Async version that checks database too
 */
export async function isConfiguredAsync(): Promise<boolean> {
    await loadCloudinaryFromDB();
    return isConfigured();
}

/**
 * Upload a PDF file to Cloudinary
 */
export async function uploadPDF(filePath: string, publicId: string): Promise<UploadResult> {
    // Ensure credentials are loaded from DB if needed
    await loadCloudinaryFromDB();

    if (!isConfigured()) {
        logger.warn("Cloudinary not configured. Using local URL for PDF.");
        return {
            success: false,
            error: "Cloudinary not configured",
            useLocal: true,
        };
    }

    if (!fs.existsSync(filePath)) {
        return {
            success: false,
            error: `File not found: ${filePath}`,
        };
    }

    try {
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: "raw",
            public_id: `documents/${publicId}`,
            overwrite: true,
            format: "pdf",
        });

        logger.info(`PDF uploaded to Cloudinary: ${result.secure_url}`);

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error("Cloudinary upload error:", { error: message, filePath, publicId });
        return {
            success: false,
            error: message,
            useLocal: true,
        };
    }
}

/**
 * Delete a PDF from Cloudinary
 */
export async function deletePDF(publicId: string): Promise<DeleteResult> {
    if (!isConfigured()) {
        return { success: false, error: "Cloudinary not configured" };
    }

    try {
        await cloudinary.uploader.destroy(`documents/${publicId}`, {
            resource_type: "raw",
        });
        logger.info(`PDF deleted from Cloudinary: ${publicId}`);
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error("Cloudinary delete error:", { error: message, publicId });
        return { success: false, error: message };
    }
}

/**
 * Get the public URL for a PDF
 */
export function getPDFUrl(publicId: string): string | null {
    if (!isConfigured()) {
        return null;
    }
    return cloudinary.url(`documents/${publicId}.pdf`, {
        resource_type: "raw",
        secure: true,
    });
}

export { loadCloudinaryFromDB };
