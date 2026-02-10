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
 * Transport sub-document interface
 */
export interface ITransport {
    mode?: "Road" | "Rail" | "Air" | "Ship";
    vehicle_number?: string;
    transporter_id?: string;
    transporter_name?: string;
    distance_km?: number;
}

/**
 * EWayBill item interface
 */
export interface IEWayBillItem {
    item_id?: Types.ObjectId;
    description?: string;
    hsn_sac?: string;
    unit?: string;
    quantity?: number;
    unit_price?: number;
    taxable_value?: number;
    gst_rate?: number;
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
 * EWayBill document interface
 */
export interface IEWayBill extends Document {
    schema_version: number;

    ewaybill_no?: string;
    ewaybill_status: "Draft" | "Generated" | "Cancelled" | "Expired";
    ewaybill_date?: Date;

    invoice_id: Types.ObjectId;

    from_address?: IAddress;
    to_address?: IAddress;

    transport?: ITransport;

    items?: IEWayBillItem[];

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
 * Transport sub-schema
 */
const transportSchema = new Schema<ITransport>(
    {
        mode: {
            type: String,
            enum: ["Road", "Rail", "Air", "Ship"],
        },
        vehicle_number: {
            type: String,
            uppercase: true,
            trim: true,
        },
        transporter_id: { type: String, trim: true },
        transporter_name: { type: String, trim: true },
        distance_km: { type: Number },
    },
    { _id: false }
);

/**
 * EWayBill item sub-schema
 */
const eWayBillItemSchema = new Schema<IEWayBillItem>(
    {
        item_id: { type: Schema.Types.ObjectId, ref: "Item" },
        description: { type: String, trim: true },
        hsn_sac: { type: String, trim: true },
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
 * EWayBill schema
 */
const eWayBillSchema = new Schema<IEWayBill>(
    {
        schema_version: {
            type: Number,
            default: 1,
            index: true,
        },

        ewaybill_no: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            index: true,
        },

        ewaybill_status: {
            type: String,
            enum: ["Draft", "Generated", "Cancelled", "Expired"],
            default: "Draft",
            index: true,
        },

        ewaybill_date: {
            type: Date,
        },

        invoice_id: {
            type: Schema.Types.ObjectId,
            ref: "Invoice",
            required: true,
            index: true,
        },

        from_address: {
            type: addressSchema,
        },

        to_address: {
            type: addressSchema,
        },

        transport: {
            type: transportSchema,
        },

        items: [eWayBillItemSchema],

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
eWayBillSchema.index({ invoice_id: 1, createdAt: -1 });
eWayBillSchema.index({ ewaybill_status: 1 });
eWayBillSchema.index({ "deletion.is_deleted": 1 });

/**
 * Model
 */
export const EWayBillModel: Model<IEWayBill> =
    mongoose.models.EWayBill || mongoose.model<IEWayBill>("EWayBill", eWayBillSchema);
