import mongoose, { Document, Schema, Model, Types } from "mongoose";

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
 * Customer snapshot interface
 */
export interface ICustomerSnapshot {
    name?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    billing_address?: IAddress;
}

/**
 * Quotation item interface
 */
export interface IQuotationItem {
    item_id?: Types.ObjectId;
    description?: string;
    specification?: string;
    hsn_sac?: string;
    unit?: string;
    unit_price?: number;
    gst_rate?: number;
    quantity?: number;
    discount_percent?: number;
    taxable_value?: number;
    total?: number;
}

/**
 * Other charges interface
 */
export interface IOtherCharges {
    description?: string;
    specification?: string;
    price?: number;
    discount_percent?: number;
    total?: number;
}

/**
 * Totals interface
 */
export interface ITotals {
    taxable_value?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    total_tax?: number;
    round_off?: number;
    grand_total?: number;
}

/**
 * Content interface
 */
export interface IContent {
    subject?: string;
    headline?: string;
    letter_1?: string;
    letter_2?: string[];
    letter_3?: string;
    notes?: string[];
    terms_and_conditions?: string;
}

/**
 * Quotation document interface
 */
export interface IQuotation extends Document {
    schema_version: number;

    quotation_no: string;
    quotation_date: Date;
    valid_till?: Date;
    quotation_status: "Draft" | "Sent" | "Approved" | "Rejected" | "Converted" | "Expired";

    project_name: string;

    customer_id?: Types.ObjectId;
    customer_snapshot?: ICustomerSnapshot;

    items?: IQuotationItem[];
    other_charges?: IOtherCharges;

    discount: number;
    totals?: ITotals;

    content?: IContent;

    duplicated_from?: string;
    converted_invoice_id?: Types.ObjectId;

    remarks?: string;

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
        country: { type: String, trim: true },
    },
    { _id: false }
);

/**
 * Customer snapshot sub-schema
 */
const customerSnapshotSchema = new Schema<ICustomerSnapshot>(
    {
        name: { type: String, trim: true },
        phone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        gstin: { type: String, trim: true },
        billing_address: { type: addressSchema },
    },
    { _id: false }
);

/**
 * Quotation item sub-schema
 */
const quotationItemSchema = new Schema<IQuotationItem>(
    {
        item_id: { type: Schema.Types.ObjectId, ref: "Item" },
        description: { type: String, trim: true },
        specification: { type: String, trim: true },
        hsn_sac: { type: String, trim: true },
        unit: { type: String, trim: true },
        unit_price: { type: Number },
        gst_rate: { type: Number },
        quantity: { type: Number, min: 1 },
        discount_percent: { type: Number },
        taxable_value: { type: Number },
        total: { type: Number },
    },
    { _id: false }
);

/**
 * Other charges sub-schema
 */
const otherChargesSchema = new Schema<IOtherCharges>(
    {
        description: { type: String, trim: true },
        specification: { type: String, trim: true },
        price: { type: Number },
        discount_percent: { type: Number },
        total: { type: Number },
    },
    { _id: false }
);

/**
 * Totals sub-schema
 */
const totalsSchema = new Schema<ITotals>(
    {
        taxable_value: { type: Number },
        cgst: { type: Number },
        sgst: { type: Number },
        igst: { type: Number },
        total_tax: { type: Number },
        round_off: { type: Number },
        grand_total: { type: Number },
    },
    { _id: false }
);

/**
 * Content sub-schema
 */
const contentSchema = new Schema<IContent>(
    {
        subject: { type: String, trim: true },
        headline: { type: String, trim: true },
        letter_1: { type: String, trim: true },
        letter_2: [{ type: String, trim: true }],
        letter_3: { type: String, trim: true },
        notes: [{ type: String, trim: true }],
        terms_and_conditions: { type: String, trim: true },
    },
    { _id: false }
);

/**
 * Quotation schema
 */
const quotationSchema = new Schema<IQuotation>(
    {
        schema_version: {
            type: Number,
            default: 1,
            index: true,
        },

        quotation_no: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },

        quotation_date: {
            type: Date,
            default: Date.now,
            index: true,
        },

        valid_till: {
            type: Date,
        },

        quotation_status: {
            type: String,
            enum: ["Draft", "Sent", "Approved", "Rejected", "Converted", "Expired"],
            default: "Draft",
            index: true,
        },

        project_name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        customer_id: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            index: true,
        },

        customer_snapshot: {
            type: customerSnapshotSchema,
        },

        items: [quotationItemSchema],

        other_charges: {
            type: otherChargesSchema,
        },

        discount: {
            type: Number,
            default: 0,
        },

        totals: {
            type: totalsSchema,
        },

        content: {
            type: contentSchema,
        },

        duplicated_from: {
            type: String,
            default: null,
            index: true,
        },

        converted_invoice_id: {
            type: Schema.Types.ObjectId,
            ref: "Invoice",
            index: true,
        },

        // Audit
        remarks: {
            type: String,
            trim: true,
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
quotationSchema.index({ quotation_no: 1 });
quotationSchema.index({ project_name: 1, quotation_date: -1 });
quotationSchema.index({ customer_id: 1, quotation_date: -1 });
quotationSchema.index({ "deletion.is_deleted": 1 });

/**
 * Model
 */
export const QuotationModel: Model<IQuotation> =
    mongoose.models.Quotation || mongoose.model<IQuotation>("Quotation", quotationSchema);
