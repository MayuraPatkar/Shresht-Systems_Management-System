const express = require("express");
const { exec, spawn } = require("child_process");
const path = require("path");
const os = require('os');
const multer = require("multer");
const fs = require("fs").promises;
const fsSync = require("fs");
const logger = require('../utils/logger');
const backupScheduler = require('../utils/backupScheduler');
const backupUtil = require('../utils/backup');

// Import cache invalidation function from comms route
let invalidateWhatsAppCache;
try {
    const commsRoute = require('./comms');
    invalidateWhatsAppCache = commsRoute.invalidateWhatsAppCache;
} catch (e) {
    // If comms route is not yet loaded, create a no-op function
    invalidateWhatsAppCache = () => {};
}

const router = express.Router();

// Helper function to show dialogs through the main process
const showDialog = (type, options) => {
    return new Promise((resolve, reject) => {
        if (!global.dialogEmitter) {
            reject(new Error('Dialog emitter not available'));
            return;
        }
        
        global.dialogEmitter.emit(type, options, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
};

// Helper function to check MongoDB tool availability
const checkMongoTool = (toolName, timeout = 3000) => {
    return new Promise((resolve) => {
        const checkProcess = spawn(toolName, ['--version']);
        
        let resolved = false;
        
        checkProcess.on('error', () => {
            if (!resolved) {
                resolved = true;
                resolve(false);
            }
        });
        
        checkProcess.on('close', (code) => {
            if (!resolved) {
                resolved = true;
                resolve(code === 0);
            }
        });
        
        // Timeout fallback
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                checkProcess.kill();
                resolve(false);
            }
        }, timeout);
    });
};

// Allowed collections for security (mapping frontend names to actual collection names)
const ALLOWED_COLLECTIONS = [
    'invoices', 'quotations', 'purchaseorders', 'waybills', 
    'services', 'employees', 'stock', 'users', 'settings',
    'purchases', 'stocks' // Aliases for frontend compatibility
];

// Map frontend names to actual database collection names
const COLLECTION_MAPPING = {
    'purchases': 'purchaseorders',
    'stocks': 'stock',
    'quotations': 'quotations',
    'invoices': 'invoices',
    'waybills': 'waybills',
    'services': 'services',
    'employees': 'employees',
    'users': 'users',
    'settings': 'settings'
};

// Validation middleware for collection names
const validateCollection = (req, res, next) => {
    const collection = req.params.collection || req.body.collection;
    
    if (!collection) {
        return res.status(400).json({ 
            success: false, 
            message: "Collection name is required" 
        });
    }
    
    // Sanitize and validate collection name
    const sanitizedCollection = collection.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    
    if (!ALLOWED_COLLECTIONS.includes(sanitizedCollection)) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid collection name" 
        });
    }
    
    // Map to actual collection name
    req.sanitizedCollection = COLLECTION_MAPPING[sanitizedCollection] || sanitizedCollection;
    req.displayName = sanitizedCollection; // Keep original name for display
    next();
};

