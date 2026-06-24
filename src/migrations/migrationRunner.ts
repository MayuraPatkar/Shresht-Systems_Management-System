import mongoose from "mongoose";
import { SettingsModel } from "../models/Settings.model";
import { QuotationModel } from "../models/Quotation.model";
import { InvoiceModel } from "../models/Invoice.model";
import { PurchaseOrderModel } from "../models/PurchaseOrder.model";
import { CustomerModel } from "../models/Customer.model";
import { SupplierModel } from "../models/Supplier.model";
import { UserModel } from "../models/User.model";
import { ItemModel } from "../models/Stock.model";
import { PurchaseModel } from "../models/Purchase.model";
import { ServiceModel } from "../models/Service.model";
import { EWayBillModel } from "../models/EWayBill.model";
import createBackup from "../utils/backup";
import { MigrationService } from "./migrationService";
import { migrateCustomers } from "./versions/v2/customer";
import { migrateQuotations } from "./versions/v2/quotation";
import { migrateInvoices } from "./versions/v2/invoice";
import { migratePurchaseOrders } from "./versions/v2/purchaseOrder";
import { migrateSettings } from "./versions/v2/settings";
import { migrateAdmins } from "./versions/v2/admin";
import { migrateStocks } from "./versions/v2/stock";
import { migratePurchases } from "./versions/v2/purchase";
import { migrateServices } from "./versions/v2/service";
import { migrateStockMovements } from "./versions/v2/stockMovement";
import { migrateEWayBills } from "./versions/v2/ewaybill";
import { migrateCounters } from "./versions/v2/counter";
import { migratePayments } from "./versions/v2/payment";
import logger from "../utils/logger";
import connectDB from "../config/database";

/**
 * Runs the database migration system.
 * Idempotent, safe, and logs detailed execution metrics.
 */
