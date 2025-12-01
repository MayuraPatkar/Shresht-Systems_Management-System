const mongoose = require('mongoose');

/**
 * StockMovement Model
 * Tracks all stock in/out movements for reporting purposes
 */
const stockMovementSchema = new mongoose.Schema({
    item_name: { 
        type: String, 
        required: true, 
        trim: true, 
        index: true 
    },
    item_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Stock',
        index: true 
    },
    HSN_SAC: { 
        type: String, 
        trim: true 
    },
    quantity_change: { 
        type: Number, 
        required: true 
    }, // Positive for IN, negative for OUT
    movement_type: { 
        type: String, 
        required: true, 
        enum: ['in', 'out', 'adjustment'],
        index: true 
    },
    reference_type: { 
        type: String, 
        enum: ['invoice', 'purchase', 'manual', 'adjustment', 'initial'],
        default: 'manual' 
    },
    reference_id: { 
        type: String // Invoice ID, Purchase ID, etc.
    },
    reference_number: {
        type: String // Human-readable reference (e.g., "INV-001")
    },
    unit_price: { 
        type: Number 
    },
    total_value: { 
        type: Number 
    },
    notes: { 
        type: String 
    },
    created_by: { 
        type: String 
    },
    timestamp: { 
        type: Date, 
        default: Date.now, 
        index: true 
    }
});

// Compound indexes for efficient querying
stockMovementSchema.index({ item_name: 1, timestamp: -1 });
stockMovementSchema.index({ movement_type: 1, timestamp: -1 });
stockMovementSchema.index({ reference_type: 1, reference_id: 1 });

// Virtual for formatted date
stockMovementSchema.virtual('formattedDate').get(function() {
    return this.timestamp.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
});

module.exports = mongoose.model('StockMovement', stockMovementSchema);
