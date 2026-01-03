const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
    purchase_order_id: { type: String, unique: true, index: true },
    purchase_invoice_id: { type: String },
    supplier_name: { type: String, trim: true },
    supplier_address: { type: String, trim: true },
    supplier_phone: { type: String, trim: true },
    supplier_email: { type: String, lowercase: true, trim: true },
    supplier_GSTIN: { type: String, trim: true },
    purchase_date: { type: Date, default: Date.now },
    items: [
        {
            description: { type: String },
            specification: { type: String },
            HSN_SAC: { type: String },
            company: { type: String },
            type: { type: String, enum: ['Material', 'Asset'], default: 'Material' },
            category: { type: String },
            quantity: { type: Number },
            unit_price: { type: Number },
            rate: { type: Number },
        },
    ],
    total_amount: { type: Number },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
purchaseSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

// Index for faster queries
purchaseSchema.index({ purchase_order_id: 1, createdAt: -1 });

module.exports = mongoose.model('Purchases', purchaseSchema);
