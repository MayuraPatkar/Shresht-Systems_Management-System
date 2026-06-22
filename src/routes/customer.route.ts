import { Router, Request, Response } from 'express';
import { CustomerModel, InvoiceModel, QuotationModel, PaymentModel, ServiceModel, VoucherModel, CommunicationModel } from '../models';
import logger from '../utils/logger';
import { Types } from 'mongoose';
import { generateNextId } from '../utils/idGenerator';

const router: Router = Router();

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildCustomerDisplayName(customer: any): string {
    const firstName = String(customer?.first_name ?? '').trim();
    const lastName = String(customer?.last_name ?? '').trim();
    return [firstName, lastName].filter(Boolean).join(' ').trim() || String(customer?.name ?? '').trim();
}

function normalizeCustomerPayload(payload: any) {
    const customer = { ...(payload?.customer || {}) };
    const billingAddress = { ...(payload?.billing_address || {}) };
    const shippingAddress = { ...(payload?.shipping_address || {}) };

    customer.first_name = String(customer.first_name ?? '').trim();
    customer.last_name = String(customer.last_name ?? '').trim();
    customer.phone = String(customer.phone ?? '').replace(/\D/g, '').slice(0, 10);
    customer.alternate_phone = String(customer.alternate_phone ?? '').replace(/\D/g, '').slice(0, 10);
    customer.email = String(customer.email ?? '').trim().toLowerCase();

    const displayName = buildCustomerDisplayName(customer);
    customer.name = displayName;

    return {
        ...payload,
        customer,
        gstin: String(payload?.gstin ?? '').trim().toUpperCase(),
        billing_address: billingAddress,
        shipping_address: shippingAddress
    };
}

async function findDuplicateCustomer(payload: any, excludeId?: string) {
    const orQuery: any[] = [];
    const phone = payload?.customer?.phone;
    const email = payload?.customer?.email;

    if (phone) orQuery.push({ 'customer.phone': phone });
    if (email) orQuery.push({ 'customer.email': email });

    if (orQuery.length === 0) return null;

    const query: any = {
        $or: orQuery,
        'deletion.is_deleted': false
    };

    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    return CustomerModel.findOne(query);
}

function buildCustomerRelationQuery(customerObjectId: Types.ObjectId, customer: any) {
    const fullName = buildCustomerDisplayName(customer?.customer);
    const phone = String(customer?.customer?.phone ?? '').trim();
    const email = String(customer?.customer?.email ?? '').trim().toLowerCase();
    const identityMatchers: any[] = [
        { customer_id: customerObjectId },
        { 'customer_snapshot.customer_id': customerObjectId }
    ];

    if (phone) {
        identityMatchers.push({ 'customer_snapshot.phone': phone }, { customer_phone: phone });
    }

    if (email) {
        identityMatchers.push({ 'customer_snapshot.email': email }, { customer_email: email });
    }

    if (fullName) {
        const nameRegex = new RegExp(`^${escapeRegex(fullName)}$`, 'i');
        identityMatchers.push({ 'customer_snapshot.name': nameRegex }, { customer_name: nameRegex });
    }

    return identityMatchers;
}

function normalizeInvoicePayments(invoices: any[]) {
    return invoices.flatMap((invoice: any) => {
        const invoicePayments = Array.isArray(invoice?.payments) ? invoice.payments : [];
        return invoicePayments.map((payment: any, index: number) => ({
            _id: `${invoice._id}-invoice-payment-${index}`,
            payment_date: payment.payment_date,
            amount: Number(payment.paid_amount || 0),
            mode: payment.payment_mode || '-',
            transaction_details: payment.extra_details || '',
            party_type: 'Customer',
            party_id: invoice.customer_id,
            reference_type: 'Invoice',
            reference_id: invoice._id,
            reference_no: invoice.invoice_id || invoice.invoice_no,
            source: 'invoice',
            payment_ref: payment.payment_ref ? String(payment.payment_ref) : undefined
        }));
    });
}

