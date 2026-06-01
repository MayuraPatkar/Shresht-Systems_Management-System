import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { InvoiceModel, PurchaseModel, PurchaseOrderModel, ItemModel, StockMovementModel, ReportModel, ServiceModel } from '../models';
import logger from '../utils/logger';

const router: Router = Router();

type StockReportMovementType = 'in' | 'out' | 'adjustment';

interface StockReportMovement {
    _id?: unknown;
    item_id?: unknown;
    timestamp: Date | string;
    item_name: string;
    movement_type: StockReportMovementType;
    quantity_change: number;
    total_value: number;
    reference_type?: string;
    reference_id?: string;
    notes?: string;
    stock_before?: number;
    stock_after?: number;
}

function getStockMovementType(movement: any): StockReportMovementType {
    const legacyType = String(movement.movement_type || '').toLowerCase();
    if (legacyType === 'in' || legacyType === 'out' || legacyType === 'adjustment') {
        return legacyType;
    }

    const direction = String(movement.direction || '').toUpperCase();
    if (direction === 'IN') return 'in';
    if (direction === 'OUT') return 'out';

    const referenceType = String(movement.reference?.type || '').toLowerCase();
    if (referenceType === 'adjustment') return 'adjustment';

    const quantityChange = Number(movement.quantity_change);
    if (!Number.isNaN(quantityChange)) {
        if (quantityChange < 0) return 'out';
        if (quantityChange > 0) return 'in';
    }

    return 'adjustment';
}

function getStockMovementQuantityChange(movement: any, type: StockReportMovementType): number {
    const legacyQuantityChange = Number(movement.quantity_change);
    const baseQuantity = Number.isNaN(legacyQuantityChange)
        ? Number(movement.quantity || 0)
        : legacyQuantityChange;

    if (type === 'out') return -Math.abs(baseQuantity);
    if (type === 'in') return Math.abs(baseQuantity);
    return baseQuantity;
}

function normalizeStockMovement(movement: any): StockReportMovement {
    const type = getStockMovementType(movement);
    const reference = movement.reference || {};
    const referenceId = reference.number || reference.id || movement.reference_id;

    return {
        _id: movement._id,
        item_id: movement.item_id,
        timestamp: movement.timestamp || movement.createdAt || movement.updatedAt || new Date(),
        item_name: movement.item_name || 'Unknown Item',
        movement_type: type,
        quantity_change: getStockMovementQuantityChange(movement, type),
        total_value: Number(movement.total_value || 0),
        reference_type: reference.type || movement.reference_type,
        reference_id: referenceId ? String(referenceId) : undefined,
        notes: movement.notes || movement.remarks || '',
        stock_before: movement.stock_before,
        stock_after: movement.stock_after
    };
}