// Async wrapper for better error handling
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Export selected collection to JSON
router.get("/backup/export/:collection", validateCollection, asyncHandler(async (req, res) => {
    const collection = req.sanitizedCollection;
    const timestamp = new Date().toISOString().split("T")[0];

    try {
        // Ask user where to save JSON file
        const result = await showDialog('show-save-dialog', {
            title: `Export ${collection} data`,
            defaultPath: `${collection}-${timestamp}.json`,
            filters: [
                { name: "JSON Files", extensions: ["json"] },
                { name: "Compressed JSON", extensions: ["gz"] }
            ]
        });

        if (result.canceled) {
            logger.info(`Export cancelled by user for collection: ${collection}`);
            return res.json({ 
                success: true, 
                message: "Export cancelled by user" 
            });
        }

        const filePath = result.filePath;
        
        // Validate file path
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('Invalid file path selected');
        }

        // Create directory if it doesn't exist
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        logger.info(`Starting export for collection: ${collection} to ${filePath}`);

        // Check if mongoexport is available
        const toolsAvailable = await checkMongoTool('mongoexport');

        if (!toolsAvailable) {
            logger.warn(`MongoDB tools not available for collection: ${collection}, using native export`);
            
            // Fallback: Use native MongoDB driver to export data
            const mongoose = require('mongoose');
            const collectionModel = mongoose.connection.db.collection(collection);
            
            try {
                const documents = await collectionModel.find({}).toArray();
                
                    if (documents.length === 0) {
                        logger.info(`No documents found in collection: ${collection}`);
                    return res.json({ 
                        success: true, 
                        message: `No data found in collection '${collection}' to export.` 
                    });
                }

                // Write JSON data to file
                const jsonData = JSON.stringify(documents, null, 2);
                await fs.writeFile(filePath, jsonData, 'utf8');
                
                logger.info(`Native export completed for collection: ${collection} (${documents.length} documents)`);
                return res.json({ 
                    success: true, 
                    message: `Successfully exported ${documents.length} documents from '${collection}' to ${path.basename(filePath)}` 
                });
                
            } catch (exportError) {
                logger.error(`Native export failed for collection ${collection}:`, exportError);
                throw exportError;
            }
        }

        // Use spawn for better control and security
        const mongoexport = spawn('mongoexport', [
            '--db', 'shreshtSystems',
            '--collection', collection,
            '--out', filePath,
            '--jsonArray',
            '--pretty'
        ]);

        let stdout = '';
        let stderr = '';

        mongoexport.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        mongoexport.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        mongoexport.on('close', async (code) => {
            if (code !== 0) {
                logger.error(`Export failed with code ${code}`, { stderr });
                return res.status(500).json({ 
                    success: false, 
                    message: "Export failed", 
                    error: stderr 
                });
            }

            try {
                // Verify file was created and has content
                const stats = await fs.stat(filePath);
                if (stats.size === 0) {
                    throw new Error('Export file is empty');
                }

                logger.info(`Export successful: ${filePath} (${stats.size} bytes)`);
                return res.json({ 
                    success: true, 
                    message: `Export successful! Saved to: ${filePath}`,
                    fileSize: stats.size,
                    collection: collection,
                    timestamp: new Date().toISOString()
                });
            } catch (statError) {
                logger.error('Error verifying export file:', statError);
                return res.status(500).json({ 
                    success: false, 
                    message: "Export completed but file verification failed" 
                });
            }
        });

        mongoexport.on('error', (error) => {
            logger.error('Mongoexport process error:', error);
            return res.status(500).json({ 
                success: false, 
                message: "Export process failed to start",
                error: error.message 
            });
        });

    } catch (err) {
        logger.error("Export error:", err);
        return res.status(500).json({ 
            success: false, 
            message: "Export failed", 
            error: err.message 
        });
    }
}));


const fileFilter = (req, file, cb) => {
    // Allow only specific backup file types
    const allowedTypes = ['.json', '.bson', '.gz', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${ext}. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
};

// Use memory storage for uploads to avoid relying on an application upload directory.
// Files will be written to a secure temporary file if needed by restore handlers.
const memoryStorage = multer.memoryStorage();
const upload = multer({ 
    storage: memoryStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
        files: 1
    }
});

