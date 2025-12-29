const express = require('express');
const router = express.Router();
const { Invoices, Stock, StockMovement, Report } = require('../models');
const logger = require('../utils/logger');

/**
 * Reports API Routes
 * Provides endpoints for generating and retrieving various reports
 */

// ============================================================================
// STOCK REPORT ENDPOINTS
// ============================================================================

/**
 * GET /reports/stock
 * Get stock movement report with optional date filters
 */
router.get('/stock', async (req, res) => {
    try {
        const { start_date, end_date, item_name, movement_type } = req.query;

        // Build query
        const query = {};

        if (start_date || end_date) {
            query.timestamp = {};
            if (start_date) query.timestamp.$gte = new Date(start_date);
            if (end_date) {
                const endDate = new Date(end_date);
                endDate.setHours(23, 59, 59, 999);
                query.timestamp.$lte = endDate;
            }
        }

        if (item_name) {
            query.item_name = { $regex: item_name, $options: 'i' };
        }

        if (movement_type && movement_type !== 'all') {
            query.movement_type = movement_type;
        }

        // Get movements
        const movements = await StockMovement.find(query)
            .sort({ timestamp: -1 })
            .limit(1000);

        // Calculate summary
        const summary = await StockMovement.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$movement_type',
                    total_quantity: { $sum: '$quantity_change' },
                    total_value: { $sum: '$total_value' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get current stock levels for comparison
        const currentStock = await Stock.find({})
            .select('item_name quantity unit_price HSN_SAC')
            .sort({ item_name: 1 });

        // Save report to history
        if (movements.length > 0) {
            try {
                const reportName = `Stock Report - ${new Date().toLocaleDateString('en-IN')}`;
                const report = new Report({
                    report_type: 'stock',
                    report_name: reportName,
                    parameters: {
                        start_date,
                        end_date,
                        item_name,
                        movement_type
                    },
                    data: {
                        movements,
                        summary: {
                            in: summary.find(s => s._id === 'in') || { total_quantity: 0, total_value: 0, count: 0 },
                            out: summary.find(s => s._id === 'out') || { total_quantity: 0, total_value: 0, count: 0 },
                            adjustment: summary.find(s => s._id === 'adjustment') || { total_quantity: 0, total_value: 0, count: 0 }
                        },
                        currentStock
                    },
                    summary: {
                        total_records: movements.length,
                        total_value: summary.reduce((acc, curr) => acc + (curr.total_value || 0), 0)
                    }
                });
                await report.save();
            } catch (saveError) {
                logger.error('Failed to save stock report to history:', saveError);
                // continue even if saving fails, as the report data was generated successfully
            }
        }

        res.json({
            success: true,
            movements,
            summary: {
                in: summary.find(s => s._id === 'in') || { total_quantity: 0, total_value: 0, count: 0 },
                out: summary.find(s => s._id === 'out') || { total_quantity: 0, total_value: 0, count: 0 },
                adjustment: summary.find(s => s._id === 'adjustment') || { total_quantity: 0, total_value: 0, count: 0 }
            },
            currentStock,
            generated_at: new Date()
        });
    } catch (error) {
        logger.error('Error fetching stock report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate stock report' });
    }
});

/**
 * GET /reports/stock/summary
 * Get stock summary by item
 */
