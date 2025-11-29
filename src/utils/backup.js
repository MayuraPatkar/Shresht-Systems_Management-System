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
function autoBackup() {
    // 1. Set up the backup directory.
    const backupDir = global.appPaths ? global.appPaths.backups : path.join(__dirname, "../../backups");
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    // 2. Generate a unique, timestamped filename.
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `backup-${timestamp}.gz`);

    // 3. Resolve mongodump path
    const config = require("../config/config");
    let mongoDumpExec = config.mongoDumpPath || 'mongodump';

    // If default or not absolute, check for bundled binary
    if (mongoDumpExec === 'mongodump') {
        const isWin = process.platform === "win32";
        const binName = isWin ? "mongodump.exe" : "mongodump";

        // Check Electron resources path (Production)
        if (process.resourcesPath) {
            const prodPath = path.join(process.resourcesPath, "bin", binName);
            if (fs.existsSync(prodPath)) {
                mongoDumpExec = prodPath;
            }
        }

        // Check local development path if not found yet
        if (mongoDumpExec === 'mongodump') {
            const devPath = path.join(__dirname, "../../resources/bin", binName);
            if (fs.existsSync(devPath)) {
                mongoDumpExec = devPath;
            }
        }
    }

    // Construct the mongodump command
    const cmd = `"${mongoDumpExec}" --uri="mongodb://127.0.0.1:27017/shreshtSystems" --archive="${backupPath}" --gzip`;

    // 4. Execute the command and log the success or failure.
    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            // Check if the error is due to missing mongodump command
            if (stderr && (stderr.includes("not recognized") || stderr.includes("not found"))) {
                logger.warn("Backup skipped: 'mongodump' command not found. Please install MongoDB Database Tools to enable automatic backups.");
                return;
            }
            logger.error("Backup failed:", stderr);
            return;
        }
        logger.info("Backup created successfully");
    });
}

// Export the function for use in other modules.
module.exports = autoBackup;
