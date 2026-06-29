import mongoose, { Document, Schema, Model, Types } from "mongoose";

/**
 * CustomDocument interface
 */
export interface ICustomDocument extends Document {
    documentNumber: string;
    date: Date;
    title: string;
    recipientName?: string;
    recipientAddress?: string;
    recipientPhone?: string;
    body: string;
    is_deleted: boolean;
    is_archived: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * CustomDocument schema
 */
const customDocumentSchema = new Schema<ICustomDocument>(
    {
        documentNumber: {
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
        title: {
            type: String,
            required: true,
            trim: true
        },
        recipientName: {
            type: String,
            trim: true
        },
        recipientAddress: {
            type: String,
            trim: true
        },
        recipientPhone: {
            type: String,
            trim: true
        },
        body: {
            type: String,
            default: ""
        },
        is_deleted: {
            type: Boolean,
            default: false,
            index: true
        },
        is_archived: {
            type: Boolean,
            default: false,
            index: true
        }
    },
    {
        timestamps: true
    }
);

export const CustomDocumentModel: Model<ICustomDocument> =
    mongoose.models.CustomDocument || mongoose.model<ICustomDocument>("CustomDocument", customDocumentSchema);
