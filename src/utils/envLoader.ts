/**
 * Environment Variable Loader
 *
 * Handles environment variable loading for both development and production:
 * - Development: Loads from .env file using dotenv
 * - Production: Reads from system environment variables
 *
 * This module should be imported at the very top of the application entry point
 * before any other modules that depend on environment variables.
 */

import path from "path";
import fs from "fs";
import secureStore from "./secureStore";

/**
 * Determines if the app is running in a packaged (production) state
 */
export function isPackaged(): boolean {
    return (
        !!(process as unknown as Record<string, Record<string, string>>).mainModule?.filename?.includes("app.asar") ||
        __dirname.includes("app.asar") ||
        process.env.NODE_ENV === "production"
    );
}

/**
 * Load environment variables from .env file in development
 * In production, uses system environment variables only
 */
export function loadEnvironment(): void {
    const isProd = isPackaged();

    if (!isProd) {
        // Development: Load from .env file
        const envPath = path.resolve(__dirname, "../../.env");

        if (fs.existsSync(envPath)) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require("dotenv").config({ path: envPath });
        }
    }
}

/**
 * Get an environment variable with fallback
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
    const value = process.env[key];

    if (value === undefined || value === "") {
        return defaultValue;
    }

    return value;
}

/**
 * Get a required environment variable (throws if not found)
 */
export function getRequiredEnv(key: string): string {
    const value = process.env[key];

    if (value === undefined || value === "") {
        throw new Error(`Required environment variable ${key} is not set`);
    }

    return value;
}

/**
 * Check if all required WhatsApp API credentials are configured
 */
export function isWhatsAppConfigured(): boolean {
    return !!(process.env.WHATSAPP_TOKEN && process.env.PHONE_NUMBER_ID);
}

/**
 * Async check for WhatsApp configuration (includes secure store)
 */
export async function asyncIsWhatsAppConfigured(): Promise<boolean> {
    if (process.env.WHATSAPP_TOKEN && process.env.PHONE_NUMBER_ID) return true;
    try {
        const token = await secureStore.getWhatsAppToken();
        const phone = process.env.PHONE_NUMBER_ID || undefined;
        return !!(token && phone);
    } catch {
        return false;
    }
}

/**
 * Get safe configuration for exposing to renderer process
 * NEVER expose sensitive tokens to the renderer!
 */
export function getSafeConfig(): Record<string, unknown> {
    return {
        nodeEnv: process.env.NODE_ENV || "development",
        appName: process.env.APP_NAME || "Shresht Systems Management System",
        appVersion: process.env.APP_VERSION || "3.3.0",
        isWhatsAppConfigured: isWhatsAppConfigured(),
    };
}

// Load environment on module import
loadEnvironment();
