const mongoose = require('mongoose');

// Define Admin Schema and Model
const adminSchema = new mongoose.Schema({
    role: { type: String },
    company: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    address: { type: String, required: true },
    state: { type: String, required: true },
    phone: {
        ph1: { type: String, required: true },
        ph2: { type: String },
    },
    email: { type: String, required: true },
    website: { type: String, required: true },
    GSTIN: { type: String, required: true },
    bank_details: {
        bank_name: { type: String, required: true },
        name: { type: String, required: true },
        accountNo: { type: String, required: true },
        type: { type: String, required: true },
        IFSC_code: { type: String, required: true },
        branch: { type: String, required: true },
    },
});

const Admin = mongoose.model('Admin', adminSchema);

const quotationSchema = new mongoose.Schema({
    quotation_id: { type: String },
    quotation_date: { type: Date, default: Date.now },
    project_name: { type: String },
    customer_name: { type: String },
    customer_address: { type: String },
    customer_phone: { type: String },
    customer_email: { type: String },

    // items details
    items: [
        {
            description: { type: String },
            specification: { type: String },
            HSN_SAC: { type: String },
            quantity: { type: Number },
            unit_price: { type: Number },
            rate: { type: Number },
        },
    ],
    non_items: [
        {
            description: { type: String },
            specification: { type: String },
            price: { type: Number },
            rate: { type: Number },
        },
    ],

    // totals
    total_tax: { type: Number },
    total_amount_no_tax: { type: Number },
    total_amount_tax: { type: Number },

    // contents
    subject: { type: String },
    letter_1: { type: String },
    letter_2: [{ type: String }],
    letter_3: { type: String },
    headline: { type: String },
    notes: [{ type: String }],
    termsAndConditions: { type: String },


    createdAt: { type: Date, default: Date.now },
})

const Quotations = mongoose.model('Quotations', quotationSchema);

const purchaseSchema = new mongoose.Schema({
    purchase_order_id: { type: String },
    purchase_invoice_id: { type: String },
    supplier_name: { type: String },
    supplier_address: { type: String },
    supplier_phone: { type: String },
    supplier_email: { type: String },
    supplier_GSTIN: { type: String },
    purchase_date: { type: Date, default: Date.now },
    items: [
        {
            description: { type: String },
            HSN_SAC: { type: String },
            company: { type: String },
            type: { type: String },
            category: { type: String },
            quantity: { type: Number },
            unit_price: { type: Number },
            rate: { type: Number },
        },
    ],
    total_amount: { type: Number },
    createdAt: { type: Date, default: Date.now },
})

const Purchases = mongoose.model('Purchases', purchaseSchema);

const wayBillSchema = new mongoose.Schema({
    waybill_id: { type: String },
    waybill_date: { type: Date, default: Date.now },
    project_name: { type: String },
    customer_name: { type: String },
    customer_address: { type: String },
    customer_phone: { type: String },
    customer_email: { type: String },
    transport_mode: { type: String },
    vehicle_number: { type: String },
    place_supply: { type: String },
    items: [
        {
            description: { type: String },
            HSN_SAC: { type: String },
            quantity: { type: Number },
            unit_price: { type: Number },
            rate: { type: Number },
        },
    ],
    createdAt: { type: Date, default: Date.now },
})

const wayBills = mongoose.model('wayBills', wayBillSchema);

// Define Project Schema and Model
const invoiceSchema = new mongoose.Schema({
    // 
    quotation_id: { type: String },
    invoice_id: { type: String },
    project_name: { type: String },
    invoice_date: { type: Date, default: Date.now },
    po_number: { type: String },
    po_date: { type: Date },
    dc_number: { type: String },
    dc_date: { type: Date },
    Waybill_id: { type: String },

    // customer and consignee
    customer_name: { type: String },
    customer_address: { type: String },
    customer_phone: { type: String },
    customer_email: { type: String },
    consignee_name: { type: String },
    consignee_address: { type: String },

    // service
    service_month: { type: Number, default: 0 },
    service_stage: { type: Number, default: 0 },
    margin: { type: Number, default: 0 },

    // items
    items_original: [
        {
            description: { type: String },
            HSN_SAC: { type: String },
            quantity: { type: Number },
            unit_price: { type: Number },
            rate: { type: Number },
        },
    ],
    items_duplicate: [
        {
            description: { type: String },
            quantity: { type: Number },
            unit_price: { type: Number },
            rate: { type: Number },
        },
    ],
    non_items_original: [
        {
            description: { type: String },
            price: { type: Number },
            rate: { type: Number },
        },
    ],
    non_items_duplicate: [
        {
            description: { type: String },
            price: { type: Number },
            rate: { type: Number },
        },
    ],

    // totals
    total_amount_original: { type: Number },
    total_amount_duplicate: { type: Number },
    total_tax_original: { type: Number },
    total_tax_duplicate: { type: Number },
    total_paid_amount: { type: Number, default: 0 },

    // payment
    payments: [
        {
            payment_date: { type: Date },
            paid_amount: { type: Number },
            payment_mode: { type: String },
            extra_details: { type: String }, // For UPI, Bank Transfer, etc.
        }
    ],
    payment_status: { type: String, default: 'Unpaid' },

    createdAt: { type: Date, default: Date.now },
});

const Invoices = mongoose.model('invoice', invoiceSchema);

// Define Stock Schema and Model
const stockSchema = new mongoose.Schema({
    item_name: { type: String, required: true },
    HSN_SAC: { type: String, required: false },
    specifications: { type: String, required: false },
    company: { type: String, required: false },
    unit_price: { type: Number, required: true },
    GST: { type: Number, required: true },
    margin: { type: Number, default: 0 },
    quantity: { type: Number, required: true },
    min_quantity: { type: Number, required: false, default: 5 },
    type: { type: String, required: true},
    category: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const Stock = mongoose.model('Stock', stockSchema);

// Define Employee Schema and Model
const employeeSchema = new mongoose.Schema({
    emp_id: { type: String, required: true },
    name: { type: String, required: true },
    address: { type: String },
    phone: { type: String },
    email: { type: String },
    salary: { type: Number },
    join_date: { type: Date },
    left_date: { type: Date },
    salary_status: { type: String },
});

const Employee = mongoose.model('Employee', employeeSchema);

// Define Employserviceee Schema and Model
const serviceSchema = new mongoose.Schema({
    service_id: { type: String, required: true },
    invoice_id: { type: String, required: true },
    fee_amount: { type: Number },
    service_date: { type: Date, default: Date.now },
    service_stage: { type: Number, default: 0 }, // Fixed: Number default instead of string
});

const service = mongoose.model('service', serviceSchema);

// Define Employee Schema and Model
const attendencsBookSchema = new mongoose.Schema({
    date: { type: Date },
    emp_id: { type: String, required: true },
    present: { type: String },
    start_time: { type: Date },
    end_time: { type: Date },
});

const AttendenceBook = mongoose.model('AttendenceBook', attendencsBookSchema);

// Define System Settings Schema
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
        invoice_prefix: { type: String, default: 'INV' },
        invoice_start: { type: Number, default: 1 },
        quotation_prefix: { type: String, default: 'QUO' },
        quotation_start: { type: Number, default: 1 },
        purchase_prefix: { type: String, default: 'PO' },
        purchase_start: { type: Number, default: 1 },
        waybill_prefix: { type: String, default: 'WB' },
        waybill_start: { type: Number, default: 1 },
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

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = { Admin, Quotations, Purchases, wayBills, Invoices, service, Stock, Employee, AttendenceBook, Settings };
