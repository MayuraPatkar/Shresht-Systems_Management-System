/**
 * Database initialization utility
 * Seeds the database with default admin users from json/info.json if they don't exist
 */

import { AdminModel } from "../models/Admin.model";
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

        // Check if admin users already exist
        const existingAdmins = await AdminModel.countDocuments();

        if (existingAdmins > 0) {
            return;
        }

        // Read the info.json file
        const infoPath = path.join(__dirname, "../../json/info.json");
        const data = fs.readFileSync(infoPath, "utf8");
        const defaultAdmins = JSON.parse(data);

        // Insert default admin users into database
        await AdminModel.insertMany(defaultAdmins);
        logger.info(`✓ Initialized database with ${defaultAdmins.length} default admin users`);
    } catch (error) {
        logger.error("Error initializing database:", error);
        throw error;
    }
}

export default initializeDatabase;

// CommonJS compatibility for .js consumers
module.exports = initializeDatabase;
module.exports.default = initializeDatabase;
