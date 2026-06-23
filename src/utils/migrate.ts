import { runMigrations } from "../migrations/migrationRunner";
import logger from "./logger";
import mongoose from "mongoose";

/**
 * CLI Migration Runner Entrypoint
 */
async function execute() {
    try {
        const result = await runMigrations();
        if (result.success) {
            logger.info("Database migration CLI run succeeded.");
            await mongoose.connection.close();
            logger.info("Database connection closed cleanly.");
            process.exit(0);
        } else {
            logger.error(`Database migration CLI run failed: ${result.error}`);
            await mongoose.connection.close();
            process.exit(1);
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Database migration CLI run encountered unexpected error: ${msg}`);
        try {
            await mongoose.connection.close();
        } catch {
            // ignore close error
        }
        process.exit(1);
    }
}

execute();
