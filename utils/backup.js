// utils/backup.js
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

function autoBackup() {
    const backupDir = path.join(__dirname, "../backups");
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `backup-${timestamp}.gz`);

    // Run mongodump with gzip
    const cmd = `mongodump --uri="mongodb://127.0.0.1:27017/shreshtSystems" --archive="${backupPath}" --gzip`;

    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            console.error("❌ Backup failed:", stderr);
        } else {
            console.log("✅ Backup created:", backupPath);
        }
    });
}

module.exports = autoBackup;
