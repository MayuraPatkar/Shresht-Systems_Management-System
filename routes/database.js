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

// Define Project Schema and Model
const projectSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    name: { type: String },
    address: { type: String },
    phone: { type: String },
    email: { type: String },
    invoice_number: { type: String },
    E_Way_Bill_number: { type: String },
    date: { type: Date },
    place_to_supply: { type: String },
    transportation_mode: { type: String },
    vehicle_no: { type: String },
    items: [
        {
            description: { type: String },
            HSN_SAC: { type: Number },
            quantity: { type: Number },
            UoM: { type: String },
            rate: { type: Number },
            taxable_value: {
                value: { type: Number },
                percentage: { type: Number },
            },
            CGST: {
                value: { type: Number },
                percentage: { type: Number },
            },
            SGST: {
                value: { type: Number },
                percentage: { type: Number },
            },
        },
    ],
    total: { type: Number },
    CGST_total: { type: Number },
    SGST_total: { type: Number },
    round_Off: { type: Number },
    invoice_total: { type: Number },
});

const Projects = mongoose.model('Project', projectSchema);

// Define Stock Schema and Model
const stockSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
});

const Stock = mongoose.model('Stock', stockSchema);

// Define Employee Schema and Model
const employeeSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    emp_id: { type: String, required: true },
    name: { type: String, required: true },
});

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = { Admin, Projects, Stock, Employee };