/**
 * @route   POST /customer
 * @desc    Create a new customer
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const payload = normalizeCustomerPayload(req.body);
        const existing = await findDuplicateCustomer(payload);
        if (existing) {
            return res.status(400).json({ error: 'Customer with this phone or email already exists' });
        }

        const customer_id = await generateNextId('customer');
        const newCustomer = new CustomerModel({
            ...payload,
            customer_id
        });
        await newCustomer.save();
        res.status(201).json(newCustomer);
    } catch (err: unknown) {
        logger.error('Error creating customer:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   GET /customer
 * @desc    Get all customers with search and filters
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { search, type, status, deleted } = req.query;
        let query: any = {};

        if (deleted === 'true') {
            query['deletion.is_deleted'] = true;
        } else {
            query['deletion.is_deleted'] = false;
        }

        if (search) {
            const searchRegex = { $regex: search as string, $options: 'i' };
            query.$or = [
                { 'customer.first_name': searchRegex },
                { 'customer.last_name': searchRegex },
                { 'customer.name': searchRegex },
                { 'customer.phone': searchRegex },
                { 'customer.email': searchRegex },
                { gstin: searchRegex }
            ];
        }

        if (type) query.customer_type = type;
        if (status === 'archived') {
            query.is_archived = true;
        } else {
            query.is_archived = { $ne: true };
            if (status) query.is_active = status === 'active';
        }

        const customers = await CustomerModel.find(query).sort({ createdAt: -1 });
        res.json(customers);
    } catch (err: unknown) {
        logger.error('Error fetching customers:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   GET /customer/:id
 * @desc    Get single customer
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const customerId = String(req.params.id || '');
        if (!Types.ObjectId.isValid(customerId)) {
            return res.status(400).json({ error: 'Invalid customer ID' });
        }
        const customer = await CustomerModel.findOne({ _id: customerId, 'deletion.is_deleted': false });
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        res.json(customer);
    } catch (err: unknown) {
        logger.error('Error fetching customer:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   PUT /customer/:id
 * @desc    Update customer
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const customerId = String(req.params.id || '');
        if (!Types.ObjectId.isValid(customerId)) {
            return res.status(400).json({ error: 'Invalid customer ID' });
        }

        const payload = normalizeCustomerPayload(req.body);
        const existing = await findDuplicateCustomer(payload, customerId);
        if (existing) {
            return res.status(400).json({ error: 'Customer with this phone or email already exists' });
        }

        const customer = await CustomerModel.findOneAndUpdate(
            { _id: customerId, 'deletion.is_deleted': false },
            { $set: payload },
            { new: true }
        );
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        res.json(customer);
    } catch (err: unknown) {
        logger.error('Error updating customer:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   DELETE /customer/:id
 * @desc    Soft delete customer
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const customerId = String(req.params.id || '');
        if (!Types.ObjectId.isValid(customerId)) {
            return res.status(400).json({ error: 'Invalid customer ID' });
        }
        const username = String((req.query && req.query.username) || (req.headers && req.headers['x-username']) || (req.body && req.body.username) || 'Admin');
        const customer = await CustomerModel.findOneAndUpdate(
            { _id: customerId, 'deletion.is_deleted': false },
            { 
                $set: { 
                    'deletion.is_deleted': true, 
                    'deletion.deleted_at': new Date(),
                    'deletion.deleted_by': username,
                    is_active: false
                } 
            },
            { new: true }
        );
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        res.json({ message: 'Customer deleted successfully' });
    } catch (err: unknown) {
        logger.error('Error deleting customer:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   PUT /customer/:id/archive
 * @desc    Archive customer
 */
