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
 * Consignee interface
 */
export interface IConsignee {
    name?: string;
    address?: IAddress;
}

/**
 * Delivery challan interface
 */
export interface IDeliveryChallan {
    number?: string;
    date?: Date;
}

/**
 * Invoice item interface
 */
export interface IInvoiceItem {
    item_id?: Types.ObjectId;
    description?: string;
    hsn_sac?: string;
    unit?: string;
    quantity?: number;
    unit_price?: number;
    taxable_value?: number;
    gst_rate?: number;
    discount_percent?: number;
    total?: number;
}

/**
 * Other charges interface
 */
export interface IOtherCharges {
    description?: string;
    price?: number;
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
    declaration?: string;
    terms_and_conditions?: string;
}

/**
 * Invoice document interface
 */
export interface IInvoice extends Document {
    schema_version: number;

    invoice_no: string;
    quotation_id?: Types.ObjectId;
    purchase_order_id?: Types.ObjectId;

    project_name: string;

    invoice_date: Date;
    due_date?: Date;

    invoice_status: "Draft" | "Issued" | "Cancelled" | "Expired";

    delivery_challan?: IDeliveryChallan;

    customer_id?: Types.ObjectId;
    customer_snapshot?: ICustomerSnapshot;

    consignee?: IConsignee;

    // Original and Duplicate items
    items_original?: IInvoiceItem[];
    items_duplicate?: IInvoiceItem[];

    other_charges?: IOtherCharges;

    discount: number;

    // Original and Duplicate totals
    totals_original?: ITotals;
    totals_duplicate?: ITotals;

    content?: IContent;

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
 * Consignee sub-schema
 */
const consigneeSchema = new Schema<IConsignee>(
    {
        name: { type: String, trim: true },
        address: { type: addressSchema },
    },
    { _id: false }
);

/**
 * Delivery challan sub-schema
 */
const deliveryChallanSchema = new Schema<IDeliveryChallan>(
    {
        number: { type: String, trim: true },
        date: { type: Date },
    },
    { _id: false }
);

/**
 * Invoice item sub-schema
 */
const invoiceItemSchema = new Schema<IInvoiceItem>(
    {
        item_id: { type: Schema.Types.ObjectId, ref: "Item" },
        description: { type: String, trim: true },
        hsn_sac: { type: String, trim: true },
        unit: { type: String, trim: true },
        quantity: { type: Number, min: 1 },
        unit_price: { type: Number },
        taxable_value: { type: Number },
        gst_rate: { type: Number },
        discount_percent: { type: Number },
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
        price: { type: Number },
        total: { type: Number },
    },
    { _id: false }
);

/**
 * Totals sub-schema (consistent across Quotation, Purchase, Invoice)
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
        declaration: { type: String, trim: true },
        terms_and_conditions: { type: String, trim: true },
    },
    { _id: false }
);

/**
 * Invoice schema
 */
const invoiceSchema = new Schema<IInvoice>(
    {
        schema_version: {
            type: Number,
            default: 1,
            index: true,
        },

        invoice_no: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },

        quotation_id: {
            type: Schema.Types.ObjectId,
            ref: "Quotation",
            index: true,
        },

        purchase_order_id: {
            type: Schema.Types.ObjectId,
            ref: "Purchase",
            index: true,
        },

        project_name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        invoice_date: {
            type: Date,
            default: Date.now,
            index: true,
        },

        due_date: {
            type: Date,
        },

        invoice_status: {
            type: String,
            enum: ["Draft", "Issued", "Cancelled", "Expired"],
            default: "Draft",
            index: true,
        },

        delivery_challan: {
            type: deliveryChallanSchema,
        },

        customer_id: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            index: true,
        },

        customer_snapshot: {
            type: customerSnapshotSchema,
        },

        consignee: {
            type: consigneeSchema,
        },

        // Original items (for original invoice)
        items_original: [invoiceItemSchema],

        // Duplicate items (for duplicate invoice)
        items_duplicate: [invoiceItemSchema],

        other_charges: {
            type: otherChargesSchema,
        },

        discount: {
            type: Number,
            default: 0,
        },

        // Original totals
        totals_original: {
            type: totalsSchema,
        },

        // Duplicate totals
        totals_duplicate: {
            type: totalsSchema,
        },

        content: {
            type: contentSchema,
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
invoiceSchema.index({ invoice_no: 1 });
invoiceSchema.index({ invoice_date: -1 });
invoiceSchema.index({ customer_id: 1, invoice_date: -1 });
invoiceSchema.index({ "deletion.is_deleted": 1 });

/**
 * Model
 */
export const InvoiceModel: Model<IInvoice> =
    mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", invoiceSchema);