function formatReportDate(value?: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ============================================================================
// STOCK REPORT ENDPOINTS
// ============================================================================

router.get('/stock', async (req: Request, res: Response) => {
    try {
        const { start_date, end_date, item_name, item_id, movement_type } = req.query as Record<string, string>;

        const query: any = {};
        const queryParts: any[] = [];

        if (start_date || end_date) {
            const dateRange: any = {};
            if (start_date) dateRange.$gte = new Date(start_date);
            if (end_date) {
                const endDate = new Date(end_date);
                endDate.setHours(23, 59, 59, 999);
                dateRange.$lte = endDate;
            }

            queryParts.push({
                $or: [
                    { createdAt: dateRange },
                    { timestamp: dateRange }
                ]
            });
        }

        if (item_id) {
            if (mongoose.Types.ObjectId.isValid(item_id)) {
                query.item_id = new mongoose.Types.ObjectId(item_id);
            }
        } else if (item_name) {
            query.item_name = { $regex: item_name, $options: 'i' };
        }

        if (movement_type && movement_type !== 'all') {
            const direction = movement_type === 'in' ? 'IN' : movement_type === 'out' ? 'OUT' : null;
            if (direction) {
                queryParts.push({
                    $or: [
                        { direction },
                        { movement_type }
                    ]
                });
            } else if (movement_type === 'adjustment') {
                queryParts.push({
                    $or: [
                        { 'reference.type': 'Adjustment' },
                        { movement_type }
                    ]
                });
            }
        }

        if (queryParts.length > 0) {
            query.$and = queryParts;
        }

        const movements = await StockMovementModel.find(query).sort({ createdAt: -1, timestamp: -1 }).limit(1000).lean();
        const allMovements = movements.map(normalizeStockMovement);

        const summary: any = {
            in: { total_quantity: 0, total_value: 0, count: 0 },
            out: { total_quantity: 0, total_value: 0, count: 0 },
            adjustment: { total_quantity: 0, total_value: 0, count: 0 }
        };

        allMovements.forEach((m: any) => {
            const type = m.movement_type;
            if (summary[type]) {
                summary[type].total_quantity += (m.quantity_change || 0);
                summary[type].total_value += (m.total_value || 0);
                summary[type].count++;
            }
        });

        const currentStock = await ItemModel.find({}).select('item_name stock_quantity quantity purchase_price unit_price hsn_sac HSN_SAC').sort({ item_name: 1 }).lean();

        if (allMovements.length > 0) {
            try {
                let reportNameParts = ['Stock Report'];
                const startFormatted = formatReportDate(start_date);
                const endFormatted = formatReportDate(end_date);
                if (startFormatted && endFormatted) reportNameParts.push(`${startFormatted} to ${endFormatted}`);
                else if (startFormatted) reportNameParts.push(`From ${startFormatted}`);
                else if (endFormatted) reportNameParts.push(`Until ${endFormatted}`);
                if (movement_type && movement_type !== 'all') reportNameParts.push(`Type: ${movement_type.charAt(0).toUpperCase() + movement_type.slice(1)}`);
                const itemLabel = item_name || (item_id ? allMovements[0]?.item_name : '');
                if (itemLabel) reportNameParts.push(`Item: ${itemLabel}`);

                const reportData: any = {
                    report_type: 'stock', report_name: reportNameParts.join(' - '),
                    parameters: {
                        start_date: start_date ? new Date(start_date) : undefined,
                        end_date: end_date ? new Date(end_date) : undefined,
                        filters: { item_name: item_name || null, item_id: item_id || null, movement_type: movement_type || null }
                    },
                    data: { movements: allMovements, summary: { in: summary.in, out: summary.out, adjustment: summary.adjustment }, currentStock },
                    summary: { total_records: allMovements.length, total_value: summary.in.total_value + summary.out.total_value },
                    generated_at: new Date(), expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                };

                const reportQuery: any = {
                    report_type: 'stock', 'parameters.filters.item_name': item_name || null,
                    'parameters.filters.movement_type': movement_type || null
                };
                if (item_id) reportQuery['parameters.filters.item_id'] = item_id;
                if (start_date) reportQuery['parameters.start_date'] = new Date(start_date);
                else reportQuery['parameters.start_date'] = { $exists: false };
                if (end_date) reportQuery['parameters.end_date'] = new Date(end_date);
                else reportQuery['parameters.end_date'] = { $exists: false };

                await ReportModel.findOneAndUpdate(reportQuery, reportData, { upsert: true, new: true, setDefaultsOnInsert: true });
            } catch (saveError: unknown) {
                logger.error('Failed to save stock report to history:', saveError);
            }
        }

        res.json({ success: true, movements: allMovements, summary: { in: summary.in, out: summary.out, adjustment: summary.adjustment }, currentStock, generated_at: new Date() });
    } catch (error: unknown) {
        logger.error('Error fetching stock report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate stock report' });
    }
});

