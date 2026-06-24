import mongoose, { Document, Schema, Model } from "mongoose";

/**
 * User document interface
 */
export interface IUser extends Document {
    schema_version: number;

    role?: string;
    username: string;
    password: string;

    // Security
    loginAttempts: number;
    lockUntil?: Date;
    lastLogin?: Date;

    createdAt: Date;
    updatedAt: Date;

    // Virtual
    isLocked: boolean;
}

/**
 * User schema
 */
const userSchema = new Schema<IUser>(
    {
        schema_version: {
            type: Number,
            default: 1,
            index: true,
        },

        role: {
            type: String,
        },

        username: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        password: {
            type: String,
            required: true,
        },

        // Security
        loginAttempts: {
            type: Number,
            default: 0,
        },

        lockUntil: {
            type: Date,
        },

        lastLogin: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

/**
 * Virtual: check if account is locked
 */
userSchema.virtual("isLocked").get(function (this: IUser) {
    return !!(this.lockUntil && this.lockUntil > new Date());
});

/**
 * Model
 */
export const UserModel: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>("User", userSchema);
