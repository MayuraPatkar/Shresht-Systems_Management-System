/**
 * search.route.ts
 *
 * Global search endpoint: GET /search?q=<query>
 * Fans out to multiple models in parallel and returns categorized results.
 */

import { Router, Request, Response } from 'express';
import {
    CustomerModel,
    SupplierModel,
    InvoiceModel,
    QuotationModel,
    PurchaseOrderModel,
    PurchaseModel,
    ServiceModel,
    ItemModel,
    PaymentModel,
    VoucherModel,
} from '../models';

const router: Router = Router();

const LIMIT = 5; // Results per category

interface SearchResult {
    category: string;
    id: string;
    title: string;
    subtitle: string;
    url: string;
    icon: string;
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /search?q=<query>
 * Returns categorized search results across all major entities.
 */
router.get('/', async (req: Request, res: Response) => {
    const raw = (req.query.q as string || '').trim();

    if (!raw || raw.length < 2) {
        res.json({ results: [], query: raw });
        return;
    }

    const escaped = escapeRegex(raw);
    const pattern = new RegExp(escaped, 'i');

    try {
        const [
            customers,
            suppliers,
            invoices,
            quotations,
            purchaseOrders,
            purchases,
            services,
            stockItems,
            payments,
            vouchers,
        ] = await Promise.allSettled([
            // Customers
            CustomerModel.find({
                'deletion.is_deleted': { $ne: true },
                $or: [
                    { 'customer.name': pattern },
                    { 'customer.first_name': pattern },
                    { 'customer.last_name': pattern },
                    { 'customer.phone': pattern },
                    { 'customer.email': pattern },
                    { customer_id: pattern },
                    { gstin: pattern },
                ],
            })
                .select('_id customer_id customer customer_type createdAt')
                .limit(LIMIT)
                .lean(),

            // Suppliers
            SupplierModel.find({
                'deletion.is_deleted': { $ne: true },
                $or: [
                    { supplier_name: pattern },
                    { phone: pattern },
                    { email: pattern },
                    { supplier_id: pattern },
                    { gstin: pattern },
                ],
            })
                .select('_id supplier_id supplier_name phone supplier_type createdAt')
                .limit(LIMIT)
                .lean(),

            // Invoices
            InvoiceModel.find({
                'deletion.is_deleted': { $ne: true },
                $or: [
                    { invoice_no: pattern },
                    { invoice_id: pattern },
                    { project_name: pattern },
                    { customer_name: pattern },
                    { 'customer_snapshot.name': pattern },
                    { 'customer_snapshot.phone': pattern },
                ],
            })
                .select('_id invoice_no invoice_id invoice_date customer_name customer_snapshot status totals_original')
                .limit(LIMIT)
                .lean(),

            // Quotations
            QuotationModel.find({
                is_deleted: { $ne: true },
                $or: [
                    { quotation_no: pattern },
                    { project_name: pattern },
                    { 'customer_snapshot.name': pattern },
                    { 'customer_snapshot.phone': pattern },
                ],
            })
                .select('_id quotation_no quotation_date project_name customer_snapshot quotation_status totals')
                .limit(LIMIT)
                .lean(),

            // Purchase Orders
            PurchaseOrderModel.find({
                'deletion.is_deleted': { $ne: true },
                $or: [
                    { purchase_order_no: pattern },
                    { purchase_invoice_no: pattern },
                    { 'supplier_snapshot.name': pattern },
                    { 'supplier_snapshot.phone': pattern },
                ],
            })
                .select('_id purchase_order_no purchase_date supplier_snapshot purchase_status totals')
                .limit(LIMIT)
                .lean(),

            // Purchases (Bills)
            PurchaseModel.find({
                'deletion.is_deleted': { $ne: true },
                $or: [
                    { purchase_no: pattern },
                    { purchase_invoice_no: pattern },
                    { 'supplier_snapshot.name': pattern },
                ],
            })
                .select('_id purchase_no purchase_date supplier_snapshot purchase_status totals')
                .limit(LIMIT)
                .lean(),

            // Services
            ServiceModel.find({
                'deletion.is_deleted': { $ne: true },
                $or: [
                    { service_no: pattern },
                    { service_id: pattern },
                ],
            })
                .select('_id service_no service_id service_date service_status total_amount_with_tax')
                .limit(LIMIT)
                .lean(),

            // Stock Items
            ItemModel.find({
                'deletion.is_deleted': { $ne: true },
                $or: [
                    { item_name: pattern },
                    { brand: pattern },
                    { category: pattern },
                    { hsn_sac: pattern },
                ],
            })
                .select('_id item_name brand category stock_quantity selling_price item_type')
                .limit(LIMIT)
                .lean(),

            // Payments
            PaymentModel.find({
                'deletion.is_deleted': { $ne: true },
                $or: [
                    { voucher_no: pattern },
                    { 'party.id': pattern },
                    { 'reference.id': pattern },
                    { transaction_details: pattern },
                ],
            })
                .select('_id voucher_no payment_date amount direction mode party reference')
                .limit(LIMIT)
                .lean(),

            // Vouchers
            VoucherModel.find({
                $or: [
                    { voucherNumber: pattern },
                    { partyName: pattern },
                    { referenceNumber: pattern },
                    { paidTowards: pattern },
                ],
            })
                .select('_id voucherNumber date amount partyName paymentMethod')
                .limit(LIMIT)
                .lean(),
        ]);

        const results: SearchResult[] = [];

        // --- Customers ---
        if (customers.status === 'fulfilled') {
            for (const c of customers.value as any[]) {
                const name = [c.customer?.first_name, c.customer?.last_name].filter(Boolean).join(' ').trim()
                    || c.customer?.name
                    || c.customer_id
                    || 'Customer';
                results.push({
                    category: 'Customer',
                    id: String(c._id),
                    title: name,
                    subtitle: [c.customer?.phone, c.customer_type].filter(Boolean).join(' · '),
                    url: `/customer/details?id=${c._id}`,
                    icon: 'fa-user',
                });
            }
        }

        // --- Suppliers ---
        if (suppliers.status === 'fulfilled') {
            for (const s of suppliers.value as any[]) {
                results.push({
                    category: 'Supplier',
                    id: String(s._id),
                    title: s.supplier_name || s.supplier_id || 'Supplier',
                    subtitle: [s.phone, s.supplier_type].filter(Boolean).join(' · '),
                    url: `/supplier/details?id=${s._id}`,
                    icon: 'fa-truck',
                });
            }
        }

        // --- Invoices ---
        if (invoices.status === 'fulfilled') {
            for (const inv of invoices.value as any[]) {
                const num = inv.invoice_no || inv.invoice_id || '—';
                const cName = inv.customer_snapshot?.name || inv.customer_name || '';
                const total = inv.totals_original?.grand_total;
                const dateStr = inv.invoice_date
                    ? new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                    : '';
                results.push({
                    category: 'Invoice',
                    id: String(inv._id),
                    title: `Invoice #${num}`,
                    subtitle: [cName, total != null ? `₹${total.toLocaleString('en-IN')}` : '', dateStr].filter(Boolean).join(' · '),
                    url: `/invoice/invoice.html?id=${inv._id}`,
                    icon: 'fa-file-invoice-dollar',
                });
            }
        }

        // --- Quotations ---
        if (quotations.status === 'fulfilled') {
            for (const q of quotations.value as any[]) {
                const cName = q.customer_snapshot?.name || '';
                const dateStr = q.quotation_date
                    ? new Date(q.quotation_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                    : '';
                results.push({
                    category: 'Quotation',
                    id: String(q._id),
                    title: `Quotation #${q.quotation_no || '—'}`,
                    subtitle: [q.project_name, cName, dateStr].filter(Boolean).join(' · '),
                    url: `/quotation/details?id=${encodeURIComponent(q.quotation_no || String(q._id))}`,
                    icon: 'fa-file-alt',
                });
            }
        }

        // --- Purchase Orders ---
        if (purchaseOrders.status === 'fulfilled') {
            for (const po of purchaseOrders.value as any[]) {
                const sName = po.supplier_snapshot?.name || '';
                const dateStr = po.purchase_date
                    ? new Date(po.purchase_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                    : '';
                results.push({
                    category: 'Purchase Order',
                    id: String(po._id),
                    title: `PO #${po.purchase_order_no || '—'}`,
                    subtitle: [sName, po.purchase_status, dateStr].filter(Boolean).join(' · '),
                    url: `/purchaseOrder/purchaseOrder.html?id=${po._id}`,
                    icon: 'fa-shopping-cart',
                });
            }
        }

        // --- Purchases (Bills) ---
        if (purchases.status === 'fulfilled') {
            for (const p of purchases.value as any[]) {
                const sName = p.supplier_snapshot?.name || '';
                const dateStr = p.purchase_date
                    ? new Date(p.purchase_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                    : '';
                results.push({
                    category: 'Purchase Bill',
                    id: String(p._id),
                    title: `Purchase #${p.purchase_no || '—'}`,
                    subtitle: [sName, dateStr].filter(Boolean).join(' · '),
                    url: `/purchase/purchase.html?id=${p._id}`,
                    icon: 'fa-shopping-bag',
                });
            }
        }

        // --- Services ---
        if (services.status === 'fulfilled') {
            for (const svc of services.value as any[]) {
                const dateStr = svc.service_date
                    ? new Date(svc.service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                    : '';
                const amount = svc.total_amount_with_tax;
                results.push({
                    category: 'Service',
                    id: String(svc._id),
                    title: `Service #${svc.service_no || svc.service_id || '—'}`,
                    subtitle: [svc.service_status, amount != null ? `₹${amount.toLocaleString('en-IN')}` : '', dateStr].filter(Boolean).join(' · '),
                    url: `/service/service.html?id=${svc._id}`,
                    icon: 'fa-wrench',
                });
            }
        }

        // --- Stock Items ---
        if (stockItems.status === 'fulfilled') {
            for (const item of stockItems.value as any[]) {
                results.push({
                    category: 'Stock Item',
                    id: String(item._id),
                    title: item.item_name || '—',
                    subtitle: [item.brand, item.category, item.stock_quantity != null ? `Qty: ${item.stock_quantity}` : ''].filter(Boolean).join(' · '),
                    url: `/stock/stock.html?q=${encodeURIComponent(item.item_name || '')}`,
                    icon: 'fa-box',
                });
            }
        }

        // --- Payments ---
        if (payments.status === 'fulfilled') {
            for (const pay of payments.value as any[]) {
                const dateStr = pay.payment_date
                    ? new Date(pay.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                    : '';
                const ref = pay.voucher_no || pay.reference?.id || '—';
                results.push({
                    category: 'Payment',
                    id: String(pay._id),
                    title: `Payment ${ref}`,
                    subtitle: [pay.direction === 'IN' ? 'Received' : 'Sent', pay.amount != null ? `₹${pay.amount.toLocaleString('en-IN')}` : '', pay.mode, dateStr].filter(Boolean).join(' · '),
                    url: `/payment/payment.html?id=${pay._id}`,
                    icon: 'fa-money-bill-wave',
                });
            }
        }

        // --- Vouchers ---
        if (vouchers.status === 'fulfilled') {
            for (const v of vouchers.value as any[]) {
                const dateStr = v.date
                    ? new Date(v.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                    : '';
                results.push({
                    category: 'Voucher',
                    id: String(v._id),
                    title: `Voucher #${v.voucherNumber || '—'}`,
                    subtitle: [v.partyName, v.amount != null ? `₹${v.amount.toLocaleString('en-IN')}` : '', dateStr].filter(Boolean).join(' · '),
                    url: `/voucher/voucher.html?id=${v._id}`,
                    icon: 'fa-receipt',
                });
            }
        }

        res.json({ results, query: raw });
    } catch (err: any) {
        console.error('[Search] Error:', err);
        res.status(500).json({ results: [], query: raw, error: 'Search failed' });
    }
});

export default router;