router.get('/stock/summary', async (req: Request, res: Response) => {
    try {
        const { start_date, end_date } = req.query as Record<string, string>;
        const matchStage: any = {};
        if (start_date || end_date) {
            const dateRange: any = {};
            if (start_date) dateRange.$gte = new Date(start_date);
            if (end_date) { const endDate = new Date(end_date); endDate.setHours(23, 59, 59, 999); dateRange.$lte = endDate; }
            matchStage.$or = [{ createdAt: dateRange }, { timestamp: dateRange }];
        }

        const summary = await StockMovementModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$item_id',
                    item_name: { $last: '$item_name' },
                    total_in: {
                        $sum: {
                            $cond: [
                                { $or: [{ $eq: ['$direction', 'IN'] }, { $eq: ['$movement_type', 'in'] }] },
                                { $abs: { $ifNull: ['$quantity', '$quantity_change'] } },
                                0
                            ]
                        }
                    },
                    total_out: {
                        $sum: {
                            $cond: [
                                { $or: [{ $eq: ['$direction', 'OUT'] }, { $eq: ['$movement_type', 'out'] }] },
                                { $abs: { $ifNull: ['$quantity', '$quantity_change'] } },
                                0
                            ]
                        }
                    },
                    total_value_in: {
                        $sum: {
                            $cond: [
                                { $or: [{ $eq: ['$direction', 'IN'] }, { $eq: ['$movement_type', 'in'] }] },
                                { $ifNull: ['$total_value', 0] },
                                0
                            ]
                        }
                    },
                    total_value_out: {
                        $sum: {
                            $cond: [
                                { $or: [{ $eq: ['$direction', 'OUT'] }, { $eq: ['$movement_type', 'out'] }] },
                                { $ifNull: ['$total_value', 0] },
                                0
                            ]
                        }
                    },
                    transaction_count: { $sum: 1 }
                }
            },
            { $lookup: { from: 'items', localField: '_id', foreignField: '_id', as: 'stockItem' } },
            { $addFields: { item_name: { $ifNull: [{ $arrayElemAt: ['$stockItem.item_name', 0] }, '$item_name'] } } },
            { $project: { stockItem: 0 } },
            { $sort: { item_name: 1 } }
        ]);

        res.json({ success: true, summary, generated_at: new Date() });
    } catch (error: unknown) {
        logger.error('Error fetching stock summary:', error);
        res.status(500).json({ success: false, error: 'Failed to generate stock summary' });
    }
});

// ============================================================================
// GST REPORT ENDPOINTS
// ============================================================================

router.get('/gst', async (req: Request, res: Response) => {
    try {
        const { month, year } = req.query as Record<string, string>;
        const reportYear = parseInt(year) || new Date().getFullYear();
        const reportMonth = parseInt(month) || new Date().getMonth() + 1;
        const startDate = new Date(reportYear, reportMonth - 1, 1);
        const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59, 999);

        const invoices = await InvoiceModel.find({
            invoice_date: { $gte: startDate, $lte: endDate },
            'deletion.is_deleted': false,
            is_archived: { $ne: true }
        }).sort({ invoice_date: 1 }) as any[];

        const rateBreakdown: Record<string, any> = {};
        let totalTaxableValue = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0, totalInvoiceValue = 0;

        invoices.forEach(invoice => {
            const items = invoice.items_original || [];
            items.forEach((item: any) => {
                const rate = parseFloat(item.gst_rate !== undefined ? item.gst_rate : item.rate) || 0;
                const taxableValue = typeof item.taxable_value === 'number' ? item.taxable_value : ((item.quantity || 0) * (item.unit_price || 0));
                const cgst = (taxableValue * rate / 2) / 100;
                const sgst = (taxableValue * rate / 2) / 100;
                const key = rate.toString();
                if (!rateBreakdown[key]) {
                    rateBreakdown[key] = { rate, description: `GST @ ${rate}%`, taxable_value: 0, cgst: 0, sgst: 0, total_tax: 0, total_value: 0 };
                }
                rateBreakdown[key].taxable_value += taxableValue;
                rateBreakdown[key].cgst += cgst;
                rateBreakdown[key].sgst += sgst;
                rateBreakdown[key].total_tax += (cgst + sgst);
                rateBreakdown[key].total_value += (taxableValue + cgst + sgst);
                totalTaxableValue += taxableValue; totalCGST += cgst; totalSGST += sgst;
                totalInvoiceValue += (taxableValue + cgst + sgst);
            });
        });

        const taxRateList = Object.values(rateBreakdown).sort((a: any, b: any) => b.rate - a.rate);
        const invoiceBreakdown = invoices.map(inv => ({
            invoice_id: inv.invoice_no || inv.invoice_id, invoice_date: inv.invoice_date, customer_name: inv.customer_snapshot?.name || inv.customer_name || '-',
            taxable_value: inv.totals_original?.taxable_value || inv.totals_duplicate?.taxable_value || (inv.total_amount_original - (inv.total_tax_original || 0)),
            cgst: inv.totals_original?.cgst || inv.totals_duplicate?.cgst || (inv.total_tax_original || 0) / 2,
            sgst: inv.totals_original?.sgst || inv.totals_duplicate?.sgst || (inv.total_tax_original || 0) / 2,
            total_tax: inv.totals_original?.total_tax || inv.totals_duplicate?.total_tax || inv.total_tax_original || 0,
            total_value: inv.totals_original?.grand_total || inv.totals_duplicate?.grand_total || inv.total_amount_original || 0
        }));

        if (invoices.length > 0) {
            try {
                const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const filter: any = { report_type: 'gst', 'parameters.month': reportMonth, 'parameters.year': reportYear };
                const updateData = {
                    report_type: 'gst', report_name: `Invoice GST Report - ${shortMonths[reportMonth - 1]} ${reportYear}`,
                    parameters: { month: reportMonth, year: reportYear },
                    data: { summary: { total_invoices: invoices.length, total_taxable_value: totalTaxableValue, total_cgst: totalCGST, total_sgst: totalSGST, total_igst: totalIGST, total_tax: totalCGST + totalSGST + totalIGST, total_invoice_value: totalInvoiceValue }, tax_rate_breakdown: taxRateList, invoice_breakdown: invoiceBreakdown },
                    summary: { total_records: invoices.length, total_value: totalInvoiceValue, custom: { month: reportMonth, year: reportYear } },
                    generated_at: new Date(), expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                };
                await ReportModel.findOneAndUpdate(filter, updateData, { upsert: true, new: true, setDefaultsOnInsert: true });
            } catch (saveError: unknown) { logger.error('Failed to save GST report to history:', saveError); }
        }

        res.json({
            success: true, report: {
                month: reportMonth, year: reportYear,
                period: `${startDate.toLocaleDateString('en-IN')} - ${endDate.toLocaleDateString('en-IN')}`,
                summary: { total_invoices: invoices.length, total_taxable_value: totalTaxableValue, total_cgst: totalCGST, total_sgst: totalSGST, total_igst: totalIGST, total_tax: totalCGST + totalSGST + totalIGST, total_invoice_value: totalInvoiceValue },
                tax_rate_breakdown: taxRateList, invoice_breakdown: invoiceBreakdown
            }, generated_at: new Date()
        });
    } catch (error: unknown) {
        logger.error('Error fetching GST report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate GST report' });
    }
});

