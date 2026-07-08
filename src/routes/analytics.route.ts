import { Router, Request, Response } from 'express';
import { InvoiceModel, QuotationModel, PurchaseModel, PurchaseOrderModel, CustomerModel } from '../models';
import logger from '../utils/logger';

const router: Router = Router();

router.get('/overview', async (req: Request, res: Response) => {
    try {
        /* ───────────────────────── Common date helpers ────────────────────────── */
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startNextMon = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        /* ────────────────────────── Simple document counts ────────────────────── */
        const totalProjects = await InvoiceModel.countDocuments({
            'deletion.is_deleted': false,
            is_archived: { $ne: true }
        });
        const totalQuotations = await QuotationModel.countDocuments();

        // Count total unpaid invoices (not distinct projects)
        const totalUnpaid = await InvoiceModel.countDocuments({
            'deletion.is_deleted': false,
            is_archived: { $ne: true },
            payment_status: { $in: ['Unpaid', 'Partial'] }
        });

        /* ────────────────────── All-Time invoice earnings (Paid) ───────────────── */
        // Calculate total earned: Sum of all payments received across all-time
        const totalEarnedResult = await InvoiceModel.aggregate([
            {
                $match: {
                    'deletion.is_deleted': false,
                    is_archived: { $ne: true }
                }
            },
            { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
            { $group: { _id: null, total: { $sum: '$payments.paid_amount' } } },
        ]);

        const totalEarned = totalEarnedResult.length > 0 ? totalEarnedResult[0].total : 0;

        /* ─────────────────────── All-Time purchase expenditure ─────────────────── */
        const [{ total: directExpenditure = 0 } = {}] = await PurchaseModel.aggregate([
            {
                $match: {
                    'deletion.is_deleted': false,
                },
            },
            { $group: { _id: null, total: { $sum: '$totals.grand_total' } } },
        ]);

        const [{ total: orderExpenditure = 0 } = {}] = await PurchaseOrderModel.aggregate([
            {
                $match: {
                    'deletion.is_deleted': false,
                    is_archived: { $ne: true },
                    status: { $nin: ['Invoiced', 'Rejected'] },
                },
            },
            { $group: { _id: null, total: { $sum: '$totals.grand_total' } } },
        ]);

        const totalExpenditure = directExpenditure + orderExpenditure;

        /* ─────────────────────── Active Pipeline Value Computation ─────────────── */
        // Sum of remaining balance on active project invoices
        const activeInvoicesResult = await InvoiceModel.aggregate([
            {
                $match: {
                    'deletion.is_deleted': false,
                    is_archived: { $ne: true },
                    payment_status: { $ne: 'Paid' }
                }
            },
            {
                $group: {
                    _id: null,
                    totalValue: {
                        $sum: {
                            $subtract: [
                                { $ifNull: ["$total_amount_duplicate", 0] },
                                { $ifNull: ["$total_paid_amount", 0] }
                            ]
                        }
                    }
                }
            }
        ]);
        const activeInvoicePipelineValue = activeInvoicesResult.length > 0 ? activeInvoicesResult[0].totalValue : 0;

        // Sum of grand totals of active quotations (Draft, Sent, Approved)
        const activeQuotationsResult = await QuotationModel.aggregate([
            {
                $match: {
                    'deletion.is_deleted': false,
                    is_archived: { $ne: true },
                    quotation_status: { $in: ['Draft', 'Sent', 'Approved'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalValue: { $sum: { $ifNull: ["$totals.grand_total", 0] } }
                }
            }
        ]);
        const activeQuotationPipelineValue = activeQuotationsResult.length > 0 ? activeQuotationsResult[0].totalValue : 0;

        const pipelineValue = activeInvoicePipelineValue + activeQuotationPipelineValue;

        /* ────────────────────── Pending services (invoices due for service) ───────────── */
        // Count invoices where service is due now (same logic as /service/get-service)
        // Service is due when: current date >= invoice_date + service_month months
        const invoicesWithService = await InvoiceModel.find({
            'deletion.is_deleted': false,
            is_archived: { $ne: true },
            $or: [
                { service_status: 'Active' },
                { service_status: { $exists: false }, service_after_months: { $gt: 0 } }
            ]
        }).lean() as any[];
        const remainingServices = invoicesWithService.filter((invoice: any) => {
            const invoiceDate = invoice.invoice_date || invoice.createdAt;
            if (!invoiceDate || !invoice.service_after_months) return false;

            const baseDate = new Date(invoiceDate as string | Date);
            const targetDate = new Date(baseDate);
            targetDate.setMonth(targetDate.getMonth() + invoice.service_after_months);

            return now >= targetDate;
        }).length;

        const totalCustomers = await CustomerModel.countDocuments({ 'deletion.is_deleted': false });
        const activeCustomers = await CustomerModel.countDocuments({ 
            'deletion.is_deleted': false, 
            is_active: true,
            is_archived: { $ne: true }
        });
        const b2bCustomers = await CustomerModel.countDocuments({
            'deletion.is_deleted': false,
            is_active: true,
            is_archived: { $ne: true },
            customer_type: { $in: ['Commercial', 'Government'] }
        });
        const b2cCustomers = await CustomerModel.countDocuments({
            'deletion.is_deleted': false,
            is_active: true,
            is_archived: { $ne: true },
            customer_type: 'Individual'
        });

        /* ────────────────────────────── Response ──────────────────────────────── */
        res.json({
            totalProjects,
            totalQuotations,
            totalEarned,
            totalUnpaid,
            totalExpenditure,
            remainingServices,
            totalCustomers,
            activeCustomers,
            b2bCustomers,
            b2cCustomers,
            pipelineValue
        });
    } catch (err: unknown) {
        logger.error('Error fetching analytics:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// New endpoint for month-over-month comparison
router.get('/comparison', async (req: Request, res: Response) => {
    try {
        const now = new Date();

        // Current month dates
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        // Previous month dates
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

        // Current month revenue (Payments received this month)
        const currentRevenueResult = await InvoiceModel.aggregate([
            {
                $match: {
                    'deletion.is_deleted': false,
                    is_archived: { $ne: true }
                }
            },
            { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
            {
                $match: {
                    'payments.payment_date': { $gte: currentMonthStart, $lt: currentMonthEnd },
                },
            },
            { $group: { _id: null, total: { $sum: '$payments.paid_amount' } } },
        ]);
        const currentRevenue = currentRevenueResult.length > 0 ? currentRevenueResult[0].total : 0;

        // Previous month revenue
        const previousRevenueResult = await InvoiceModel.aggregate([
            {
                $match: {
                    'deletion.is_deleted': false,
                    is_archived: { $ne: true }
                }
            },
            { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
            {
                $match: {
                    'payments.payment_date': { $gte: previousMonthStart, $lt: previousMonthEnd },
                },
            },
            { $group: { _id: null, total: { $sum: '$payments.paid_amount' } } },
        ]);
        const previousRevenue = previousRevenueResult.length > 0 ? previousRevenueResult[0].total : 0;

        // Current month projects
        const currentProjects = await InvoiceModel.countDocuments({
            'deletion.is_deleted': false,
            is_archived: { $ne: true },
            createdAt: { $gte: currentMonthStart, $lt: currentMonthEnd },
        });

        // Previous month projects
        const previousProjects = await InvoiceModel.countDocuments({
            'deletion.is_deleted': false,
            is_archived: { $ne: true },
            createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd },
        });

        // Current month quotations
        const currentQuotations = await QuotationModel.countDocuments({
            createdAt: { $gte: currentMonthStart, $lt: currentMonthEnd },
        });

        // Previous month quotations
        const previousQuotations = await QuotationModel.countDocuments({
            createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd },
        });

        res.json({
            revenue: {
                current: currentRevenue,
                previous: previousRevenue,
            },
            projects: {
                current: currentProjects,
                previous: previousProjects,
            },
            quotations: {
                current: currentQuotations,
                previous: previousQuotations,
            },
        });
    } catch (err: unknown) {
        logger.error('Error fetching comparison analytics:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