// Restore collection from backup
router.post("/backup/restore-collection", upload.single("backupFile"), validateCollection, asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            message: "No backup file uploaded" 
        });
    }
    // If multer used memoryStorage, write buffer to a temp file so restore tools can access a path
    const originalName = req.file.originalname;
    let filePath;
    if (req.file.path && typeof req.file.path === 'string') {
        filePath = req.file.path;
    } else if (req.file.buffer) {
        const ext = path.extname(originalName) || '';
        const tmpName = `shresht-restore-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        const tmpPath = path.join(os.tmpdir(), tmpName);
        await fs.writeFile(tmpPath, req.file.buffer);
        filePath = tmpPath;
    } else {
        return res.status(400).json({ success: false, message: 'Invalid uploaded file' });
    }
    const collection = req.sanitizedCollection;
    
    logger.info(`Starting collection restore: ${collection} from ${originalName}`);

    try {
        // Verify file exists and is readable
        await fs.access(filePath, fsSync.constants.R_OK);
        const stats = await fs.stat(filePath);
        
        if (stats.size === 0) {
            throw new Error('Uploaded file is empty');
        }

        const ext = path.extname(originalName).toLowerCase();
        let command, args;

        if (ext === ".json") {
            // Check if mongoimport is available
            const importAvailable = await checkMongoTool('mongoimport');
            if (!importAvailable) {
                logger.warn(`MongoDB tools not available for collection: ${collection}, using native import`);
                
                // Fallback: Use native MongoDB driver to import data
                const mongoose = require('mongoose');
                const collectionModel = mongoose.connection.db.collection(collection);
                
                try {
                    // Read and parse JSON file
                    const jsonData = await fs.readFile(filePath, 'utf8');
                    const documents = JSON.parse(jsonData);
                    
                    if (!Array.isArray(documents) || documents.length === 0) {
                        throw new Error('Invalid JSON format or empty data');
                    }

                    // Clear existing collection
                    await collectionModel.deleteMany({});
                    
                    // Insert new documents
                    const result = await collectionModel.insertMany(documents);
                    
                    logger.info(`Native import completed for collection: ${collection} (${result.insertedCount} documents)`);
                    return res.json({ 
                        success: true, 
                        message: `Successfully imported ${result.insertedCount} documents to '${collection}'` 
                    });
                    
                } catch (importError) {
                    logger.error(`Native import failed for collection ${collection}:`, importError);
                    throw importError;
                }
            }
            
            // JSON backup → use mongoimport
            command = 'mongoimport';
            args = [
                '--db', 'shreshtSystems',
                '--collection', collection,
                '--file', filePath,
                '--jsonArray',
                '--drop'
            ];
        } else if (['.bson', '.gz', '.zip'].includes(ext)) {
            // Check if mongorestore is available
            const restoreAvailable = await checkMongoTool('mongorestore');
            if (!restoreAvailable) {
                throw new Error('MongoDB restore tools are not installed. Please install MongoDB Tools to use this feature.');
            }
            
            // BSON/mongodump backup → use mongorestore
            command = 'mongorestore';
            args = [
                '--db', 'shreshtSystems',
                '--collection', collection,
                '--drop',
                '--archive=' + filePath
            ];
            
            if (ext === '.gz') {
                args.push('--gzip');
            }
        } else {
            throw new Error(`Unsupported file format: ${ext}`);
        }

        // Execute restore command
        const restoreProcess = spawn(command, args);
        let stdout = '';
        let stderr = '';

        restoreProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        restoreProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        restoreProcess.on('close', async (code) => {
            // Clean up temp file
            try {
                await fs.unlink(filePath);
            } catch (cleanupError) {
                logger.warn('Failed to cleanup temp file:', cleanupError);
            }

            if (code !== 0) {
                logger.error(`Restore failed with code ${code}`, { stderr });
                return res.status(500).json({ 
                    success: false, 
                    message: "Restore failed", 
                    error: stderr 
                });
            }

            logger.info(`Restore successful: ${originalName} -> ${collection}`);
            return res.json({ 
                success: true, 
                message: `Restore successful from ${originalName}`,
                collection: collection,
                fileSize: stats.size,
                timestamp: new Date().toISOString()
            });
        });

        restoreProcess.on('error', async (error) => {
            // Clean up temp file on error
            try {
                await fs.unlink(filePath);
            } catch (cleanupError) {
                logger.warn('Failed to cleanup temp file:', cleanupError);
            }

            logger.error('Restore process error:', error);
            return res.status(500).json({ 
                success: false, 
                message: "Restore process failed to start",
                error: error.message 
            });
        });

    } catch (error) {
        // Clean up temp file on error
        try {
            await fs.unlink(filePath);
        } catch (cleanupError) {
            logger.warn('Failed to cleanup temp file:', cleanupError);
        }

        logger.error('Collection restore error:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Restore failed", 
            error: error.message 
        });
    }
}));


// Restore database from backup
router.post("/backup/restore-database", upload.single("backupFile"), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            message: "No backup file uploaded" 
        });
    }
    // If multer used memoryStorage, write buffer to a temp file so restore tools can access a path
    const originalName = req.file.originalname;
    let filePath;
    if (req.file.path && typeof req.file.path === 'string') {
        filePath = req.file.path;
    } else if (req.file.buffer) {
        const ext = path.extname(originalName) || '';
        const tmpName = `shresht-restore-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        const tmpPath = path.join(os.tmpdir(), tmpName);
        await fs.writeFile(tmpPath, req.file.buffer);
        filePath = tmpPath;
    } else {
        return res.status(400).json({ success: false, message: 'Invalid uploaded file' });
    }
    
    logger.info(`Starting database restore from ${originalName}`);

    try {
        // Verify file exists and is readable
        await fs.access(filePath, fsSync.constants.R_OK);
        const stats = await fs.stat(filePath);
        
        if (stats.size === 0) {
            throw new Error('Uploaded file is empty');
        }

        const ext = path.extname(originalName).toLowerCase();
        let command, args;

        if (ext === ".json") {
            // JSON backup → use mongoimport (this is problematic for full DB restore)
            return res.status(400).json({ 
                success: false, 
                message: "JSON format not supported for full database restore. Use mongodump format (.bson/.gz)" 
            });
        } else if (['.bson', '.gz', '.zip'].includes(ext)) {
            // Check if mongorestore is available
            const restoreAvailable = await checkMongoTool('mongorestore');
            if (!restoreAvailable) {
                throw new Error('MongoDB restore tools are not installed. Please install MongoDB Tools to use this feature.');
            }
            
            // BSON/mongodump backup → use mongorestore
            command = 'mongorestore';
            args = [
                '--db', 'shreshtSystems',
                '--drop',
                '--archive=' + filePath
            ];
            
            if (ext === '.gz') {
                args.push('--gzip');
            }
        } else {
            throw new Error(`Unsupported file format: ${ext}`);
        }

        // Execute restore command
        const restoreProcess = spawn(command, args);
        let stdout = '';
        let stderr = '';

        restoreProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        restoreProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        restoreProcess.on('close', async (code) => {
            // Clean up temp file
            try {
                await fs.unlink(filePath);
            } catch (cleanupError) {
                logger.warn('Failed to cleanup temp file:', cleanupError);
            }

            if (code !== 0) {
                logger.error(`Database restore failed with code ${code}`, { stderr });
                return res.status(500).json({ 
                    success: false, 
                    message: "Database restore failed", 
                    error: stderr 
                });
            }

            logger.info(`Database restore successful from: ${originalName}`);
            return res.json({ 
                success: true, 
                message: `Database restore successful from ${originalName}`,
                fileSize: stats.size,
                timestamp: new Date().toISOString(),
                warning: "Application may need to be restarted for changes to take full effect"
            });
        });

        restoreProcess.on('error', async (error) => {
            // Clean up temp file on error
            try {
                await fs.unlink(filePath);
            } catch (cleanupError) {
                logger.warn('Failed to cleanup temp file:', cleanupError);
            }

            logger.error('Database restore process error:', error);
            return res.status(500).json({ 
                success: false, 
                message: "Database restore process failed to start",
                error: error.message 
            });
        });

    } catch (error) {
        // Clean up temp file on error
        try {
            await fs.unlink(filePath);
        } catch (cleanupError) {
            logger.warn('Failed to cleanup temp file:', cleanupError);
        }

        logger.error('Database restore error:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Database restore failed", 
            error: error.message 
        });
    }
}));