router.get('/gst/summary', async (req: Request, res: Response) => {
    try {
        const { year } = req.query as Record<string, string>;
        const reportYear = parseInt(year) || new Date().getFullYear();
        const monthlySummary: any[] = [];

        for (let month = 1; month <= 12; month++) {
            const startDate = new Date(reportYear, month - 1, 1);
            const endDate = new Date(reportYear, month, 0, 23, 59, 59, 999);
            const result = await InvoiceModel.aggregate([
                { 
                    $match: { 
                        invoice_date: { $gte: startDate, $lte: endDate },
                        'deletion.is_deleted': false,
                        is_archived: { $ne: true }
                    } 
                },
                { $group: { _id: null, total_invoices: { $sum: 1 }, total_amount: { $sum: { $ifNull: ['$totals_original.grand_total', '$total_amount_original'] } }, total_tax: { $sum: { $ifNull: ['$totals_original.total_tax', '$total_tax_original'] } } } }
            ]);
            monthlySummary.push({
                month, month_name: new Date(reportYear, month - 1, 1).toLocaleString('en-IN', { month: 'long' }),
                total_invoices: result[0]?.total_invoices || 0, total_amount: result[0]?.total_amount || 0,
                total_tax: result[0]?.total_tax || 0, cgst: (result[0]?.total_tax || 0) / 2, sgst: (result[0]?.total_tax || 0) / 2
            });
        }

        res.json({ success: true, year: reportYear, monthly_summary: monthlySummary, generated_at: new Date() });
    } catch (error: unknown) {
        logger.error('Error fetching GST summary:', error);
        res.status(500).json({ success: false, error: 'Failed to generate GST summary' });
    }
});

// ============================================================================
// PURCHASE GST REPORT ENDPOINTS
// ============================================================================

