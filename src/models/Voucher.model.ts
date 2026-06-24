import mongoose, { Document, Schema, Model, Types } from "mongoose";

/**
 * Voucher document interface
 */
export interface IVoucher extends Document {
    voucherNumber: string;
    date: Date;
    partyName: string;
    partyType: "Customer" | "Supplier" | "Other";
    amount: number;
    amountInWords: string;
    paymentMethod: "Cash" | "UPI" | "Bank Transfer" | "Cheque";
    chequeNumber?: string;
    bankName?: string;
    chequeDate?: Date;
    referenceNumber?: string;
    paidTowards: string;
    createdBy?: string;
    transactionId?: Types.ObjectId;
    customer_id?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    is_deleted?: boolean;
}

/**
 * Voucher schema
 */
const voucherSchema = new Schema<IVoucher>(
    {
        voucherNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
            index: true
        },
        partyName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        partyType: {
            type: String,
            required: true,
            enum: ["Customer", "Supplier", "Other"],
            index: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        amountInWords: {
            type: String,
            required: true,
            trim: true
        },
        paymentMethod: {
            type: String,
            required: true,
            enum: ["Cash", "UPI", "Bank Transfer", "Cheque"],
            index: true
        },
        chequeNumber: {
            type: String,
            trim: true
        },
        bankName: {
            type: String,
            trim: true
        },
        chequeDate: {
            type: Date
        },
        referenceNumber: {
            type: String,
            trim: true
        },
        paidTowards: {
            type: String,
            required: true,
            trim: true
        },
        createdBy: {
            type: String,
            trim: true
        },
        transactionId: {
            type: Schema.Types.ObjectId,
            ref: "Payment",
            index: true
        },
        customer_id: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            index: true
        },
        is_deleted: {
            type: Boolean,
            default: false,
            index: true
        }
    },
    {
        timestamps: true
    }
);

export const VoucherModel: Model<IVoucher> =
    mongoose.models.Voucher || mongoose.model<IVoucher>("Voucher", voucherSchema);
