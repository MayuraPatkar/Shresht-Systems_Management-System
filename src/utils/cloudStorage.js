/**
 * Cloud Storage Utility for PDF Documents
 * Uploads PDFs to Cloudinary for WhatsApp accessibility
 * 
 * Setup:
 * 1. Create free Cloudinary account at https://cloudinary.com
 * 2. Add these to your .env file:
 *    CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    CLOUDINARY_API_KEY=your_api_key
 *    CLOUDINARY_API_SECRET=your_api_secret
 */

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Configure Cloudinary from environment variables
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
 * Upload a PDF file to Cloudinary
 * @param {string} filePath - Local path to the PDF file
 * @param {string} publicId - Public ID for the file (without extension)
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
async function uploadPDF(filePath, publicId) {
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
    uploadPDF,
    deletePDF,
    getPDFUrl
};
