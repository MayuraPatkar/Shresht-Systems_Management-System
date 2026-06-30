import { Types } from "mongoose";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { SupplierModel } from "../../../models/Supplier.model";
import { SettingsModel } from "../../../models/Settings.model";
import logger from "../../../utils/logger";
import { addressFromLegacy } from "../v2/customer";
import { generateNextId } from "../../../utils/idGenerator";
import { MigrationService } from "../../migrationService";
import config from "../../../config/config";

/**
 * Migration schema v2 -> v3
 */
export async function migrateV2toV3(db: any): Promise<{
    recovered: number;
    alreadyPresent: number;
    failed: number;
}> {
    logger.info("=========================================");
    logger.info("Starting Schema Version 3 Migration Pipeline");
    logger.info("=========================================");

    const purchasesCollection = db.collection("purchases");

    // 1. Drop existing unique index on purchase_order_id
    logger.info("Step 1: Dropping existing unique index on purchase_order_id if present...");
    try {
        const indexes = await purchasesCollection.indexes();
        for (const idx of indexes) {
            // Check for index name or index key matching purchase_order_id with unique constraint
            const isPurchaseOrderIdIndex = idx.key && idx.key.purchase_order_id !== undefined;
            if (isPurchaseOrderIdIndex && idx.unique) {
                logger.info(`Found unique index on purchase_order_id: ${idx.name}. Dropping it...`);
                await purchasesCollection.dropIndex(idx.name);
                logger.info(`Successfully dropped index ${idx.name}`);
            }
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`Non-fatal warning when dropping unique index: ${msg}`);
    }

    // 2. Create standard non-unique index on purchase_order_id
    logger.info("Step 2: Creating non-unique index on purchase_order_id...");
    try {
        await purchasesCollection.createIndex(
            { purchase_order_id: 1 },
            {
                name: "purchase_order_id_1",
                background: true
            }
        );
        logger.info("Successfully created non-unique index: purchase_order_id_1");
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to create non-unique index: ${msg}`);
        throw err;
    }

    // 3. Locate the latest pre-migration backup
    logger.info("Step 3: Locating the latest pre-migration backup...");
    const state = await MigrationService.getMigrationState();
    const backupMarker = state.backup_marker;
    let backupPath = "";

    if (backupMarker && fs.existsSync(backupMarker) && fs.statSync(backupMarker).isFile()) {
        backupPath = backupMarker;
    } else {
        const settings = await SettingsModel.findOne().lean();
        const backupLocation = settings?.backup?.backup_location || "./backups";
        if (fs.existsSync(backupLocation)) {
            const files = fs.readdirSync(backupLocation);
            const gzFiles = files
                .filter(f => f.startsWith("backup-") && f.endsWith(".gz"))
                .map(f => ({
                    name: f,
                    path: path.resolve(backupLocation, f),
                    mtime: fs.statSync(path.resolve(backupLocation, f)).mtimeMs
                }))
                .sort((a, b) => b.mtime - a.mtime);
            if (gzFiles.length > 0) {
                backupPath = gzFiles[0].path;
            }
        }
    }

    if (!backupPath) {
        const errStr = "No valid pre-migration backup file could be located. Cannot proceed with data recovery.";
        logger.error(errStr);
        throw new Error(errStr);
    }
    logger.info(`Reusing pre-migration backup file: ${backupPath}`);

    // 4. Restore legacy purchases to a temporary collection
    logger.info("Step 4: Restoring legacy purchases to purchases_temp_migration collection...");
    const tempCollectionName = "purchases_temp_migration";
    const tempCollection = db.collection(tempCollectionName);
    
    // Ensure temporary collection is clean
    await tempCollection.drop().catch(() => {});

    const mongoUri = config.mongoURI || "mongodb://127.0.0.1:27017/shreshtSystems";
    
    // Parse DB name from Mongo URI
    let dbName = "shreshtSystems";
    try {
        const cleanUri = mongoUri.split("?")[0];
        const parts = cleanUri.split("/");
        const extracted = parts[parts.length - 1];
        if (extracted) {
            dbName = extracted;
        }
    } catch (parseErr) {
        logger.warn(`Could not parse database name from URI: ${mongoUri}, using default: ${dbName}`);
    }

    const restoreCmd = `mongorestore --uri="${mongoUri}" --archive="${backupPath}" --gzip --nsInclude="*.purchases" --nsFrom="*.purchases" --nsTo="*.${tempCollectionName}"`;
    
    logger.info(`Executing restore command: ${restoreCmd.replace(/"/g, "'")}`);
    
    await new Promise<void>((resolve, reject) => {
        exec(restoreCmd, (err, _stdout, stderr) => {
            if (err) {
                logger.error(`mongorestore failed: ${stderr || err.message}`);
                reject(err);
            } else {
                logger.info("Successfully restored purchases to temporary collection.");
                resolve();
            }
        });
    });

    // 5. Transform and migrate legacy purchases
    logger.info("Step 5: Transforming and migrating legacy purchases...");
    const legacyPurchases = await tempCollection.find({}).toArray();
    logger.info(`Found ${legacyPurchases.length} legacy purchases in backup.`);

    const metrics = {
        recovered: 0,
        alreadyPresent: 0,
        failed: 0
    };

    for (const doc of legacyPurchases) {
        try {
            // Check if this purchase already exists and has been successfully migrated
            const existingActiveDoc = await purchasesCollection.findOne({ _id: doc._id });
            if (existingActiveDoc && existingActiveDoc.schema_version >= 2) {
                metrics.alreadyPresent++;
                continue;
            }

            // Extract supplier properties
            const gstin = doc.supplier_GSTIN || doc.supplier_snapshot?.gstin || "";
            const name = doc.supplier_name || doc.supplier_snapshot?.name || "";
            const phone = doc.supplier_phone || doc.supplier_snapshot?.phone || "";
            const email = doc.supplier_email || doc.supplier_snapshot?.email || "";
            const address = doc.supplier_address || doc.supplier_snapshot?.address;

            // Resolve supplier
            let supplierId: Types.ObjectId | undefined = undefined;
            const supplierDoc = await SupplierModel.findOne({
                $or: [
                    ...(gstin ? [{ gstin }] : []),
                    ...(name ? [{ name }] : [])
                ]
            });
            if (supplierDoc) {
                supplierId = supplierDoc._id;
            }

            // Map supplier snapshot
            const supplierSnapshot = {
                name,
                gstin,
                phone,
                email,
                address: addressFromLegacy(address)
            };

            // Map items
            const mappedItems = Array.isArray(doc.items)
                ? doc.items.map((item: any) => {
                      const qty = Number(item.quantity || 0);
                      const price = Number(item.unit_price || item.rate || 0);
                      const gst = Number(item.rate || item.gst_rate || 18);
                      const taxable = qty * price;
                      return {
                          item_id: item.stock_id || item.item_id ? new Types.ObjectId(item.stock_id || item.item_id) : undefined,
                          description: item.description || "",
                          specification: item.specification || "",
                          hsn_sac: item.HSN_SAC || item.hsn_sac || "",
                          brand: item.company || item.brand || "",
                          item_type: item.type === "Asset" || item.item_type === "Asset" ? "Asset" : "Material",
                          category: item.category || "",
                          unit: item.unit || "Nos",
                          quantity: qty,
                          unit_price: price,
                          taxable_value: taxable,
                          gst_rate: gst,
                          total: Math.round((taxable * (1 + gst / 100)) * 100) / 100
                      };
                  })
                : [];

            // Map totals
            let taxableValue = 0;
            let totalTax = 0;
            for (const item of mappedItems) {
                taxableValue += item.taxable_value;
                totalTax += (item.total - item.taxable_value);
            }
            const grandTotal = Number(doc.total_amount || doc.totals?.grand_total || (taxableValue + totalTax));

            const isInterState = String(supplierSnapshot.address?.state || "Karnataka").toLowerCase().trim() !== "karnataka";
            const igst = isInterState ? totalTax : 0;
            const cgst = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
            const sgst = isInterState ? 0 : Math.round((totalTax - cgst) * 100) / 100;

            const totals = {
                taxable_value: Math.round(taxableValue * 100) / 100,
                cgst,
                sgst,
                igst,
                total_tax: Math.round(totalTax * 100) / 100,
                round_off: Math.round((grandTotal - (taxableValue + totalTax)) * 100) / 100,
                grand_total: Math.round(grandTotal * 100) / 100
            };

            const purchaseInvoiceNo = doc.purchase_invoice_no || doc.purchase_no || await generateNextId('purchase');

            // Construct new schema purchase document
            const newPurchaseData: any = {
                schema_version: 3,
                purchase_no: purchaseInvoiceNo,
                purchase_order_no: doc.purchase_order_no || "",
                purchase_order_id: undefined, // Must be undefined or omitted instead of null
                purchase_invoice_no: purchaseInvoiceNo,
                purchase_date: doc.purchase_date ? new Date(doc.purchase_date) : new Date(),
                purchase_status: "Received",
                purchase_type: isInterState ? "Interstate" : "Local",
                supplier_id: supplierId,
                supplier_snapshot: supplierSnapshot,
                items: mappedItems,
                totals,
                remarks: `Recovered and migrated from pre-migration backup. Original No: ${doc.purchase_invoice_no || doc.purchase_no}`,
                total_paid_amount: grandTotal,
                payment_status: doc.payment_status || "Paid",
                payments: doc.payments || [
                    {
                        payment_date: doc.purchase_date ? new Date(doc.purchase_date) : new Date(),
                        payment_mode: "Cash",
                        paid_amount: grandTotal,
                        extra_details: "Auto-migrated payment ledger"
                    }
                ],
                deletion: doc.deletion || { is_deleted: false },
                is_archived: doc.is_archived ?? false
            };

            // Write document to active collection
            await purchasesCollection.replaceOne(
                { _id: doc._id },
                newPurchaseData,
                { upsert: true }
            );

            metrics.recovered++;
        } catch (err: unknown) {
            metrics.failed++;
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to migrate purchase document ${doc.purchase_invoice_id || doc._id}:`, { error: msg });
        }
    }

    // 6. Clean up temporary collection
    logger.info("Step 6: Cleaning up temporary collection...");
    await tempCollection.drop().catch(() => {});

    logger.info("=========================================");
    logger.info(`Schema Version 3 Migration Metrics:`);
    logger.info(`- Recovered Purchases: ${metrics.recovered}`);
    logger.info(`- Already Present: ${metrics.alreadyPresent}`);
    logger.info(`- Failed: ${metrics.failed}`);
    logger.info("=========================================");

    return metrics;
}