// Manual backup trigger (creates a gzipped mongodump archive)
router.post("/backup/manual", asyncHandler(async (req, res) => {
    try {
        const info = await backupUtil();
        return res.json({
            success: true,
            message: 'Backup created successfully',
            path: info.backupPath,
            fileSize: info.size,
            timestamp: info.timestamp
        });
    } catch (error) {
        logger.error('Manual backup failed:', error);
        return res.status(500).json({ success: false, message: 'Manual backup failed', error: error.message });
    }
}));

// Add backup status endpoint
router.get("/backup/status", asyncHandler(async (req, res) => {
    try {
        // Check if MongoDB tools are available using our helper function
        const [mongodumpAvailable, mongoexportAvailable, mongoimportAvailable, mongorestoreAvailable] = await Promise.all([
            checkMongoTool('mongodump'),
            checkMongoTool('mongoexport'),
            checkMongoTool('mongoimport'),
            checkMongoTool('mongorestore')
        ]);

        res.json({
            success: true,
            tools: {
                mongodump: mongodumpAvailable,
                mongoexport: mongoexportAvailable,
                mongoimport: mongoimportAvailable,
                mongorestore: mongorestoreAvailable
            },
            allowedCollections: ALLOWED_COLLECTIONS,
            maxFileSize: '100MB'
        });
    } catch (error) {
        logger.error('Error checking backup status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check backup tools status',
            error: error.message
        });
    }
}));

