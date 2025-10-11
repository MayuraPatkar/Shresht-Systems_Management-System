const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const exServer = express();
const config = require('./config');
const log = require("electron-log"); // Import electron-log in the preload process
const autoBackup = require("./utils/backup");

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

// Rate limiting
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
    log.info(`${req.method} ${req.originalUrl} - ${req.ip}`);
    
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        log.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
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

// MongoDB Connection with enhanced error handling and reconnection logic
async function connectDB() {
    try {
        // MongoDB connection options
        const mongoOptions = {
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            bufferCommands: false, // Disable mongoose buffering
        };

        await mongoose.connect(config.mongodbUri, mongoOptions);
        log.info('MongoDB connected successfully');
        
        // Connection event listeners
        mongoose.connection.on('connected', () => {
            log.info('Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            log.error('Mongoose connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            log.warn('Mongoose disconnected from MongoDB');
        });

        // Handle application termination
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            log.info('Mongoose connection closed due to application termination');
            process.exit(0);
        });

    } catch (error) {
        log.error('MongoDB connection failed:', error.message);
        log.error('Retrying connection in 5 seconds...');
        
        // Retry connection after 5 seconds
        setTimeout(() => {
            connectDB();
        }, 5000);
    }
}

// Initialize database connection
connectDB();

// Routes - Importing route modules
const authRoutes = require('./routes/auth');
const viewRoutes = require('./routes/views');
const stockRoutes = require('./routes/stock');
const invoiceRoutes = require('./routes/invoice');
const quotationRoutes = require('./routes/quotation');
const purchaseRoutes = require('./routes/purchaseOrder');
const wayBillRoutes = require('./routes/wayBill');
const serviceRoutes = require('./routes/service');
const employeeRoute = require('./routes/employee');
const analyticsRoutes = require('./routes/analytics');
const commsRouter = require('./routes/comms');
const settingsRoutes = require('./routes/settings');

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
        log.error('Health check failed:', error);
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// API routes with error handling wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Using routes middleware with async error handling
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

// 404 handler for undefined routes
exServer.use((req, res) => {
    log.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString()
    });
});

// Enhanced Centralized Error Handling Middleware
exServer.use((err, req, res, next) => {
    // Log the full error with stack trace
    log.error('Global error handler caught an error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Check if headers already sent to prevent error after response sent
    if (res.headersSent) {
        return next(err); // Delegate to default Express error handler
    }

    // Determine error status code
    let statusCode = err.statusCode || err.status || 500;
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
    } else if (err.name === 'CastError') {
        statusCode = 400;
    } else if (err.code === 11000) {
        statusCode = 409; // Duplicate key error
    }

    // Error response structure
    const errorResponse = {
        error: 'An error occurred',
        message: statusCode === 500 ? 'Internal server error' : err.message,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }

    res.status(statusCode).json(errorResponse);
});

// Run automatic backup on startup with error handling
try {
    autoBackup();
    log.info('Automatic backup initiated successfully');
} catch (backupError) {
    log.error('Failed to initiate automatic backup:', backupError.message);
    // Don't exit, continue with server startup
}

// Start the server
const server = exServer.listen(config.port, () => {
    log.info(`Express server listening on port ${config.port}`);
    log.info(`Server started at ${new Date().toISOString()}`);
    log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    log.info(`Process ID: ${process.pid}`);
});

// Handle server startup errors
server.on('error', (error) => {
    if (error.syscall !== 'listen') {
        throw error;
    }
    const bind = typeof config.port === 'string' ? 'Pipe ' + config.port : 'Port ' + config.port;
    switch (error.code) {
        case 'EACCES':
            log.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            log.error(`${bind} is already in use`);
            process.exit(1);
            break;
        default:
            log.error('Server error:', error);
            throw error;
    }
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
    log.info(`${signal} received. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(async (err) => {
        if (err) {
            log.error('Error during server shutdown:', err);
            process.exit(1);
        }
        
        try {
            // Close database connections
            await mongoose.connection.close();
            log.info('Database connections closed');
            
            log.info('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            log.error('Error during graceful shutdown:', error);
            process.exit(1);
        }
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        log.error('Forced shutdown due to timeout');
        process.exit(1);
    }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = exServer;