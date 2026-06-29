import { Types } from "mongoose";
import { UserModel } from "../../../models/User.model";
import { SettingsModel } from "../../../models/Settings.model";
import logger from "../../../utils/logger";

/**
 * Migrates legacy Admins into Users and copies company information into Settings.
 */
export async function migrateAdmins(db: any): Promise<{
    migrated: number;
    skipped: number;
    failed: number;
}> {
    logger.info("Starting admin migration...");
    const report = { migrated: 0, skipped: 0, failed: 0 };

    const rawAdminsCollection = db.collection("admins");
    const admins = await rawAdminsCollection.find({}).toArray();

    logger.info(`Found ${admins.length} legacy admins.`);

    let companyDetailsSaved = false;

    for (const admin of admins) {
        try {
            // Check if user already exists
            const existingUser = await UserModel.findOne({ username: admin.username });
            if (existingUser) {
                logger.info(`User ${admin.username} already exists, skipping user creation.`);
                report.skipped++;
            } else {
                // Create user document
                await UserModel.create({
                    _id: admin._id,
                    schema_version: 2,
                    username: admin.username,
                    password: admin.password,
                    role: admin.role || "admin",
                    loginAttempts: admin.loginAttempts || 0,
                    lockUntil: admin.lockUntil,
                    lastLogin: admin.lastLogin,
                    createdAt: admin.createdAt || new Date(),
                    updatedAt: admin.updatedAt || new Date()
                });
                report.migrated++;
            }

            // Save company details to settings if not saved yet
            if (!companyDetailsSaved && admin.company) {
                const settingsDoc = await SettingsModel.findOne({});
                if (settingsDoc) {
                    await SettingsModel.updateOne(
                        { _id: settingsDoc._id },
                        {
                            $set: {
                                company_details: {
                                    company_name: admin.company,
                                    address: {
                                        line1: admin.address || "",
                                        line2: "",
                                        city: "",
                                        state: admin.state || "Karnataka",
                                        pincode: "",
                                        country: "India"
                                    },
                                    phone: {
                                        ph1: admin.phone?.ph1 || "",
                                        ph2: admin.phone?.ph2 || ""
                                    },
                                    email: admin.email || "",
                                    website: admin.website || "",
                                    gstin: admin.GSTIN || "",
                                    bank_details: admin.bank_details ? {
                                        bank_name: admin.bank_details.bank_name || "",
                                        account_holder_name: admin.bank_details.name || "",
                                        account_number: admin.bank_details.accountNo || "",
                                        type: admin.bank_details.type || "",
                                        ifsc_code: admin.bank_details.IFSC_code || "",
                                        branch: admin.bank_details.branch || ""
                                    } : undefined
                                }
                            }
                        }
                    );
                    companyDetailsSaved = true;
                    logger.info(`Saved company details to settings from admin: ${admin.username}`);
                }
            }
        } catch (err: unknown) {
            report.failed++;
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to migrate admin ${admin.username || admin._id}:`, { error: msg });
        }
    }

    return report;
}
