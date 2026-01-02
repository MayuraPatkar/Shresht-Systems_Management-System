const express = require('express');
const router = express.Router();
const { Invoices, Purchases, Stock, StockMovement, Report, service } = require('../models');
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

        // ------------------------------------------------------------------
        // BACKFILL: Include Purchase Orders as "In" movements if missing
        // ------------------------------------------------------------------

        let poMovements = [];

        // Only fetch POs if we are looking for 'in' or 'all' movements
        if (!movement_type || movement_type === 'all' || movement_type === 'in') {
            // 1. Get Purchase Orders in date range
            const poQuery = {};
            if (start_date || end_date) {
                poQuery.purchase_date = {};
                if (start_date) poQuery.purchase_date.$gte = new Date(start_date);
                if (end_date) {
                    const endDate = new Date(end_date);
                    endDate.setHours(23, 59, 59, 999);
                    poQuery.purchase_date.$lte = endDate;
                }
            }

            const purchaseOrders = await Purchases.find(poQuery);

            // 2. Identify POs that already have StockMovements (to avoid duplicates)
            const recordedPOIds = new Set(
                movements
                    .filter(m => m.reference_type === 'purchase_order')
                    .map(m => m.reference_id)
            );

            // 3. Convert untracked POs into movement objects
            purchaseOrders.forEach(po => {
                // Skip if this PO is already tracked in StockMovements
                if (recordedPOIds.has(po.purchase_order_id)) return;

                if (po.items && Array.isArray(po.items)) {
                    po.items.forEach(item => {
                        // Check item name filter
                        if (item_name && item.description && !item.description.match(new RegExp(item_name, 'i'))) {
                            return;
                        }

                        poMovements.push({
                            timestamp: po.purchase_date || po.createdAt,
                            item_name: item.description || 'Unknown Item',
                            movement_type: 'in',
                            quantity_change: Number(item.quantity) || 0,
                            total_value: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
                            reference_type: 'purchase_order',
                            reference_id: po.purchase_order_id,
                            notes: 'Generated from Purchase Order history'
                        });
                    });
                }
            });
        }

        // ------------------------------------------------------------------
        // BACKFILL: Include Services as "Out" movements if missing
        // ------------------------------------------------------------------

        let serviceMovements = [];

        // Only fetch Services if we are looking for 'out' or 'all' movements
        if (!movement_type || movement_type === 'all' || movement_type === 'out') {
            // 1. Get Services in date range
            const serviceQuery = {};
            if (start_date || end_date) {
                serviceQuery.service_date = {};
                if (start_date) serviceQuery.service_date.$gte = new Date(start_date);
                if (end_date) {
                    const endDate = new Date(end_date);
                    endDate.setHours(23, 59, 59, 999);
                    serviceQuery.service_date.$lte = endDate;
                }
            }

            const services = await service.find(serviceQuery);

            // 2. Identify Services that already have StockMovements
            const recordedServiceIds = new Set(
                movements
                    .filter(m => m.reference_type === 'service')
                    .map(m => m.reference_id)
            );

            // 3. Convert untracked Services into movement objects
            services.forEach(srv => {
                // Skip if this Service is already tracked
                if (recordedServiceIds.has(srv.service_id)) return;

                if (srv.items && Array.isArray(srv.items)) {
                    srv.items.forEach(item => {
                        // Check item name filter
                        if (item_name && item.description && !item.description.match(new RegExp(item_name, 'i'))) {
                            return;
                        }

                        serviceMovements.push({
                            timestamp: srv.service_date || srv.createdAt,
                            item_name: item.description || 'Unknown Item',
                            movement_type: 'out',
                            quantity_change: Number(item.quantity) || 0,
                            total_value: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
                            reference_type: 'service',
                            reference_id: srv.service_id,
                            notes: 'Generated from Service history'
                        });
                    });
                }
            });
        }

        // 4. Merge and Sort
        const allMovements = [...movements, ...poMovements, ...serviceMovements].sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        // Calculate summary from ALL movements
        const summary = {
            in: { total_quantity: 0, total_value: 0, count: 0 },
            out: { total_quantity: 0, total_value: 0, count: 0 },
            adjustment: { total_quantity: 0, total_value: 0, count: 0 }
        };

        allMovements.forEach(m => {
            const type = m.movement_type;
            if (summary[type]) {
                summary[type].total_quantity += (m.quantity_change || 0); // Keep sign for calculation, but handle display later
                summary[type].total_value += (m.total_value || 0);
                summary[type].count++;
            }
        });

        // Backend summary structure normalization to match what frontend expects (optional, but good for consistency)
        // Note: quantity_change for 'out' is often negative in DB, but summary usually wants magnitude. 
        // Let's stick to simple summation here, frontend handles magnitude.
        // Actually, let's make sure the summary matches the aggregate logic we replaced.

        const summaryArray = Object.keys(summary).map(key => ({
            _id: key,
            ...summary[key]
        }));

        // Get current stock levels for comparison
        const currentStock = await Stock.find({})
            .select('item_name quantity unit_price HSN_SAC')
            .sort({ item_name: 1 });

        // Save report to history
        if (allMovements.length > 0) {
            try {
                const reportName = `Stock Report - ${new Date().toLocaleDateString('en-IN')}`;
                
                // Prepare report data
                const reportData = {
                    report_type: 'stock',
                    report_name: reportName,
                    parameters: {
                        start_date: start_date ? new Date(start_date) : undefined,
                        end_date: end_date ? new Date(end_date) : undefined,
                        filters: {
                            item_name: item_name || null,
                            movement_type: movement_type || null
                        }
                    },
                    data: {
                        movements: allMovements,
                        summary: {
                            in: summary.in,
                            out: summary.out,
                            adjustment: summary.adjustment
                        },
                        currentStock
                    },
                    summary: {
                        total_records: allMovements.length,
                        total_value: summary.in.total_value + summary.out.total_value // Rough value calc
                    },
                    generated_at: new Date(),
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Reset expiry
                };

                // Build query to find existing report with same parameters
                const query = {
                    report_type: 'stock',
                    'parameters.filters.item_name': item_name || null,
                    'parameters.filters.movement_type': movement_type || null
                };

                if (start_date) {
                    query['parameters.start_date'] = new Date(start_date);
                } else {
                    query['parameters.start_date'] = { $exists: false };
                }

                if (end_date) {
                    query['parameters.end_date'] = new Date(end_date);
                } else {
                    query['parameters.end_date'] = { $exists: false };
                }

                // Upsert: Update if exists, Insert if not
                await Report.findOneAndUpdate(
                    query,
                    reportData,
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            } catch (saveError) {
                logger.error('Failed to save stock report to history:', saveError);
                // continue even if saving fails, as the report data was generated successfully
            }
        }

        res.json({
            success: true,
            movements: allMovements,
            summary: {
                in: summary.in,
                out: summary.out,
                adjustment: summary.adjustment
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

                const reportName = `${monthName} ${reportYear} Invoice GST Report`;
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
// PURCHASE GST REPORT ENDPOINTS
// ============================================================================

/**
 * GET /reports/purchase-gst
 * Get monthly GST report from purchase orders
 */
router.get('/purchase-gst', async (req, res) => {
    try {
        const { month, year } = req.query;

        // Default to current month/year
        const reportYear = parseInt(year) || new Date().getFullYear();
        const reportMonth = parseInt(month) || new Date().getMonth() + 1;

        // Calculate date range for the month
        const startDate = new Date(reportYear, reportMonth - 1, 1);
        const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59, 999);

        // Get all purchase orders for the month
        const purchaseOrders = await Purchases.find({
            purchase_date: { $gte: startDate, $lte: endDate }
        }).sort({ purchase_date: 1 });

        // Calculate GST breakdown by Tax Rate
        const rateBreakdown = {};
        let totalTaxableValue = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;
        let totalPurchaseValue = 0;

        purchaseOrders.forEach(po => {
            // Process items
            const items = po.items || [];

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
                totalPurchaseValue += (taxableValue + cgst + sgst);
            });
        });

        // Convert to array and sort by rate (descending)
        const taxRateList = Object.values(rateBreakdown).sort((a, b) => b.rate - a.rate);

        // Purchase order-wise breakdown
        const purchaseBreakdown = purchaseOrders.map(po => {
            // Calculate totals from items
            let poTaxableValue = 0;
            let poTax = 0;
            (po.items || []).forEach(item => {
                const itemTaxable = (item.quantity || 0) * (item.unit_price || 0);
                const itemTax = (itemTaxable * (item.rate || 0)) / 100;
                poTaxableValue += itemTaxable;
                poTax += itemTax;
            });

            return {
                purchase_order_id: po.purchase_order_id,
                purchase_invoice_id: po.purchase_invoice_id,
                purchase_date: po.purchase_date,
                supplier_name: po.supplier_name,
                taxable_value: poTaxableValue,
                cgst: poTax / 2,
                sgst: poTax / 2,
                total_tax: poTax,
                total_value: po.total_amount || (poTaxableValue + poTax)
            };
        });

        // Save report to history
        if (purchaseOrders.length > 0) {
            try {
                const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                const monthName = months[reportMonth - 1] || reportMonth;
                const filter = {
                    report_type: 'purchase_gst',
                    'parameters.month': reportMonth,
                    'parameters.year': reportYear
                };

                const reportName = `${monthName} ${reportYear} Purchase GST Report`;
                const updateData = {
                    report_type: 'purchase_gst',
                    report_name: reportName,
                    parameters: {
                        month: reportMonth,
                        year: reportYear
                    },
                    data: {
                        summary: {
                            total_purchase_orders: purchaseOrders.length,
                            total_taxable_value: totalTaxableValue,
                            total_cgst: totalCGST,
                            total_sgst: totalSGST,
                            total_igst: totalIGST,
                            total_tax: totalCGST + totalSGST + totalIGST,
                            total_purchase_value: totalPurchaseValue
                        },
                        tax_rate_breakdown: taxRateList,
                        purchase_breakdown: purchaseBreakdown
                    },
                    summary: {
                        total_records: purchaseOrders.length,
                        total_value: totalPurchaseValue,
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
                logger.error('Failed to save Purchase GST report to history:', saveError);
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
                    total_purchase_orders: purchaseOrders.length,
                    total_taxable_value: totalTaxableValue,
                    total_cgst: totalCGST,
                    total_sgst: totalSGST,
                    total_igst: totalIGST,
                    total_tax: totalCGST + totalSGST + totalIGST,
                    total_purchase_value: totalPurchaseValue
                },
                tax_rate_breakdown: taxRateList,
                purchase_breakdown: purchaseBreakdown
            },
            generated_at: new Date()
        });
    } catch (error) {
        logger.error('Error fetching Purchase GST report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate Purchase GST report' });
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
            },
            {
                id: 'purchase-gst',
                name: 'Purchase GST Report',
                description: 'Monthly GST summary from purchase orders',
                icon: 'fa-shopping-cart',
                color: 'orange'
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
