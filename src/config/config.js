// Environment loader handles dotenv in development, system env vars in production
require('../utils/envLoader');

module.exports = {
    // Application
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    portMaxRetries: parseInt(process.env.PORT_MAX_RETRIES, 10) || 10,
    portCacheEnabled: process.env.PORT_CACHE_ENABLED !== 'false', // Enabled by default
    appName: process.env.APP_NAME || 'Shresht Systems Management System',
    appVersion: process.env.APP_VERSION || '3.3.0',

    // Database
    mongoURI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shreshtSystems',

    // Security
    sessionSecret: process.env.SESSION_SECRET || 'unsafe-default-secret-change-in-production',
    jwtSecret: process.env.JWT_SECRET || 'unsafe-jwt-secret',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,

    // Session
    session: {
        cookieMaxAge: parseInt(process.env.SESSION_COOKIE_MAX_AGE, 10) || 86400000, // 24 hours
        cookieSecure: process.env.SESSION_COOKIE_SECURE === 'true' || false,
    },

    // Backup
    backupDir: process.env.BACKUP_DIR || '',
    autoBackupEnabled: process.env.AUTO_BACKUP_ENABLED === 'true' || false,
    mongoDumpPath: process.env.MONGO_DUMP_PATH || 'mongodump',

    // Email
    email: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASSWORD || '',
        fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@shreshtsystems.com',
    },

    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
    logFile: process.env.LOG_FILE || './logs/app.log',
    logMaxSize: parseInt(process.env.LOG_MAX_SIZE, 10) || 10 * 1024 * 1024, // 10MB default

    // Uploads cleanup
    uploadsRetentionDays: parseInt(process.env.UPLOADS_RETENTION_DAYS, 10) || 7,

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    },

    // WhatsApp API Configuration
    whatsapp: {
        token: process.env.WHATSAPP_TOKEN || '',
        phoneNumberId: process.env.PHONE_NUMBER_ID || '',
        appId: process.env.APP_ID || '',
        verifyToken: process.env.VERIFY_TOKEN || '',
        // Base URL for serving PDF documents (required for WhatsApp to access them)
        // In production, set this to your public domain (e.g., https://yourdomain.com or ngrok URL)
        pdfBaseUrl: process.env.WHATSAPP_PDF_BASE_URL || '',
        isConfigured() {
            return !!(this.token && this.phoneNumberId);
        }
    },

    // Cloudinary Configuration (for cloud-hosted PDFs - recommended for WhatsApp)
    // Get free account at https://cloudinary.com (25GB storage, 25GB bandwidth/month)
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
        apiKey: process.env.CLOUDINARY_API_KEY || '',
        apiSecret: process.env.CLOUDINARY_API_SECRET || '',
        isConfigured() {
            return !!(this.cloudName && this.apiKey && this.apiSecret);
        }
    },

    // Helper methods
    isDevelopment() {
        return this.env === 'development';
    },
    isProduction() {
        return this.env === 'production';
    },
};
