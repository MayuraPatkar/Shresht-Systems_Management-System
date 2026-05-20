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

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');

let cloudinaryConfigured = false;
let configChecked = false;

/**
 * Load Cloudinary credentials from database if not in environment
 */
async function loadCloudinaryFromDB() {
    if (configChecked) return cloudinaryConfigured;
    
    try {
        // Check if already configured via env
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET
            });
            cloudinaryConfigured = true;
            configChecked = true;
            return true;
        }
        
        // Try to load from database
        const { Settings } = require('../models');
        const settings = await Settings.findOne();
        
        if (settings?.cloudinary?.configured && settings.cloudinary.cloudName && settings.cloudinary.apiKey && settings.cloudinary.apiSecretEncrypted) {
            // Decrypt the API secret
            const secret = process.env.SESSION_SECRET || 'unsafe-default-secret-change-in-production';
            const [ivHex, dataHex] = settings.cloudinary.apiSecretEncrypted.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const encrypted = Buffer.from(dataHex, 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.createHash('sha256').update(secret).digest(), iv);
            const apiSecret = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
            
            // Configure cloudinary
            cloudinary.config({
                cloud_name: settings.cloudinary.cloudName,
                api_key: settings.cloudinary.apiKey,
                api_secret: apiSecret
            });
            
            // Also set env vars for other modules
            process.env.CLOUDINARY_CLOUD_NAME = settings.cloudinary.cloudName;
            process.env.CLOUDINARY_API_KEY = settings.cloudinary.apiKey;
            process.env.CLOUDINARY_API_SECRET = apiSecret;
            
            cloudinaryConfigured = true;
            logger.info('Cloudinary configured from database settings');
        }
    } catch (err) {
        logger.warn('Failed to load Cloudinary settings from database:', err.message);
    }
    
    configChecked = true;
    return cloudinaryConfigured;
}

// Initial configuration from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Check if Cloudinary is configured
 * @returns {boolean} True if all required credentials are set
 */
function isConfigured() {
    return !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
}

/**
 * Async version that checks database too
 * @returns {Promise<boolean>}
 */
async function isConfiguredAsync() {
    await loadCloudinaryFromDB();
    return isConfigured();
}

/**
 * Upload a PDF file to Cloudinary
 * @param {string} filePath - Local path to the PDF file
 * @param {string} publicId - Public ID for the file (without extension)
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
async function uploadPDF(filePath, publicId) {
    // Ensure credentials are loaded from DB if needed
    await loadCloudinaryFromDB();
    
    if (!isConfigured()) {
        logger.warn('Cloudinary not configured. Using local URL for PDF.');
        return { 
            success: false, 
            error: 'Cloudinary not configured',
            useLocal: true 
        };
    }

    if (!fs.existsSync(filePath)) {
        return { 
            success: false, 
            error: `File not found: ${filePath}` 
        };
    }

    try {
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'raw',  // Required for PDF files
            public_id: `documents/${publicId}`,
            overwrite: true,
            format: 'pdf'
        });

        logger.info(`PDF uploaded to Cloudinary: ${result.secure_url}`);
        
        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id
        };
    } catch (error) {
        logger.error('Cloudinary upload error:', { 
            error: error.message,
            filePath,
            publicId 
        });
        return { 
            success: false, 
            error: error.message,
            useLocal: true 
        };
    }
}

/**
 * Delete a PDF from Cloudinary
 * @param {string} publicId - Public ID of the file to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deletePDF(publicId) {
    if (!isConfigured()) {
        return { success: false, error: 'Cloudinary not configured' };
    }

    try {
        await cloudinary.uploader.destroy(`documents/${publicId}`, {
            resource_type: 'raw'
        });
        logger.info(`PDF deleted from Cloudinary: ${publicId}`);
        return { success: true };
    } catch (error) {
        logger.error('Cloudinary delete error:', { error: error.message, publicId });
        return { success: false, error: error.message };
    }
}

/**
 * Get the public URL for a PDF
 * @param {string} publicId - Public ID of the file
 * @returns {string} The public URL
 */
function getPDFUrl(publicId) {
    if (!isConfigured()) {
        return null;
    }
    return cloudinary.url(`documents/${publicId}.pdf`, {
        resource_type: 'raw',
        secure: true
    });
}

module.exports = {
    isConfigured,
    isConfiguredAsync,
    loadCloudinaryFromDB,
    uploadPDF,
    deletePDF,
    getPDFUrl
};
