const express = require("express");
const { exec, spawn } = require("child_process");
const path = require("path");
const multer = require("multer");
const fs = require("fs").promises;
const fsSync = require("fs");
const log = require("electron-log");

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

// Allowed collections for security
const ALLOWED_COLLECTIONS = [
    'invoices', 'quotations', 'purchaseorders', 'waybills', 
    'services', 'employees', 'stock', 'users', 'settings'
];

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
    const sanitizedCollection = collection.replace(/[^a-zA-Z0-9_-]/g, '');
    
    if (!ALLOWED_COLLECTIONS.includes(sanitizedCollection.toLowerCase())) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid collection name" 
        });
    }
    
    req.sanitizedCollection = sanitizedCollection;
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
            log.info(`Export cancelled by user for collection: ${collection}`);
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

        log.info(`Starting export for collection: ${collection} to ${filePath}`);

        // Check if mongoexport is available
        const toolsAvailable = await checkMongoTool('mongoexport');

        if (!toolsAvailable) {
            log.warn(`MongoDB tools not available for collection: ${collection}, using native export`);
            
            // Fallback: Use native MongoDB driver to export data
            const mongoose = require('mongoose');
            const collectionModel = mongoose.connection.db.collection(collection);
            
            try {
                const documents = await collectionModel.find({}).toArray();
                
                if (documents.length === 0) {
                    log.info(`No documents found in collection: ${collection}`);
                    return res.json({ 
                        success: true, 
                        message: `No data found in collection '${collection}' to export.` 
                    });
                }

                // Write JSON data to file
                const jsonData = JSON.stringify(documents, null, 2);
                await fs.writeFile(filePath, jsonData, 'utf8');
                
                log.info(`Native export completed for collection: ${collection} (${documents.length} documents)`);
                return res.json({ 
                    success: true, 
                    message: `Successfully exported ${documents.length} documents from '${collection}' to ${path.basename(filePath)}` 
                });
                
            } catch (exportError) {
                log.error(`Native export failed for collection ${collection}:`, exportError);
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
                log.error(`Export failed with code ${code}:`, stderr);
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

                log.info(`Export successful: ${filePath} (${stats.size} bytes)`);
                return res.json({ 
                    success: true, 
                    message: `Export successful! Saved to: ${filePath}`,
                    fileSize: stats.size,
                    collection: collection,
                    timestamp: new Date().toISOString()
                });
            } catch (statError) {
                log.error('Error verifying export file:', statError);
                return res.status(500).json({ 
                    success: false, 
                    message: "Export completed but file verification failed" 
                });
            }
        });

        mongoexport.on('error', (error) => {
            log.error('Mongoexport process error:', error);
            return res.status(500).json({ 
                success: false, 
                message: "Export process failed to start",
                error: error.message 
            });
        });

    } catch (err) {
        log.error("Export error:", err);
        return res.status(500).json({ 
            success: false, 
            message: "Export failed", 
            error: err.message 
        });
    }
}));

// Enhanced Multer config with security
const uploadDir = path.join(__dirname, "../uploads/");

// Ensure upload directory exists
const ensureUploadDir = async () => {
    try {
        await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
        log.error('Failed to create upload directory:', error);
    }
};
ensureUploadDir();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate secure filename with timestamp
        const timestamp = Date.now();
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `backup_${timestamp}_${sanitizedName}`);
    }
});

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

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
        files: 1
    }
});

// Clean up old temporary files
const cleanupOldFiles = async () => {
    try {
        const files = await fs.readdir(uploadDir);
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        for (const file of files) {
            const filePath = path.join(uploadDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime.getTime() < oneHourAgo) {
                await fs.unlink(filePath);
                log.info(`Cleaned up old temp file: ${file}`);
            }
        }
    } catch (error) {
        log.error('Error cleaning up temp files:', error);
    }
};

// Run cleanup every hour
setInterval(cleanupOldFiles, 60 * 60 * 1000);

// Restore collection from backup
router.post("/backup/restore-collection", upload.single("backupFile"), validateCollection, asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            message: "No backup file uploaded" 
        });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const collection = req.sanitizedCollection;
    
    log.info(`Starting collection restore: ${collection} from ${originalName}`);

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
                log.warn(`MongoDB tools not available for collection: ${collection}, using native import`);
                
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
                    
                    log.info(`Native import completed for collection: ${collection} (${result.insertedCount} documents)`);
                    return res.json({ 
                        success: true, 
                        message: `Successfully imported ${result.insertedCount} documents to '${collection}'` 
                    });
                    
                } catch (importError) {
                    log.error(`Native import failed for collection ${collection}:`, importError);
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
                log.warn('Failed to cleanup temp file:', cleanupError);
            }

            if (code !== 0) {
                log.error(`Restore failed with code ${code}:`, stderr);
                return res.status(500).json({ 
                    success: false, 
                    message: "Restore failed", 
                    error: stderr 
                });
            }

            log.info(`Restore successful: ${originalName} -> ${collection}`);
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
                log.warn('Failed to cleanup temp file:', cleanupError);
            }

            log.error('Restore process error:', error);
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
            log.warn('Failed to cleanup temp file:', cleanupError);
        }

        log.error('Collection restore error:', error);
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

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    
    log.info(`Starting database restore from ${originalName}`);

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
                log.warn('Failed to cleanup temp file:', cleanupError);
            }

            if (code !== 0) {
                log.error(`Database restore failed with code ${code}:`, stderr);
                return res.status(500).json({ 
                    success: false, 
                    message: "Database restore failed", 
                    error: stderr 
                });
            }

            log.info(`Database restore successful from: ${originalName}`);
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
                log.warn('Failed to cleanup temp file:', cleanupError);
            }

            log.error('Database restore process error:', error);
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
            log.warn('Failed to cleanup temp file:', cleanupError);
        }

        log.error('Database restore error:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Database restore failed", 
            error: error.message 
        });
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
            uploadDir: uploadDir,
            allowedCollections: ALLOWED_COLLECTIONS,
            maxFileSize: '100MB'
        });
    } catch (error) {
        log.error('Error checking backup status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check backup tools status',
            error: error.message
        });
    }
}));


module.exports = router;
