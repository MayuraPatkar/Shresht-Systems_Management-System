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
    name?: string;
    phone?: string;
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
 * Customer document interface
 */
export interface ICustomer extends Document {
    schema_version: number;

    // Customer info
    customer: IContactInfo;

    // Contact person info
    contact_person: IContactInfo;

    gstin?: string;

    billing_address?: IAddress;
    shipping_address?: IAddress;

    customer_type: "Individual" | "Company" | "Government";

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
        name: { type: String, trim: true },
        phone: { type: String, trim: true },
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
 * Customer schema
 */
const customerSchema = new Schema<ICustomer>(
    {
        schema_version: {
            type: Number,
            default: 1,
            index: true,
        },

        // Customer info
        customer: {
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

        customer_type: {
            type: String,
            enum: ["Individual", "Company", "Government"],
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
 * Indexes
 */
customerSchema.index({ "customer.name": 1, "customer.phone": 1 });
customerSchema.index({ gstin: 1 });
customerSchema.index({ "customer.phone": 1 });
customerSchema.index({ "customer.email": 1 });
customerSchema.index({ "deletion.is_deleted": 1 });

/**
 * Model
 */
export const CustomerModel: Model<ICustomer> =
    mongoose.models.Customer || mongoose.model<ICustomer>("Customer", customerSchema);
