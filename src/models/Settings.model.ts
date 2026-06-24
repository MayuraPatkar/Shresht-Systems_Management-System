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
    stock_inactive_months?: number;
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
    phoneNumberId?: string;
    pdfBaseUrl?: string;
    storedTokenReference?: string;
    verifyToken?: string;
}

/**
 * Email (SMTP) sub-document interface
 */
export interface IEmail {
    enabled?: boolean;
    host?: string;          // e.g. smtp.gmail.com
    port?: number;          // 587 (TLS) or 465 (SSL)
    secure?: boolean;       // true for port 465 (SSL)
    user?: string;          // sender email / SMTP username
    passwordEncrypted?: string; // encrypted SMTP password
    fromName?: string;      // display name for sent emails
}

/**
 * Cloudinary sub-document interface
 */
export interface ICloudinary {
    cloudName?: string;
    apiKey?: string;
    apiSecretEncrypted?: string;
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
 * Branding sub-document interface
 */
export interface IBranding {
    logo_path?: string;
    primary_color?: string;
    secondary_color?: string;
    theme?: string;
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
 * Phone sub-document interface
 */
export interface IPhone {
    ph1: string;
    ph2?: string;
}

/**
 * Bank details sub-document interface
 */
export interface IBankDetails {
    bank_name?: string;
    account_holder_name?: string;
    account_number?: string;
    type?: string;
    ifsc_code?: string;
    branch?: string;
}

/**
 * Company details sub-document interface
 */
export interface ICompanyDetails {
    company_name?: string;
    address?: IAddress;
    phone?: IPhone;
    email?: string;
    website?: string;
    gstin?: string;
    bank_details?: IBankDetails;
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
    email?: IEmail;
    cloudinary?: ICloudinary;
    defaults?: IDefaults;
    system?: ISystem;
    branding?: IBranding;
    company_details?: ICompanyDetails;

    createdAt: Date;
    updatedAt: Date;
}

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
        country: { type: String, trim: true, default: "India" },
    },
    { _id: false }
);

/**
 * Phone sub-schema
 */
const phoneSchema = new Schema<IPhone>(
    {
        ph1: { type: String, required: true, trim: true },
        ph2: { type: String, trim: true },
    },
    { _id: false }
);

/**
 * Bank details sub-schema
 */
const bankDetailsSchema = new Schema<IBankDetails>(
    {
        bank_name: { type: String, trim: true },
        account_holder_name: { type: String, trim: true },
        account_number: { type: String, trim: true },
        type: { type: String, trim: true },
        ifsc_code: { type: String, trim: true },
        branch: { type: String, trim: true },
    },
    { _id: false }
);

/**
 * Company details sub-schema
 */
const companyDetailsSchema = new Schema<ICompanyDetails>(
    {
        company_name: { type: String, trim: true },
        address: { type: addressSchema },
        phone: { type: phoneSchema },
        email: { type: String, lowercase: true, trim: true },
        website: { type: String, trim: true },
        gstin: { type: String, trim: true },
        bank_details: { type: bankDetailsSchema },
    },
    { _id: false }
);


/**
 * Numbering sub-schema
 */
const numberingSchema = new Schema<INumbering>(
    {
        invoice_prefix: { type: String, default: "INV", uppercase: true, minlength: 1, maxlength: 5 },
        quotation_prefix: { type: String, default: "QUO", uppercase: true, minlength: 1, maxlength: 5 },
        purchase_prefix: { type: String, default: "PUR", uppercase: true, minlength: 1, maxlength: 5 },
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
        session_timeout: { type: Number, default: 30, min: 5, max: 1440 },
        max_login_attempts: { type: Number, default: 5, min: 1, max: 10 },
        lockout_duration: { type: Number, default: 15, min: 1, max: 60 },
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
        stock_inactive_months: { type: Number, default: 3, min: 1, max: 24 },
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
        phoneNumberId: { type: String, default: "" },
        pdfBaseUrl: { type: String, default: "" },
        storedTokenReference: { type: String, default: "" },
        verifyToken: { type: String, default: "" },
    },
    { _id: false }
);

/**
 * Email (SMTP) sub-schema
 */
const emailSchema = new Schema<IEmail>(
    {
        enabled: { type: Boolean, default: false },
        host: { type: String, default: "" },
        port: { type: Number, default: 587 },
        secure: { type: Boolean, default: false },
        user: { type: String, default: "" },
        passwordEncrypted: { type: String, default: "" },
        fromName: { type: String, default: "" },
    },
    { _id: false }
);

/**
 * Cloudinary sub-schema
 */
const cloudinarySchema = new Schema<ICloudinary>(
    {
        cloudName: { type: String, default: "" },
        apiKey: { type: String, default: "" },
        apiSecretEncrypted: { type: String, default: "" },
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
 * Branding sub-schema
 */
const brandingSchema = new Schema<IBranding>(
    {
        logo_path: { type: String, default: "" },
        primary_color: { type: String, default: "#2563eb" },
        secondary_color: { type: String, default: "#10b981" },
        theme: { type: String, default: "light" },
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

        branding: {
            type: brandingSchema,
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

        email: {
            type: emailSchema,
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

        company_details: {
            type: companyDetailsSchema,
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
