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

    // 3. Construct the mongodump command to create a compressed archive.
    const cmd = `mongodump --uri="mongodb://127.0.0.1:27017/shreshtSystems" --archive="${backupPath}" --gzip`;

    // 4. Execute the command and log the success or failure.
    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            logger.error("Backup failed:", stderr);
            return;
        }
        logger.info("Backup created successfully:");
    });
}

// Export the function for use in other modules.
module.exports = autoBackup;
