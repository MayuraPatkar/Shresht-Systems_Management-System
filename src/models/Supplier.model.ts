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
 * Contact info sub-document interface
 */
export interface IContactInfo {
    first_name?: string;
    last_name?: string;
    name?: string; // Kept for virtual/legacy
    phone?: string;
    alternate_phone?: string;
    email?: string;
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
    supplier: IContactInfo;

    // Contact person info
    contact_person: IContactInfo;

    gstin?: string;

    billing_address?: IAddress;
    shipping_address?: IAddress;

    supplier_type: "Individual" | "Company" | "Government" | "Residential" | "Commercial" | "Industrial";

    credit_score: number;

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
        country: { type: String, trim: true, default: "India" },
    },
    { _id: false }
);

/**
 * Contact info sub-schema
 */
const contactInfoSchema = new Schema<IContactInfo>(
    {
        first_name: { type: String, trim: true },
        last_name: { type: String, trim: true },
        name: { type: String, trim: true }, // Can store full name here as well for easier search
        phone: { type: String, trim: true },
        alternate_phone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
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

        billing_address: {
            type: addressSchema,
        },

        shipping_address: {
            type: addressSchema,
        },

        supplier_type: {
            type: String,
            enum: ["Individual", "Company", "Government", "Residential", "Commercial", "Industrial"],
            default: "Individual",
            index: true,
        },

        credit_score: {
            type: Number,
            default: 0,
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
 * Virtuals
 */
supplierSchema.virtual('supplier.full_name').get(function() {
    if (this.supplier.first_name || this.supplier.last_name) {
        return `${this.supplier.first_name || ''} ${this.supplier.last_name || ''}`.trim();
    }
    return this.supplier.name;
});

/**
 * Indexes
 */
supplierSchema.index({ "supplier.first_name": 1, "supplier.last_name": 1, "supplier.phone": 1 });
supplierSchema.index({ "supplier.name": 1, "supplier.phone": 1 });
supplierSchema.index({ "supplier.phone": 1 });
supplierSchema.index({ "supplier.email": 1 });
supplierSchema.index({ "deletion.is_deleted": 1 });

/**
 * Model
 */
export const SupplierModel: Model<ISupplier> =
    mongoose.models.Supplier || mongoose.model<ISupplier>("Supplier", supplierSchema);

