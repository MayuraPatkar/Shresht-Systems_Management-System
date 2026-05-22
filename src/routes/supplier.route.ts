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
                { supplier_name: searchRegex },
                { phone: searchRegex },
                { email: searchRegex },
                { gstin: searchRegex }
            ];
        }

        if (type) query.supplier_type = type;
        if (status === 'archived') {
            query.is_archived = true;
        } else {
            query.is_archived = { $ne: true };
            if (status) query.is_active = status === 'active';
        }

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
            { returnDocument: 'after' }
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
                    'deletion.deleted_by': username
                } 
            },
            { returnDocument: 'after' }
        );
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        res.json({ message: 'Supplier deleted successfully' });
    } catch (err: unknown) {
        logger.error('Error deleting supplier:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   PUT /supplier/:id/archive
 * @desc    Archive supplier
 */
router.put('/:id/archive', async (req: Request, res: Response) => {
    try {
        const supplierId = String(req.params.id || '');
        if (!Types.ObjectId.isValid(supplierId)) {
            return res.status(400).json({ error: 'Invalid supplier ID' });
        }
        const supplier = await SupplierModel.findOneAndUpdate(
            { _id: supplierId, 'deletion.is_deleted': false },
            { $set: { is_archived: true } },
            { returnDocument: 'after' }
        );
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        res.json({ message: 'Supplier archived successfully', supplier });
    } catch (err: unknown) {
        logger.error('Error archiving supplier:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   PUT /supplier/:id/restore
 * @desc    Restore supplier from archive
 */
router.put('/:id/restore', async (req: Request, res: Response) => {
    try {
        const supplierId = String(req.params.id || '');
        if (!Types.ObjectId.isValid(supplierId)) {
            return res.status(400).json({ error: 'Invalid supplier ID' });
        }
        const supplier = await SupplierModel.findOneAndUpdate(
            { _id: supplierId, 'deletion.is_deleted': false },
            { $set: { is_archived: false } },
            { returnDocument: 'after' }
        );
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        res.json({ message: 'Supplier restored successfully', supplier });
    } catch (err: unknown) {
        logger.error('Error restoring supplier:', err);
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

// Restore soft-deleted supplier
router.post('/restoreItem', async (req: Request, res: Response) => {
    const { itemId } = req.body;
    try {
        const supplier = await SupplierModel.findOne({ _id: itemId });
        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        if (supplier.deletion) {
            supplier.deletion.is_deleted = false;
            supplier.deletion.deleted_at = undefined;
            supplier.deletion.deleted_by = undefined;
            await supplier.save();
        }

        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Supplier restore failed', { service: "supplier", itemId, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to restore supplier' });
    }
});

// Permanently delete supplier
router.post('/hardDeleteItem', async (req: Request, res: Response) => {
    const { itemId } = req.body;
    try {
        const result = await SupplierModel.deleteOne({ _id: itemId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Supplier permanent deletion failed', { service: "supplier", itemId, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to permanently delete supplier' });
    }
});

// Bulk restore suppliers
router.post('/bulkRestore', async (req: Request, res: Response) => {
    const { itemIds } = req.body;
    try {
        await SupplierModel.updateMany(
            { _id: { $in: itemIds } },
            { 
                $set: { 
                    "deletion.is_deleted": false,
                    "deletion.deleted_at": undefined,
                    "deletion.deleted_by": undefined
                } 
            }
        );
        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Bulk supplier restore failed', { service: "supplier", count: itemIds?.length, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to bulk restore suppliers' });
    }
});

// Bulk permanently delete suppliers
router.post('/bulkHardDelete', async (req: Request, res: Response) => {
    const { itemIds } = req.body;
    try {
        await SupplierModel.deleteMany({ _id: { $in: itemIds } });
        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Bulk supplier permanent deletion failed', { service: "supplier", count: itemIds?.length, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to bulk permanently delete suppliers' });
    }
});

export default router;