export async function runMigrations(): Promise<{
    success: boolean;
    report?: string;
    error?: string;
}> {
    logger.info("=========================================");
    logger.info("Initializing Shresht Systems Database Migration");
    logger.info("=========================================");

    // 1. Connect DB
    if (mongoose.connection.readyState !== 1) {
        logger.info("Database not connected. Initiating connection...");
        await connectDB();
    }

    const db = mongoose.connection.db;
    if (!db) {
        const errMsg = "Database connection object is undefined.";
        logger.error(errMsg);
        return { success: false, error: errMsg };
    }

    // 2. Check migration version
    const state = await MigrationService.getMigrationState();
    if (state.current_version >= 2) {
        logger.info(`Database schema is already at version ${state.current_version}. No migration needed.`);
        return {
            success: true,
            report: `Skipped. Current schema version is ${state.current_version}.`,
        };
    }

    // Update status to running
    await MigrationService.updateState("running");

    // 3. Create backup marker
    let backupMarker = "Skipped or Failed";
    try {
        const settings = await SettingsModel.findOne().lean();
        const backupLocation = settings?.backup?.backup_location || "./backups";
        logger.info(`Creating pre-migration backup in: ${backupLocation}...`);
        const backupResult = await createBackup(backupLocation);
        backupMarker = backupResult.backupPath;
        logger.info(`Pre-migration database backup created successfully: ${backupMarker}`);
    } catch (backupErr: unknown) {
        const msg = backupErr instanceof Error ? backupErr.message : String(backupErr);
        backupMarker = `Skipped: ${msg}`;
        logger.warn(`Pre-migration backup was skipped or failed. Continuing migration. Reason: ${msg}`);
    }

    await MigrationService.updateState("running", undefined, backupMarker);

    // Try starting a session for transaction support if replica set is active
    let session: mongoose.mongo.ClientSession | null = null;
    let useTransaction = false;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
        logger.info("Started MongoDB transaction session successfully.");
    } catch {
        logger.warn("MongoDB transactions not supported (e.g. standalone server). Running migration in non-transactional mode.");
    }

    try {
        // Step 3a: Run Settings Migration
        logger.info("Step 3a: Executing settings migration...");
        const settingsResult = await migrateSettings(db);

        // Step 3b: Run Admin Migration
        logger.info("Step 3b: Executing admin/user migration...");
        const adminResult = await migrateAdmins(db);

        // 4. Run Customer Migration
        logger.info("Step 4: Executing customer migration...");
        const customerResult = await migrateCustomers(db);

        // 5. Run Quotation Migration
        logger.info("Step 5: Executing quotation migration...");
        const quotationResult = await migrateQuotations(db, customerResult.lookupMap);

        // 6. Run Invoice Migration
        logger.info("Step 6: Executing invoice migration...");
        const invoiceResult = await migrateInvoices(db, customerResult.lookupMap);

        // 7. Run Purchase Order Migration
        logger.info("Step 7: Executing purchase order migration...");
        const poResult = await migratePurchaseOrders(db);

        // Step 7a: Run Stock (Items) Migration
        logger.info("Step 7a: Executing stock/item migration...");
        const stockResult = await migrateStocks(db);

        // Step 7b: Run Purchase Migration
        logger.info("Step 7b: Executing purchase migration...");
        const purchaseResult = await migratePurchases(db);

        // Step 7c: Run Service Migration
        logger.info("Step 7c: Executing service migration...");
        const serviceResult = await migrateServices(db);

        // Step 7d: Run Stock Movement Migration
        logger.info("Step 7d: Executing stock movement migration...");
        const stockMovementResult = await migrateStockMovements(db);

        // Step 7e: Run E-Way Bill Migration
        logger.info("Step 7e: Executing e-way bill migration...");
        const ewaybillResult = await migrateEWayBills(db);

        // Step 7f: Run Counter Migration
        logger.info("Step 7f: Executing counter migration...");
        const counterResult = await migrateCounters(db);

        // Step 7g: Run Payment Migration (extract from invoices and purchases)
        logger.info("Step 7g: Executing payment migration...");
        const paymentResult = await migratePayments(db);

        // Commit transaction if active
        if (useTransaction && session) {
            await session.commitTransaction();
            logger.info("Committed MongoDB transaction successfully.");
        }

        // 8. Validate migrated data
        logger.info("Step 8: Performing post-migration data validation...");
        const validationReport = await performValidation();

        // 9. Update migration version and mark complete
        await MigrationService.completeMigration(2, backupMarker);

        const summaryReport = `
=========================================
DATABASE MIGRATION SUCCESS REPORT
=========================================
Schema Version: 1 -> 2
Backup Location: ${backupMarker}

MIGRATION METRICS:
- Settings Migrated: ${settingsResult.migrated} (Skipped: ${settingsResult.skipped}, Failed: ${settingsResult.failed})
- Users Migrated: ${adminResult.migrated} (Skipped: ${adminResult.skipped}, Failed: ${adminResult.failed})
- Customers Created: ${customerResult.report.migrated} (Merged: ${customerResult.report.duplicatesMerged}, Failed: ${customerResult.report.failed})
- Quotations Migrated: ${quotationResult.migrated} (Skipped: ${quotationResult.skipped}, Failed: ${quotationResult.failed})
- Invoices Migrated: ${invoiceResult.migrated} (Skipped: ${invoiceResult.skipped}, Failed: ${invoiceResult.failed})
- Suppliers Created: ${poResult.suppliersCreated} (Merged: ${poResult.suppliersMerged})
- Purchase Orders Migrated: ${poResult.migrated} (Skipped: ${poResult.skipped}, Failed: ${poResult.failed})
- Stock Items Migrated: ${stockResult.migrated} (Skipped: ${stockResult.skipped}, Failed: ${stockResult.failed})
- Purchases Migrated: ${purchaseResult.migrated} (Skipped: ${purchaseResult.skipped}, Failed: ${purchaseResult.failed})
- Payments Migrated: ${paymentResult.migrated} (Failed: ${paymentResult.failed})
- Services Migrated: ${serviceResult.migrated} (Skipped: ${serviceResult.skipped}, Failed: ${serviceResult.failed})
- Stock Movements Migrated: ${stockMovementResult.migrated} (Skipped: ${stockMovementResult.skipped}, Failed: ${stockMovementResult.failed})
- E-Way Bills Migrated: ${ewaybillResult.migrated} (Skipped: ${ewaybillResult.skipped}, Failed: ${ewaybillResult.failed})
- Counters Validated: ${counterResult.migrated + counterResult.skipped}

POST-MIGRATION VALIDATION RESULTS:
- Validated Quotations: ${validationReport.validatedQuotations} / ${validationReport.totalQuotations} (Failed: ${validationReport.failedQuotations})
- Validated Invoices: ${validationReport.validatedInvoices} / ${validationReport.totalInvoices} (Failed: ${validationReport.failedInvoices})
- Validated Purchase Orders: ${validationReport.validatedPurchaseOrders} / ${validationReport.totalPurchaseOrders} (Failed: ${validationReport.failedPurchaseOrders})
- Validated Users: ${validationReport.validatedUsers} / ${validationReport.totalUsers} (Failed: ${validationReport.failedUsers})
- Validated Stock Items: ${validationReport.validatedItems} / ${validationReport.totalItems} (Failed: ${validationReport.failedItems})
- Validated Purchases: ${validationReport.validatedPurchases} / ${validationReport.totalPurchases} (Failed: ${validationReport.failedPurchases})
- Validated Services: ${validationReport.validatedServices} / ${validationReport.totalServices} (Failed: ${validationReport.failedServices})
- Validated E-Way Bills: ${validationReport.validatedEWayBills} / ${validationReport.totalEWayBills} (Failed: ${validationReport.failedEWayBills})
=========================================
`;
        logger.info(summaryReport);
        return { success: true, report: summaryReport };
    } catch (err: unknown) {
        // Rollback transaction if active
        if (useTransaction && session) {
            await session.abortTransaction();
            logger.error("Aborted MongoDB transaction due to fatal migration error.");
        }

        const msg = err instanceof Error ? err.message : String(err);
        logger.error("FATAL MIGRATION ERROR - STOPPING PROCESS IMMEDIATELY:", { error: msg });
        await MigrationService.failMigration(msg);
        return { success: false, error: msg };
    } finally {
        if (session) {
            await session.endSession();
        }
    }
}

