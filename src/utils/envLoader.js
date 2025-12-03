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

const path = require('path');
const fs = require('fs');
const secureStore = require('./secureStore');

/**
 * Determines if the app is running in a packaged (production) state
 * @returns {boolean}
 */
function isPackaged() {
    // electron-builder sets this, or we can check for .asar in path
    return (
        process.mainModule?.filename?.includes('app.asar') ||
        __dirname.includes('app.asar') ||
        process.env.NODE_ENV === 'production'
    );
}

/**
 * Load environment variables from .env file in development
 * In production, uses system environment variables only
 */
function loadEnvironment() {
    const isProd = isPackaged();
    
    if (!isProd) {
        // Development: Load from .env file
        const envPath = path.resolve(__dirname, '../../.env');
        
        if (fs.existsSync(envPath)) {
            require('dotenv').config({ path: envPath });
            console.log('[ENV] Loaded environment variables from .env file');
        } else {
            console.warn('[ENV] No .env file found, using system environment variables');
        }
    } else {
        // Production: Use system environment variables
        // dotenv is not needed, process.env already contains system vars
        console.log('[ENV] Production mode: Using system environment variables');
    }
}

/**
 * Get an environment variable with fallback
 * @param {string} key - Environment variable name
 * @param {*} defaultValue - Default value if not found
 * @returns {string|*} - The environment variable value or default
 */
function getEnv(key, defaultValue = undefined) {
    const value = process.env[key];
    
    if (value === undefined || value === '') {
        if (defaultValue === undefined) {
            console.warn(`[ENV] Environment variable ${key} is not set and has no default`);
        }
        return defaultValue;
    }
    
    return value;
}

/**
 * Get a required environment variable (throws if not found)
 * @param {string} key - Environment variable name
 * @returns {string} - The environment variable value
 * @throws {Error} - If the variable is not set
 */
function getRequiredEnv(key) {
    const value = process.env[key];
    
    if (value === undefined || value === '') {
        throw new Error(`Required environment variable ${key} is not set`);
    }
    
    return value;
}

/**
 * Check if all required WhatsApp API credentials are configured
 * @returns {boolean}
 */
function isWhatsAppConfigured() {
    return !!(
        process.env.WHATSAPP_TOKEN &&
        process.env.PHONE_NUMBER_ID
    );
}

async function asyncIsWhatsAppConfigured() {
    if (process.env.WHATSAPP_TOKEN && process.env.PHONE_NUMBER_ID) return true;
    try {
        const token = await secureStore.getWhatsAppToken();
        const phone = process.env.PHONE_NUMBER_ID || undefined;
        if (token && phone) return true;
        // If phone is in DB, check DB (less ideal in this low-level loader)
        return !!(token && phone);
    } catch (e) {
        return false;
    }
}

/**
 * Get safe configuration for exposing to renderer process
 * NEVER expose sensitive tokens to the renderer!
 * @returns {Object} - Safe configuration object
 */
function getSafeConfig() {
    return {
        nodeEnv: process.env.NODE_ENV || 'development',
        appName: process.env.APP_NAME || 'Shresht Systems Management System',
        appVersion: process.env.APP_VERSION || '3.3.0',
        isWhatsAppConfigured: isWhatsAppConfigured(),
        // Add other non-sensitive config here
    };
}

// Load environment on module import
loadEnvironment();

module.exports = {
    loadEnvironment,
    getEnv,
    getRequiredEnv,
    isPackaged,
    isWhatsAppConfigured,
    asyncIsWhatsAppConfigured,
    getSafeConfig
};
