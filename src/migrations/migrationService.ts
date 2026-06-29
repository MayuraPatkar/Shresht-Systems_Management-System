import { MigrationStateModel, IMigrationState } from "./migrationModel";
import logger from "../utils/logger";

/**
 * Migration Service class to manage state tracking in the migration_state collection
 */
export class MigrationService {
    /**
     * Gets the current migration state document.
     * If no document exists, initializes a default state at version 1 (pending).
     */
    static async getMigrationState(): Promise<IMigrationState> {
        try {
            let state = await MigrationStateModel.findOne().exec();
            if (!state) {
                state = new MigrationStateModel({
                    current_version: 1,
                    last_migration_at: new Date(),
                    migration_status: "pending",
                });
                await state.save();
                logger.info("Initialized default migration state in database at version 1.");
            }
            return state;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error("Failed to retrieve or initialize migration state:", { error: msg });
            throw err;
        }
    }

    /**
     * Updates the status, backup marker, and/or errors of the migration state.
     */
    static async updateState(
        status: "pending" | "running" | "completed" | "failed",
        errorDetails?: string,
        backupMarker?: string
    ): Promise<IMigrationState> {
        try {
            const state = await this.getMigrationState();
            state.migration_status = status;
            state.last_migration_at = new Date();
            if (errorDetails !== undefined) state.error_details = errorDetails;
            if (backupMarker !== undefined) state.backup_marker = backupMarker;

            await state.save();
            logger.info(`Migration state updated: status=${status}, version=${state.current_version}`);
            return state;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error("Failed to update migration state:", { error: msg });
            throw err;
        }
    }

    /**
     * Marks the migration to target version as complete.
     */
    static async completeMigration(targetVersion: number, backupMarker?: string): Promise<IMigrationState> {
        try {
            const state = await this.getMigrationState();
            state.current_version = targetVersion;
            state.migration_status = "completed";
            state.error_details = undefined;
            state.last_migration_at = new Date();
            if (backupMarker !== undefined) state.backup_marker = backupMarker;

            await state.save();
            logger.info(`✓ Migration successfully completed. Updated to schema version ${targetVersion}`);
            return state;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error("Failed to complete migration state:", { error: msg });
            throw err;
        }
    }

    /**
     * Marks the migration as failed with error details.
     */
    static async failMigration(errorDetails: string): Promise<IMigrationState> {
        try {
            const state = await this.getMigrationState();
            state.migration_status = "failed";
            state.error_details = errorDetails;
            state.last_migration_at = new Date();

            await state.save();
            logger.error(`✗ Migration execution failed: ${errorDetails}`);
            return state;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error("Failed to set migration state to failed:", { error: msg });
            throw err;
        }
    }
}
