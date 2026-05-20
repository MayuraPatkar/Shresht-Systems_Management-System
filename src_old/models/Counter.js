const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // name e.g., 'invoice'
    seq: { type: Number, default: 0 }
});

// No need to set an explicit index on `_id`. MongoDB maintains a unique index on `_id` by default.
// Trying to add a custom index on `_id` causes: "Cannot specify a custom index on `_id`" warning.
// If a separate unique field is required, add a different property with an index instead.

module.exports = mongoose.model('Counters', counterSchema);