router.get('/purchase-gst', async (req: Request, res: Response) => {
    try {
        const { month, year } = req.query as Record<string, string>;
        const reportYear = parseInt(year) || new Date().getFullYear();
        const reportMonth = parseInt(month) || new Date().getMonth() + 1;
        const startDate = new Date(reportYear, reportMonth - 1, 1);
        const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59, 999);

        const purchaseOrders = await PurchaseOrderModel.find({ purchase_date: { $gte: startDate, $lte: endDate } }).sort({ purchase_date: 1 }) as any[];

        const rateBreakdown: Record<string, any> = {};
        let totalTaxableValue = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0, totalPurchaseValue = 0;

        purchaseOrders.forEach(po => {
            (po.items || []).forEach((item: any) => {
                const rate = parseFloat(item.gst_rate !== undefined ? item.gst_rate : item.rate) || 0;
                const taxableValue = typeof item.taxable_value === 'number' ? item.taxable_value : ((item.quantity || 0) * (item.unit_price || 0));
                const cgst = (taxableValue * rate / 2) / 100;
                const sgst = (taxableValue * rate / 2) / 100;
                const key = rate.toString();
                if (!rateBreakdown[key]) { rateBreakdown[key] = { rate, description: `GST @ ${rate}%`, taxable_value: 0, cgst: 0, sgst: 0, total_tax: 0, total_value: 0 }; }
                rateBreakdown[key].taxable_value += taxableValue; rateBreakdown[key].cgst += cgst;
                rateBreakdown[key].sgst += sgst; rateBreakdown[key].total_tax += (cgst + sgst);
                rateBreakdown[key].total_value += (taxableValue + cgst + sgst);
                totalTaxableValue += taxableValue; totalCGST += cgst; totalSGST += sgst;
                totalPurchaseValue += (taxableValue + cgst + sgst);
            });
        });

        const taxRateList = Object.values(rateBreakdown).sort((a: any, b: any) => b.rate - a.rate);
        const purchaseBreakdown = purchaseOrders.map(po => {
            let poTaxableValue = 0, poTax = 0;
            (po.items || []).forEach((item: any) => {
                const t = typeof item.taxable_value === 'number' ? item.taxable_value : ((item.quantity || 0) * (item.unit_price || 0));
                poTaxableValue += t;
                const rate = item.gst_rate !== undefined ? item.gst_rate : (item.rate || 0);
                poTax += (t * rate) / 100;
            });
            return {
                purchase_order_id: po.purchase_order_no || po.purchase_order_id || po.purchase_no || po._id,
                purchase_invoice_id: po.purchase_invoice_no || po.purchase_invoice_id,
                purchase_date: po.purchase_date,
                supplier_name: po.supplier_snapshot?.name || po.supplier_name || '-',
                taxable_value: poTaxableValue,
                cgst: poTax / 2,
                sgst: poTax / 2,
                total_tax: poTax,
                total_value: po.totals?.grand_total || po.total_amount || (poTaxableValue + poTax)
            };
        });

        if (purchaseOrders.length > 0) {
            try {
                const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const filter: any = { report_type: 'purchase_gst', 'parameters.month': reportMonth, 'parameters.year': reportYear };
                const updateData = {
                    report_type: 'purchase_gst', report_name: `Purchase GST Report - ${shortMonths[reportMonth - 1]} ${reportYear}`,
                    parameters: { month: reportMonth, year: reportYear },
                    data: { summary: { total_purchase_orders: purchaseOrders.length, total_taxable_value: totalTaxableValue, total_cgst: totalCGST, total_sgst: totalSGST, total_igst: totalIGST, total_tax: totalCGST + totalSGST + totalIGST, total_purchase_value: totalPurchaseValue }, tax_rate_breakdown: taxRateList, purchase_breakdown: purchaseBreakdown },
                    summary: { total_records: purchaseOrders.length, total_value: totalPurchaseValue, custom: { month: reportMonth, year: reportYear } },
                    generated_at: new Date(), expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                };
                await ReportModel.findOneAndUpdate(filter, updateData, { upsert: true, new: true, setDefaultsOnInsert: true });
            } catch (saveError: unknown) { logger.error('Failed to save Purchase GST report to history:', saveError); }
        }

        res.json({
            success: true, report: {
                month: reportMonth, year: reportYear,
                period: `${startDate.toLocaleDateString('en-IN')} - ${endDate.toLocaleDateString('en-IN')}`,
                summary: { total_purchase_orders: purchaseOrders.length, total_taxable_value: totalTaxableValue, total_cgst: totalCGST, total_sgst: totalSGST, total_igst: totalIGST, total_tax: totalCGST + totalSGST + totalIGST, total_purchase_value: totalPurchaseValue },
                tax_rate_breakdown: taxRateList, purchase_breakdown: purchaseBreakdown
            }, generated_at: new Date()
        });
    } catch (error: unknown) {
        logger.error('Error fetching Purchase GST report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate Purchase GST report' });
    }
});

