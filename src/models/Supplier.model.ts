import mongoose, { Document, Schema, Model } from "mongoose";

/**
 * Soft delete sub-document interface
 */
export interface ISoftDelete {
    is_deleted: boolean;
    deleted_at?: Date;
    deleted_by?: string;
}

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
 * Contact info sub-document interface
 */
export interface IContactInfo {
    name?: string;
    phone?: string;
    email?: string;
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
 * Supplier document interface
 */
export interface ISupplier extends Document {
    schema_version: number;

    // Supplier info
    supplier: IContactInfo;

    // Contact person info
    contact_person: IContactInfo;

    gstin?: string;

    address?: IAddress;

    supplier_type: "Vendor" | "Manufacturer" | "Distributor" | "Service Provider";

    bank_details?: IBankDetails;

    remarks?: string[];

    is_active: boolean;

    deletion: ISoftDelete;

    createdAt: Date;
    updatedAt: Date;
}

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
 * Contact info sub-schema
 */
const contactInfoSchema = new Schema<IContactInfo>(
    {
        name: { type: String, trim: true },
        phone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
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
 * Supplier schema
 */
const supplierSchema = new Schema<ISupplier>(
    {
        schema_version: {
            type: Number,
            default: 1,
            index: true,
        },

        // Supplier info
        supplier: {
            type: contactInfoSchema,
            required: true,
        },

        // Contact person info
        contact_person: {
            type: contactInfoSchema,
        },

        gstin: {
            type: String,
            trim: true,
            index: true,
        },

        address: {
            type: addressSchema,
        },

        supplier_type: {
            type: String,
            enum: ["Vendor", "Manufacturer", "Distributor", "Service Provider"],
            default: "Vendor",
            index: true,
        },

        bank_details: {
            type: bankDetailsSchema,
        },

        // Audit
        remarks: [{ type: String, trim: true }],

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
supplierSchema.index({ "supplier.name": 1, "supplier.phone": 1 });
supplierSchema.index({ gstin: 1 });
supplierSchema.index({ "supplier.phone": 1 });
supplierSchema.index({ "supplier.email": 1 });
supplierSchema.index({ "deletion.is_deleted": 1 });

/**
 * Model
 */
export const SupplierModel: Model<ISupplier> =
    mongoose.models.Supplier || mongoose.model<ISupplier>("Supplier", supplierSchema);
