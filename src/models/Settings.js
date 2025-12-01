const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // General Preferences
    preferences: {
        currency: { type: String, default: '₹' },
        currency_position: { type: String, default: 'before' }, // before or after
        decimal_places: { type: Number, default: 2 },
        date_format: { type: String, default: 'DD/MM/YYYY' },
        time_format: { type: String, default: '12h' }, // 12h or 24h
        timezone: { type: String, default: 'Asia/Kolkata' },
        language: { type: String, default: 'en' },
    },

    // Tax Settings
    tax: {
        default_gst_rate: { type: Number, default: 18 },
        tax_included: { type: Boolean, default: false },
        enable_gst: { type: Boolean, default: true },
    },

    // Document Numbering
    numbering: {
        invoice_prefix: { type: String, default: 'INV', uppercase: true, minlength: 1, maxlength: 5 },
        quotation_prefix: { type: String, default: 'QUO', uppercase: true, minlength: 1, maxlength: 5 },
        purchase_prefix: { type: String, default: 'PO', uppercase: true, minlength: 1, maxlength: 5 },
        waybill_prefix: { type: String, default: 'WB', uppercase: true, minlength: 1, maxlength: 5 },
        service_prefix: { type: String, default: 'SRV', uppercase: true, minlength: 1, maxlength: 5 },
    },

    // Branding
    branding: {
        logo_path: { type: String, default: '' },
        primary_color: { type: String, default: '#2563eb' },
        secondary_color: { type: String, default: '#10b981' },
        theme: { type: String, default: 'light' }, // light or dark
    },

    // Backup Settings
    backup: {
        auto_backup_enabled: { type: Boolean, default: false },
        backup_frequency: { type: String, default: 'daily' }, // daily, weekly, monthly
        backup_time: { type: String, default: '02:00' }, // HH:mm format
        retention_days: { type: Number, default: 30 },
        last_backup: { type: Date, default: null },
        backup_location: { type: String, default: './backups' },
    },

    // Security Settings
    security: {
        session_timeout: { type: Number, default: 30 }, // minutes
        password_min_length: { type: Number, default: 8 },
        password_require_uppercase: { type: Boolean, default: true },
        password_require_number: { type: Boolean, default: true },
        password_require_special: { type: Boolean, default: false },
        max_login_attempts: { type: Number, default: 5 },
        lockout_duration: { type: Number, default: 15 }, // minutes
        enable_2fa: { type: Boolean, default: false },
    },

    // Notification Settings
    notifications: {
        low_stock_threshold: { type: Number, default: 10 },
        enable_stock_alerts: { type: Boolean, default: true },
        enable_invoice_reminders: { type: Boolean, default: true },
        invoice_reminder_days: { type: Number, default: 7 }, // days before due
        enable_service_reminders: { type: Boolean, default: true },
        service_reminder_days: { type: Number, default: 3 },
        enable_email_notifications: { type: Boolean, default: false },
    },

    // Email Configuration
    email: {
        smtp_host: { type: String, default: '' },
        smtp_port: { type: Number, default: 587 },
        smtp_user: { type: String, default: '' },
        smtp_password: { type: String, default: '' },
        smtp_secure: { type: Boolean, default: false },
        from_name: { type: String, default: 'Shresht Systems' },
        from_email: { type: String, default: '' },
    },

    // Default Terms & Conditions
    defaults: {
        invoice_terms: { type: String, default: '' },
        quotation_terms: { type: String, default: '' },
        payment_terms: { type: String, default: 'Net 30 days' },
        notes: { type: String, default: '' },
    },

    // System Info (read-only)
    system: {
        app_version: { type: String, default: '1.0.0' },
        last_updated: { type: Date, default: Date.now },
        database_size: { type: Number, default: 0 },
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
// Use a synchronous pre-save hook (no `next` callback) to avoid middleware signature issues
settingsSchema.pre('save', function () {
    this.updatedAt = Date.now();
    if (!this.system) this.system = {};
    this.system.last_updated = Date.now();
});

module.exports = mongoose.model('Settings', settingsSchema);
