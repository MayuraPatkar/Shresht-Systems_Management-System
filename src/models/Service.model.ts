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
 * Service item interface
 */
export interface IServiceItem {
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
 * Payment record interface
 */
export interface IPaymentRecord {
    payment_date?: Date;
    payment_mode?: string;
    paid_amount?: number;
    extra_details?: string;
    payment_ref?: Types.ObjectId;
}

/**
 * Service document interface
 */
export interface IService extends Document {
    schema_version: number;

    service_no: string;
    invoice_id: Types.ObjectId;

    service_after_months?: number;
    service_date: Date;
    due_date?: Date;

    service_stage: number;
    service_status: "Open" | "Completed" | "Cancelled";

    items?: IServiceItem[];
    other_charges?: IOtherCharges;

    discount: number;
    totals?: ITotals;

    content?: IContent;

    remarks?: string;

    total_paid_amount: number;
    payment_status: string;
    payments: IPaymentRecord[];

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
 * Service item sub-schema
 */
const serviceItemSchema = new Schema<IServiceItem>(
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
        declaration: { type: String, trim: true },
        terms_and_conditions: { type: String, trim: true },
    },
    { _id: false }
);

/**
 * Service schema
 */
const serviceSchema = new Schema<IService>(
    {
        schema_version: {
            type: Number,
            default: 1,
            index: true,
        },

        service_no: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },

        invoice_id: {
            type: Schema.Types.ObjectId,
            ref: "Invoice",
            required: true,
            index: true,
        },

        service_after_months: {
            type: Number,
        },

        service_date: {
            type: Date,
            default: Date.now,
            index: true,
        },

        due_date: {
            type: Date,
        },

        service_stage: {
            type: Number,
            default: 0,
        },

        service_status: {
            type: String,
            enum: ["Open", "Completed", "Cancelled"],
            default: "Open",
            index: true,
        },

        items: [serviceItemSchema],

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

        // Audit
        remarks: {
            type: String,
            trim: true,
        },

        total_paid_amount: { type: Number, default: 0 },
        payment_status: { type: String, default: "Unpaid" },
        payments: {
            type: [
                {
                    payment_date: { type: Date },
                    paid_amount: { type: Number },
                    payment_mode: { type: String },
                    extra_details: { type: String },
                    payment_ref: { type: Schema.Types.ObjectId, ref: 'Payment' }
                }
            ],
            default: []
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
serviceSchema.index({ invoice_id: 1, service_date: -1 });
serviceSchema.index({ "deletion.is_deleted": 1 });

/**
 * Model
 */
export const ServiceModel: Model<IService> =
    mongoose.models.Service || mongoose.model<IService>("Service", serviceSchema);
