import mongoose, { Document, Schema, Model } from "mongoose";

/**
 * Numbering sub-document interface
 */
export interface INumbering {
    invoice_prefix?: string;
    quotation_prefix?: string;
    purchase_prefix?: string;
    service_prefix?: string;
}

/**
 * Backup sub-document interface
 */
export interface IBackup {
    auto_backup_enabled?: boolean;
    backup_frequency?: string;
    backup_time?: string;
    retention_days?: number;
    last_backup?: Date;
    backup_location?: string;
}

/**
 * Security sub-document interface
 */
export interface ISecurity {
    session_timeout?: number;
    max_login_attempts?: number;
    lockout_duration?: number;
}

/**
 * Notifications sub-document interface
 */
export interface INotifications {
    low_stock_threshold?: number;
    enable_stock_alerts?: boolean;
    enable_invoice_reminders?: boolean;
    invoice_reminder_days?: number;
    enable_service_reminders?: boolean;
    service_reminder_days?: number;
}

/**
 * WhatsApp sub-document interface
 */
export interface IWhatsApp {
    enabled?: boolean;
    phone_number_id?: string;
    pdf_base_url?: string;
    stored_token_reference?: string;
}

/**
 * Cloudinary sub-document interface
 */
export interface ICloudinary {
    cloud_name?: string;
    api_key?: string;
    api_secret_encrypted?: string;
    configured?: boolean;
}

/**
 * Defaults sub-document interface
 */
export interface IDefaults {
    invoice_terms?: string;
    quotation_terms?: string;
    payment_terms?: string;
    service_terms?: string;
    notes?: string;
}

/**
 * System sub-document interface
 */
export interface ISystem {
    app_version?: string;
    last_updated?: Date;
    database_size?: number;
}

/**
 * Settings document interface
 */
export interface ISettings extends Document {
    schema_version: number;

    numbering?: INumbering;
    backup?: IBackup;
    security?: ISecurity;
    notifications?: INotifications;
    whatsapp?: IWhatsApp;
    cloudinary?: ICloudinary;
    defaults?: IDefaults;
    system?: ISystem;

    createdAt: Date;
    updatedAt: Date;
}

/**
 * Numbering sub-schema
 */
const numberingSchema = new Schema<INumbering>(
    {
        invoice_prefix: { type: String, default: "INV", uppercase: true, minlength: 1, maxlength: 5 },
        quotation_prefix: { type: String, default: "QUO", uppercase: true, minlength: 1, maxlength: 5 },
        purchase_prefix: { type: String, default: "PO", uppercase: true, minlength: 1, maxlength: 5 },
        service_prefix: { type: String, default: "SRV", uppercase: true, minlength: 1, maxlength: 5 },
    },
    { _id: false }
);

/**
 * Backup sub-schema
 */
const backupSchema = new Schema<IBackup>(
    {
        auto_backup_enabled: { type: Boolean, default: false },
        backup_frequency: { type: String, default: "daily" },
        backup_time: { type: String, default: "02:00" },
        retention_days: { type: Number, default: 30 },
        last_backup: { type: Date, default: null },
        backup_location: { type: String, default: null },
    },
    { _id: false }
);

/**
 * Security sub-schema
 */
const securitySchema = new Schema<ISecurity>(
    {
        session_timeout: { type: Number, default: 30 },
        max_login_attempts: { type: Number, default: 5 },
        lockout_duration: { type: Number, default: 15 },
    },
    { _id: false }
);

/**
 * Notifications sub-schema
 */
const notificationsSchema = new Schema<INotifications>(
    {
        low_stock_threshold: { type: Number, default: 10 },
        enable_stock_alerts: { type: Boolean, default: true },
        enable_invoice_reminders: { type: Boolean, default: true },
        invoice_reminder_days: { type: Number, default: 7 },
        enable_service_reminders: { type: Boolean, default: true },
        service_reminder_days: { type: Number, default: 3 },
    },
    { _id: false }
);

/**
 * WhatsApp sub-schema
 */
const whatsappSchema = new Schema<IWhatsApp>(
    {
        enabled: { type: Boolean, default: false },
        phone_number_id: { type: String, default: "" },
        pdf_base_url: { type: String, default: "" },
        stored_token_reference: { type: String, default: "" },
    },
    { _id: false }
);

/**
 * Cloudinary sub-schema
 */
const cloudinarySchema = new Schema<ICloudinary>(
    {
        cloud_name: { type: String, default: "" },
        api_key: { type: String, default: "" },
        api_secret_encrypted: { type: String, default: "" },
        configured: { type: Boolean, default: false },
    },
    { _id: false }
);

/**
 * Defaults sub-schema
 */
const defaultsSchema = new Schema<IDefaults>(
    {
        invoice_terms: { type: String, default: "" },
        quotation_terms: { type: String, default: "" },
        payment_terms: { type: String, default: "Net 30 days" },
        service_terms: { type: String, default: "" },
        notes: { type: String, default: "" },
    },
    { _id: false }
);

/**
 * System sub-schema
 */
const systemSchema = new Schema<ISystem>(
    {
        app_version: { type: String, default: "1.0.0" },
        last_updated: { type: Date, default: Date.now },
        database_size: { type: Number, default: 0 },
    },
    { _id: false }
);

/**
 * Settings schema
 */
const settingsSchema = new Schema<ISettings>(
    {
        schema_version: {
            type: Number,
            default: 1,
            index: true,
        },

        numbering: {
            type: numberingSchema,
            default: () => ({}),
        },

        backup: {
            type: backupSchema,
            default: () => ({}),
        },

        security: {
            type: securitySchema,
            default: () => ({}),
        },

        notifications: {
            type: notificationsSchema,
            default: () => ({}),
        },

        whatsapp: {
            type: whatsappSchema,
            default: () => ({}),
        },

        cloudinary: {
            type: cloudinarySchema,
            default: () => ({}),
        },

        defaults: {
            type: defaultsSchema,
            default: () => ({}),
        },

        system: {
            type: systemSchema,
            default: () => ({}),
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

/**
 * Pre-save hook: update system.last_updated
 */
settingsSchema.pre("save", function () {
    if (!this.system) this.system = {};
    this.system.last_updated = new Date();
});

/**
 * Model
 */
export const SettingsModel: Model<ISettings> =
    mongoose.models.Settings || mongoose.model<ISettings>("Settings", settingsSchema);
