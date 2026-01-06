const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const exServer = express();
const config = require('./src/config/config');
const logger = require('./src/utils/logger');
const connectDB = require('./src/config/database');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const autoBackup = require("./src/utils/backup");
const backupScheduler = require('./src/utils/backupScheduler');
const { findAvailablePort, printStartupBanner } = require('./src/utils/portFinder');
const secureStore = require('./src/utils/secureStore');
const fileCleanup = require('./src/utils/fileCleanup');

// Track the actual port the server is running on
let actualPort = null;
let server = null;

// Security Middleware
exServer.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// Dynamic CORS configuration - uses actual port after detection
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like Electron file://)
        if (!origin) {
            return callback(null, true);
        }

        // Build allowed origins dynamically based on actual port
        const port = actualPort || config.port;
        const allowedOrigins = [
            `http://localhost:${port}`,
            'file://'
        ];

        if (allowedOrigins.includes(origin) || origin.startsWith('file://')) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

exServer.use(cors(corsOptions));

// Body parsing middleware
exServer.use(express.json({ limit: '10mb' }));
exServer.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Get paths from global or use defaults
const publicPath = path.join(__dirname, 'public');
const fs = require('fs');

// Resolve a writable documents directory (packaged/asar-safe)
// Priority:
// 1. process.env.UPLOADS_DIR
// 2. global.appPaths.userData (set by main.js in Electron)
// 3. Electron userData path (if available)
// 4. Relative development path: __dirname/uploads/documents
function resolveDocumentsDirectory() {
    const envUploadsDir = process.env.UPLOADS_DIR;
    if (envUploadsDir) return path.resolve(envUploadsDir);

    if (global.appPaths && global.appPaths.userData) {
        return path.join(global.appPaths.userData, 'uploads', 'documents');
    }

    try {
        // Running inside Electron main process
        // eslint-disable-next-line global-require
        const { app } = require('electron');
        if (app && typeof app.getPath === 'function') {
            return path.join(app.getPath('userData'), 'uploads', 'documents');
        }
    } catch (e) {
        // Not running inside Electron or require failed
    }

    // Local development fallback
    return path.join(__dirname, 'uploads', 'documents');
}

let documentsPath = resolveDocumentsDirectory();

// Ensure documents directory exists and is actually a directory
try {
    if (fs.existsSync(documentsPath)) {
        const stat = fs.lstatSync(documentsPath);
        if (!stat.isDirectory()) {
            // Problem: path exists but is not a directory
            logger.error(`Documents path exists but is not a directory: ${documentsPath}`);
            // Try fallback to userData/uploads/documents, or fail after logging
            const fallbackBase = (global.appPaths && global.appPaths.userData) || __dirname;
            documentsPath = path.join(fallbackBase, 'uploads', 'documents');
            if (!fs.existsSync(documentsPath)) {
                fs.mkdirSync(documentsPath, { recursive: true });
            }
        }
    } else {
        fs.mkdirSync(documentsPath, { recursive: true });
    }
} catch (err) {
    logger.error('Failed to prepare documents directory:', err);
    // Final fallback to a safe relative path
    try {
        const fallback = path.join(__dirname, '..', 'uploads', 'documents');
        if (!fs.existsSync(fallback)) {
            fs.mkdirSync(fallback, { recursive: true });
        }
        documentsPath = fallback;
    } catch (ex) {
        logger.error('Unable to create fallback documents directory:', ex);
    }
}

// Static files with proper caching - BEFORE rate limiting
exServer.use(express.static(publicPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true
}));

// Serve generated documents (PDFs for WhatsApp)
exServer.use('/documents', express.static(documentsPath, {
    maxAge: '1h', // Cache for 1 hour
    etag: true,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
        }
    }
}));

// Rate limiting AFTER static files to exclude them
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // Increased limit for development navigation
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exServer.use(limiter);

// Set the view engine to EJS
exServer.set('view engine', 'ejs');
exServer.set('views', path.join(__dirname, 'public', 'views'));

