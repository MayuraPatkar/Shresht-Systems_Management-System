/**
 * File Cleanup Utility
 *
 * Provides safe file removal and age-based cleanup of directories.
 */

import { promises as fs } from "fs";
import fssync from "fs";
import path from "path";
import logger from "./logger";

interface CleanupResult {
    success: boolean;
    removed?: number;
    message?: string;
    error?: string;
}

/**
 * Remove a single file safely, ensuring it lies under a given base directory (if provided)
 */
export async function removeFile(filePath: string, baseDir?: string): Promise<boolean> {
    try {
        if (!filePath || typeof filePath !== "string") return false;
        const resolved = path.resolve(filePath);

        if (baseDir) {
            const resolvedBase = path.resolve(baseDir);
            if (!resolved.startsWith(resolvedBase)) {
                logger.warn(`Refusing to remove file outside base directory: ${filePath}`);
                return false;
            }
        }

        if (!fssync.existsSync(resolved)) {
            logger.info(`File not found for delete: ${resolved}`);
            return false;
        }

        await fs.unlink(resolved);
        logger.info(`Deleted file: ${resolved}`);
        return true;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Error deleting file ${filePath}:`, message);
        return false;
    }
}

/**
 * Clean up files older than the provided age (in days) under `directory`
 */
export async function cleanupOldFiles(
    directory: string,
    olderThanDays = 7,
    fileTypes: string[] = []
): Promise<CleanupResult> {
    try {
        if (!directory) return { success: false, message: "Directory not specified" };
        const resolvedBase = path.resolve(directory);

        if (!fssync.existsSync(resolvedBase)) {
            return { success: true, removed: 0, message: "No directory" };
        }

        const entries = await fs.readdir(resolvedBase);
        const threshold = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
        let removed = 0;

        for (const entry of entries) {
            try {
                const full = path.join(resolvedBase, entry);
                const stat = await fs.stat(full);
                if (stat.isDirectory()) continue;

                // Skip files not matching specified types when fileTypes provided
                if (fileTypes && fileTypes.length > 0) {
                    const ext = path.extname(entry).toLowerCase();
                    if (!fileTypes.includes(ext)) continue;
                }

                if (stat.mtimeMs < threshold) {
                    await fs.unlink(full);
                    removed += 1;
                }
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                logger.warn(`Failed to analyze or remove item ${entry}: ${message}`);
            }
        }

        return { success: true, removed };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("Error during cleanupOldFiles:", message);
        return { success: false, error: message };
    }
}
