const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    emp_id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    salary: { type: Number },
    join_date: { type: Date },
    left_date: { type: Date },
    salary_status: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
employeeSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for active employee check
employeeSchema.virtual('isActive').get(function() {
    return !this.left_date || this.left_date > new Date();
});

module.exports = mongoose.model('Employee', employeeSchema);
