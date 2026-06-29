import mongoose, { Document, Schema, Model } from "mongoose";

/**
 * Communication document interface
 */
export interface ICommunication extends Document {
    recipient: string; // Phone number or email
    type: "WhatsApp" | "Email" | "SMS";
    messageType: "Invoice" | "Quotation" | "Manual Reminder" | "Automated Reminder" | "Document" | "Custom Message" | "Festival Greeting" | "Offer";
    referenceId?: string; // Invoice ID, Quotation ID, etc.
    content?: string; // Message content or parameters
    documentUrl?: string; // Attachment/PDF URL
    status: "Success" | "Failed" | "Pending" | "Sent" | "Delivered" | "Read";
    errorMessage?: string; // Error detail if failed
    messageId?: string; // WhatsApp API message ID if available
    sentAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Communication schema
 */
const communicationSchema = new Schema<ICommunication>(
    {
        recipient: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        type: {
            type: String,
            required: true,
            enum: ["WhatsApp", "Email", "SMS"],
            default: "WhatsApp",
            index: true
        },
        messageType: {
            type: String,
            required: true,
            enum: ["Invoice", "Quotation", "Manual Reminder", "Automated Reminder", "Document", "Custom Message", "Festival Greeting", "Offer"],
            index: true
        },
        referenceId: {
            type: String,
            trim: true,
            index: true
        },
        content: {
            type: String,
            trim: true
        },
        documentUrl: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            required: true,
            enum: ["Success", "Failed", "Pending", "Sent", "Delivered", "Read"],
            default: "Pending",
            index: true
        },
        errorMessage: {
            type: String,
            trim: true
        },
        messageId: {
            type: String,
            trim: true,
            index: true
        },
        sentAt: {
            type: Date,
            required: true,
            default: Date.now,
            index: true
        }
    },
    {
        timestamps: true
    }
);

export const CommunicationModel: Model<ICommunication> =
    mongoose.models.Communication || mongoose.model<ICommunication>("Communication", communicationSchema);
