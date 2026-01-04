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
    declaration: { type: String },
    terms_and_conditions: { type: String },

    // Payment Tracking
    payments: [
        {
            payment_date: { type: Date },
            paid_amount: { type: Number },
            payment_mode: { type: String },
            extra_details: { type: String },
        }
    ],
    total_paid_amount: { type: Number, default: 0 },
    payment_status: { type: String, default: 'Unpaid', index: true },
    
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
serviceSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

// Helper method to update payment status
serviceSchema.methods.updatePaymentStatus = function() {
    const totalDue = this.total_amount_with_tax || 0;
    const totalPaid = this.total_paid_amount || 0;

    // Use a small epsilon for float comparison if needed, but simple comparison usually works for currency
    if (totalDue > 0 && totalPaid >= totalDue) {
        this.payment_status = 'Paid';
    } else if (totalPaid > 0) {
        this.payment_status = 'Partial';
    } else {
        this.payment_status = 'Unpaid';
    }
};

// Index for faster queries
serviceSchema.index({ invoice_id: 1, service_stage: 1 });

module.exports = mongoose.model('service', serviceSchema);
