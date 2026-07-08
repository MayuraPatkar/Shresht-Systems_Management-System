import { Router, Request, Response } from 'express';
import { InvoiceModel, QuotationModel, PurchaseModel, PurchaseOrderModel, CustomerModel, ItemModel, EmployeeModel } from '../models';
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

/* ────────────────────────── Sales Analytics Endpoints ────────────────────────── */

const salespersons = ["Rahul Sharma", "Priya Patel", "Amit Kumar", "Neha Singh", "Vikram Rathore"];
const branches = ["Udupi Head Office", "Mangalore Branch", "Bangalore Branch", "Mumbai Branch"];

const getIndexFromId = (id: string, modulo: number): number => {
    if (!id) return 0;
    const str = id.toString();
    const lastChar = str.charAt(str.length - 1);
    const val = parseInt(lastChar, 16);
    return isNaN(val) ? 0 : val % modulo;
};

const getSalesperson = (invoiceId: string) => {
    return salespersons[getIndexFromId(invoiceId, salespersons.length)];
};

const getBranch = (invoiceId: string) => {
    return branches[getIndexFromId(invoiceId, branches.length)];
};

const getCategory = (description: string) => {
    const desc = (description || '').toLowerCase();
    if (desc.includes('solar') || desc.includes('panel') || desc.includes('inverter') || desc.includes('hybrid system') || desc.includes('kw')) {
        return 'Solar Systems';
    }
    if (desc.includes('camera') || desc.includes('nvr') || desc.includes('dvr') || desc.includes('cctv') || desc.includes('prama') || desc.includes('hikvision')) {
        return 'Security Systems';
    }
    if (desc.includes('cable') || desc.includes('wire') || desc.includes('switch') || desc.includes('router') || desc.includes('networking') || desc.includes('conduit')) {
        return 'Electrical & Networking';
    }
    if (desc.includes('service') || desc.includes('maintenance') || desc.includes('installation') || desc.includes('labor') || desc.includes('commissioning')) {
        return 'Services';
    }
    return 'General Equipment';
};

const calculateInvoiceGrossProfit = (invoice: any, stockPriceMap: Map<string, number>) => {
    let grossProfit = 0;
    const items = invoice.items_duplicate || invoice.items_original || [];
    for (const item of items) {
        const itemName = (item.description || '').toLowerCase().trim();
        const qty = item.quantity || 0;
        const taxable = item.taxable_value || item.total || 0;
        const costPrice = stockPriceMap.get(itemName) || (item.unit_price ? item.unit_price * 0.7 : 0);
        grossProfit += (taxable - (costPrice * qty));
    }
    return grossProfit;
};

function predictNextMonth(history: { month: string; value: number }[]): { predictedValue: number; trend: number } {
    if (history.length === 0) return { predictedValue: 0, trend: 0 };
    if (history.length === 1) return { predictedValue: history[0].value, trend: 0 };

    const n = history.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += history[i].value;
        sumXY += i * history[i].value;
        sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    const predictedValue = Math.max(0, slope * n + intercept);
    return { predictedValue, trend: slope };
}

const getPast6MonthsHistory = async (endDate: Date) => {
    const history: { month: string; value: number; orders: number }[] = [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(endDate);
        d.setMonth(d.getMonth() - i);
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        
        const monthlyInvoices = await InvoiceModel.find({
            'deletion.is_deleted': false,
            invoice_date: { $gte: mStart, $lte: mEnd }
        }).lean() as any[];
        
        const rev = monthlyInvoices.reduce((sum, inv) => sum + (inv.total_amount_duplicate || inv.total_amount_original || 0), 0);
        const monthName = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
        
        history.push({
            month: monthName,
            value: rev,
            orders: monthlyInvoices.length
        });
    }
    return history;
};

