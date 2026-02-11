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

import winston from "winston";
import path from "path";
import fs from "fs";

// Get config if available
interface LogConfig {
    logLevel: string;
    logFile: string;
    logMaxSize: number;
    isDevelopment?: () => boolean;
}

let config: LogConfig;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    config = require("../config/config").default || require("../config/config");
} catch {
    config = {
        logLevel: "info",
        logFile: "./logs/app.log",
        logMaxSize: 10 * 1024 * 1024, // 10MB
        isDevelopment: () => process.env.NODE_ENV !== "production",
    };
}

// Determine process type
let processType = "server";
try {
    if (process.versions && (process.versions as Record<string, string>).electron) {
        processType = (process as unknown as Record<string, string>).type === "renderer" ? "renderer" : "main";
    }
} catch {
    // Not in Electron
}

// Determine log directory
// When running in a packaged Electron app, __dirname points inside the .asar archive
// which is read-only. We need to use a writable location outside the archive.
let logDir: string;

// Check if we're running from inside an .asar archive
const isPackaged = __dirname.includes(".asar");

if (isPackaged) {
    // When packaged, put logs alongside the executable (outside the .asar)
    const appAsarPath = __dirname.split(".asar")[0] + ".asar";
    const resourcesDir = path.dirname(appAsarPath);
    const appDir = path.dirname(resourcesDir);
    logDir = path.join(appDir, "logs");
} else {
    // Development mode - use relative path from project root
    logDir = path.resolve(__dirname, "../../logs");
}

const logFilePath = path.join(logDir, "app.log");
const errorLogPath = path.join(logDir, "error.log");

// Ensure log directory exists
try {
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
} catch (e) {
    console.error("Failed to create log directory:", logDir, e);
}

// JSON format for file transport (NDJSON - Newline Delimited JSON)
const jsonFormat = winston.format.printf(
    ({ timestamp, level, message, ...meta }: winston.Logform.TransformableInfo) => {
        const logEntry: Record<string, unknown> = {
            timestamp,
            level,
            message,
            meta: {
                process: processType,
                ...meta,
            },
        };

        // Remove stack from meta if it exists, handle it separately
        if (meta.stack) {
            (logEntry.meta as Record<string, unknown>).stack = meta.stack;
            delete (logEntry as Record<string, unknown>).stack;
        }

        return JSON.stringify(logEntry);
    }
);

// Console format for development (human-readable)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(
        ({ timestamp, level, message, ...meta }: winston.Logform.TransformableInfo) => {
            let msg = `${timestamp} [${level}]: ${message}`;
            const metaKeys = Object.keys(meta).filter((k) => k !== "stack");
            if (metaKeys.length > 0) {
                const metaObj: Record<string, unknown> = {};
                metaKeys.forEach((k) => (metaObj[k] = meta[k]));
                msg += ` ${JSON.stringify(metaObj)}`;
            }
            if (meta.stack) {
                msg += `\n${meta.stack}`;
            }
            return msg;
        }
    )
);

// Create logger instance
const logger = winston.createLogger({
    level: config.logLevel || "info",
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
            tailable: true,
        }),
        // Error-only log file
        new winston.transports.File({
            filename: errorLogPath,
            level: "error",
            format: jsonFormat,
            maxsize: config.logMaxSize || 10 * 1024 * 1024,
            maxFiles: 3,
            tailable: true,
        }),
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, "exceptions.log"),
            format: jsonFormat,
        }),
    ],
});

// Add console transport in development
if (config.isDevelopment && config.isDevelopment()) {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
                consoleFormat
            ),
        })
    );
}

export default logger;
