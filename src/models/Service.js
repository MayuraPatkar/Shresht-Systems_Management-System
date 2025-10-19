const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    service_id: { type: String, required: true, unique: true, index: true },
    invoice_id: { type: String, required: true, index: true },
    fee_amount: { type: Number },
    service_date: { type: Date, default: Date.now },
    service_stage: { type: Number, default: 0 },
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
