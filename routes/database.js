const mongoose = require('mongoose');

// Define Admin Schema and Model
const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
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
    project_name: { type: String },
    buyer_name: { type: String },
    buyer_address: { type: String },
    buyer_phone: { type: String },
    buyer_email: { type: String },
    items: [
        {
            description: { type: String },
            HSN_SAC: { type: String },
            quantity: { type: Number },
            unitPrice: { type: String },
            rate: { type: Number },
        },
    ],
    createdAt: { type: Date, default: Date.now },
})

const Quotations = mongoose.model('Quotations', quotationSchema);

const purchaseSchema = new mongoose.Schema({
    purchase_order_id: { type: String },
    project_name: { type: String },
    handledBy: { type: String },
    supplier_name: { type: String },
    supplier_address: { type: String },
    supplier_phone: { type: String },
    supplier_email: { type: String },
    supplier_GSTIN: { type: String },
    items: [
        {
            description: { type: String },
            HSN_SAC: { type: String },
            quantity: { type: Number },
            unitPrice: { type: Number },
            rate: { type: Number },
        },
    ],
    createdAt: { type: Date, default: Date.now },
})

const Purchases = mongoose.model('Purchases', purchaseSchema);

const wayBillSchema = new mongoose.Schema({
    wayBill_id: { type: String },
    project_name: { type: String },
    buyer_name: { type: String },
    buyer_address: { type: String },
    buyer_phone: { type: String },
    transport_mode: { type: String },
    vehicle_number: { type: String },
    place_supply: { type: String },

    items: [
        {
            description: { type: String },
            HSN_SAC: { type: String },
            quantity: { type: Number },
            unitPrice: { type: Number },
            rate: { type: Number },
        },
    ],
    createdAt: { type: Date, default: Date.now },
})

const wayBills = mongoose.model('wayBills', wayBillSchema);

// Define Project Schema and Model
const invoiceSchema = new mongoose.Schema({
    quotation_id: { type: String },
    project_name: { type: String },
    invoice_id: { type: String },
    po_number: { type: String },
    po_date: { type: Date },
    dc_number: { type: String },
    dc_date: { type: Date },
    service_month: { type: Number, default: 0 },
    margin: { type: Number, default: 0 },
    Way_Bill_number: { type: String },
    buyer_name: { type: String },
    buyer_address: { type: String },
    buyer_phone: { type: String },
    buyer_email: { type: String },
    consignee_name: { type: String },
    consignee_address: { type: String },
    items: [
        {
            description: { type: String },
            HSN_SAC: { type: String },
            quantity: { type: Number },
            UnitPrice: { type: Number },
            rate: { type: Number },
        },
    ],
    totalAmount: { type: Number },
    paidAmount: [{ type: Number }],
    paymentMode: { type: String },
    paymentDate: { type: Date },
    paymentStatus: { type: String, default: 'Unpaid' },
    createdAt: { type: Date, default: Date.now },
});

const Invoices = mongoose.model('invoice', invoiceSchema);

// Define Stock Schema and Model
const stockSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    HSN_SAC: { type: String, required: false },
    unitPrice: { type: Number, required: true },
    GST: { type: Number, required: true },
    threshold: { type: Number, required: true },
    quantity: { type: Number, required: true },
    min_quantity: { type: Number, required: false },
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

// Define Employee Schema and Model
const attendencsBookSchema = new mongoose.Schema({
    date: { type: Date },
    emp_id: { type: String, required: true },
    present: { type: String },
    start_time: { type: Date },
    end_time: { type: Date },
});

const AttendenceBook = mongoose.model('AttendenceBook', attendencsBookSchema);

module.exports = { Admin, Quotations, Purchases, wayBills, Invoices, Stock, Employee, AttendenceBook };
