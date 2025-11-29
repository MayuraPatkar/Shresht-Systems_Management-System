const mongoose = require('mongoose');

const wayBillSchema = new mongoose.Schema({
    waybill_id: { type: String, required: true, unique: true, index: true },
    waybill_date: { type: Date, default: Date.now },
    project_name: { type: String, trim: true, index: true },
    customer_name: { type: String, trim: true },
    customer_address: { type: String, trim: true },
    customer_phone: { type: String, trim: true },
    customer_email: { type: String, lowercase: true, trim: true },
    transport_mode: { type: String, trim: true },
    vehicle_number: { type: String, trim: true },
    place_supply: { type: String, trim: true },
    items: [
        {
            description: { type: String },
            HSN_SAC: { type: String },
            quantity: { type: Number },
            unit_price: { type: Number },
            rate: { type: Number },
        },
    ],
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
wayBillSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

// Index for faster queries
wayBillSchema.index({ waybill_id: 1, createdAt: -1 });

module.exports = mongoose.model('wayBills', wayBillSchema);
