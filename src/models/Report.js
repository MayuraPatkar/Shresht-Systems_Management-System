const mongoose = require('mongoose');

/**
 * Report Model
 * Stores generated/cached reports for quick access
 */
const reportSchema = new mongoose.Schema({
    report_type: {
        type: String,
        required: true,
        enum: ['stock', 'gst', 'data_worksheet', 'sales', 'purchase', 'custom'],
        index: true
    },
    report_name: {
        type: String,
        required: true
    },
    parameters: {
        // Flexible parameters based on report type
        start_date: Date,
        end_date: Date,
        month: Number,
        year: Number,
        filters: mongoose.Schema.Types.Mixed
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }, // Stores the actual report data
    summary: {
        // Quick summary stats
        total_records: Number,
        total_value: Number,
        custom: mongoose.Schema.Types.Mixed
    },
    status: {
        type: String,
        enum: ['pending', 'generated', 'failed', 'expired'],
        default: 'generated'
    },
    generated_at: {
        type: Date,
        default: Date.now,
        index: true
    },
    expires_at: {
        type: Date
    },
    generated_by: {
        type: String
    },
    last_accessed: {
        type: Date
    },
    access_count: {
        type: Number,
        default: 0
    }
});

// Compound indexes
reportSchema.index({ report_type: 1, generated_at: -1 });
reportSchema.index({ report_type: 1, 'parameters.month': 1, 'parameters.year': 1 });

// TTL index for auto-expiry (optional - reports expire after 7 days)
reportSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Pre-save hook to set expiry
reportSchema.pre('save', function () {
    if (!this.expires_at) {
        // Default expiry: 7 days from generation
        this.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
});

// Method to update access stats
reportSchema.methods.recordAccess = function () {
    this.last_accessed = new Date();
    this.access_count += 1;
    return this.save();
};

// Static method to find or generate report
reportSchema.statics.findOrGenerate = async function (type, params, generatorFn) {
    // Try to find existing unexpired report with same parameters
    const existing = await this.findOne({
        report_type: type,
        'parameters.month': params.month,
        'parameters.year': params.year,
        status: 'generated',
        expires_at: { $gt: new Date() }
    });

    if (existing) {
        await existing.recordAccess();
        return existing;
    }

    // Generate new report
    const data = await generatorFn(params);
    const report = new this({
        report_type: type,
        report_name: `${type}_${params.month || ''}_${params.year || new Date().getFullYear()}`,
        parameters: params,
        data: data.records || data,
        summary: data.summary || { total_records: (data.records || data).length }
    });

    return report.save();
};

module.exports = mongoose.model('Report', reportSchema);
