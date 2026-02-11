/**
 * Utility script to hash existing plain text passwords in json/info.json
 * Run this once after implementing bcrypt authentication
 */

import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import logger from "./logger";

interface InfoUser {
    password?: string;
    bank_details?: {
        accountNo?: number | string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

async function hashPasswordsInInfoJson(): Promise<void> {
    const infoPath = path.join(__dirname, "../../json/info.json");

    try {
        // Read the current info.json
        const data = fs.readFileSync(infoPath, "utf8");
        const users: InfoUser[] = JSON.parse(data);

        const saltRounds = 10;

        // Hash passwords for all users
        for (const user of users) {
            if (user.password && !user.password.startsWith("$2b$")) {
                user.password = await bcrypt.hash(user.password, saltRounds);

                // Also update accountNo to string if it's a number
                if (user.bank_details && typeof user.bank_details.accountNo === "number") {
                    user.bank_details.accountNo = user.bank_details.accountNo.toString();
                }
            }
        }

        // Write the updated data back to info.json
        fs.writeFileSync(infoPath, JSON.stringify(users, null, 4));
    } catch (error) {
        logger.error("Error updating info.json:", error);
        process.exit(1);
    }
}

// Run the function if this script is executed directly
if (require.main === module) {
    hashPasswordsInInfoJson();
}

export default hashPasswordsInInfoJson;
