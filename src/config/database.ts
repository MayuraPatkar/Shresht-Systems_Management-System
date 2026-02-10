import mongoose, { ConnectOptions } from "mongoose";
import config from "./config";
import logger from "../utils/logger";

const connectDB = async (): Promise<void> => {
    try {
        // Note: useNewUrlParser and useUnifiedTopology are deprecated and no longer needed
        // in Mongoose 6.0+. They are now the default behavior.
        const options: ConnectOptions = {
            // Add any custom options here if needed
        };

        await mongoose.connect(config.mongoURI, options);

        // Log successful connection
        logger.info("Database connected", {
            service: "database",
            host: mongoose.connection.host,
            database: mongoose.connection.name,
        });

        // Handle connection events
        mongoose.connection.on("error", (err: Error) => {
            logger.error("Database connection error", { service: "database", error: err.message });
        });

        mongoose.connection.on("disconnected", () => {
            logger.warn("Database disconnected", { service: "database" });
        });

        mongoose.connection.on("reconnected", () => {
            logger.info("Database reconnected", { service: "database" });
        });

        process.on("SIGINT", async () => {
            await mongoose.connection.close();
            logger.info("Database connection closed", { service: "database", reason: "app_termination" });
            process.exit(0);
        });
    } catch (error) {
        logger.error("MongoDB connection failed:", error);
        process.exit(1);
    }
};

export default connectDB;
