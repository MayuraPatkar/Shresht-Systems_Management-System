import logger from "../../../utils/logger";

/**
 * Migration schema v3 -> v4: Split employee name into first_name and last_name
 */
export async function migrateV3toV4(db: any): Promise<{
    migrated: number;
    failed: number;
}> {
    logger.info("=========================================");
    logger.info("Starting Schema Version 4 Migration Pipeline (Employee Name Split)");
    logger.info("=========================================");

    const employeesCollection = db.collection("employees");
    const employees = await employeesCollection.find({}).toArray();
    
    let migrated = 0;
    let failed = 0;

    for (const doc of employees) {
        try {
            // If first_name already exists, skip
            if (doc.first_name !== undefined) {
                continue;
            }

            const fullName = doc.name || "";
            const parts = fullName.trim().split(/\s+/);
            const first_name = parts[0] || "Unknown";
            const last_name = parts.slice(1).join(" ") || "";

            await employeesCollection.updateOne(
                { _id: doc._id },
                {
                    $set: {
                        first_name,
                        last_name
                    },
                    $unset: {
                        name: ""
                    }
                }
            );

            migrated++;
        } catch (err: unknown) {
            failed++;
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to migrate employee ${doc._id}: ${msg}`);
        }
    }

    logger.info("=========================================");
    logger.info(`Schema Version 4 Migration Metrics:`);
    logger.info(`- Migrated Employees: ${migrated}`);
    logger.info(`- Failed: ${failed}`);
    logger.info("=========================================");

    return { migrated, failed };
}
