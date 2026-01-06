/**
 * Utility script to hash existing plain text passwords in json/info.json
 * Run this once after implementing bcrypt authentication
 */

const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

async function hashPasswordsInInfoJson() {
    const infoPath = path.join(__dirname, '../../json/info.json');

    try {
        // Read the current info.json
        const data = fs.readFileSync(infoPath, 'utf8');
        const users = JSON.parse(data);

        const saltRounds = 10;

        // Hash passwords for all users
        for (let user of users) {
            if (user.password && !user.password.startsWith('$2b$')) {
                user.password = await bcrypt.hash(user.password, saltRounds);

                // Also update accountNo to string if it's a number
                if (user.bank_details && typeof user.bank_details.accountNo === 'number') {
                    user.bank_details.accountNo = user.bank_details.accountNo.toString();
                }
            }
        }

        // Write the updated data back to info.json
        fs.writeFileSync(infoPath, JSON.stringify(users, null, 4));

    } catch (error) {
        logger.error('Error updating info.json:', error);
        process.exit(1);
    }
}

// Run the function if this script is executed directly
if (require.main === module) {
    hashPasswordsInInfoJson();
}

module.exports = hashPasswordsInInfoJson;