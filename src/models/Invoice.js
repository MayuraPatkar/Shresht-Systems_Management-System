const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    // references
    quotation_id: { type: String, index: true },
    invoice_id: { type: String, required: true, unique: true, index: true },
    project_name: { type: String, required: true, trim: true, index: true },
    invoice_date: { type: Date, default: Date.now },
    po_number: { type: String },
    po_date: { type: Date },
    dc_number: { type: String },
    dc_date: { type: Date },

    // customer and consignee
    customer_name: { type: String, trim: true },
    customer_address: { type: String, trim: true },
    customer_phone: { type: String, trim: true },
    customer_email: { type: String, lowercase: true, trim: true },
    consignee_name: { type: String, trim: true },
    consignee_address: { type: String, trim: true },

    // service
    service_after_months: { type: Number, default: 0 },
    service_status: { 
        type: String, 
        enum: ['Active', 'Paused', 'Closed'], 
        default: 'Active' 
    },
    next_service_date: { type: Date },
    service_stage: { type: Number, default: 0 },
    margin: { type: Number, default: 0 },

    // items
    items_original: [
        {
            description: { type: String, trim: true },
            HSN_SAC: { type: String, trim: true },
            quantity: { type: Number },
            unit_price: { type: Number },
            rate: { type: Number },
        },
    ],
    items_duplicate: [
        {
            description: { type: String, trim: true },
            HSN_SAC: { type: String, trim: true },
            quantity: { type: Number },
            unit_price: { type: Number },
            rate: { type: Number },
        },
    ],
    non_items_original: [
        {
            description: { type: String },
            price: { type: Number },
            rate: { type: Number },
        },
    ],
    non_items_duplicate: [
        {
            description: { type: String },
            price: { type: Number },
            rate: { type: Number },
        },
    ],

    // totals
    total_amount_original: { type: Number },
    total_amount_duplicate: { type: Number },
    total_tax_original: { type: Number },
    total_tax_duplicate: { type: Number },
    total_paid_amount: { type: Number, default: 0 },

    // payment
    payments: [
        {
            payment_date: { type: Date },
            paid_amount: { type: Number },
            payment_mode: { type: String },
            extra_details: { type: String }, // For UPI, Bank Transfer, etc.
        }
    ],
    payment_status: { type: String, default: 'Unpaid', index: true },

    // content
    declaration: { type: String },
    termsAndConditions: { type: String },

    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
invoiceSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

// Update payment status based on paid amount
invoiceSchema.methods.updatePaymentStatus = function() {
    // Prefer duplicate total (customer-facing), fallback to original
    const totalDue = (typeof this.total_amount_duplicate !== 'undefined' && this.total_amount_duplicate !== null)
        ? this.total_amount_duplicate
        : (this.total_amount_original || 0);
    const totalPaid = this.total_paid_amount || 0;

    if (totalPaid === 0) {
        this.payment_status = 'Unpaid';
    } else if (totalPaid >= totalDue) {
        this.payment_status = 'Paid';
    } else {
        this.payment_status = 'Partial';
    }
};

// Index for faster queries
invoiceSchema.index({ invoice_id: 1, createdAt: -1 });
invoiceSchema.index({ payment_status: 1, createdAt: -1 });

module.exports = mongoose.model('invoice', invoiceSchema);
