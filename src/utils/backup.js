/**
 * @file MongoDB backup utility.
 * @summary A simple script to create compressed, timestamped database backups.
 */

const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const logger = require("./logger");

/**
 * Creates a gzipped backup of the 'shreshtSystems' MongoDB database.
 * The backup file is saved with a timestamp into the '../backups' directory.
 */
function createBackup() {
    // 1. Load configuration and determine backup directory.
    return new Promise((resolve, reject) => {
    const config = require("../config/config");

    // Priority: env BACKUP_DIR -> global.appPaths -> config.backupDir -> Electron userData -> local backups
    const envBackupDir = process.env.BACKUP_DIR;
    let backupDir = envBackupDir || (global.appPaths && global.appPaths.backups) || config.backupDir;

    if (!backupDir) {
        try {
            // Try to detect Electron's userData path when running inside Electron
            // eslint-disable-next-line global-require
            const { app } = require("electron");
            if (app && typeof app.getPath === "function") {
                backupDir = path.join(app.getPath("userData"), "backups");
            }
        } catch (e) {
            // not running in Electron or electron not available
        }
    }

    // Last-resort: keep a relative backups folder (useful for dev/server-only runs)
    if (!backupDir) {
        backupDir = path.join(__dirname, "../../backups");
    }

    // Ensure the directory exists and has restrictive permissions where possible
    try {
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        try { fs.chmodSync(backupDir, 0o700); } catch (e) { /* ignore on Windows or when unsupported */ }
    } catch (err) {
        logger.error(`Failed to prepare backup directory '${backupDir}': ${err.message || err}`);
        return;
    }

    // Optional retention: remove backups older than retentionDays
    const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || config.backupRetentionDays || 30);
    if (retentionDays > 0) {
        const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
        try {
            const files = fs.readdirSync(backupDir);
            files.forEach((f) => {
                const full = path.join(backupDir, f);
                try {
                    const stat = fs.statSync(full);
                    if (stat.isFile() && stat.mtimeMs < cutoff) {
                        fs.unlinkSync(full);
                        logger.info(`Old backup removed: ${full}`);
                    }
                } catch (e) {
                    // ignore errors per-file
                }
            });
        } catch (e) {
            logger.warn(`Failed to enforce backup retention in '${backupDir}': ${e.message || e}`);
        }
    }

    // 2. Generate a unique, timestamped filename.
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `backup-${timestamp}.gz`);

    // 3. Resolve mongodump path and target URI
    let mongoDumpExec = config.mongoDumpPath || 'mongodump';
    const mongoUri = config.mongoUri || 'mongodb://127.0.0.1:27017/shreshtSystems';

    if (mongoDumpExec === 'mongodump') {
        const isWin = process.platform === "win32";
        const binName = isWin ? "mongodump.exe" : "mongodump";

        if (process.resourcesPath) {
            const prodPath = path.join(process.resourcesPath, "bin", binName);
            if (fs.existsSync(prodPath)) {
                mongoDumpExec = prodPath;
            }
        }

        if (mongoDumpExec === 'mongodump') {
            const devPath = path.join(__dirname, "../../resources/bin", binName);
            if (fs.existsSync(devPath)) {
                mongoDumpExec = devPath;
            }
        }
    }

    const cmd = `"${mongoDumpExec}" --uri="${mongoUri}" --archive="${backupPath}" --gzip`;

        // 4. Execute the command and resolve/reject the promise based on outcome.
        exec(cmd, async (err, stdout, stderr) => {
            if (err) {
                const notFound = err.code === 'ENOENT' || (stderr && (stderr.includes("not recognized") || stderr.includes("not found")));
                if (notFound) {
                    const message = "'mongodump' command not found. Please install MongoDB Database Tools to enable backups.";
                    logger.warn(`Backup skipped: ${message}`);
                    return reject(new Error(message));
                }
                logger.error("Backup failed:", stderr || err.message || err);
                return reject(err);
            }

            try {
                const stats = fs.statSync(backupPath);
                logger.info(`Backup created successfully: ${backupPath}`);
                return resolve({ backupPath, size: stats.size, timestamp: new Date().toISOString() });
            } catch (statErr) {
                logger.error('Backup created but verification failed:', statErr);
                return reject(statErr);
            }
        });
    });
}

// Provide backward-compatible default export (function) and named property
module.exports = createBackup;
module.exports.autoBackup = createBackup;
