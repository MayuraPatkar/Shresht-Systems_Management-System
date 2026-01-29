/**
 * server.ts
 * 
 * Express server for the Electron application.
 * Handles HTTP requests, database connections, and middleware setup.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import http from 'http';

// Local imports - using require for non-typed modules
const config = require('./config/config');
const logger = require('./utils/logger');
const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const autoBackup = require('./utils/backup');
const backupScheduler = require('./utils/backupScheduler');
const { findAvailablePort, printStartupBanner } = require('./utils/portFinder');
const secureStore = require('./utils/secureStore');
const fileCleanup = require('./utils/fileCleanup');

// Express app instance
const exServer: Express = express();

// Track the actual port the server is running on
let actualPort: number | null = null;
let server: http.Server | null = null;

/**
 * Server startup result type
 */
interface ServerStartResult {
    server: http.Server;
    port: number;
}

/**
 * Port finder options
 */
interface PortFinderOptions {
    defaultPort: number;
    maxRetries: number;
    useCache: boolean;
    logger: typeof logger;
}

/**
 * Port finder result
 */
interface PortFinderResult {
    port: number;
    source: string;
}

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
const corsOptions: cors.CorsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void {
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
const publicPath = (() => {
    const localPublic = path.join(__dirname, 'public');
    if (fs.existsSync(localPublic)) return localPublic;

    const rootPublic = path.join(__dirname, '..', 'public');
    if (fs.existsSync(rootPublic)) return rootPublic;

    return localPublic; // Default to local even if missing
})();

/**
 * Resolve a writable documents directory (packaged/asar-safe)
 * Priority:
 * 1. process.env.UPLOADS_DIR
 * 2. global.appPaths.userData (set by main.ts in Electron)
 * 3. Electron userData path (if available)
 * 4. Relative development path: __dirname/uploads/documents
 */
function resolveDocumentsDirectory(): string {
    const envUploadsDir = process.env.UPLOADS_DIR;
    if (envUploadsDir) return path.resolve(envUploadsDir);

    if (global.appPaths && global.appPaths.userData) {
        return path.join(global.appPaths.userData, 'uploads', 'documents');
    }

    try {
        // Running inside Electron main process
        // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    setHeaders: (res: Response, filePath: string) => {
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
    const initializeDatabase = require('./utils/initDatabase');
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
            const { Settings } = require('./models');
            const settings = await Settings.findOne();
            if (settings && settings.whatsapp && settings.whatsapp.phoneNumberId && !config.whatsapp.phoneNumberId) {
                config.whatsapp.phoneNumberId = settings.whatsapp.phoneNumberId;
                logger.info('WhatsApp phoneNumberId loaded from DB settings');
            }
            if (settings && settings.whatsapp && settings.whatsapp.pdfBaseUrl && !config.whatsapp.pdfBaseUrl) {
                config.whatsapp.pdfBaseUrl = settings.whatsapp.pdfBaseUrl;
            }
        } catch (e) {
            logger.warn('Failed to load WhatsApp settings from DB on startup', e && (e as Error).message);
        }
    } catch (err) {
        logger.warn('Failed to load WhatsApp token from secure store', err && (err as Error).message);
    }
}).catch((err: Error) => {
    logger.error('Database connection failed:', err);
});

// Routes - Importing route modules
const authRoutes = require('./routes/auth');
const viewRoutes = require('./routes/views');
const stockRoutes = require('./routes/stock');
const invoiceRoutes = require('./routes/invoice');
const quotationRoutes = require('./routes/quotation');
const purchaseRoutes = require('./routes/purchaseOrder');
const eWayBillRoutes = require('./routes/eWayBill');
const serviceRoutes = require('./routes/service');
const employeeRoute = require('./routes/employee');
const analyticsRoutes = require('./routes/analytics');
const commsRouter = require('./routes/comms');
const settingsRoutes = require('./routes/settings');
const reportsRoutes = require('./routes/reports');

// Health check endpoint
exServer.get('/health', async (req: Request, res: Response) => {
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
            error: (error as Error).message
        });
    }
});

