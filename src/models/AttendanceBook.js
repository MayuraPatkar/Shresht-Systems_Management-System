const mongoose = require('mongoose');

const attendanceBookSchema = new mongoose.Schema({
    date: { type: Date, required: true, index: true },
    emp_id: { type: String, required: true, index: true },
    present: { type: String },
    start_time: { type: Date },
    end_time: { type: Date },
    createdAt: { type: Date, default: Date.now },
});

// Compound index for efficient queries
attendanceBookSchema.index({ emp_id: 1, date: -1 });

// Virtual for hours worked
attendanceBookSchema.virtual('hoursWorked').get(function() {
    if (this.start_time && this.end_time) {
        const diff = this.end_time - this.start_time;
        return Math.round(diff / (1000 * 60 * 60) * 100) / 100; // hours
    }
    return 0;
});

module.exports = mongoose.model('AttendenceBook', attendanceBookSchema);
