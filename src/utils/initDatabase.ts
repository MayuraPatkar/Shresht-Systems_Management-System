/**
 * Database initialization utility
 * Seeds the database with default admin users from json/info.json if they don't exist
 */

import { UserModel, SettingsModel } from "../models";
import { ReportModel } from "../models/Report.model";
import fs from "fs";
import path from "path";
import logger from "./logger";
import { migrateLegacyQuotations } from "./quotationMigration";

async function initializeDatabase(): Promise<void> {
    try {
        await migrateLegacyQuotations();

        // Drop reports collection if it exists to ensure it is not created
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;
        if (db) {
            const collections = await db.listCollections({ name: 'reports' }).toArray();
            if (collections.length > 0) {
                await db.dropCollection('reports');
                logger.info("✓ Dropped reports collection successfully");
            }
        }

        // Read the info.json file
        const infoPath = path.join(__dirname, "../../json/info.json");
        const data = fs.readFileSync(infoPath, "utf8");
        const defaultInfo = JSON.parse(data);

        // Ensure settings collection only has one document and it contains company details
        const allSettings = await SettingsModel.find();
        if (allSettings.length > 1) {
            const docWithCompany = allSettings.find(doc => doc.company_details && doc.company_details.company_name);
            if (docWithCompany) {
                await SettingsModel.deleteMany({ _id: { $ne: docWithCompany._id } });
                logger.info(`✓ Cleaned up ${allSettings.length - 1} duplicate settings documents, kept the one with company details`);
            } else {
                await SettingsModel.deleteMany({ _id: { $ne: allSettings[0]._id } });
                logger.info(`✓ Cleaned up ${allSettings.length - 1} duplicate settings documents, kept the first one`);
            }
        }

        // Check if settings has company details initialized
        let settings = await SettingsModel.findOne();
        if (!settings) {
            settings = new SettingsModel({});
        }
        if (!settings.company_details || !settings.company_details.company_name) {
            const firstInfo = defaultInfo[0];
            if (firstInfo) {
                settings.company_details = {
                    company_name: firstInfo.company_name,
                    address: firstInfo.address,
                    phone: firstInfo.phone,
                    email: firstInfo.email,
                    website: firstInfo.website,
                    gstin: firstInfo.gstin,
                    bank_details: firstInfo.bank_details
                };
                await settings.save();
                logger.info("✓ Initialized settings with company details");
            }
        }

        // Check if users already exist
        const existingUsers = await UserModel.countDocuments();

        if (existingUsers === 0) {
            // Strip company details from user records for the users collection
            const usersToInsert = defaultInfo.map((info: any) => {
                const {
                    company_name,
                    address,
                    phone,
                    email,
                    website,
                    gstin,
                    bank_details,
                    ...userFields
                } = info;
                return userFields;
            });

            await UserModel.insertMany(usersToInsert);
            logger.info(`✓ Initialized database with ${usersToInsert.length} default users`);
        }
    } catch (error) {
        logger.error("Error initializing database:", error);
        throw error;
    }
}

export default initializeDatabase;

// CommonJS compatibility for .js consumers
module.exports = initializeDatabase;
module.exports.default = initializeDatabase;
