import "./envLoader"; // must be imported at the very top to load env vars
import connectDB from "../config/database";
import { CustomerModel } from "../models/Customer.model";

async function runMigration() {
    try {
        console.log("Connecting to database...");
        await connectDB();
        console.log("Database connected successfully.");

        // Count current states
        const total = await CustomerModel.countDocuments();
        console.log(`Total customers in database: ${total}`);

        // Update Company and Industrial -> Commercial
        const resCommercial = await CustomerModel.updateMany(
            { customer_type: { $in: ["Company", "Industrial"] } },
            { $set: { customer_type: "Commercial" } }
        );
        console.log(`Merged ${resCommercial.modifiedCount} 'Company'/'Industrial' tags to 'Commercial'.`);

        // Update Residential -> Individual
        const resIndividual = await CustomerModel.updateMany(
            { customer_type: "Residential" },
            { $set: { customer_type: "Individual" } }
        );
        console.log(`Merged ${resIndividual.modifiedCount} 'Residential' tags to 'Individual'.`);

        // Default any invalid or blank types to Individual
        const resOther = await CustomerModel.updateMany(
            { customer_type: { $nin: ["Commercial", "Individual", "Government"] } },
            { $set: { customer_type: "Individual" } }
        );
        if (resOther.modifiedCount > 0) {
            console.log(`Defaulted ${resOther.modifiedCount} invalid customer type tags to 'Individual'.`);
        }

        console.log("Migration finished successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

runMigration();
