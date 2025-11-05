const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    item_name: { type: String, required: true, trim: true, index: true },
    HSN_SAC: { type: String, trim: true },
    specifications: { type: String },
    company: { type: String, trim: true },
    unit_price: { type: Number, required: true },
    GST: { type: Number, required: true },
    margin: { type: Number, default: 0 },
    quantity: { type: Number, required: true },
    min_quantity: { type: Number, default: 5 },
    type: { type: String, required: true, index: true },
    category: { type: String, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
stockSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for low stock check
stockSchema.virtual('isLowStock').get(function() {
    return this.quantity <= this.min_quantity;
});

// Index for faster queries
stockSchema.index({ item_name: 1, type: 1, category: 1 });

module.exports = mongoose.model('Stock', stockSchema);
