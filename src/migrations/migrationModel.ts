import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Migration State interface
 */
export interface IMigrationState extends Document {
    current_version: number;
    last_migration_at: Date;
    migration_status: "pending" | "running" | "completed" | "failed";
    error_details?: string;
    backup_marker?: string;
}

/**
 * Migration State schema
 */
const migrationStateSchema = new Schema<IMigrationState>(
    {
        current_version: { type: Number, required: true, default: 1 },
        last_migration_at: { type: Date, default: Date.now },
        migration_status: { type: String, required: true, default: "pending" },
        error_details: { type: String },
        backup_marker: { type: String },
    },
    {
        timestamps: true,
        collection: "migration_state",
    }
);

/**
 * Migration State Model
 */
export const MigrationStateModel: Model<IMigrationState> =
    mongoose.models.MigrationState ||
    mongoose.model<IMigrationState>("MigrationState", migrationStateSchema);