router.get('/stock/summary', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        const matchStage = {};
        if (start_date || end_date) {
            matchStage.timestamp = {};
            if (start_date) matchStage.timestamp.$gte = new Date(start_date);
            if (end_date) {
                const endDate = new Date(end_date);
                endDate.setHours(23, 59, 59, 999);
                matchStage.timestamp.$lte = endDate;
            }
        }

        const summary = await StockMovement.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$item_name',
                    total_in: {
                        $sum: {
                            $cond: [{ $eq: ['$movement_type', 'in'] }, '$quantity_change', 0]
                        }
                    },
                    total_out: {
                        $sum: {
                            $cond: [{ $eq: ['$movement_type', 'out'] }, { $abs: '$quantity_change' }, 0]
                        }
                    },
                    total_value_in: {
                        $sum: {
                            $cond: [{ $eq: ['$movement_type', 'in'] }, '$total_value', 0]
                        }
                    },
                    total_value_out: {
                        $sum: {
                            $cond: [{ $eq: ['$movement_type', 'out'] }, '$total_value', 0]
                        }
                    },
                    transaction_count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            summary,
            generated_at: new Date()
        });
    } catch (error) {
        logger.error('Error fetching stock summary:', error);
        res.status(500).json({ success: false, error: 'Failed to generate stock summary' });
    }
});

// ============================================================================
// GST REPORT ENDPOINTS
// ============================================================================

/**
 * GET /reports/gst
 * Get monthly GST report from invoices
 */
router.get('/gst', async (req, res) => {
    try {
        const { month, year } = req.query;

        // Default to current month/year
        const reportYear = parseInt(year) || new Date().getFullYear();
        const reportMonth = parseInt(month) || new Date().getMonth() + 1;

        // Calculate date range for the month
        const startDate = new Date(reportYear, reportMonth - 1, 1);
        const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59, 999);

        // Get all invoices for the month
        const invoices = await Invoices.find({
            invoice_date: { $gte: startDate, $lte: endDate }
        }).sort({ invoice_date: 1 });

        // Calculate GST breakdown by Tax Rate
        const rateBreakdown = {};
        let totalTaxableValue = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;
        let totalInvoiceValue = 0;

        invoices.forEach(invoice => {
            // Process original items
            const items = invoice.items_original || [];

            items.forEach(item => {
                const rate = parseFloat(item.rate) || 0;
                const taxableValue = (item.quantity || 0) * (item.unit_price || 0);
                const cgst = (taxableValue * rate / 2) / 100;
                const sgst = (taxableValue * rate / 2) / 100;

                // Use rate as key
                const key = rate.toString();

                if (!rateBreakdown[key]) {
                    rateBreakdown[key] = {
                        rate: rate,
                        description: `GST @ ${rate}%`,
                        taxable_value: 0,
                        cgst: 0,
                        sgst: 0,
                        total_tax: 0,
                        total_value: 0
                    };
                }

                rateBreakdown[key].taxable_value += taxableValue;
                rateBreakdown[key].cgst += cgst;
                rateBreakdown[key].sgst += sgst;
                rateBreakdown[key].total_tax += (cgst + sgst);
                rateBreakdown[key].total_value += (taxableValue + cgst + sgst);

                totalTaxableValue += taxableValue;
                totalCGST += cgst;
                totalSGST += sgst;
                totalInvoiceValue += (taxableValue + cgst + sgst);
            });

            // Non-items (installation charges, services, etc.) are intentionally excluded from GST reports
        });

        // Convert to array and sort by rate (descending)
        const taxRateList = Object.values(rateBreakdown).sort((a, b) => b.rate - a.rate);

        // Invoice-wise breakdown
        const invoiceBreakdown = invoices.map(inv => ({
            invoice_id: inv.invoice_id,
            invoice_date: inv.invoice_date,
            customer_name: inv.customer_name,
            taxable_value: inv.total_amount_original - (inv.total_tax_original || 0),
            cgst: (inv.total_tax_original || 0) / 2,
            sgst: (inv.total_tax_original || 0) / 2,
            total_tax: inv.total_tax_original || 0,
            total_value: inv.total_amount_original || 0
        }));

        // Save report to history
        if (invoices.length > 0) {
            try {
                const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                const monthName = months[reportMonth - 1] || reportMonth;
                const filter = {
                    report_type: 'gst',
                    'parameters.month': reportMonth,
                    'parameters.year': reportYear
                };

                const reportName = `${monthName} ${reportYear} GST Report`;
                const updateData = {
                    report_type: 'gst',
                    report_name: reportName,
                    parameters: {
                        month: reportMonth,
                        year: reportYear
                    },
                    data: {
                        summary: {
                            total_invoices: invoices.length,
                            total_taxable_value: totalTaxableValue,
                            total_cgst: totalCGST,
                            total_sgst: totalSGST,
                            total_igst: totalIGST,
                            total_tax: totalCGST + totalSGST + totalIGST,
                            total_invoice_value: totalInvoiceValue
                        },
                        tax_rate_breakdown: taxRateList,
                        invoice_breakdown: invoiceBreakdown
                    },
                    summary: {
                        total_records: invoices.length,
                        total_value: totalInvoiceValue,
                        custom: {
                            month: reportMonth,
                            year: reportYear
                        }
                    },
                    generated_at: new Date(),
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Reset expiry to 7 days
                };

                await Report.findOneAndUpdate(filter, updateData, {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                });
            } catch (saveError) {
                logger.error('Failed to save GST report to history:', saveError);
                // continue even if saving fails, as the report data was generated successfully
            }
        }

        res.json({
            success: true,
            report: {
                month: reportMonth,
                year: reportYear,
                period: `${startDate.toLocaleDateString('en-IN')} - ${endDate.toLocaleDateString('en-IN')}`,
                summary: {
                    total_invoices: invoices.length,
                    total_taxable_value: totalTaxableValue,
                    total_cgst: totalCGST,
                    total_sgst: totalSGST,
                    total_igst: totalIGST,
                    total_tax: totalCGST + totalSGST + totalIGST,
                    total_invoice_value: totalInvoiceValue
                },
                tax_rate_breakdown: taxRateList,
                invoice_breakdown: invoiceBreakdown
            },
            generated_at: new Date()
        });
    } catch (error) {
        logger.error('Error fetching GST report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate GST report' });
    }
});