// Initialize database connection with default admin users
connectDB().then(async () => {
    const initializeDatabase = require('./src/utils/initDatabase');
    await initializeDatabase();
    // Resolve WhatsApp token from secure storage if not provided via env
    try {
        if (!process.env.WHATSAPP_TOKEN || !config.whatsapp.token) {
            const token = await secureStore.getWhatsAppToken();
            if (token) {
                config.whatsapp.token = token;
                logger.info('WhatsApp token loaded from secure store');
            }
        }
        // If phoneNumberId not in env, check settings collection
        try {
            const { Settings } = require('./src/models');
            const settings = await Settings.findOne();
            if (settings && settings.whatsapp && settings.whatsapp.phoneNumberId && !config.whatsapp.phoneNumberId) {
                config.whatsapp.phoneNumberId = settings.whatsapp.phoneNumberId;
                logger.info('WhatsApp phoneNumberId loaded from DB settings');
            }
            if (settings && settings.whatsapp && settings.whatsapp.pdfBaseUrl && !config.whatsapp.pdfBaseUrl) {
                config.whatsapp.pdfBaseUrl = settings.whatsapp.pdfBaseUrl;
            }
        } catch (e) {
            logger.warn('Failed to load WhatsApp settings from DB on startup', e && e.message);
        }
    } catch (err) {
        logger.warn('Failed to load WhatsApp token from secure store', err && err.message);
    }
}).catch(err => {
    logger.error('Database connection failed:', err);
});

// Routes - Importing route modules
const authRoutes = require('./src/routes/auth');
const viewRoutes = require('./src/routes/views');
const stockRoutes = require('./src/routes/stock');
const invoiceRoutes = require('./src/routes/invoice');
const quotationRoutes = require('./src/routes/quotation');
const purchaseRoutes = require('./src/routes/purchaseOrder');
const wayBillRoutes = require('./src/routes/wayBill');
const serviceRoutes = require('./src/routes/service');
const employeeRoute = require('./src/routes/employee');
const analyticsRoutes = require('./src/routes/analytics');
const commsRouter = require('./src/routes/comms');
const settingsRoutes = require('./src/routes/settings');
const reportsRoutes = require('./src/routes/reports');

