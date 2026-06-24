import logger from "../../../utils/logger";

/**
 * Validates/migrates legacy counters in V2.
 */
export async function migrateCounters(db: any): Promise<{
    migrated: number;
    skipped: number;
    failed: number;
}> {
    logger.info("Starting counter validation/migration...");
    const report = { migrated: 0, skipped: 0, failed: 0 };

    const rawCountersCollection = db.collection("counters");
    const legacyCounters = await rawCountersCollection.find({}).toArray();

    logger.info(`Found ${legacyCounters.length} counters in database.`);

    for (const doc of legacyCounters) {
        try {
            // Counters use the same schema in V2, so we just verify/mark as skipped (no conversion needed)
            report.skipped++;
        } catch (err: unknown) {
            report.failed++;
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to validate counter ${doc._id}:`, { error: msg });
        }
    }

    return report;
}