/**
 * Validates the migrated data schema structures.
 */
async function performValidation() {
    const totalQuotations = await QuotationModel.countDocuments();
    const totalInvoices = await InvoiceModel.countDocuments();
    const totalPurchaseOrders = await PurchaseOrderModel.countDocuments();
    const totalUsers = await UserModel.countDocuments();
    const totalItems = await ItemModel.countDocuments();
    const totalPurchases = await PurchaseModel.countDocuments();
    const totalServices = await ServiceModel.countDocuments();
    const totalEWayBills = await EWayBillModel.countDocuments();

    // Check quotations
    const invalidQuotations = await QuotationModel.find({
        $or: [
            { customer_id: { $exists: false } },
            { customer_snapshot: { $exists: false } },
            { schema_version: { $ne: 2 } },
        ],
    }).lean();

    // Check invoices
    const invalidInvoices = await InvoiceModel.find({
        $or: [
            { customer_id: { $exists: false } },
            { customer_snapshot: { $exists: false } },
            { schema_version: { $ne: 2 } },
        ],
    }).lean();

    // Check purchase orders
    const invalidPurchaseOrders = await PurchaseOrderModel.find({
        $or: [
            { supplier_id: { $exists: false } },
            { supplier_snapshot: { $exists: false } },
            { schema_version: { $ne: 2 } },
        ],
    }).lean();

    // Check users
    const invalidUsers = await UserModel.find({
        $or: [
            { username: { $exists: false } },
            { password: { $exists: false } },
            { schema_version: { $ne: 2 } }
        ]
    }).lean();

    // Check stock items
    const invalidItems = await ItemModel.find({
        $or: [
            { item_name: { $exists: false } },
            { unit: { $exists: false } },
            { purchase_price: { $exists: false } },
            { schema_version: { $ne: 2 } }
        ]
    }).lean();

    // Check purchases
    const invalidPurchases = await PurchaseModel.find({
        $or: [
            { supplier_id: { $exists: false } },
            { supplier_snapshot: { $exists: false } },
            { schema_version: { $ne: 2 } }
        ]
    }).lean();

    // Check services
    const invalidServices = await ServiceModel.find({
        $or: [
            { invoice_id: { $exists: false } },
            { schema_version: { $ne: 2 } }
        ]
    }).lean();

    // Check e-way bills
    const invalidEWayBills = await EWayBillModel.find({
        $or: [
            { invoice_id: { $exists: false } },
            { schema_version: { $ne: 2 } }
        ]
    }).lean();

    return {
        totalQuotations,
        totalInvoices,
        totalPurchaseOrders,
        totalUsers,
        totalItems,
        totalPurchases,
        totalServices,
        totalEWayBills,
        validatedQuotations: totalQuotations - invalidQuotations.length,
        validatedInvoices: totalInvoices - invalidInvoices.length,
        validatedPurchaseOrders: totalPurchaseOrders - invalidPurchaseOrders.length,
        validatedUsers: totalUsers - invalidUsers.length,
        validatedItems: totalItems - invalidItems.length,
        validatedPurchases: totalPurchases - invalidPurchases.length,
        validatedServices: totalServices - invalidServices.length,
        validatedEWayBills: totalEWayBills - invalidEWayBills.length,
        failedQuotations: invalidQuotations.length,
        failedInvoices: invalidInvoices.length,
        failedPurchaseOrders: invalidPurchaseOrders.length,
        failedUsers: invalidUsers.length,
        failedItems: invalidItems.length,
        failedPurchases: invalidPurchases.length,
        failedServices: invalidServices.length,
        failedEWayBills: invalidEWayBills.length
    };
}
