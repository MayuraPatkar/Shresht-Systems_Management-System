const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    role: { type: String },
    company: { type: String, required: true },
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    address: { type: String, required: true },
    state: { type: String, required: true },
    phone: {
        ph1: { type: String, required: true },
        ph2: { type: String },
    },
    email: { type: String, required: true, lowercase: true, trim: true },
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
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
// Use synchronous middleware (no next) to avoid runtime errors when Mongoose/karma middlewares call hooks differently
adminSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

module.exports = mongoose.model('Admin', adminSchema);
