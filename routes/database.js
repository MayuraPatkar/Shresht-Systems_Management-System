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
        accountNo: { type: Number, required: true },
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
    service_stage: { type: Number, default: '0' },
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

module.exports = { Admin, Quotations, Purchases, wayBills, Invoices, service, Stock, Employee, AttendenceBook };
