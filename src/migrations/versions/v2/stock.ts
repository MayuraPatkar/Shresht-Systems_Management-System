import { Types } from "mongoose";
import { ItemModel } from "../../../models/Stock.model";
import logger from "../../../utils/logger";

/**
 * Migrates stocks to items in V2.
 */
export async function migrateStocks(db: any): Promise<{
    migrated: number;
    skipped: number;
    failed: number;
}> {
    logger.info("Starting stock (items) migration...");
    const report = { migrated: 0, skipped: 0, failed: 0 };

    const rawStocksCollection = db.collection("stocks");
    const legacyStocks = await rawStocksCollection.find({}).toArray();

    logger.info(`Found ${legacyStocks.length} legacy stocks.`);

    for (const doc of legacyStocks) {
        try {
            // Check if already migrated
            const existingItem = await ItemModel.findById(doc._id);
            if (existingItem && existingItem.schema_version === 2) {
                report.skipped++;
                continue;
            }

            const unitPrice = Number(doc.unit_price || 0);
            const margin = Number(doc.margin || 0);
            const sellingPrice = Math.round((unitPrice * (1 + margin / 100)) * 100) / 100;

            await ItemModel.updateOne(
                { _id: doc._id },
                {
                    $set: {
                        schema_version: 2,
                        item_name: doc.item_name,
                        hsn_sac: doc.HSN_SAC || "",
                        specifications: doc.specifications || "",
                        brand: doc.company || "",
                        category: doc.category || "",
                        item_type: doc.type === "Asset" ? "Asset" : "Material",
                        unit: doc.unit || "Nos",
                        purchase_price: unitPrice,
                        selling_price: doc.selling_price || sellingPrice,
                        gst_rate: Number(doc.GST || 18),
                        margin,
                        stock_quantity: Number(doc.quantity || 0),
                        min_stock_quantity: Number(doc.min_quantity || 5),
                        is_active: doc.is_active !== false,
                        deletion: doc.deletion || { is_deleted: false }
                    }
                },
                { upsert: true }
            );

            report.migrated++;
        } catch (err: unknown) {
            report.failed++;
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to migrate stock item ${doc.item_name || doc._id}:`, { error: msg });
        }
    }

    return report;
}
