const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const logger = require('./logger');

// Remove a single file safely ensuring it lies under a given base directory (if provided)
async function removeFile(filePath, baseDir) {
    try {
        if (!filePath || typeof filePath !== 'string') return false;
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
    } catch (err) {
        logger.error(`Error deleting file ${filePath}:`, err && err.message ? err.message : err);
        return false;
    }
}

// Clean up files older than the provided age (in days) under `directory`
async function cleanupOldFiles(directory, olderThanDays = 7, fileTypes = []) {
    try {
        if (!directory) return { success: false, message: 'Directory not specified' };
        const resolvedBase = path.resolve(directory);
        if (!fssync.existsSync(resolvedBase)) {
            return { success: true, removed: 0, message: 'No directory' };
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
                    logger.info(`Removed old file from uploads: ${full}`);
                }
            } catch (e) {
                // ignore per-file errors
                logger.warn(`Failed to analyze or remove item ${entry}: ${e && e.message}`);
            }
        }

        return { success: true, removed };
    } catch (err) {
        logger.error('Error during cleanupOldFiles:', err && err.message ? err.message : err);
        return { success: false, error: err && err.message };
    }
}

module.exports = {
    removeFile,
    cleanupOldFiles
};
