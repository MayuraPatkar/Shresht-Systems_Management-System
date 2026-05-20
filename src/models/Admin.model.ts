import mongoose, { Document, Schema, Model } from "mongoose";

/**
 * Address sub-document interface
 */
export interface IAddress {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
}

/**
 * Phone sub-document interface
 */
export interface IPhone {
    ph1: string;
    ph2?: string;
}

/**
 * Bank details sub-document interface
 */
export interface IBankDetails {
    bank_name?: string;
    account_holder_name?: string;
    account_number?: string;
    type?: string;
    ifsc_code?: string;
    branch?: string;
}

/**
 * Admin document interface
 */
export interface IAdmin extends Document {
    schema_version: number;

    role?: string;
    company_name: string;
    username: string;
    password: string;

    address: IAddress;
    phone: IPhone;
    email: string;
    website: string;
    gstin: string;

    bank_details?: IBankDetails;

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
 * Address sub-schema
 */
const addressSchema = new Schema<IAddress>(
    {
        line1: { type: String, trim: true },
        line2: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        pincode: { type: String, trim: true },
        country: { type: String, trim: true, default: "India" },
    },
    { _id: false }
);

/**
 * Phone sub-schema
 */
const phoneSchema = new Schema<IPhone>(
    {
        ph1: { type: String, required: true, trim: true },
        ph2: { type: String, trim: true },
    },
    { _id: false }
);

/**
 * Bank details sub-schema
 */
const bankDetailsSchema = new Schema<IBankDetails>(
    {
        bank_name: { type: String, trim: true },
        account_holder_name: { type: String, trim: true },
        account_number: { type: String, trim: true },
        type: { type: String, trim: true },
        ifsc_code: { type: String, trim: true },
        branch: { type: String, trim: true },
    },
    { _id: false }
);

/**
 * Admin schema
 */
const adminSchema = new Schema<IAdmin>(
    {
        schema_version: {
            type: Number,
            default: 1,
            index: true,
        },

        role: {
            type: String,
        },

        company_name: {
            type: String,
            required: true,
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

        address: {
            type: addressSchema,
            required: true,
        },

        phone: {
            type: phoneSchema,
            required: true,
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        website: {
            type: String,
            required: true,
            trim: true,
        },

        gstin: {
            type: String,
            required: true,
            trim: true,
        },

        bank_details: {
            type: bankDetailsSchema,
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
adminSchema.virtual("isLocked").get(function (this: IAdmin) {
    return !!(this.lockUntil && this.lockUntil > new Date());
});

/**
 * Model
 */
export const AdminModel: Model<IAdmin> =
    mongoose.models.Admin || mongoose.model<IAdmin>("Admin", adminSchema);
