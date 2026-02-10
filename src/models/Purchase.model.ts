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
 * Supplier snapshot interface
 */
export interface ISupplierSnapshot {
    name?: string;
    gstin?: string;
    phone?: string;
    email?: string;
    address?: IAddress;
}

/**
 * Purchase item interface
 */
export interface IPurchaseItem {
    item_id?: Types.ObjectId;
    description?: string;
    specification?: string;
    hsn_sac?: string;
    brand?: string;
    category?: string;
    item_type?: "Material" | "Asset";
    unit?: string;
    quantity?: number;
    unit_price?: number;
    taxable_value?: number;
    gst_rate?: number;
    total?: number;
}

/**
 * Totals interface (consistent across Quotation, Purchase, Invoice)
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
 * Purchase document interface
 */
export interface IPurchase extends Document {
    schema_version: number;

    purchase_order_no?: string;
    purchase_invoice_no?: string;
    purchase_date: Date;
    due_date?: Date;

    purchase_status: "Draft" | "Ordered" | "Received" | "Cancelled" | "Expired";
    purchase_type?: "Local" | "Interstate" | "Import";

    supplier_id?: Types.ObjectId;
    supplier_snapshot?: ISupplierSnapshot;

    items?: IPurchaseItem[];

    totals?: ITotals;

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
 * Supplier snapshot sub-schema
 */
const supplierSnapshotSchema = new Schema<ISupplierSnapshot>(
    {
        name: { type: String, trim: true },
        gstin: { type: String, trim: true },
        phone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        address: { type: addressSchema },
    },
    { _id: false }
);

/**
 * Purchase item sub-schema
 */
const purchaseItemSchema = new Schema<IPurchaseItem>(
    {
        item_id: { type: Schema.Types.ObjectId, ref: "Item" },
        description: { type: String, trim: true },
        specification: { type: String, trim: true },
        hsn_sac: { type: String, trim: true },
        brand: { type: String, trim: true },
        category: { type: String, trim: true },
        item_type: {
            type: String,
            enum: ["Material", "Asset"],
            default: "Material",
        },
        unit: { type: String, trim: true },
        quantity: { type: Number, min: 1 },
        unit_price: { type: Number },
        taxable_value: { type: Number },
        gst_rate: { type: Number },
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
 * Purchase schema
 */
const purchaseSchema = new Schema<IPurchase>(
    {
        schema_version: {
            type: Number,
            default: 1,
            index: true,
        },

        purchase_order_no: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            index: true,
        },

        purchase_invoice_no: {
            type: String,
            trim: true,
            index: true,
        },

        purchase_date: {
            type: Date,
            default: Date.now,
            index: true,
        },

        due_date: {
            type: Date,
        },

        purchase_status: {
            type: String,
            enum: ["Draft", "Ordered", "Received", "Cancelled", "Expired"],
            default: "Draft",
            index: true,
        },

        purchase_type: {
            type: String,
            enum: ["Local", "Interstate", "Import"],
            index: true,
        },

        supplier_id: {
            type: Schema.Types.ObjectId,
            ref: "Supplier",
            index: true,
        },

        supplier_snapshot: {
            type: supplierSnapshotSchema,
        },

        items: [purchaseItemSchema],

        totals: {
            type: totalsSchema,
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
purchaseSchema.index({ purchase_order_no: 1 });
purchaseSchema.index({ purchase_invoice_no: 1, purchase_date: -1 });
purchaseSchema.index({ supplier_id: 1, purchase_date: -1 });
purchaseSchema.index({ "deletion.is_deleted": 1 });

/**
 * Model
 */
export const PurchaseModel: Model<IPurchase> =
    mongoose.models.Purchase || mongoose.model<IPurchase>("Purchase", purchaseSchema);
