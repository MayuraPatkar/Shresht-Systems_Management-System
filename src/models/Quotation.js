const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema({
    quotation_id: { type: String, required: true, unique: true, index: true },
    quotation_date: { type: Date, default: Date.now },
    project_name: { type: String, required: true, trim: true, index: true },
    customer_name: { type: String, trim: true },
    customer_address: { type: String, trim: true },
    customer_phone: { type: String, trim: true },
    customer_email: { type: String, lowercase: true, trim: true },

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

    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
quotationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Index for faster queries
quotationSchema.index({ quotation_id: 1, createdAt: -1 });
// Text index for search functionality
quotationSchema.index({ 
    quotation_id: 'text', 
    project_name: 'text', 
    customer_name: 'text', 
    customer_phone: 'text', 
    customer_email: 'text' 
});
// Additional indexes for common queries
quotationSchema.index({ customer_name: 1 });
quotationSchema.index({ customer_phone: 1 });

module.exports = mongoose.model('Quotations', quotationSchema);
