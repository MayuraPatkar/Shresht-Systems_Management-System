import { Types } from "mongoose";
import logger from "../../../utils/logger";

/**
 * Migrates legacy stock movements to V2 in-place.
 */
export async function migrateStockMovements(db: any): Promise<{
    migrated: number;
    skipped: number;
    failed: number;
}> {
    logger.info("Starting stock movement migration...");
    const report = { migrated: 0, skipped: 0, failed: 0 };

    const rawStockMovementCollection = db.collection("stockmovements");
    const legacyMovements = await rawStockMovementCollection.find({}).toArray();

    logger.info(`Found ${legacyMovements.length} legacy stock movements.`);

    // Group movements by item_id to calculate stock_before and stock_after sequentially
    const movementsByItem = new Map<string, any[]>();
    for (const doc of legacyMovements) {
        const itemId = String(doc.item_id || doc.stock_id || "");
        if (!itemId) {
            report.skipped++;
            continue;
        }
        if (!movementsByItem.has(itemId)) {
            movementsByItem.set(itemId, []);
        }
        movementsByItem.get(itemId)!.push(doc);
    }

    for (const [itemId, movements] of movementsByItem.entries()) {
        // Sort movements by timestamp ascending
        movements.sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeA - timeB;
        });

        let runningStock = 0;

        for (const doc of movements) {
            try {
                // Check if already migrated
                if (doc.schema_version === 2) {
                    report.skipped++;
                    const qtyChange = Number(doc.quantity_change || doc.quantity || 0);
                    runningStock += qtyChange;
                    continue;
                }

                const qtyChange = Number(doc.quantity_change || 0);
                const quantity = Math.abs(qtyChange);
                const direction = qtyChange >= 0 ? "IN" : "OUT";

                const stockBefore = runningStock;
                const stockAfter = runningStock + qtyChange;
                runningStock = stockAfter;

                // Map reference type
                let refType: any = "Manual";
                const legacyRefType = String(doc.reference_type || "").toLowerCase();
                if (legacyRefType === "invoice") refType = "Invoice";
                else if (legacyRefType === "purchase") refType = "Purchase";
                else if (legacyRefType === "purchase_order") refType = "Purchase";
                else if (legacyRefType === "service") refType = "Service";
                else if (legacyRefType === "manual") refType = "Manual";
                else if (legacyRefType === "adjustment") refType = "Adjustment";

                let refId: Types.ObjectId | undefined = undefined;
                if (doc.reference_id && Types.ObjectId.isValid(doc.reference_id)) {
                    refId = new Types.ObjectId(doc.reference_id);
                }

                await rawStockMovementCollection.updateOne(
                    { _id: doc._id },
                    {
                        $set: {
                            schema_version: 2,
                            item_id: new Types.ObjectId(itemId),
                            item_name: doc.item_name || "",
                            hsn_sac: doc.HSN_SAC || "",
                            direction,
                            quantity,
                            stock_before: stockBefore,
                            stock_after: stockAfter,
                            reference: {
                                type: refType,
                                id: refId,
                                number: doc.reference_number || ""
                            },
                            unit_price: Number(doc.unit_price || 0),
                            total_value: Number(doc.total_value || 0),
                            remarks: doc.notes || "",
                            created_by: doc.created_by || "system",
                            createdAt: doc.timestamp ? new Date(doc.timestamp) : new Date(),
                            updatedAt: doc.timestamp ? new Date(doc.timestamp) : new Date()
                        },
                        $unset: {
                            quantity_change: "",
                            movement_type: "",
                            reference_type: "",
                            reference_id: "",
                            reference_number: "",
                            notes: "",
                            timestamp: ""
                        }
                    }
                );

                report.migrated++;
            } catch (err: unknown) {
                report.failed++;
                const msg = err instanceof Error ? err.message : String(err);
                logger.error(`Failed to migrate stock movement ${doc._id}:`, { error: msg });
            }
        }
    }

    return report;
}
