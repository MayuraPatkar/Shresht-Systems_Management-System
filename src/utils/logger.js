const winston = require('winston');
const path = require('path');
const config = require('../config/config');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: config.logLevel,
    format: logFormat,
    transports: [
        // Write all logs to file
        new winston.transports.File({ 
            filename: path.join(config.logFile.replace('/app.log', ''), 'error.log'), 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: config.logFile 
        }),
    ],
    exceptionHandlers: [
        new winston.transports.File({ 
            filename: path.join(config.logFile.replace('/app.log', ''), 'exceptions.log') 
        })
    ],
});

// If not in production, also log to console
if (config.isDevelopment()) {
    logger.add(new winston.transports.Console({
        format: consoleFormat,
    }));
}

module.exports = logger;
