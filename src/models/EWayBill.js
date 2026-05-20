const mongoose = require('mongoose');

const eWayBillSchema = new mongoose.Schema({
    ewaybill_no: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    }, // External E-Way Bill number from government portal
    ewaybill_status: {
        type: String,
        enum: ['Draft', 'Generated', 'Cancelled', 'Expired'],
        default: 'Draft'
    },
    ewaybill_generated_at: { type: Date },
    invoice_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'invoice',
        index: true
    },
    from_address: { type: String, trim: true },
    to_address: { type: String, trim: true },
    transport: {
        mode: { type: String, enum: ['Road', 'Rail', 'Air', 'Ship'] },
        vehicle_number: { type: String, uppercase: true },
        transporter_id: { type: String },
        transporter_name: { type: String },
        distance_km: { type: Number }
    },
    items: [{
        stock_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
        description: String,
        hsn_sac: String,
        quantity: Number,
        unit_price: Number,
        taxable_value: Number,
        gst_rate: Number
    }],
    total_taxable_value: { type: Number },
    cgst: { type: Number },
    sgst: { type: Number },
    total_invoice_value: { type: Number },
}, { timestamps: true });

// Index for faster queries

eWayBillSchema.index({ invoice_id: 1, createdAt: -1 });

module.exports = mongoose.model('ewaybills', eWayBillSchema);
