import { Router, Request, Response } from 'express';
import { PurchaseOrderModel } from '../models';
import logger from '../utils/logger';
import { previewNextId, generateNextId } from '../utils/idGenerator';

const router: Router = Router();

/**
 * Route: Generate a Preview ID
 * Description: returns the next likely ID for UI display.
 * Does NOT increment the database counter.
 */
router.get("/generate-id", async (req: Request, res: Response) => {
    try {
        const purchase_order_no = await previewNextId('purchaseOrder');
        return res.status(200).json({ purchase_order_no });
    } catch (err: unknown) {
        logger.error('Error generating purchase order preview', { error: (err as Error).message || err });
        return res.status(500).json({ error: 'Failed to generate purchase order id' });
    }
});

// Route to get all unique suppliers
router.get("/suppliers/list", async (req: Request, res: Response) => {
    try {
        // Get all unique supplier names from supplier_snapshot
        const suppliers = await PurchaseOrderModel.aggregate([
            {
                $group: {
                    _id: "$supplier_snapshot.name",
                    name: { $first: "$supplier_snapshot.name" },
                    gstin: { $first: "$supplier_snapshot.gstin" },
                    phone: { $first: "$supplier_snapshot.phone" },
                    email: { $first: "$supplier_snapshot.email" },
                    address: { $first: "$supplier_snapshot.address" }
                }
            },
            {
                $match: {
                    _id: { $ne: null }  // also filters out empty strings
                }
            },
            {
                $sort: { name: 1 }
            }
        ]);

        res.status(200).json({
            message: "Suppliers retrieved successfully",
            suppliers: suppliers.map((s: any) => ({
                name: s.name,
                address: s.address,
                phone: s.phone,
                email: s.email,
                gstin: s.gstin
            }))
        });
    } catch (error: unknown) {
        logger.error("Error retrieving suppliers:", error);
        res.status(500).json({
            message: "Internal server error",
            error: (error as Error).message,
        });
    }
});

router.post("/save-purchase-order", async (req: Request, res: Response) => {
    try {
        const {
            purchase_order_no,
            purchase_invoice_no,
            purchase_date,
            supplier_snapshot,
            items = [] as any[],
            totals
        } = req.body;

        // Attempt to find an existing document using the provided ID
        let purchaseOrder: any = null;
        if (purchase_order_no) {
            purchaseOrder = await PurchaseOrderModel.findOne({ purchase_order_no });
        }

        let previousItems: any[] = [];

        if (purchaseOrder) {
            // ---------------------------------------------------------
            // SCENARIO 1: UPDATE EXISTING PURCHASE ORDER
            // ---------------------------------------------------------

            // Capture previous items for stock reversal logic
            previousItems = Array.isArray(purchaseOrder.items) ? purchaseOrder.items : [];

            // Update fields
            purchaseOrder.purchase_invoice_no = purchase_invoice_no;
            purchaseOrder.purchase_date = purchase_date || new Date();
            purchaseOrder.supplier_snapshot = supplier_snapshot;
            purchaseOrder.items = items;
            purchaseOrder.totals = totals;

        } else {
            // ---------------------------------------------------------
            // SCENARIO 2: CREATE NEW PURCHASE ORDER
            // ---------------------------------------------------------

            // Generate the permanent ID now (increments the counter)
            const newId = await generateNextId('purchaseOrder');

            purchaseOrder = new PurchaseOrderModel({
                purchase_order_no: newId,
                purchase_invoice_no: purchase_invoice_no,
                purchase_date: purchase_date || new Date(),
                supplier_snapshot,
                items,
                totals,
            });
        }


        // Save the document
        const savedPurchaseOrder = await purchaseOrder.save();

        res.status(201).json({
            message: 'Purchase order saved successfully',
            purchaseOrder: savedPurchaseOrder,
            purchase_order_no: savedPurchaseOrder.purchase_order_no // Return the final ID
        });
    } catch (error: unknown) {
        logger.error('Error saving purchase order:', error);
        res.status(500).json({ message: 'Internal server error', error: (error as Error).message });
    }
});

