import { Router, Request, Response } from 'express';
import { SupplierModel, PurchaseModel, PaymentModel } from '../models';
import logger from '../utils/logger';
import { Types } from 'mongoose';
import { generateNextId } from '../utils/idGenerator';

const router: Router = Router();

function normalizeSupplierPayload(payload: any) {
    const billingAddress = { ...(payload?.billing_address || {}) };
    const shippingAddress = { ...(payload?.shipping_address || {}) };
    const bankDetails = { ...(payload?.bank_details || {}) };

    // Remove country from address
    delete billingAddress.country;
    delete shippingAddress.country;

    return {
        ...payload,
        supplier_name: String(payload?.supplier_name ?? '').trim(),
        phone: String(payload?.phone ?? '').replace(/\D/g, '').slice(0, 10),
        email: String(payload?.email ?? '').trim().toLowerCase(),
        gstin: String(payload?.gstin ?? '').trim().toUpperCase(),
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        bank_details: bankDetails
    };
}

async function findDuplicateSupplier(payload: any, excludeId?: string) {
    const orQuery: any[] = [];
    const phone = payload?.phone;
    const email = payload?.email;

    if (phone) orQuery.push({ phone: phone });
    if (email) orQuery.push({ email: email });

    if (orQuery.length === 0) return null;

    const query: any = {
        $or: orQuery,
        'deletion.is_deleted': false
    };

    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    return SupplierModel.findOne(query);
}


/**
 * @route   POST /supplier
 * @desc    Create a new supplier
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const payload = normalizeSupplierPayload(req.body);
        const existing = await findDuplicateSupplier(payload);
        if (existing) {
            return res.status(400).json({ error: 'Supplier with this phone or email already exists' });
        }

        const supplier_id = await generateNextId('supplier');
        const newSupplier = new SupplierModel({
            ...payload,
            supplier_id
        });
        await newSupplier.save();
        res.status(201).json(newSupplier);
    } catch (err: unknown) {
        logger.error('Error creating supplier:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   GET /supplier
 * @desc    Get all suppliers with search and filters
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { search, type, status } = req.query;
        let query: any = { 'deletion.is_deleted': false };

        if (search) {
            const searchRegex = { $regex: search as string, $options: 'i' };
            query.$or = [
                { supplier_name: searchRegex },
                { phone: searchRegex },
                { email: searchRegex },
                { gstin: searchRegex }
            ];
        }

        if (type) query.supplier_type = type;
        if (status) query.is_active = status === 'active';

        const suppliers = await SupplierModel.find(query).sort({ createdAt: -1 });
        res.json(suppliers);
    } catch (err: unknown) {
        logger.error('Error fetching suppliers:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   GET /supplier/:id
 * @desc    Get single supplier
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const supplierId = String(req.params.id || '');
        if (!Types.ObjectId.isValid(supplierId)) {
            return res.status(400).json({ error: 'Invalid supplier ID' });
        }
        const supplier = await SupplierModel.findOne({ _id: supplierId, 'deletion.is_deleted': false });
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        res.json(supplier);
    } catch (err: unknown) {
        logger.error('Error fetching supplier:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   PUT /supplier/:id
 * @desc    Update supplier
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const supplierId = String(req.params.id || '');
        if (!Types.ObjectId.isValid(supplierId)) {
            return res.status(400).json({ error: 'Invalid supplier ID' });
        }

        const payload = normalizeSupplierPayload(req.body);
        const existing = await findDuplicateSupplier(payload, supplierId);
        if (existing) {
            return res.status(400).json({ error: 'Supplier with this phone or email already exists' });
        }

        const supplier = await SupplierModel.findOneAndUpdate(
            { _id: supplierId, 'deletion.is_deleted': false },
            { $set: payload },
            { new: true }
        );
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        res.json(supplier);
    } catch (err: unknown) {
        logger.error('Error updating supplier:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   DELETE /supplier/:id
 * @desc    Soft delete supplier
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const supplierId = String(req.params.id || '');
        if (!Types.ObjectId.isValid(supplierId)) {
            return res.status(400).json({ error: 'Invalid supplier ID' });
        }
        const username = String(req.query.username || req.headers['x-username'] || req.body.username || 'Admin');
        const supplier = await SupplierModel.findOneAndUpdate(
            { _id: supplierId, 'deletion.is_deleted': false },
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
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        res.json({ message: 'Supplier deleted successfully' });
    } catch (err: unknown) {
        logger.error('Error deleting supplier:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   GET /supplier/:id/full-details
 * @desc    Get comprehensive supplier details (purchases, payments)
 */
router.get('/:id/full-details', async (req: Request, res: Response) => {
    try {
        const supplierId = String(req.params.id || '');
        if (!Types.ObjectId.isValid(supplierId)) {
            return res.status(400).json({ error: 'Invalid supplier ID' });
        }
        const supplierObjectId = new Types.ObjectId(supplierId);

        const supplier = await SupplierModel.findOne({ _id: supplierObjectId, 'deletion.is_deleted': false });
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

        // Fetch related data in parallel
        const [purchases, payments] = await Promise.all([
            PurchaseModel.find({ 
                supplier_id: supplierObjectId,
                'deletion.is_deleted': false 
            }).sort({ purchase_date: -1 }),
            PaymentModel.find({ 
                party_id: supplierObjectId, 
                party_type: 'Supplier', 
                'deletion.is_deleted': false 
            }).sort({ payment_date: -1 })
        ]);

        // Calculate statistics
        const stats = {
            totalPurchases: purchases.length,
            totalPayments: payments.length,
            totalPurchasedAmount: purchases.reduce((sum, pur: any) => sum + (
                Number(pur?.totals?.grand_total) || 0
            ), 0),
            totalPaidAmount: payments.reduce((sum, pay) => sum + pay.amount, 0),
        };
        (stats as any).pendingBalance = stats.totalPurchasedAmount - stats.totalPaidAmount;

        res.json({
            supplier,
            purchases,
            payments,
            stats
        });
    } catch (err: unknown) {
        logger.error('Error fetching full supplier details:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;

