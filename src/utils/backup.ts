/**
 * MongoDB backup utility.
 * Creates compressed, timestamped database backups using mongodump.
 */

import { exec } from "child_process";
import path from "path";
import fs from "fs";
import logger from "./logger";

interface BackupResult {
    backupPath: string;
    size: number;
    timestamp: string;
}

/**
 * Creates a gzipped backup of the MongoDB database.
 * The backup file is saved with a timestamp into the specified directory.
 */
function createBackup(customPath?: string): Promise<BackupResult> {
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const config = require("../config/config").default || require("../config/config");

        // Priority: customPath is required - no default fallback
        const backupDir = customPath;

        if (!backupDir) {
            const errorMsg =
                "Backup location not configured. Please set a backup location in Settings -> Preferences.";
            logger.error("Backup failed", { service: "backup", reason: "not_configured" });
            return reject(new Error(errorMsg));
        }

        // Ensure the directory exists
        try {
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            try {
                fs.chmodSync(backupDir, 0o700);
            } catch {
                /* ignore on Windows */
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error("Failed to prepare backup directory", {
                service: "backup",
                directory: backupDir,
                error: message,
            });
            return;
        }

        // Optional retention: remove backups older than retentionDays
        const retentionDays = Number(
            process.env.BACKUP_RETENTION_DAYS || config.backupRetentionDays || 30
        );
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
                            logger.info("Old backup removed", { service: "backup", file: full });
                        }
                    } catch {
                        // ignore errors per-file
                    }
                });
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                logger.warn("Failed to enforce backup retention", {
                    service: "backup",
                    directory: backupDir,
                    error: message,
                });
            }
        }

        // Generate a unique, timestamped filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = path.join(backupDir, `backup-${timestamp}.gz`);

        // Resolve mongodump path and target URI
        let mongoDumpExec: string = config.mongoDumpPath || "mongodump";
        const mongoUri: string = config.mongoUri || "mongodb://127.0.0.1:27017/shreshtSystems";

        if (mongoDumpExec === "mongodump") {
            const isWin = process.platform === "win32";
            const binName = isWin ? "mongodump.exe" : "mongodump";

            if (process.resourcesPath) {
                const prodPath = path.join(process.resourcesPath, "bin", binName);
                if (fs.existsSync(prodPath)) {
                    mongoDumpExec = prodPath;
                }
            }

            if (mongoDumpExec === "mongodump") {
                const devPath = path.join(__dirname, "../../resources/bin", binName);
                if (fs.existsSync(devPath)) {
                    mongoDumpExec = devPath;
                }
            }
        }

        const cmd = `"${mongoDumpExec}" --uri="${mongoUri}" --archive="${backupPath}" --gzip`;

        // Execute the command
        exec(cmd, async (err, _stdout, stderr) => {
            if (err) {
                const notFound =
                    (err as NodeJS.ErrnoException).code === "ENOENT" ||
                    (stderr &&
                        (stderr.includes("not recognized") || stderr.includes("not found")));
                if (notFound) {
                    const message =
                        "'mongodump' command not found. Please install MongoDB Database Tools to enable backups.";
                    logger.warn("Backup skipped - mongodump not found", { service: "backup" });
                    return reject(new Error(message));
                }
                logger.error("Backup failed", {
                    service: "backup",
                    stderr,
                    error: err.message || String(err),
                });
                return reject(err);
            }

            try {
                const stats = fs.statSync(backupPath);
                logger.info("Backup created successfully", {
                    service: "backup",
                    path: backupPath,
                    size: stats.size,
                    timestamp,
                });
                return resolve({
                    backupPath,
                    size: stats.size,
                    timestamp: new Date().toISOString(),
                });
            } catch (statErr: unknown) {
                const message = statErr instanceof Error ? statErr.message : String(statErr);
                logger.error("Backup verification failed", {
                    service: "backup",
                    error: message,
                });
                return reject(statErr);
            }
        });
    });
}

export default createBackup;
export { createBackup as autoBackup };
