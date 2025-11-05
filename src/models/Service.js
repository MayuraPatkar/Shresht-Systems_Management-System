const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    service_id: { type: String, required: true, unique: true, index: true },
    invoice_id: { type: String, required: true, index: true },
    fee_amount: { type: Number },
    service_date: { type: Date, default: Date.now },
    service_stage: { type: Number, default: 0 },
    
    // Service items
    items: [
        {
            description: { type: String },
            HSN_SAC: { type: String },
            quantity: { type: Number },
            unit_price: { type: Number },
            rate: { type: Number },
        },
    ],
    
    // Non-items (charges, installation, etc.)
    non_items: [
        {
            description: { type: String },
            price: { type: Number },
            rate: { type: Number },
        },
    ],
    
    // Totals
    total_tax: { type: Number, default: 0 },
    total_amount_no_tax: { type: Number, default: 0 },
    total_amount_with_tax: { type: Number, default: 0 },
    
    // Notes and remarks
    notes: { type: String },
    
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
serviceSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Index for faster queries
serviceSchema.index({ invoice_id: 1, service_stage: 1 });

module.exports = mongoose.model('service', serviceSchema);