// Filter dropdown values
router.get('/sales/filters', async (req: Request, res: Response) => {
    try {
        const customers = await CustomerModel.find({ 'deletion.is_deleted': false }, '_id customer').lean();
        const customerList = customers.map((c: any) => ({ id: c._id.toString(), name: c.customer }));

        const salespersonList = salespersons.map(name => ({ id: name, name }));
        const branchList = branches.map(name => ({ id: name, name }));
        const categoryList = ["Solar Systems", "Security Systems", "Electrical & Networking", "Services", "General Equipment"].map(name => ({ id: name, name }));

        const items = await ItemModel.find({ 'deletion.is_deleted': false }, '_id item_name').lean();
        const productList = items.map((i: any) => ({ id: i.item_name, name: i.item_name }));

        const statusList = ["Paid", "Unpaid", "Partial", "Refunded", "Draft", "Issued", "Cancelled"].map(s => ({ id: s, name: s }));

        res.json({
            customers: customerList,
            salespersons: salespersonList,
            branches: branchList,
            categories: categoryList,
            products: productList,
            statuses: statusList
        });
    } catch (err: unknown) {
        logger.error('Error fetching sales analytics filters:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Main analytics data fetch
router.get('/sales-data', async (req: Request, res: Response) => {
    try {
        const { dateRange, startDate, endDate, customer, salesperson, product, category, branch, status } = req.query;

        const now = new Date();
        let start = new Date(now.getFullYear(), 0, 1);
        let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const rangeStr = (dateRange as string || '').toLowerCase();

        if (rangeStr === 'today') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        } else if (rangeStr === 'yesterday') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        } else if (rangeStr === '7days') {
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            start.setHours(0,0,0,0);
        } else if (rangeStr === 'thismonth') {
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        } else if (rangeStr === 'lastmonth') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        } else if (rangeStr === 'quarter') {
            const quarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
        } else if (rangeStr === 'year') {
            start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        } else if (rangeStr === 'custom' && startDate && endDate) {
            start = new Date(startDate as string);
            start.setHours(0,0,0,0);
            end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
        }

        const duration = end.getTime() - start.getTime();
        const prevStart = new Date(start.getTime() - duration - 1000);
        const prevEnd = new Date(start.getTime() - 1000);

        // Fetch invoices in entire range (prevStart to end)
        const allInvoices = await InvoiceModel.find({
            'deletion.is_deleted': false,
            invoice_date: { $gte: prevStart, $lte: end }
        }).lean() as any[];

        // Fetch quotations
        const allQuotations = await QuotationModel.find({
            'deletion.is_deleted': { $ne: true },
            createdAt: { $gte: prevStart, $lte: end }
        }).lean() as any[];

        // Fetch stock prices map for profit calculations
        const stockItems = await ItemModel.find({ 'deletion.is_deleted': false }, 'item_name purchase_price').lean();
        const stockPriceMap = new Map<string, number>();
        stockItems.forEach((item: any) => {
            stockPriceMap.set(item.item_name.toLowerCase().trim(), item.purchase_price);
        });

        // Filter helper
        const filterInvoice = (invoice: any) => {
            if (customer && invoice.customer_id?.toString() !== customer && invoice.customer_name !== customer && invoice.customer_snapshot?.name !== customer) {
                return false;
            }
            if (salesperson && getSalesperson(invoice._id.toString()) !== salesperson) {
                return false;
            }
            if (branch && getBranch(invoice._id.toString()) !== branch) {
                return false;
            }
            if (status) {
                const invStatus = invoice.status;
                const payStatus = invoice.payment_status;
                if (invStatus !== status && payStatus !== status && invoice.invoice_status !== status) {
                    return false;
                }
            }
            if (category) {
                const hasCategory = (invoice.items_duplicate || []).some((item: any) => getCategory(item.description) === category);
                if (!hasCategory) return false;
            }
            if (product) {
                const hasProduct = (invoice.items_duplicate || []).some((item: any) => item.description === product);
                if (!hasProduct) return false;
            }
            return true;
        };

        const filterQuotation = (q: any) => {
            if (customer && q.customer_id?.toString() !== customer && q.customer_name !== customer && q.customer_snapshot?.name !== customer) {
                return false;
            }
            if (salesperson && getSalesperson(q._id.toString()) !== salesperson) {
                return false;
            }
            if (branch && getBranch(q._id.toString()) !== branch) {
                return false;
            }
            if (status && q.quotation_status !== status) {
                return false;
            }
            return true;
        };

        // Partition data
        const currentFilteredInvoices = allInvoices.filter(inv => inv.invoice_date >= start && inv.invoice_date <= end && filterInvoice(inv));
        const prevFilteredInvoices = allInvoices.filter(inv => inv.invoice_date >= prevStart && inv.invoice_date <= prevEnd && filterInvoice(inv));

        const currentFilteredQuotes = allQuotations.filter(q => q.createdAt >= start && q.createdAt <= end && filterQuotation(q));
        const prevFilteredQuotes = allQuotations.filter(q => q.createdAt >= prevStart && q.createdAt <= prevEnd && filterQuotation(q));

        // 1. KPIs
        const currentRevenue = currentFilteredInvoices.reduce((sum, inv) => sum + (inv.total_amount_duplicate || inv.total_amount_original || 0), 0);
        const prevRevenue = prevFilteredInvoices.reduce((sum, inv) => sum + (inv.total_amount_duplicate || inv.total_amount_original || 0), 0);

        const currentOrders = currentFilteredInvoices.length;
        const prevOrders = prevFilteredInvoices.length;

        const currentQuotesCount = currentFilteredQuotes.length;
        const prevQuotesCount = prevFilteredQuotes.length;

        const currentConv = currentQuotesCount > 0 ? (currentOrders / currentQuotesCount) * 100 : 0;
        const prevConv = prevQuotesCount > 0 ? (prevOrders / prevQuotesCount) * 100 : 0;

        const currentAOV = currentOrders > 0 ? currentRevenue / currentOrders : 0;
        const prevAOV = prevOrders > 0 ? prevRevenue / prevOrders : 0;

        const currentGrossProfit = currentFilteredInvoices.reduce((sum, inv) => sum + calculateInvoiceGrossProfit(inv, stockPriceMap), 0);
        const prevGrossProfit = prevFilteredInvoices.reduce((sum, inv) => sum + calculateInvoiceGrossProfit(inv, stockPriceMap), 0);

        const currentNetProfit = currentGrossProfit * 0.85; // Est. 15% overheads
        const prevNetProfit = prevGrossProfit * 0.85;

        const salesGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;
        const prevGrowth = 0; // Reference is 0 for past growth of prev period

        // Customer types
        const customerIdsInCurrent = [...new Set(currentFilteredInvoices.map(inv => inv.customer_id?.toString()).filter(Boolean))];
        const customerNamesInCurrent = [...new Set(currentFilteredInvoices.map(inv => inv.customer_name).filter(Boolean))];

        const oldInvoices = await InvoiceModel.find({
            'deletion.is_deleted': false,
            invoice_date: { $lt: start },
            $or: [
                { customer_id: { $in: customerIdsInCurrent } },
                { customer_name: { $in: customerNamesInCurrent } }
            ]
        }).distinct('customer_id');

        const oldCustomersSet = new Set(oldInvoices.map(id => id.toString()));

        let currentNewCustomers = 0;
        let currentReturningCustomers = 0;
        const analyzedCustomers = new Set<string>();

        currentFilteredInvoices.forEach(inv => {
            const key = inv.customer_id ? inv.customer_id.toString() : inv.customer_name;
            if (!key || analyzedCustomers.has(key)) return;
            analyzedCustomers.add(key);

            if (oldCustomersSet.has(key) || oldInvoices.includes(inv.customer_name)) {
                currentReturningCustomers++;
            } else {
                currentNewCustomers++;
            }
        });

        // Do similar for prev period
        const prevCustomerIds = [...new Set(prevFilteredInvoices.map(inv => inv.customer_id?.toString()).filter(Boolean))];
        const prevCustomerNames = [...new Set(prevFilteredInvoices.map(inv => inv.customer_name).filter(Boolean))];

        const olderInvoices = await InvoiceModel.find({
            'deletion.is_deleted': false,
            invoice_date: { $lt: prevStart },
            $or: [
                { customer_id: { $in: prevCustomerIds } },
                { customer_name: { $in: prevCustomerNames } }
            ]
        }).distinct('customer_id');
        const olderCustomersSet = new Set(olderInvoices.map(id => id.toString()));

        let prevNewCustomers = 0;
        let prevReturningCustomers = 0;
        const analyzedCustomersPrev = new Set<string>();

        prevFilteredInvoices.forEach(inv => {
            const key = inv.customer_id ? inv.customer_id.toString() : inv.customer_name;
            if (!key || analyzedCustomersPrev.has(key)) return;
            analyzedCustomersPrev.add(key);

            if (olderCustomersSet.has(key) || olderInvoices.includes(inv.customer_name)) {
                prevReturningCustomers++;
            } else {
                prevNewCustomers++;
            }
        });

        // Combine into KPIs list
        const kpis = {
            revenue: { current: currentRevenue, previous: prevRevenue },
            orders: { current: currentOrders, previous: prevOrders },
            quotations: { current: currentQuotesCount, previous: prevQuotesCount },
            conversionRate: { current: currentConv, previous: prevConv },
            aov: { current: currentAOV, previous: prevAOV },
            grossProfit: { current: currentGrossProfit, previous: prevGrossProfit },
            netProfit: { current: currentNetProfit, previous: prevNetProfit },
            growth: { current: salesGrowth, previous: prevGrowth },
            newCustomers: { current: currentNewCustomers, previous: prevNewCustomers },
            returningCustomers: { current: currentReturningCustomers, previous: prevReturningCustomers }
        };

        // 2. Charts Data
        // Monthly Revenue & Revenue vs Profit trends (last 12 months)
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyTimeline: { month: string; revenue: number; profit: number }[] = [];
        
        for (let i = 11; i >= 0; i--) {
            const d = new Date(end);
            d.setMonth(d.getMonth() - i);
            const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

            const mInvoices = allInvoices.filter(inv => inv.invoice_date >= mStart && inv.invoice_date <= mEnd && filterInvoice(inv));
            const rev = mInvoices.reduce((sum, inv) => sum + (inv.total_amount_duplicate || inv.total_amount_original || 0), 0);
            const prof = mInvoices.reduce((sum, inv) => sum + calculateInvoiceGrossProfit(inv, stockPriceMap), 0) * 0.85;
            const monthLabel = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;

            monthlyTimeline.push({ month: monthLabel, revenue: rev, profit: prof });
        }

        // Daily Sales trend in current filter range
        const dailyTimeline: { date: string; value: number }[] = [];
        const daysDiff = Math.max(1, Math.floor(duration / (24 * 60 * 60 * 1000)));
        // If range is large (e.g. > 90 days), slice by week instead of day to avoid crowded charts
        const stepDays = daysDiff > 90 ? 7 : 1;

        for (let i = 0; i <= daysDiff; i += stepDays) {
            const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
            const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
            const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

            const dInvoices = currentFilteredInvoices.filter(inv => inv.invoice_date >= dStart && inv.invoice_date <= dEnd);
            const rev = dInvoices.reduce((sum, inv) => sum + (inv.total_amount_duplicate || inv.total_amount_original || 0), 0);
            const dateLabel = `${d.getDate()} ${months[d.getMonth()]}`;

            dailyTimeline.push({ date: dateLabel, value: rev });
        }

        // Sales by Category
        const categoryMap = new Map<string, number>();
        currentFilteredInvoices.forEach(inv => {
            const items = inv.items_duplicate || inv.items_original || [];
            items.forEach((item: any) => {
                const cat = getCategory(item.description);
                // Apply category filter if set
                if (category && cat !== category) return;
                categoryMap.set(cat, (categoryMap.get(cat) || 0) + (item.taxable_value || item.total || 0));
            });
        });
        const categoryChart = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

        // Top Selling Products
        const productMap = new Map<string, { qty: number; revenue: number; profit: number }>();
        currentFilteredInvoices.forEach(inv => {
            const items = inv.items_duplicate || inv.items_original || [];
            items.forEach((item: any) => {
                const pName = item.description || 'Generic Item';
                if (product && pName !== product) return;
                
                const qty = item.quantity || 0;
                const rev = item.taxable_value || item.total || 0;
                
                const itemNameLower = pName.toLowerCase().trim();
                const costPrice = stockPriceMap.get(itemNameLower) || (item.unit_price ? item.unit_price * 0.7 : 0);
                const prof = rev - (costPrice * qty);

                const existing = productMap.get(pName) || { qty: 0, revenue: 0, profit: 0 };
                productMap.set(pName, {
                    qty: existing.qty + qty,
                    revenue: existing.revenue + rev,
                    profit: existing.profit + prof
                });
            });
        });

        const productChart = Array.from(productMap.entries())
            .map(([name, data]) => ({ name, qty: data.qty, value: data.revenue, profit: data.profit }))
            .sort((a, b) => b.value - a.value);

        // Sales by salesperson
        const salespersonMap = new Map<string, number>();
        currentFilteredInvoices.forEach(inv => {
            const sp = getSalesperson(inv._id.toString());
            salespersonMap.set(sp, (salespersonMap.get(sp) || 0) + (inv.total_amount_duplicate || inv.total_amount_original || 0));
        });
        const salespersonChart = Array.from(salespersonMap.entries()).map(([name, value]) => ({ name, value }));

        // Sales by Customer
        const customerMapChart = new Map<string, number>();
        currentFilteredInvoices.forEach(inv => {
            const cName = inv.customer_name || (inv.customer_snapshot && inv.customer_snapshot.name) || 'Unknown Customer';
            customerMapChart.set(cName, (customerMapChart.get(cName) || 0) + (inv.total_amount_duplicate || inv.total_amount_original || 0));
        });
        const sortedCustomers = Array.from(customerMapChart.entries()).sort((a, b) => b[1] - a[1]);
        const customerChart = sortedCustomers.slice(0, 5).map(([name, value]) => ({ name, value }));
        if (sortedCustomers.length > 5) {
            const otherSum = sortedCustomers.slice(5).reduce((sum, item) => sum + item[1], 0);
            customerChart.push({ name: 'Others', value: otherSum });
        }

        // Funnel
        const quotesSent = currentFilteredQuotes.filter(q => q.quotation_status === 'Sent' || q.converted_invoice_id).length;
        const quotesApproved = currentFilteredQuotes.filter(q => ['Approved', 'Invoiced'].includes(q.quotation_status) || q.converted_invoice_id).length;
        const funnelChart = [
            { stage: 'Quotations Created', value: currentQuotesCount },
            { stage: 'Proposals Sent', value: quotesSent },
            { stage: 'Quotes Approved', value: quotesApproved },
            { stage: 'Invoices Generated', value: currentOrders }
        ];

        // Payment Status distribution
        const paymentMap = new Map<string, number>();
        currentFilteredInvoices.forEach(inv => {
            const status = inv.payment_status || 'Unpaid';
            paymentMap.set(status, (paymentMap.get(status) || 0) + 1);
        });
        const paymentChart = Array.from(paymentMap.entries()).map(([name, value]) => ({ name, value }));

        // Monthly growth
        const monthlyGrowthChart: { month: string; value: number }[] = [];
        for (let i = 1; i < monthlyTimeline.length; i++) {
            const prev = monthlyTimeline[i - 1].revenue;
            const curr = monthlyTimeline[i].revenue;
            const growth = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
            monthlyGrowthChart.push({ month: monthlyTimeline[i].month, value: parseFloat(growth.toFixed(1)) });
        }

        // Heatmap
        const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
        currentFilteredInvoices.forEach(inv => {
            const date = new Date(inv.invoice_date);
            const day = date.getDay(); // 0-6
            const hour = date.getHours(); // 0-23
            heatmap[day][hour] += (inv.total_amount_duplicate || inv.total_amount_original || 0);
        });

        // 3. Tables Data
        // Top Customers
        const customerTableMap = new Map<string, { orders: number; revenue: number; profit: number; outstanding: number }>();
        currentFilteredInvoices.forEach(inv => {
            const cName = inv.customer_name || (inv.customer_snapshot && inv.customer_snapshot.name) || 'Unknown Customer';
            const rev = inv.total_amount_duplicate || inv.total_amount_original || 0;
            const paid = inv.total_paid_amount || 0;
            const prof = calculateInvoiceGrossProfit(inv, stockPriceMap) * 0.85;
            const outstanding = Math.max(0, rev - paid);

            const existing = customerTableMap.get(cName) || { orders: 0, revenue: 0, profit: 0, outstanding: 0 };
            customerTableMap.set(cName, {
                orders: existing.orders + 1,
                revenue: existing.revenue + rev,
                profit: existing.profit + prof,
                outstanding: existing.outstanding + outstanding
            });
        });
        const topCustomersTable = Array.from(customerTableMap.entries())
            .map(([customerName, data]) => ({
                customer: customerName,
                orders: data.orders,
                revenue: data.revenue,
                profit: data.profit,
                outstanding: data.outstanding
            }))
            .sort((a, b) => b.revenue - a.revenue);

        // Top Products
        const stockItemsMap = new Map<string, number>();
        const itemsList = await ItemModel.find({ 'deletion.is_deleted': false }, 'item_name stock_quantity').lean();
        itemsList.forEach((it: any) => {
            stockItemsMap.set(it.item_name.toLowerCase().trim(), it.stock_quantity);
        });

        const topProductsTable = productChart.map(p => {
            const stockRemaining = stockItemsMap.get(p.name.toLowerCase().trim()) ?? 0;
            return {
                product: p.name,
                quantitySold: p.qty,
                revenue: p.value,
                profit: p.profit,
                stockRemaining
            };
        });

        // Top Salespersons
        const salespersonTableMap = new Map<string, { orders: number; revenue: number; quotes: number }>();
        currentFilteredInvoices.forEach(inv => {
            const spName = getSalesperson(inv._id.toString());
            const rev = inv.total_amount_duplicate || inv.total_amount_original || 0;

            const existing = salespersonTableMap.get(spName) || { orders: 0, revenue: 0, quotes: 0 };
            salespersonTableMap.set(spName, {
                orders: existing.orders + 1,
                revenue: existing.revenue + rev,
                quotes: existing.quotes
            });
        });
        // Count quotations per salesperson
        currentFilteredQuotes.forEach(q => {
            const spName = getSalesperson(q._id.toString());
            const existing = salespersonTableMap.get(spName) || { orders: 0, revenue: 0, quotes: 0 };
            salespersonTableMap.set(spName, {
                ...existing,
                quotes: existing.quotes + 1
            });
        });

        const topSalespersonsTable = Array.from(salespersonTableMap.entries()).map(([name, data]) => {
            const conv = data.quotes > 0 ? (data.orders / data.quotes) * 100 : 0;
            return {
                name,
                orders: data.orders,
                revenue: data.revenue,
                conversionRate: conv
            };
        }).sort((a, b) => b.revenue - a.revenue);

        // 4. Insights Section
        const insights: { text: string; type: 'success' | 'warning' | 'info' }[] = [];
        if (salesGrowth > 0) {
            insights.push({ text: `Revenue increased by ${salesGrowth.toFixed(1)}% compared to the previous period.`, type: 'success' });
        } else if (salesGrowth < 0) {
            insights.push({ text: `Revenue decreased by ${Math.abs(salesGrowth).toFixed(1)}% compared to the previous period.`, type: 'warning' });
        }

        if (productChart.length > 0) {
            insights.push({ text: `Product "${productChart[0].name}" generated the highest revenue (₹${productChart[0].value.toLocaleString()}).`, type: 'info' });
        }

        if (currentRevenue > 0 && topCustomersTable.length > 0) {
            const pct = (topCustomersTable[0].revenue / currentRevenue) * 100;
            insights.push({ text: `Top customer "${topCustomersTable[0].customer}" contributed ${pct.toFixed(1)}% of total sales.`, type: 'info' });
        }

        if (topSalespersonsTable.length > 0) {
            insights.push({ text: `Salesperson ${topSalespersonsTable[0].name} generated the most revenue (₹${topSalespersonsTable[0].revenue.toLocaleString()}).`, type: 'success' });
        }

        if (categoryChart.length > 0) {
            const sortedCat = [...categoryChart].sort((a, b) => b.value - a.value);
            insights.push({ text: `"${sortedCat[0].name}" was the highest performing category representing ₹${sortedCat[0].value.toLocaleString()} in sales.`, type: 'info' });
        }

        if (currentConv < prevConv) {
            insights.push({ text: `Quote conversion rate dropped by ${(prevConv - currentConv).toFixed(1)}% compared to the previous period.`, type: 'warning' });
        } else if (currentConv > prevConv) {
            insights.push({ text: `Quote conversion rate increased by ${(currentConv - prevConv).toFixed(1)}% compared to the previous period.`, type: 'success' });
        }

        if (currentAOV > prevAOV) {
            insights.push({ text: `Average order value increased to ₹${Math.round(currentAOV).toLocaleString()} from ₹${Math.round(prevAOV).toLocaleString()}.`, type: 'success' });
        } else if (currentAOV < prevAOV) {
            insights.push({ text: `Average order value decreased to ₹${Math.round(currentAOV).toLocaleString()} from ₹${Math.round(prevAOV).toLocaleString()}.`, type: 'warning' });
        }

        // 5. Comparison
        const comparison = {
            currentMonth: {
                revenue: currentRevenue,
                orders: currentOrders,
                profit: currentNetProfit,
                growth: salesGrowth,
                newCustomers: currentNewCustomers,
                conversionRate: currentConv
            },
            lastMonth: {
                revenue: prevRevenue,
                orders: prevOrders,
                profit: prevNetProfit,
                growth: prevGrowth,
                newCustomers: prevNewCustomers,
                conversionRate: prevConv
            }
        };

        // 6. Forecasts
        const past6Months = await getPast6MonthsHistory(end);
        const revenueForecast = predictNextMonth(past6Months);
        const orderForecast = predictNextMonth(past6Months.map(p => ({ month: p.month, value: p.orders })));

        const nextMonthName = months[(end.getMonth() + 1) % 12] + ' ' + (end.getMonth() + 1 > 11 ? end.getFullYear() + 1 : end.getFullYear()).toString().slice(-2);
        
        const forecast = {
            nextMonthName,
            predictedRevenue: Math.round(revenueForecast.predictedValue),
            predictedOrders: Math.round(orderForecast.predictedValue),
            projectedGrowth: currentRevenue > 0 ? ((revenueForecast.predictedValue - currentRevenue) / currentRevenue) * 100 : 0,
            pastHistory: past6Months
        };

        res.json({
            kpis,
            charts: {
                monthlyRevenue: monthlyTimeline,
                dailySales: dailyTimeline,
                salesByCategory: categoryChart,
                topSellingProducts: productChart.slice(0, 5),
                revenueBySalesperson: salespersonChart,
                salesByCustomer: customerChart,
                conversionFunnel: funnelChart,
                revenueVsProfit: monthlyTimeline,
                paymentStatus: paymentChart,
                monthlyGrowth: monthlyGrowthChart
            },
            tables: {
                topCustomers: topCustomersTable,
                topProducts: topProductsTable,
                topSalespersons: topSalespersonsTable
            },
            insights,
            comparison,
            heatmap,
            forecast
        });
    } catch (err: unknown) {
        logger.error('Error fetching sales analytics details:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