// Using routes middleware - API routes BEFORE view routes to prevent conflicts
exServer.use('/admin', authRoutes);
exServer.use('/stock', stockRoutes);
exServer.use('/invoice', invoiceRoutes);
exServer.use('/quotation', quotationRoutes);
exServer.use('/purchaseOrder', purchaseRoutes);
exServer.use('/eWayBill', eWayBillRoutes);
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
    backupScheduler.startScheduler().catch((err: Error) => {
        logger.error('Failed to start backup scheduler:', err);
    });

    // Schedule periodic cleanup of old files in uploads/documents (default 7 days)
    try {
        const retentionDays = config.uploadsRetentionDays || 7;
        if (documentsPath) {
            // Run on startup once
            fileCleanup.cleanupOldFiles(documentsPath, retentionDays, ['.pdf']).then(({ success, removed }: { success: boolean; removed: number }) => {
                if (success && removed) logger.info(`Uploads cleanup completed: removed ${removed} old files`);
            }).catch((err: Error) => logger.warn('Uploads cleanup error:', err && err.message));

            // Schedule daily cleanup
            setInterval(() => {
                fileCleanup.cleanupOldFiles(documentsPath, retentionDays, ['.pdf']).then(({ success, removed }: { success: boolean; removed: number }) => {
                    if (success && removed) logger.info(`Scheduled uploads cleanup removed ${removed} old files`);
                }).catch((err: Error) => logger.warn('Scheduled uploads cleanup error:', err && err.message));
            }, 24 * 60 * 60 * 1000);
        }
    } catch (e) {
        logger.warn('Failed to schedule uploads cleanup:', e && (e as Error).message);
    }
} catch (backupError) {
    const err = backupError as Error;
    logger.error('Failed to initialize backup scheduler:', err && err.message ? err.message : err);
}

/**
 * Start the server with automatic port detection
 * @returns Promise with server instance and actual port
 */
async function startServer(): Promise<ServerStartResult> {
    try {
        // We'll allow a few binding attempts in case of a race where
        // the port was available during detection but got taken before listen.
        const maxBindAttempts = Math.min(Math.max(config.portMaxRetries || 3, 1), 5);
        let attempt = 0;

        while (attempt < maxBindAttempts) {
            attempt += 1;

            // Find an available port using the existing port finder
            const { port, source }: PortFinderResult = await findAvailablePort({
                defaultPort: config.port,
                maxRetries: config.portMaxRetries,
                useCache: config.portCacheEnabled,
                logger: logger
            } as PortFinderOptions);

            actualPort = port;

            // Try to start the server on the detected port
            try {
                const result = await new Promise<ServerStartResult>((resolve, reject) => {
                    // Attempt to listen
                    const tempServer = exServer.listen(port, () => {
                        // Log server startup
                        logger.info('Express server started', {
                            service: 'http-server',
                            port: actualPort,
                            portSource: source,
                            environment: process.env.NODE_ENV || 'development'
                        });

                        // Update the outer-scope server reference
                        server = tempServer;
                        resolve({ server: tempServer, port: actualPort as number });
                    });

                    // Handle server startup errors for this attempt
                    const onError = (error: NodeJS.ErrnoException): void => {
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
                const error = err as NodeJS.ErrnoException;
                // If the error is an EADDRINUSE, loop and try again (findAvailablePort will pick another)
                if (error && error.code === 'EADDRINUSE') {
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
        const err = new Error(`Failed to bind to a port after ${maxBindAttempts} attempts due to address-in-use errors.`) as NodeJS.ErrnoException;
        err.code = 'EADDRINUSE_RETRIES_EXHAUSTED';
        logger.error(err.message);
        throw err;
    } catch (error) {
        logger.error('Failed to start server:', error);
        throw error;
    }
}

/**
 * Graceful shutdown handling
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    if (!server) {
        process.exit(0);
        return;
    }

    // Stop accepting new connections
    server.close(async (err?: Error) => {
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
process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    logger.error('Unhandled Rejection at:', promise);
    logger.error('Reason:', reason instanceof Error ? reason.stack : reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Auto-start server when this module is required
// Store the startup promise so main.ts can await it
const serverStartPromise = startServer();

// Export the app, actual port getter, and startup promise
export default exServer;
export const getActualPort = (): number | null => actualPort;
export const serverReady = serverStartPromise;

// Also support CommonJS require
module.exports = exServer;
module.exports.getActualPort = getActualPort;
module.exports.serverReady = serverReady;