router.put('/:id/archive', async (req: Request, res: Response) => {
    try {
        const customerId = String(req.params.id || '');
        if (!Types.ObjectId.isValid(customerId)) {
            return res.status(400).json({ error: 'Invalid customer ID' });
        }
        const customer = await CustomerModel.findOneAndUpdate(
            { _id: customerId, 'deletion.is_deleted': false },
            { $set: { is_archived: true } },
            { new: true }
        );
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        res.json({ message: 'Customer archived successfully', customer });
    } catch (err: unknown) {
        logger.error('Error archiving customer:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   PUT /customer/:id/restore
 * @desc    Restore customer from archive
 */
router.put('/:id/restore', async (req: Request, res: Response) => {
    try {
        const customerId = String(req.params.id || '');
        if (!Types.ObjectId.isValid(customerId)) {
            return res.status(400).json({ error: 'Invalid customer ID' });
        }
        const customer = await CustomerModel.findOneAndUpdate(
            { _id: customerId, 'deletion.is_deleted': false },
            { $set: { is_archived: false } },
            { new: true }
        );
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        res.json({ message: 'Customer restored successfully', customer });
    } catch (err: unknown) {
        logger.error('Error restoring customer:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   GET /customer/:id/full-details
 * @desc    Get comprehensive customer details (quotations, invoices, services, payments)
 */
router.get('/:id/full-details', async (req: Request, res: Response) => {
    try {
        const customerId = String(req.params.id || '');
        if (!Types.ObjectId.isValid(customerId)) {
            return res.status(400).json({ error: 'Invalid customer ID' });
        }
        const customerObjectId = new Types.ObjectId(customerId);

        const customer = await CustomerModel.findOne({ _id: customerObjectId, 'deletion.is_deleted': false });
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const relationQuery = buildCustomerRelationQuery(customerObjectId, customer);

        // Fetch related documents first so payments can also be matched by invoice reference.
        const [quotations, invoices] = await Promise.all([
            QuotationModel.find({ 
                $or: relationQuery,
                'deletion.is_deleted': false 
            }).sort({ quotation_date: -1 }),
            InvoiceModel.find({ 
                $or: relationQuery,
                'deletion.is_deleted': false 
            }).sort({ invoice_date: -1 })
        ]);

        const invoiceObjectIds = invoices.map((inv: any) => inv._id);
        const paymentMatchers: any[] = [
            { 'party.ref': customerObjectId, 'party.type': 'Customer' },
            { party_id: customerObjectId, party_type: 'Customer' }
        ];
        if (invoiceObjectIds.length > 0) {
            paymentMatchers.push(
                { 'reference.type': 'Invoice', 'reference.ref': { $in: invoiceObjectIds } },
                { reference_type: 'Invoice', reference_id: { $in: invoiceObjectIds } }
            );
        }

        const directPayments = await PaymentModel.find({
            $or: paymentMatchers,
            'deletion.is_deleted': { $ne: true }
        }).sort({ payment_date: -1 });

        const embeddedInvoicePayments = normalizeInvoicePayments(invoices);
        
        // De-duplicate: filter out embedded invoice payments that have a payment_ref matching an ID in directPayments
        const directPaymentIds = new Set(directPayments.map((p: any) => p._id.toString()));
        const uniqueEmbeddedPayments = embeddedInvoicePayments.filter((p: any) => 
            !p.payment_ref || !directPaymentIds.has(p.payment_ref)
        );

        const payments = [...directPayments, ...uniqueEmbeddedPayments]
            .sort((a: any, b: any) => new Date(b.payment_date || b.createdAt || 0).getTime() - new Date(a.payment_date || a.createdAt || 0).getTime());

        // Fetch services via invoice ObjectIds. Service.invoice_id is an ObjectId field.
        const invoiceIds = invoices.map(inv => inv._id);
        
        const serviceQuery: any = { 'deletion.is_deleted': false };
        const serviceLinks: any[] = [];
        if (invoiceIds.length > 0) serviceLinks.push({ invoice_id: { $in: invoiceIds } });
        
        const services = serviceLinks.length > 0
            ? await ServiceModel.find({ ...serviceQuery, $or: serviceLinks }).sort({ service_date: -1 })
            : [];

        // Fetch vouchers linked to this customer by name (partyType=Customer)
        const customerDisplayName = buildCustomerDisplayName(customer.customer as any);
        const vouchers = customerDisplayName
            ? await VoucherModel.find({
                partyType: 'Customer',
                partyName: { $regex: new RegExp(`^${escapeRegex(customerDisplayName)}$`, 'i') },
                is_deleted: { $ne: true }
              }).sort({ date: -1 }).lean()
            : [];

        // Calculate statistics
        const stats = {
            totalQuotations: quotations.length,
            totalInvoices: invoices.length,
            totalServices: services.length,
            totalPayments: payments.length,
            totalInvoicedAmount: invoices.reduce((sum, inv: any) => sum + (
                Number(inv?.totals_duplicate?.grand_total) ||
                Number(inv?.total_amount_duplicate) ||
                Number(inv?.total_amount_with_tax) ||
                Number(inv?.grand_total) ||
                0
            ), 0),
            totalPaidAmount: payments.reduce((sum, pay) => sum + pay.amount, 0),
        };
        (stats as any).pendingBalance = stats.totalInvoicedAmount - stats.totalPaidAmount;

        (stats as any).totalVouchers = vouchers.length;
        (stats as any).totalVoucherAmount = vouchers.reduce((sum: number, v: any) => sum + (v.amount || 0), 0);

        // Fetch communications linked to this customer
        const recipientList: string[] = [];
        if (customer.customer?.phone) recipientList.push(customer.customer.phone);
        if (customer.customer?.alternate_phone) recipientList.push(customer.customer.alternate_phone);
        if (customer.customer?.email) recipientList.push(customer.customer.email.toLowerCase());

        const commQuery: any[] = [];
        recipientList.forEach(r => {
            commQuery.push({ recipient: r });
            const digits = r.replace(/[^0-9]/g, '');
            if (digits.length >= 10) {
                const last10 = digits.slice(-10);
                commQuery.push({ recipient: { $regex: new RegExp(last10 + '$') } });
            }
        });

        const communications = commQuery.length > 0
            ? await CommunicationModel.find({ $or: commQuery }).sort({ sentAt: -1 }).limit(100)
            : [];

        res.json({
            customer,
            quotations,
            invoices,
            services,
            payments,
            vouchers,
            communications,
            stats
        });
    } catch (err: unknown) {
        logger.error('Error fetching full customer details:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Restore soft-deleted customer
router.post('/restoreItem', async (req: Request, res: Response) => {
    const { itemId } = req.body;
    try {
        const customer = await CustomerModel.findOne({ _id: itemId });
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        if (customer.deletion) {
            customer.deletion.is_deleted = false;
            customer.deletion.deleted_at = undefined;
            customer.deletion.deleted_by = undefined;
            customer.is_active = true;
            await customer.save();
        }

        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Customer restore failed', { service: "customer", itemId, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to restore customer' });
    }
});

// Permanently delete customer
router.post('/hardDeleteItem', async (req: Request, res: Response) => {
    const { itemId } = req.body;
    try {
        const result = await CustomerModel.deleteOne({ _id: itemId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Customer permanent deletion failed', { service: "customer", itemId, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to permanently delete customer' });
    }
});

// Bulk restore customers
router.post('/bulkRestore', async (req: Request, res: Response) => {
    const { itemIds } = req.body;
    try {
        await CustomerModel.updateMany(
            { _id: { $in: itemIds } },
            { 
                $set: { 
                    "deletion.is_deleted": false,
                    "deletion.deleted_at": undefined,
                    "deletion.deleted_by": undefined,
                    is_active: true
                } 
            }
        );
        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Bulk customer restore failed', { service: "customer", count: itemIds?.length, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to bulk restore customers' });
    }
});

// Bulk permanently delete customers
router.post('/bulkHardDelete', async (req: Request, res: Response) => {
    const { itemIds } = req.body;
    try {
        await CustomerModel.deleteMany({ _id: { $in: itemIds } });
        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Bulk customer permanent deletion failed', { service: "customer", count: itemIds?.length, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to bulk permanently delete customers' });
    }
});

export default router;
