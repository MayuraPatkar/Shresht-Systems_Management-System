/**
 * Database initialization utility
 * Seeds the database with default admin users from json/info.json if they don't exist
 */

import { AdminModel } from "../models/Admin.model";
import fs from "fs";
import path from "path";
import logger from "./logger";

async function initializeDatabase(): Promise<void> {
    try {
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