// ==================== SYSTEM SETTINGS MANAGEMENT ====================

const { Settings, Admin } = require('../models');
const mongoose = require('mongoose');
const fileCleanup = require('../utils/fileCleanup');
const config = require('../config/config');

// Get system settings
router.get("/preferences", asyncHandler(async (req, res) => {
    try {
        let settings = await Settings.findOne();
        
        // Create default settings if none exist
        if (!settings) {
            settings = new Settings({});
            await settings.save();
        }
        
        res.json({
            success: true,
            settings: settings
        });
    } catch (error) {
        logger.error('Error fetching settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
            error: error.message
        });
    }
}));

// Update system settings (partial update)
router.patch("/preferences", asyncHandler(async (req, res) => {
    try {
        const updates = req.body;
        
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings({});
        }
        
        // Update only provided fields
        Object.keys(updates).forEach(key => {
            if (settings[key] && typeof settings[key] === 'object') {
                settings[key] = { ...settings[key].toObject(), ...updates[key] };
            } else {
                settings[key] = updates[key];
            }
        });
        
        settings.updatedAt = new Date();
        await settings.save();

        // Refresh backup schedule in case backup preferences changed
        try {
            await backupScheduler.refreshSchedule();
            logger.info('Backup scheduler refreshed after settings update');
        } catch (schedErr) {
            logger.warn('Failed to refresh backup scheduler after settings update:', schedErr.message || schedErr);
        }

        logger.info('Settings updated successfully');
        res.json({
            success: true,
            message: 'Settings updated successfully',
            settings: settings
        });
    } catch (error) {
        logger.error('Error updating settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings',
            error: error.message
        });
    }
}));

// Update WhatsApp settings (non-sensitive fields). Token not included here; see separate token endpoint.
router.patch('/preferences/whatsapp', asyncHandler(async (req, res) => {
    try {
        const { enabled, phoneNumberId, pdfBaseUrl } = req.body;

        let settings = await Settings.findOne();
        if (!settings) settings = new Settings({});

        settings.whatsapp = settings.whatsapp || {};
        if (enabled !== undefined) settings.whatsapp.enabled = !!enabled;
        if (phoneNumberId !== undefined) settings.whatsapp.phoneNumberId = String(phoneNumberId);
        if (pdfBaseUrl !== undefined) settings.whatsapp.pdfBaseUrl = String(pdfBaseUrl);

        settings.updatedAt = new Date();
        await settings.save();

        // Invalidate WhatsApp credentials cache so new settings take effect immediately
        if (invalidateWhatsAppCache) invalidateWhatsAppCache();

        logger.info('WhatsApp settings updated');
        return res.json({ success: true, message: 'WhatsApp settings updated', whatsapp: settings.whatsapp });
    } catch (error) {
        logger.error('Error updating WhatsApp settings:', error);
        return res.status(500).json({ success: false, message: 'Failed to update WhatsApp settings', error: error.message });
    }
}));

