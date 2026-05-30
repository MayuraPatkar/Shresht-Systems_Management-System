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
export interface IPaymentParty {
    type?: "Customer" | "Supplier";
    id?: string;
    ref?: Types.ObjectId;
}

export interface IPaymentReference {
    type?: "Invoice" | "Purchase" | "Service" | "Adjustment";
    id?: string;
    ref?: Types.ObjectId;
}

export interface IPayment extends Document {
    schema_version: number;

    payment_date: Date;

    amount: number;

    direction: "IN" | "OUT";

    party?: IPaymentParty;

    reference?: IPaymentReference;

    mode: "Cash" | "UPI" | "Bank Transfer" | "Cheque";

    transaction_details?: string;

    is_advance: boolean;
    is_refund: boolean;
    refunded_payment_ref?: Types.ObjectId;
    status?: "Completed" | "Pending" | "Refunded" | "Partially Refunded" | "Cancelled" | "Failed";

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

const paymentPartySchema = new Schema<IPaymentParty>(
    {
        type: {
            type: String,
            enum: ["Customer", "Supplier"],
            index: true,
        },
        id: {
            type: String,
            trim: true,
            index: true,
        },
        ref: {
            type: Schema.Types.ObjectId,
            index: true,
        },
    },
    { _id: false }
);

const paymentReferenceSchema = new Schema<IPaymentReference>(
    {
        type: {
            type: String,
            enum: ["Invoice", "Purchase", "Service", "Adjustment"],
            index: true,
        },
        id: {
            type: String,
            trim: true,
            index: true,
        },
        ref: {
            type: Schema.Types.ObjectId,
            index: true,
        },
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

        // Who is involved. Stores both business id and MongoDB reference.
        party: {
            type: paymentPartySchema,
            default: undefined,
        },

        // Why the payment happened. Stores both business id and MongoDB reference.
        reference: {
            type: paymentReferenceSchema,
            default: undefined,
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

        is_refund: {
            type: Boolean,
            default: false,
        },

        refunded_payment_ref: {
            type: Schema.Types.ObjectId,
            ref: "Payment",
            index: true,
        },

        status: {
            type: String,
            enum: ["Completed", "Pending", "Refunded", "Partially Refunded", "Cancelled", "Failed"],
            default: "Completed",
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
paymentSchema.index({ "party.type": 1, "party.ref": 1, payment_date: -1 });
paymentSchema.index({ "party.type": 1, "party.id": 1, payment_date: -1 });
paymentSchema.index({ "reference.type": 1, "reference.ref": 1 });
paymentSchema.index({ "reference.type": 1, "reference.id": 1 });
paymentSchema.index({ direction: 1, payment_date: -1 });
paymentSchema.index({ "deletion.is_deleted": 1 });

/**
 * Model
 */
export const PaymentModel: Model<IPayment> =
    mongoose.models.Payment || mongoose.model<IPayment>("Payment", paymentSchema);
