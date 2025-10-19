require('dotenv').config();

module.exports = {
    // Application
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    appName: process.env.APP_NAME || 'Shresht Systems Management System',
    appVersion: process.env.APP_VERSION || '1.0.0',
    
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
    backupDir: process.env.BACKUP_DIR || './backups',
    autoBackupEnabled: process.env.AUTO_BACKUP_ENABLED === 'true' || false,
    
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
    
    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    },
    
    // Helper methods
    isDevelopment() {
        return this.env === 'development';
    },
    isProduction() {
        return this.env === 'production';
    },
};
