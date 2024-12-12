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
        ph2: { type: String, required: false },
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

const customerSchema = new mongoose.Schema({
    c_id: { type: String, required: true },
    c_name: { type: String, required: true },
})

const customer = mongoose.model('customer', customerSchema);

const stockSchema = new mongoose.Schema({
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
})

const stock = mongoose.model('stock', stockSchema);


const employeeSchema = new mongoose.Schema({
    emp_id: { type: String, required: true },
    name: { type: String, required: true },
})

const employee = mongoose.model('employee', employeeSchema);


module.exports = { Admin, customer, stock, employee }