/**
 * Structured Logger
 * 
 * Uses winston for file logging with JSON format
 * Uses console for terminal output in development
 * 
 * Features:
 * - JSON format (NDJSON) for machine parsing
 * - UTC timestamps (ISO 8601)
 * - Contextual tags (service, process)
 * - Automatic log rotation via maxsize
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Get config if available
let config;
try {
    config = require('../config/config');
} catch (e) {
    config = {
        logLevel: 'info',
        logFile: './logs/app.log',
        logMaxSize: 10 * 1024 * 1024, // 10MB
        isDevelopment: () => process.env.NODE_ENV !== 'production'
    };
}

// Determine process type
let processType = 'server';
try {
    if (process.versions && process.versions.electron) {
        processType = process.type === 'renderer' ? 'renderer' : 'main';
    }
} catch (e) {
    // Not in Electron
}

// Determine log directory
const logDir = path.resolve(__dirname, '../../logs');
const logFilePath = path.join(logDir, 'app.log');
const errorLogPath = path.join(logDir, 'error.log');

// Ensure log directory exists
try {
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
} catch (e) {
    console.error('Failed to create log directory:', e);
}

// JSON format for file transport (NDJSON - Newline Delimited JSON)
const jsonFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const logEntry = {
        timestamp,
        level,
        message,
        meta: {
            process: processType,
            ...meta
        }
    };

    // Remove stack from meta if it exists, handle it separately
    if (meta.stack) {
        logEntry.meta.stack = meta.stack;
        delete logEntry.stack;
    }

    return JSON.stringify(logEntry);
});

// Console format for development (human-readable)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        const metaKeys = Object.keys(meta).filter(k => k !== 'stack');
        if (metaKeys.length > 0) {
            const metaObj = {};
            metaKeys.forEach(k => metaObj[k] = meta[k]);
            msg += ` ${JSON.stringify(metaObj)}`;
        }
        if (meta.stack) {
            msg += `\n${meta.stack}`;
        }
        return msg;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: config.logLevel || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: () => new Date().toISOString() }), // UTC ISO 8601
        winston.format.errors({ stack: true })
    ),
    transports: [
        // JSON log file with rotation
        new winston.transports.File({
            filename: logFilePath,
            format: jsonFormat,
            maxsize: config.logMaxSize || 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true
        }),
        // Error-only log file
        new winston.transports.File({
            filename: errorLogPath,
            level: 'error',
            format: jsonFormat,
            maxsize: config.logMaxSize || 10 * 1024 * 1024,
            maxFiles: 3,
            tailable: true
        })
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'exceptions.log'),
            format: jsonFormat
        })
    ]
});

// Add console transport in development
if (config.isDevelopment && config.isDevelopment()) {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            consoleFormat
        )
    }));
}

module.exports = logger;