// Health check endpoint
exServer.get('/health', async (req, res) => {
    try {
        // Check database connection
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

        const healthCheck = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: dbStatus,
            memory: process.memoryUsage(),
            version: process.version,
            port: actualPort
        };

        res.status(200).json(healthCheck);
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Using routes middleware - API routes BEFORE view routes to prevent conflicts
exServer.use('/admin', authRoutes);
exServer.use('/stock', stockRoutes);
exServer.use('/invoice', invoiceRoutes);
exServer.use('/quotation', quotationRoutes);
exServer.use('/purchaseOrder', purchaseRoutes);
exServer.use('/wayBill', wayBillRoutes);
exServer.use('/service', serviceRoutes);
exServer.use('/employee', employeeRoute);
exServer.use('/analytics', analyticsRoutes);
exServer.use('/comms', commsRouter);
exServer.use('/settings', settingsRoutes);
exServer.use('/reports', reportsRoutes);

// View routes LAST (to avoid catching API routes)
exServer.use('/', viewRoutes);

// Apply API rate limiter to specific routes if needed
// exServer.use('/api', apiLimiter);

// 404 handler (using new middleware)
exServer.use(notFound);

// Error handling middleware (using new middleware)
exServer.use(errorHandler);

// Run automatic backup on startup with error handling
// Start scheduled automatic backups based on saved settings
try {
    backupScheduler.startScheduler().catch(err => {
        logger.error('Failed to start backup scheduler:', err);
    });

    // Schedule periodic cleanup of old files in uploads/documents (default 7 days)
    try {
        const retentionDays = config.uploadsRetentionDays || 7;
        if (documentsPath) {
            // Run on startup once
            fileCleanup.cleanupOldFiles(documentsPath, retentionDays, ['.pdf']).then(({ success, removed }) => {
                if (success && removed) logger.info(`Uploads cleanup completed: removed ${removed} old files`);
            }).catch(err => logger.warn('Uploads cleanup error:', err && err.message));

            // Schedule daily cleanup
            setInterval(() => {
                fileCleanup.cleanupOldFiles(documentsPath, retentionDays, ['.pdf']).then(({ success, removed }) => {
                    if (success && removed) logger.info(`Scheduled uploads cleanup removed ${removed} old files`);
                }).catch(err => logger.warn('Scheduled uploads cleanup error:', err && err.message));
            }, 24 * 60 * 60 * 1000);
        }
    } catch (e) {
        logger.warn('Failed to schedule uploads cleanup:', e && e.message);
    }
} catch (backupError) {
    logger.error('Failed to initialize backup scheduler:', backupError && backupError.message ? backupError.message : backupError);
}

/**
 * Start the server with automatic port detection
 * @returns {Promise<{server: object, port: number}>} Server instance and actual port
 */
async function startServer() {
    try {
        // We'll allow a few binding attempts in case of a race where
        // the port was available during detection but got taken before listen.
        const maxBindAttempts = Math.min(Math.max(config.portMaxRetries || 3, 1), 5);
        let attempt = 0;

        while (attempt < maxBindAttempts) {
            attempt += 1;

            // Find an available port using the existing port finder
            const { port, source } = await findAvailablePort({
                defaultPort: config.port,
                maxRetries: config.portMaxRetries,
                useCache: config.portCacheEnabled,
                logger: logger
            });

            actualPort = port;

            // Try to start the server on the detected port
            try {
                const result = await new Promise((resolve, reject) => {
                    // Attempt to listen
                    const tempServer = exServer.listen(port, () => {
                        // Log server startup
                        logger.info("Express server started", {
                            service: "http-server",
                            port: actualPort,
                            portSource: source,
                            environment: process.env.NODE_ENV || 'development'
                        });

                        // Update the outer-scope server reference
                        server = tempServer;
                        resolve({ server: tempServer, port: actualPort });
                    });

                    // Handle server startup errors for this attempt
                    const onError = (error) => {
                        if (error.syscall !== 'listen') {
                            reject(error);
                            return;
                        }
                        const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
                        switch (error.code) {
                            case 'EACCES':
                                logger.error(`${bind} requires elevated privileges`);
                                reject(new Error(`${bind} requires elevated privileges`));
                                break;
                            case 'EADDRINUSE':
                                logger.warn(`${bind} is already in use (race). Will retry detection. Attempt ${attempt}/${maxBindAttempts}`);
                                reject(Object.assign(new Error(`${bind} is already in use`), { code: 'EADDRINUSE' }));
                                break;
                            default:
                                logger.error('Server error:', error);
                                reject(error);
                        }
                    };

                    tempServer.on('error', onError);
                });

                // If we get here, listening succeeded
                return result;
            } catch (err) {
                // If the error is an EADDRINUSE, loop and try again (findAvailablePort will pick another)
                if (err && err.code === 'EADDRINUSE') {
                    logger.info('Retrying port detection due to EADDRINUSE...');
                    // small delay to reduce tight loop
                    await new Promise(r => setTimeout(r, 250));
                    continue;
                }

                // For other errors, rethrow
                throw err;
            }
        }

        // Exhausted attempts
        const err = new Error(`Failed to bind to a port after ${maxBindAttempts} attempts due to address-in-use errors.`);
        err.code = 'EADDRINUSE_RETRIES_EXHAUSTED';
        logger.error(err.message);
        throw err;
    } catch (error) {
        logger.error('Failed to start server:', error);
        throw error;
    }
}

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    if (!server) {
        process.exit(0);
        return;
    }

    // Stop accepting new connections
    server.close(async (err) => {
        if (err) {
            logger.error('Error during server shutdown:', err);
            process.exit(1);
        }

        try {
            // Close database connections
            await mongoose.connection.close();
            logger.info('Database connections closed');

            logger.info('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            logger.error('Error during graceful shutdown:', error);
            process.exit(1);
        }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
    }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise);
    logger.error('Reason:', reason instanceof Error ? reason.stack : reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Auto-start server when this module is required
// Store the startup promise so main.js can await it
const serverStartPromise = startServer();

// Export the app, actual port getter, and startup promise
module.exports = exServer;
module.exports.getActualPort = () => actualPort;
module.exports.serverReady = serverStartPromise;