// Store WhatsApp token securely using Keytar or encrypted fallback
const secureStore = require('../utils/secureStore');

router.post('/preferences/whatsapp/token', asyncHandler(async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

        const ok = await secureStore.setWhatsAppToken(token);
        if (!ok) {
            return res.status(500).json({ success: false, message: 'Failed to store token securely' });
        }

        // Optionally update settings to reflect token is present
        let settings = await Settings.findOne();
        if (!settings) settings = new Settings({});
        settings.whatsapp = settings.whatsapp || {};
        settings.whatsapp.storedTokenReference = 'os-keychain';
        await settings.save();

        // Invalidate WhatsApp credentials cache so new token takes effect immediately
        if (invalidateWhatsAppCache) invalidateWhatsAppCache();

        logger.info('WhatsApp token stored securely');
        return res.json({ success: true, message: 'WhatsApp token stored securely' });
    } catch (error) {
        logger.error('Error storing WhatsApp token:', error);
        return res.status(500).json({ success: false, message: 'Failed to store WhatsApp token', error: error.message });
    }
}));

// Update Cloudinary settings (stored in Settings DB - secrets encrypted)
router.patch('/preferences/cloudinary', asyncHandler(async (req, res) => {
    try {
        const { cloudName, apiKey, apiSecret } = req.body;
        
        if (!cloudName || !apiKey || !apiSecret) {
            return res.status(400).json({ success: false, message: 'All Cloudinary fields are required' });
        }
        
        let settings = await Settings.findOne();
        if (!settings) settings = new Settings({});
        
        // Store cloudinary config - in production these would go to secure store
        // For now, store in settings with a reference that they're configured
        settings.cloudinary = settings.cloudinary || {};
        settings.cloudinary.cloudName = cloudName;
        settings.cloudinary.apiKey = apiKey;
        settings.cloudinary.configured = true;
        
        // Store the secret securely using the same pattern as WhatsApp token
        const crypto = require('crypto');
        const secret = process.env.SESSION_SECRET || 'unsafe-default-secret-change-in-production';
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', crypto.createHash('sha256').update(secret).digest(), iv);
        const encrypted = Buffer.concat([cipher.update(apiSecret, 'utf8'), cipher.final()]);
        settings.cloudinary.apiSecretEncrypted = iv.toString('hex') + ':' + encrypted.toString('hex');
        
        await settings.save();
        
        // Also set environment variables for current session
        process.env.CLOUDINARY_CLOUD_NAME = cloudName;
        process.env.CLOUDINARY_API_KEY = apiKey;
        process.env.CLOUDINARY_API_SECRET = apiSecret;
        
        logger.info('Cloudinary settings updated');
        return res.json({ success: true, message: 'Cloudinary settings saved successfully' });
    } catch (error) {
        logger.error('Error updating Cloudinary settings:', error);
        return res.status(500).json({ success: false, message: 'Failed to update Cloudinary settings', error: error.message });
    }
}));

// Update admin/company information
router.put("/company-info", asyncHandler(async (req, res) => {
    try {
        const updates = req.body;
        
        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin record not found'
            });
        }
        
        // Update allowed fields
        const allowedFields = ['company', 'address', 'state', 'phone', 'email', 'website', 'GSTIN', 'bank_details'];
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                admin[field] = updates[field];
            }
        });
        
        await admin.save();
        
        logger.info('Company information updated successfully');
        res.json({
            success: true,
            message: 'Company information updated successfully',
            admin: admin
        });
    } catch (error) {
        logger.error('Error updating company info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update company information',
            error: error.message
        });
    }
}));

