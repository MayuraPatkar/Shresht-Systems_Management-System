/**
 * Database initialization utility
 * Seeds the database with default admin users from json/info.json if they don't exist
 */

const { Admin } = require('../routes/database');
const fs = require('fs');
const path = require('path');
const log = require("electron-log");

async function initializeDatabase() {
    try {
        // Check if admin users already exist
        const existingAdmins = await Admin.countDocuments();
        
        if (existingAdmins > 0) {
            log.info('Admin users already exist in database, skipping initialization');
            return;
        }

        // Read the info.json file
        const infoPath = path.join(__dirname, '../json/info.json');
        const data = fs.readFileSync(infoPath, 'utf8');
        const defaultAdmins = JSON.parse(data);

        // Insert default admin users into database
        await Admin.insertMany(defaultAdmins);
        log.info(`✓ Initialized database with ${defaultAdmins.length} default admin users`);
        
    } catch (error) {
        log.error('Error initializing database:', error);
        throw error;
    }
}

module.exports = initializeDatabase;