/**
 * GET /reports/gst/summary
 * Get GST summary for multiple months
 */
router.get('/gst/summary', async (req, res) => {
    try {
        const { year } = req.query;
        const reportYear = parseInt(year) || new Date().getFullYear();

        const monthlySummary = [];

        for (let month = 1; month <= 12; month++) {
            const startDate = new Date(reportYear, month - 1, 1);
            const endDate = new Date(reportYear, month, 0, 23, 59, 59, 999);

            const result = await Invoices.aggregate([
                {
                    $match: {
                        invoice_date: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total_invoices: { $sum: 1 },
                        total_amount: { $sum: '$total_amount_original' },
                        total_tax: { $sum: '$total_tax_original' }
                    }
                }
            ]);

            monthlySummary.push({
                month,
                month_name: new Date(reportYear, month - 1, 1).toLocaleString('en-IN', { month: 'long' }),
                total_invoices: result[0]?.total_invoices || 0,
                total_amount: result[0]?.total_amount || 0,
                total_tax: result[0]?.total_tax || 0,
                cgst: (result[0]?.total_tax || 0) / 2,
                sgst: (result[0]?.total_tax || 0) / 2
            });
        }

        res.json({
            success: true,
            year: reportYear,
            monthly_summary: monthlySummary,
            generated_at: new Date()
        });
    } catch (error) {
        logger.error('Error fetching GST summary:', error);
        res.status(500).json({ success: false, error: 'Failed to generate GST summary' });
    }
});

// ============================================================================
// DATA WORKSHEET ENDPOINTS
// ============================================================================

/**
 * POST /reports/data-worksheet
 * Generate and save data worksheet
 */