// Get database statistics
router.get("/database/stats", asyncHandler(async (req, res) => {
    try {
        const db = mongoose.connection.db;
        
        // Get database stats
        const stats = await db.stats();
        
        // Get collection counts
        const collections = await db.listCollections().toArray();
        const collectionCounts = {};
        
        for (const coll of collections) {
            const count = await db.collection(coll.name).countDocuments();
            collectionCounts[coll.name] = count;
        }
        
        // Get settings for last backup info
        const settings = await Settings.findOne();
        
        res.json({
            success: true,
            stats: {
                database_size: stats.dataSize,
                database_size_mb: (stats.dataSize / (1024 * 1024)).toFixed(2),
                storage_size: stats.storageSize,
                storage_size_mb: (stats.storageSize / (1024 * 1024)).toFixed(2),
                index_size: stats.indexSize,
                index_size_mb: (stats.indexSize / (1024 * 1024)).toFixed(2),
                total_documents: Object.values(collectionCounts).reduce((a, b) => a + b, 0),
                collections: collectionCounts,
                last_backup: settings?.backup?.last_backup || null
            }
        });
    } catch (error) {
        logger.error('Error fetching database stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch database statistics',
            error: error.message
        });
    }
}));

// Update last backup timestamp
router.post("/database/backup-completed", asyncHandler(async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings({});
        }
        
        settings.backup.last_backup = new Date();
        await settings.save();
        
        res.json({
            success: true,
            message: 'Backup timestamp updated',
            last_backup: settings.backup.last_backup
        });
    } catch (error) {
        logger.error('Error updating backup timestamp:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update backup timestamp',
            error: error.message
        });
    }
}));

// Trigger immediate uploads cleanup (remove old PDFs)
router.post('/cleanup/uploads', asyncHandler(async (req, res) => {
    try {
        // Build uploads path similarly to server fallback logic
        const uploadsDir = process.env.UPLOADS_DIR || (global.appPaths && path.join(global.appPaths.userData, 'uploads', 'documents')) || path.join(__dirname, '../../uploads/documents');
        const retentionDays = config.uploadsRetentionDays || 7;
        const result = await fileCleanup.cleanupOldFiles(uploadsDir, retentionDays, ['.pdf']);
        return res.json({ success: true, message: 'Upload cleanup completed', result });
    } catch (error) {
        logger.error('Upload cleanup error via settings endpoint:', error);
        return res.status(500).json({ success: false, message: 'Upload cleanup failed', error: error.message });
    }
}));

// Logo upload configuration
const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const logoDir = path.join(__dirname, "../../public/assets/");
        cb(null, logoDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `company-logo${ext}`);
    }
});

const logoUpload = multer({
    storage: logoStorage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.png', '.jpg', '.jpeg', '.svg'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PNG, JPG, and SVG are allowed.'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Upload company logo
router.post("/logo/upload", logoUpload.single("logo"), asyncHandler(async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        
        const logoPath = `/assets/${req.file.filename}`;
        
        // Update settings with logo path
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings({});
        }
        
        settings.branding.logo_path = logoPath;
        settings.updatedAt = new Date();
        await settings.save();
        
        logger.info('Company logo uploaded successfully:', logoPath);
        res.json({
            success: true,
            message: 'Logo uploaded successfully',
            logo_path: logoPath
        });
    } catch (error) {
        logger.error('Error uploading logo:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload logo',
            error: error.message
        });
    }
}));

// Get system information
router.get("/system-info", asyncHandler(async (req, res) => {
    try {
        const package = require('../../package.json');
        const os = require('os');
        
        res.json({
            success: true,
            system: {
                app_name: package.name || 'Shresht Systems Management',
                app_version: package.version || '1.0.0',
                node_version: process.version,
                platform: os.platform(),
                arch: os.arch(),
                total_memory: (os.totalmem() / (1024 ** 3)).toFixed(2) + ' GB',
                free_memory: (os.freemem() / (1024 ** 3)).toFixed(2) + ' GB',
                uptime: Math.floor(process.uptime()) + ' seconds'
            }
        });
    } catch (error) {
        logger.error('Error fetching system info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system information',
            error: error.message
        });
    }
}));


module.exports = router;
