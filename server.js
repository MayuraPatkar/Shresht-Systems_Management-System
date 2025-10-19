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

// CORS configuration for Electron app
exServer.use(cors({
    origin: ['http://localhost:3000', 'file://'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting (general limiter)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exServer.use(limiter);

// Request logging middleware
exServer.use((req, res, next) => {
    const start = Date.now();
    
    // Log request
    logger.info(`${req.method} ${req.originalUrl} - ${req.ip}`);
    
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
});

// Body parsing middleware
exServer.use(express.json({ limit: '10mb' }));
exServer.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files with proper caching
exServer.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true
}));

// Set the view engine to EJS
exServer.set('view engine', 'ejs');
exServer.set('views', path.join(__dirname, 'public', 'views'));

// Initialize database connection with default admin users
connectDB().then(async () => {
    logger.info('Database connected, initializing default data...');
    const initializeDatabase = require('./src/utils/initDatabase');
    await initializeDatabase();
    logger.info('Database initialization complete');
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
            version: process.version
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

// Using routes middleware
exServer.use('/', viewRoutes);
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

// Apply API rate limiter to specific routes if needed
// exServer.use('/api', apiLimiter);

// 404 handler (using new middleware)
exServer.use(notFound);

// Error handling middleware (using new middleware)
exServer.use(errorHandler);

// Run automatic backup on startup with error handling
try {
    autoBackup();
    logger.info('Automatic backup initiated successfully');
} catch (backupError) {
    logger.error('Failed to initiate automatic backup:', backupError.message);
    // Don't exit, continue with server startup
}

// Start the server
const server = exServer.listen(config.port, () => {
    logger.info(`Express server listening on port ${config.port}`);
    logger.info(`Server started at ${new Date().toISOString()}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Process ID: ${process.pid}`);
});

// Handle server startup errors
server.on('error', (error) => {
    if (error.syscall !== 'listen') {
        throw error;
    }
    const bind = typeof config.port === 'string' ? 'Pipe ' + config.port : 'Port ' + config.port;
    switch (error.code) {
        case 'EACCES':
            logger.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            logger.error(`${bind} is already in use`);
            process.exit(1);
            break;
        default:
            logger.error('Server error:', error);
            throw error;
    }
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    
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
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = exServer;