router.post('/data-worksheet', async (req, res) => {
    try {
        const worksheetData = req.body;

        // Save to Report collection for history
        const report = new Report({
            report_type: 'data_worksheet',
            report_name: `Solar Worksheet - ${worksheetData.customerName || 'Customer'} - ${worksheetData.systemSize}KW`,
            parameters: {
                customer_name: worksheetData.customerName,
                system_size: worksheetData.systemSize,
                month: worksheetData.month
            },
            data: worksheetData,
            summary: {
                system_size: worksheetData.systemSize,
                monthly_production: worksheetData.systemSize * (worksheetData.unitsPerDay || 4) * 30,
                monthly_savings: worksheetData.monthlySavings
            }
        });

        await report.save();

        res.json({
            success: true,
            report_id: report._id,
            message: 'Data worksheet saved successfully'
        });
    } catch (error) {
        logger.error('Error saving data worksheet:', error);
        res.status(500).json({ success: false, error: 'Failed to save data worksheet' });
    }
});

/**
 * GET /reports/data-worksheet/history
 * Get data worksheet history
 */
router.get('/data-worksheet/history', async (req, res) => {
    try {
        const worksheets = await Report.find({ report_type: 'data_worksheet' })
            .select('report_name parameters summary generated_at')
            .sort({ generated_at: -1 })
            .limit(50);

        res.json({
            success: true,
            worksheets
        });
    } catch (error) {
        logger.error('Error fetching worksheet history:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch worksheet history' });
    }
});

// ============================================================================
// GENERAL REPORT ENDPOINTS
// ============================================================================

/**
 * GET /reports/list
 * Get list of available reports
 */
router.get('/list', async (req, res) => {
    try {
        const reports = [
            {
                id: 'stock',
                name: 'Stock Report',
                description: 'Track stock in/out movements and current inventory levels',
                icon: 'fa-boxes',
                color: 'blue'
            },
            {
                id: 'gst',
                name: 'Monthly GST Report',
                description: 'GST breakdown by HSN/SAC code for tax filing',
                icon: 'fa-file-invoice-dollar',
                color: 'green'
            },
            {
                id: 'data-worksheet',
                name: 'Data Worksheet',
                description: 'Solar installation calculation and savings worksheet',
                icon: 'fa-solar-panel',
                color: 'purple'
            }
        ];

        res.json({ success: true, reports });
    } catch (error) {
        logger.error('Error fetching report list:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch report list' });
    }
});

/**
 * GET /reports/saved
 * Get saved/cached reports
 */
router.get('/saved', async (req, res) => {
    try {
        const { type, limit = 10 } = req.query;

        const query = { status: 'generated' };
        if (type) query.report_type = type;

        const reports = await Report.find(query)
            .select('report_type report_name parameters summary generated_at')
            .sort({ generated_at: -1 })
            .limit(parseInt(limit));

        res.json({ success: true, reports });
    } catch (error) {
        logger.error('Error fetching saved reports:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch saved reports' });
    }
});

/**
 * DELETE /reports/all
 * Delete all saved reports (filtered by type)
 */
router.delete('/all', async (req, res) => {
    try {
        const { type } = req.query;

        const query = { status: 'generated' };
        if (type) {
            query.report_type = type;
        }

        const result = await Report.deleteMany(query);

        logger.info(`Deleted ${result.deletedCount} reports${type ? ` of type: ${type}` : ''}`);
        res.json({
            success: true,
            message: type ? `All ${type} reports deleted successfully` : 'All reports deleted successfully',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        logger.error('Error deleting reports:', error);
        res.status(500).json({ success: false, error: 'Failed to delete reports' });
    }
});

/**
 * GET /reports/:id
 * Get a specific saved report by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }

        // Update access stats
        await report.recordAccess();

        res.json({ success: true, report });
    } catch (error) {
        logger.error('Error fetching report:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch report' });
    }
});

/**
 * DELETE /reports/:id
 * Delete a saved report
 */
router.delete('/:id', async (req, res) => {
    try {
        const result = await Report.findByIdAndDelete(req.params.id);

        if (!result) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }

        res.json({ success: true, message: 'Report deleted successfully' });
    } catch (error) {
        logger.error('Error deleting report:', error);
        res.status(500).json({ success: false, error: 'Failed to delete report' });
    }
});

module.exports = router;
