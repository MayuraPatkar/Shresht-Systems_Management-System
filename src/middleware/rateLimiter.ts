import rateLimit from "express-rate-limit";
import config from "../config/config";

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        success: false,
        message: "Too many requests from this IP, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Strict limiter for authentication routes
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: {
        success: false,
        message: "Too many login attempts, please try again after 15 minutes.",
    },
    skipSuccessfulRequests: true,
});

/**
 * Moderate limiter for create/update operations
 */
export const createLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests
    message: {
        success: false,
        message: "Too many create/update requests, please slow down.",
    },
});
