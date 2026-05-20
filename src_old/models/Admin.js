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
        bank_name: { type: String },
        name: { type: String },
        accountNo: { type: String },
        type: { type: String },
        IFSC_code: { type: String },
        branch: { type: String },
    },
    // Security fields
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLogin: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Virtual for checking if account is locked
adminSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Update timestamp on save
// Use synchronous middleware (no next) to avoid runtime errors when Mongoose/karma middlewares call hooks differently
adminSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

module.exports = mongoose.model('Admin', adminSchema);
