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
 * Payment document interface
 */
export interface IPayment extends Document {
    schema_version: number;

    payment_date: Date;

    amount: number;

    direction: "IN" | "OUT";

    party_type?: "Customer" | "Supplier";
    party_id?: Types.ObjectId;

    reference_type?: "Invoice" | "Purchase" | "Service" | "Adjustment";
    reference_id?: Types.ObjectId;

    mode: "Cash" | "UPI" | "Bank Transfer" | "Cheque";

    transaction_details?: string;

    is_advance: boolean;

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
 * Payment schema
 */
const paymentSchema = new Schema<IPayment>(
    {
        schema_version: {
            type: Number,
            default: 1,
            index: true,
        },

        payment_date: {
            type: Date,
            default: Date.now,
            index: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        direction: {
            type: String,
            enum: ["IN", "OUT"],
            required: true,
            index: true,
        },

        // Who is involved (null for Adjustment)
        party_type: {
            type: String,
            enum: ["Customer", "Supplier"],
            index: true,
        },

        party_id: {
            type: Schema.Types.ObjectId,
            index: true,
        },

        // Why the payment happened
        reference_type: {
            type: String,
            enum: ["Invoice", "Purchase", "Service", "Adjustment"],
            index: true,
        },

        // Links to Invoice/Purchase/Service doc, or Item for Adjustment
        reference_id: {
            type: Schema.Types.ObjectId,
            index: true,
        },

        mode: {
            type: String,
            enum: ["Cash", "UPI", "Bank Transfer", "Cheque"],
            required: true,
        },

        // UTR / Cheque number / Bank ref
        transaction_details: {
            type: String,
            trim: true,
        },

        is_advance: {
            type: Boolean,
            default: false,
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
paymentSchema.index({ party_type: 1, party_id: 1, payment_date: -1 });
paymentSchema.index({ reference_type: 1, reference_id: 1 });
paymentSchema.index({ direction: 1, payment_date: -1 });
paymentSchema.index({ "deletion.is_deleted": 1 });

/**
 * Model
 */
export const PaymentModel: Model<IPayment> =
    mongoose.models.Payment || mongoose.model<IPayment>("Payment", paymentSchema);