// ============================================================================
// DATA WORKSHEET ENDPOINTS
// ============================================================================

router.post('/data-worksheet', async (req: Request, res: Response) => {
    try {
        const worksheetData = req.body;
        const report = new ReportModel({
            report_type: 'data_worksheet',
            report_name: `Solar Worksheet - ${worksheetData.customerName || 'Customer'} - ${worksheetData.systemSize}KW`,
            parameters: { customer_name: worksheetData.customerName, system_size: worksheetData.systemSize, month: worksheetData.month },
            data: worksheetData,
            summary: { custom: { system_size: worksheetData.systemSize, monthly_production: worksheetData.systemSize * (worksheetData.unitsPerDay || 4) * 30, monthly_savings: worksheetData.monthlySavings } }
        });
        await report.save();
        res.json({ success: true, report_id: report._id, message: 'Data worksheet saved successfully' });
    } catch (error: unknown) {
        logger.error('Error saving data worksheet:', error);
        res.status(500).json({ success: false, error: 'Failed to save data worksheet' });
    }
});

router.get('/data-worksheet/history', async (req: Request, res: Response) => {
    try {
        const worksheets = await ReportModel.find({ report_type: 'data_worksheet' }).select('report_name parameters summary generated_at').sort({ generated_at: -1 }).limit(50);
        res.json({ success: true, worksheets });
    } catch (error: unknown) {
        logger.error('Error fetching worksheet history:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch worksheet history' });
    }
});

// ============================================================================
// GENERAL REPORT ENDPOINTS
// ============================================================================

router.get('/list', async (req: Request, res: Response) => {
    try {
        const reports = [
            { id: 'stock', name: 'Stock Report', description: 'Track stock in/out movements and current inventory levels', icon: 'fa-boxes', color: 'blue' },
            { id: 'gst', name: 'Monthly GST Report', description: 'GST breakdown by HSN/SAC code for tax filing', icon: 'fa-file-invoice-dollar', color: 'green' },
            { id: 'data-worksheet', name: 'Data Worksheet', description: 'Solar installation calculation and savings worksheet', icon: 'fa-solar-panel', color: 'purple' },
            { id: 'purchase-gst', name: 'Purchase GST Report', description: 'Monthly GST summary from purchase orders', icon: 'fa-shopping-cart', color: 'orange' }
        ];
        res.json({ success: true, reports });
    } catch (error: unknown) {
        res.status(500).json({ success: false, error: 'Failed to fetch report list' });
    }
});

router.get('/saved', async (req: Request, res: Response) => {
    try {
        const { type, limit = '10' } = req.query as Record<string, string>;
        const query: any = {};
        if (type) query.report_type = type;
        const reports = await ReportModel.find(query).select('report_type report_name parameters summary generated_at createdAt').sort({ generated_at: -1 }).limit(parseInt(limit));
        res.json({ success: true, reports });
    } catch (error: unknown) {
        logger.error('Error fetching saved reports:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch saved reports' });
    }
});

router.delete('/all', async (req: Request, res: Response) => {
    try {
        const { type } = req.query as Record<string, string>;
        const query: any = { status: 'generated' };
        if (type) query.report_type = type;
        const result = await ReportModel.deleteMany(query);
        logger.info(`Deleted ${result.deletedCount} reports${type ? ` of type: ${type}` : ''}`);
        res.json({ success: true, message: type ? `All ${type} reports deleted successfully` : 'All reports deleted successfully', deletedCount: result.deletedCount });
    } catch (error: unknown) {
        logger.error('Error deleting reports:', error);
        res.status(500).json({ success: false, error: 'Failed to delete reports' });
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const report = await ReportModel.findById(req.params.id) as any;
        if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
        if (typeof report.recordAccess === 'function') await report.recordAccess();
        res.json({ success: true, report });
    } catch (error: unknown) {
        logger.error('Error fetching report:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch report' });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const result = await ReportModel.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ success: false, error: 'Report not found' });
        res.json({ success: true, message: 'Report deleted successfully' });
    } catch (error: unknown) {
        logger.error('Error deleting report:', error);
        res.status(500).json({ success: false, error: 'Failed to delete report' });
    }
});

export default router;
