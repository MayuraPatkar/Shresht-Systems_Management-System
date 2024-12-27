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
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    quotation_id: { type: String },
    project_name: { type: String },
    buyer_name: { type: String },
    buyer_address: { type: String },
    buyer_phone: { type: String },
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
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
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
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
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
const projectSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    quotation_id: { type: String },
    project_name: { type: String },
    invoice_number: { type: String },
    po_number: { type: String },
    po_date: { type: Date },
    dc_number: { type: String },
    dc_date: { type: Date },
    E_Way_Bill_number: { type: String },
    buyer_name: { type: String },
    buyer_address: { type: String },
    buyer_phone: { type: String },
    consignee_name: { type: String },
    consignee_address: { type: String },
    items: [
        {
            description: { type: String },
            HSN_SAC: { type: String },
            quantity: { type: Number },
            UoM: { type: String },
            rate: { type: Number },
            taxable_value: { type: Number },
            CGST: {
                percentage: { type: Number },
                value: { type: Number },
            },
            SGST: {
                percentage: { type: Number },
                value: { type: Number },
            },
            total_price: { type: Number },
        },
    ],
    total: { type: Number },
    CGST_total: { type: Number },
    SGST_total: { type: Number },
    round_Off: { type: Number },
    invoice_total: { type: Number },
    createdAt: { type: Date, default: Date.now },
    due_amount: { type: Number },
    status: { type: String, default: 'Unpaid' },
});

const Projects = mongoose.model('Project', projectSchema);

// Define Stock Schema and Model
const stockSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    itemName: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    GST: { type: Number, required: true },
    margin_value: { type: Number, required: true },
    quantity: { type: Number, required: true },
});

const Stock = mongoose.model('Stock', stockSchema);

// Define Employee Schema and Model
const employeeSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    emp_id: { type: String, required: true },
    name: { type: String, required: true },
    salary_status: { type: String, required: true },
});

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = { Admin, Quotations, Purchases, wayBills, Projects, Stock, Employee };