// Route to get recent purchase orders (supports filtering by deleted status)
router.get("/recent-purchase-orders", async (req: Request, res: Response) => {
    try {
        const { deleted } = req.query;
        let query: any = {};

        if (deleted === 'true') {
            query['deletion.is_deleted'] = true;
        } else {
            query['deletion.is_deleted'] = false;
        }

        let queryBuilder = PurchaseOrderModel.find(query).sort({ createdAt: -1 });
        if (deleted !== 'true') {
            queryBuilder = queryBuilder.limit(10);
        }

        const recentPurchaseOrders = await queryBuilder
            .select("purchase_order_no supplier_snapshot totals purchase_date createdAt deletion");

        res.status(200).json({
            message: "Recent purchase orders retrieved successfully",
            purchaseOrders: recentPurchaseOrders,
        });
    } catch (error: unknown) {
        logger.error("Error retrieving recent purchase orders:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Route to get a purchase order by ID
router.get("/:purchaseOrderId", async (req: Request, res: Response) => {
    try {
        const { purchaseOrderId } = req.params;
        const purchaseOrder = await PurchaseOrderModel.findOne({ purchase_order_no: purchaseOrderId });
        if (!purchaseOrder) {
            return res.status(404).json({ message: 'Purchase order not found' });
        }
        res.status(200).json({ message: "Purchase order retrieved successfully", purchaseOrder });
    } catch (error: unknown) {
        logger.error("Error retrieving purchase order:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Helper function to handle permanent purchase order deletion
async function performHardDeletePurchaseOrder(purchaseOrderId: string): Promise<boolean> {
    const result = await PurchaseOrderModel.deleteOne({ purchase_order_no: purchaseOrderId });
    return result.deletedCount > 0;
}

// Route to soft delete a purchase order
router.delete("/:purchaseOrderId", async (req: Request, res: Response) => {
    try {
        const { purchaseOrderId } = req.params;
        const username = String((req.query && req.query.username) || (req.headers && req.headers['x-username']) || (req.body && req.body.username) || 'Admin');
        
        const purchaseOrder = await PurchaseOrderModel.findOneAndUpdate(
            { purchase_order_no: purchaseOrderId, 'deletion.is_deleted': false },
            {
                $set: {
                    'deletion.is_deleted': true,
                    'deletion.deleted_at': new Date(),
                    'deletion.deleted_by': username
                }
            },
            { new: true }
        );
        
        if (!purchaseOrder) {
            return res.status(404).json({ message: 'Purchase order not found' });
        }
        
        res.status(200).json({ message: 'Purchase order deleted successfully' });
    } catch (error: unknown) {
        logger.error("Error soft deleting purchase order:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Route to restore soft-deleted purchase order from trash
router.post("/restoreItem", async (req: Request, res: Response) => {
    const { itemId } = req.body;
    try {
        const purchaseOrder = await PurchaseOrderModel.findOne({ purchase_order_no: itemId });
        if (!purchaseOrder) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        if (purchaseOrder.deletion) {
            purchaseOrder.deletion.is_deleted = false;
            purchaseOrder.deletion.deleted_at = undefined;
            purchaseOrder.deletion.deleted_by = undefined;
            await purchaseOrder.save();
        }

        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Purchase order restore failed', { itemId, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to restore purchase order' });
    }
});

// Route to permanently delete a single purchase order
router.post("/hardDeleteItem", async (req: Request, res: Response) => {
    const { itemId } = req.body;
    try {
        const deleted = await performHardDeletePurchaseOrder(itemId);
        if (!deleted) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Purchase order permanent deletion failed', { itemId, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to permanently delete purchase order' });
    }
});

// Route to bulk restore soft-deleted purchase orders
router.post("/bulkRestore", async (req: Request, res: Response) => {
    const { itemIds } = req.body;
    try {
        await PurchaseOrderModel.updateMany(
            { purchase_order_no: { $in: itemIds } },
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
        logger.error('Bulk purchase order restore failed', { count: itemIds?.length, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to bulk restore purchase orders' });
    }
});

// Route to bulk permanently delete purchase orders
router.post("/bulkHardDelete", async (req: Request, res: Response) => {
    const { itemIds } = req.body;
    try {
        if (Array.isArray(itemIds)) {
            for (const itemId of itemIds) {
                await performHardDeletePurchaseOrder(itemId);
            }
        }
        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Bulk purchase order hard delete failed', { count: itemIds?.length, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to bulk permanently delete purchase orders' });
    }
});

// Search purchase orders
router.get('/search/:query', async (req: Request, res: Response) => {
    const { query } = req.params;
    if (!query) return res.status(400).send('Query parameter is required.');

    try {
        const purchaseOrders = await PurchaseOrderModel.find({
            'deletion.is_deleted': false,
            $or: [
                { purchase_order_no: { $regex: query, $options: 'i' } },
                { 'supplier_snapshot.name': { $regex: query, $options: 'i' } },
                { 'supplier_snapshot.phone': { $regex: query, $options: 'i' } }
            ]
        } as any);

        if (purchaseOrders.length === 0) {
            return res.status(404).send('No purchase orders found.');
        } else {
            return res.status(200).json({ purchaseOrder: purchaseOrders });
        }
    } catch (err: unknown) {
        logger.error(err);
        return res.status(500).send('Failed to fetch purchase orders.');
    }
});

export default router;
