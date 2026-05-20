/**
 * Database initialization utility
 * Seeds the database with default admin users from json/info.json if they don't exist
 */

const { Admin } = require('../models');
const fs = require('fs');
const path = require('path');
const logger = require("./logger");

async function initializeDatabase() {
    try {
        // Check if admin users already exist
        const existingAdmins = await Admin.countDocuments();

        if (existingAdmins > 0) {
            return;
        }

        // Read the info.json file
        const infoPath = path.join(__dirname, '../../json/info.json');
        const data = fs.readFileSync(infoPath, 'utf8');
        const defaultAdmins = JSON.parse(data);

        // Insert default admin users into database
        await Admin.insertMany(defaultAdmins);
        logger.info(`✓ Initialized database with ${defaultAdmins.length} default admin users`);

    } catch (error) {
        logger.error('Error initializing database:', error);
        throw error;
    }
}

module.exports = initializeDatabase;
