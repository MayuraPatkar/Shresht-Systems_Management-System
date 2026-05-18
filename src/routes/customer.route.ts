import { Router, Request, Response } from 'express';
import { CustomerModel, InvoiceModel, QuotationModel, PaymentModel, ServiceModel } from '../models';
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
        const { search, type, status } = req.query;
        let query: any = { 'deletion.is_deleted': false };

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
        const customer = await CustomerModel.findOneAndUpdate(
            { _id: customerId, 'deletion.is_deleted': false },
            { 
                $set: { 
                    'deletion.is_deleted': true, 
                    'deletion.deleted_at': new Date(),
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

        // Fetch related data in parallel
        const [quotations, invoices, payments] = await Promise.all([
            QuotationModel.find({ 
                $or: relationQuery,
                'deletion.is_deleted': false 
            }).sort({ quotation_date: -1 }),
            InvoiceModel.find({ 
                $or: relationQuery,
                'deletion.is_deleted': false 
            }).sort({ invoice_date: -1 }),
            PaymentModel.find({ party_id: customerObjectId, party_type: 'Customer', 'deletion.is_deleted': false }).sort({ payment_date: -1 })
        ]);

        // Fetch services via invoices. Support both ObjectId-linked and legacy invoice-number-linked records.
        const invoiceIds = invoices.map(inv => inv._id);
        const invoiceNumbers = invoices
            .map((inv: any) => inv.invoice_no || inv.invoice_id)
            .filter(Boolean);
        const serviceQuery: any = { 'deletion.is_deleted': false };
        const serviceLinks: any[] = [];
        if (invoiceIds.length > 0) serviceLinks.push({ invoice_id: { $in: invoiceIds } });
        if (invoiceNumbers.length > 0) serviceLinks.push({ invoice_id: { $in: invoiceNumbers } });
        const services = serviceLinks.length > 0
            ? await ServiceModel.find({ ...serviceQuery, $or: serviceLinks }).sort({ service_date: -1 })
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

        res.json({
            customer,
            quotations,
            invoices,
            services,
            payments,
            stats
        });
    } catch (err: unknown) {
        logger.error('Error fetching full customer details:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
