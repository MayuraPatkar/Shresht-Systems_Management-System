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
}

/**
 * Bank details sub-document interface
 */
export interface IBankDetails {
    account_name?: string;
    account_number?: string;
    ifsc?: string;
    bank_name?: string;
}

/**
 * Soft delete sub-document interface
 */
export interface ISoftDelete {
    is_deleted: boolean;
    deleted_at?: Date;
    deleted_by?: string;
}

/**
 * Supplier document interface
 */
export interface ISupplier extends Document {
    schema_version: number;

    // Supplier generated ID
    supplier_id: string;

    // Supplier info
    supplier_name: string;
    phone?: string;
    email?: string;

    gstin?: string;

    billing_address?: IAddress;
    shipping_address?: IAddress;

    bank_details?: IBankDetails;

    supplier_type: "Vendor" | "Manufacturer" | "Distributor" | "Service Provider";

    remarks?: string;

    is_active: boolean;

    deletion: ISoftDelete;

    createdAt: Date;
    updatedAt: Date;
}

/**
 * Address sub-schema
 */
const addressSchema = new Schema<IAddress>(
    {
        line1: { type: String, trim: true },
        line2: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true, default: "Karnataka" },
        pincode: { type: String, trim: true },
    },
    { _id: false }
);

/**
 * Bank details sub-schema
 */
const bankDetailsSchema = new Schema<IBankDetails>(
    {
        account_name: { type: String, trim: true },
        account_number: { type: String, trim: true },
        ifsc: { type: String, trim: true },
        bank_name: { type: String, trim: true },
    },
    { _id: false }
);

/**
 * Soft delete sub-schema
 */
const softDeleteSchema = new Schema<ISoftDelete>(
    {
        is_deleted: { type: Boolean, default: false },
        deleted_at: { type: Date },
        deleted_by: { type: String },
    },
    { _id: false }
);

/**
 * Supplier schema
 */
const supplierSchema = new Schema<ISupplier>(
    {
        schema_version: {
            type: Number,
            default: 1,
            index: true,
        },

        // Supplier generated ID
        supplier_id: {
            type: String,
            unique: true,
            index: true,
        },

        // Supplier info
        supplier_name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            index: true,
        },

        gstin: {
            type: String,
            trim: true,
            index: true,
        },

        billing_address: {
            type: addressSchema,
        },

        shipping_address: {
            type: addressSchema,
        },

        bank_details: {
            type: bankDetailsSchema,
        },

        supplier_type: {
            type: String,
            enum: ["Vendor", "Manufacturer", "Distributor", "Service Provider"],
            default: "Vendor",
            index: true,
        },

        // Audit
        remarks: {
            type: String,
            trim: true,
        },

        is_active: {
            type: Boolean,
            default: true,
            index: true,
        },

        deletion: {
            type: softDeleteSchema,
            default: () => ({ is_deleted: false }),
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

/**
 * Indexes
 */
supplierSchema.index({ "supplier_name": 1, "phone": 1 });
supplierSchema.index({ "phone": 1 });
supplierSchema.index({ "email": 1 });
supplierSchema.index({ "deletion.is_deleted": 1 });

/**
 * Model
 */
export const SupplierModel: Model<ISupplier> =
    mongoose.models.Supplier || mongoose.model<ISupplier>("Supplier", supplierSchema);

