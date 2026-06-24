import { SettingsModel } from "../../../models/Settings.model";
import logger from "../../../utils/logger";

/**
 * Migrates or creates settings in-place for V2.
 */
export async function migrateSettings(db: any): Promise<{
    migrated: number;
    skipped: number;
    failed: number;
}> {
    logger.info("Starting settings migration...");
    const report = { migrated: 0, skipped: 0, failed: 0 };

    const rawSettingsCollection = db.collection("settings");
    const doc = await rawSettingsCollection.findOne({});

    if (doc) {
        if (doc.schema_version === 2) {
            report.skipped++;
            logger.info("Settings already migrated.");
            return report;
        }

        try {
            await rawSettingsCollection.updateOne(
                { _id: doc._id },
                {
                    $set: {
                        schema_version: 2,
                        numbering: {
                            invoice_prefix: doc.numbering?.invoice_prefix || "INV",
                            quotation_prefix: doc.numbering?.quotation_prefix || "QUO",
                            purchase_prefix: doc.numbering?.purchase_prefix || "PUR",
                            service_prefix: doc.numbering?.service_prefix || "SRV",
                        },
                        backup: doc.backup || {
                            auto_backup_enabled: false,
                            backup_frequency: "daily",
                            backup_time: "02:00",
                            retention_days: 30,
                            last_backup: null,
                            backup_location: null,
                        },
                        security: doc.security || {
                            session_timeout: 30,
                            max_login_attempts: 5,
                            lockout_duration: 15,
                        },
                        notifications: doc.notifications || {
                            low_stock_threshold: 10,
                            enable_stock_alerts: true,
                            stock_inactive_months: 3,
                            enable_invoice_reminders: true,
                            invoice_reminder_days: 7,
                            enable_service_reminders: true,
                            service_reminder_days: 3,
                        },
                        whatsapp: doc.whatsapp || {
                            enabled: false,
                            phoneNumberId: "",
                            pdfBaseUrl: "",
                            storedTokenReference: "",
                            verifyToken: "",
                        },
                        cloudinary: doc.cloudinary || {
                            cloudName: "",
                            apiKey: "",
                            apiSecretEncrypted: "",
                            configured: false,
                        },
                        defaults: {
                            invoice_terms: doc.defaults?.invoice_terms || "",
                            quotation_terms: doc.defaults?.quotation_terms || "",
                            payment_terms: doc.defaults?.payment_terms || "Net 30 days",
                            service_terms: doc.defaults?.service_terms || "",
                            notes: doc.defaults?.notes || "",
                        },
                        branding: doc.branding || {
                            logo_path: "",
                            primary_color: "#2563eb",
                            secondary_color: "#10b981",
                            theme: "light",
                        },
                        system: doc.system || {
                            app_version: "2.0.0",
                            last_updated: new Date(),
                            database_size: 0,
                        },
                    },
                    $unset: {
                        preferences: "",
                        tax: "",
                    }
                }
            );
            report.migrated++;
            logger.info("Migrated existing settings to version 2.");
        } catch (err: unknown) {
            report.failed++;
            const msg = err instanceof Error ? err.message : String(err);
            logger.error("Failed to migrate existing settings:", { error: msg });
        }
    } else {
        try {
            await SettingsModel.create({
                schema_version: 2,
                numbering: {
                    invoice_prefix: "INV",
                    quotation_prefix: "QUO",
                    purchase_prefix: "PUR",
                    service_prefix: "SRV",
                },
                backup: {
                    auto_backup_enabled: false,
                    backup_frequency: "daily",
                    backup_time: "02:00",
                    retention_days: 30,
                    last_backup: undefined,
                    backup_location: "",
                },
                security: {
                    session_timeout: 30,
                    max_login_attempts: 5,
                    lockout_duration: 15,
                },
                notifications: {
                    low_stock_threshold: 10,
                    enable_stock_alerts: true,
                    stock_inactive_months: 3,
                    enable_invoice_reminders: true,
                    invoice_reminder_days: 7,
                    enable_service_reminders: true,
                    service_reminder_days: 3,
                },
                whatsapp: {
                    enabled: false,
                    phoneNumberId: "",
                    pdfBaseUrl: "",
                    storedTokenReference: "",
                    verifyToken: "",
                },
                cloudinary: {
                    cloudName: "",
                    apiKey: "",
                    apiSecretEncrypted: "",
                    configured: false,
                },
                defaults: {
                    invoice_terms: "",
                    quotation_terms: "",
                    payment_terms: "Net 30 days",
                    service_terms: "",
                    notes: "",
                },
                branding: {
                    logo_path: "",
                    primary_color: "#2563eb",
                    secondary_color: "#10b981",
                    theme: "light",
                },
                system: {
                    app_version: "2.0.0",
                    last_updated: new Date(),
                    database_size: 0,
                },
            });
            report.migrated++;
            logger.info("Created default settings document.");
        } catch (err: unknown) {
            report.failed++;
            const msg = err instanceof Error ? err.message : String(err);
            logger.error("Failed to create default settings:", { error: msg });
        }
    }

    return report;
}
