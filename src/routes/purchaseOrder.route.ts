import { Router, Request, Response } from 'express';
import { PurchaseModel, ItemModel, StockMovementModel } from '../models';
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
        const suppliers = await PurchaseModel.aggregate([
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
            purchaseOrder = await PurchaseModel.findOne({ purchase_order_no });
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

            purchaseOrder = new PurchaseModel({
                purchase_order_no: newId,
                purchase_invoice_no: purchase_invoice_no,
                purchase_date: purchase_date || new Date(),
                supplier_snapshot,
                items,
                totals,
            });
        }

        // ---------------------------------------------------------
        // STOCK MANAGEMENT LOGIC
        // ---------------------------------------------------------

        // 1. Adjust Stock Quantities (Revert Old + Add New)
        // We do this to ensure Stock collection is always accurate based on the PO content.

        // A. Revert previous items
        if (previousItems.length > 0) {
            for (const prevItem of previousItems) {
                if (!prevItem.description) continue;
                const itemName = prevItem.description.trim();
                const stockItem = await ItemModel.findOne({ item_name: itemName }) as any;
                if (stockItem) {
                    const reversalQty = Number(prevItem.quantity || 0);
                    const stockBefore = stockItem.stock_quantity || 0;
                    stockItem.stock_quantity = stockBefore - reversalQty;
                    await stockItem.save();
                }
            }
        }

        // B. Add current items
        for (const item of items) {
            if (!item.description) continue;
            const itemName = item.description.trim();
            let stockItem = await ItemModel.findOne({ item_name: itemName }) as any;

            const addQty = Number(item.quantity || 0);

            if (stockItem) {
                const stockBefore = stockItem.stock_quantity || 0;
                stockItem.stock_quantity = stockBefore + addQty;
                stockItem.purchase_price = Number(item.unit_price) || stockItem.purchase_price;
                stockItem.gst_rate = Number(item.gst_rate || item.rate) || stockItem.gst_rate;
                stockItem.specifications = item.specification || stockItem.specifications;
                stockItem.brand = item.brand || item.company || stockItem.brand;
                stockItem.category = item.category || stockItem.category;
                stockItem.item_type = item.item_type || item.type || stockItem.item_type;
                stockItem.updatedAt = new Date();
                await stockItem.save();
            } else {
                await ItemModel.create({
                    item_name: itemName,
                    hsn_sac: item.hsn_sac || "",
                    specifications: item.specification || "",
                    brand: item.brand || item.company || "",
                    category: item.category || "",
                    purchase_price: Number(item.unit_price) || 0,
                    gst_rate: Number(item.gst_rate || item.rate) || 0,
                    margin: 0,
                    stock_quantity: addQty,
                    item_type: item.item_type || item.type || 'Material',
                } as any);
            }
        }

        // 2. Sync Stock Movements (Update Existing, Create New, Delete Removed)
        const currentPOId = purchase_order_no || (purchaseOrder ? purchaseOrder.purchase_order_no : 'NEW');

        // Fetch existing movements for this PO (using new schema: reference.type + reference.id)
        const existingMovements = await StockMovementModel.find({
            'reference.type': 'Purchase',
            'reference.number': currentPOId
        });

        // Create a pool of available movements to match against
        const movementPool = [...existingMovements];

        for (const item of items) {
            if (!item.description) continue;
            const itemName = item.description.trim();
            const qty = Number(item.quantity || 0);
            const totalVal = qty * (Number(item.unit_price) || 0);

            // Find a matching movement in the pool
            const matchIndex = movementPool.findIndex((m: any) => m.item_name === itemName);

            if (matchIndex !== -1) {
                // UPDATE existing movement
                const movement = movementPool[matchIndex] as any;
                movement.quantity = qty;
                movement.total_value = totalVal;
                // Update item_id if we can find the stock item
                const stockItem = await ItemModel.findOne({ item_name: itemName });
                if (stockItem) {
                    movement.item_id = stockItem._id;
                    movement.stock_after = (stockItem as any).stock_quantity || 0;
                    movement.stock_before = movement.stock_after - qty;
                }
                await movement.save();

                // Remove from pool so we don't use it again
                movementPool.splice(matchIndex, 1);
            } else {
                // CREATE new movement - look up stock item to get ID
                const stockItem = await ItemModel.findOne({ item_name: itemName });
                const stockQty = stockItem ? (stockItem as any).stock_quantity || 0 : 0;
                await StockMovementModel.create({
                    item_id: stockItem ? stockItem._id : null,
                    item_name: itemName,
                    direction: 'IN',
                    quantity: qty,
                    stock_before: stockQty - qty,
                    stock_after: stockQty,
                    reference: {
                        type: 'Purchase',
                        id: purchaseOrder._id || undefined,
                        number: currentPOId
                    },
                    remarks: 'Purchase Order Received',
                    total_value: totalVal
                } as any);
            }
        }

        // Delete any remaining movements in the pool (items removed from PO)
        for (const unusedMovement of movementPool) {
            await StockMovementModel.deleteOne({ _id: unusedMovement._id });
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

// Route to get the 10 most recent purchase orders
router.get("/recent-purchase-orders", async (req: Request, res: Response) => {
    try {
        const recentPurchaseOrders = await PurchaseModel.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select("purchase_order_no supplier_snapshot totals purchase_date createdAt");

        res.status(200).json({
            message: "Recent purchase orders retrieved successfully",
            purchaseOrder: recentPurchaseOrders,
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
        const purchaseOrder = await PurchaseModel.findOne({ purchase_order_no: purchaseOrderId });
        if (!purchaseOrder) {
            return res.status(404).json({ message: 'Purchase order not found' });
        }
        res.status(200).json({ message: "Purchase order retrieved successfully", purchaseOrder });
    } catch (error: unknown) {
        logger.error("Error retrieving purchase order:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Route to delete a purchase order
router.delete("/:purchaseOrderId", async (req: Request, res: Response) => {
    try {
        const { purchaseOrderId } = req.params;
        const purchaseOrder = await PurchaseModel.findOne({ purchase_order_no: purchaseOrderId });
        if (!purchaseOrder) {
            return res.status(404).json({ message: 'Purchase order not found' });
        }

        // Reverse stock changes (remove the quantity added)
        if (purchaseOrder.items && purchaseOrder.items.length > 0) {
            for (const item of purchaseOrder.items) {
                if (!item.description) continue;
                const stockItem = await ItemModel.findOne({ item_name: item.description }) as any;
                if (stockItem) {
                    stockItem.stock_quantity = (stockItem.stock_quantity || 0) - Number(item.quantity || 0);
                    await stockItem.save();
                }
            }
        }

        // Delete associated stock movements
        await StockMovementModel.deleteMany({
            'reference.type': 'Purchase',
            'reference.number': purchaseOrderId
        });

        await PurchaseModel.deleteOne({ purchase_order_no: purchaseOrderId });
        res.status(200).json({ message: 'Purchase order deleted successfully' });
    } catch (error: unknown) {
        logger.error("Error deleting purchase order:", error);
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Search purchase orders
router.get('/search/:query', async (req: Request, res: Response) => {
    const { query } = req.params;
    if (!query) return res.status(400).send('Query parameter is required.');

    try {
        const purchaseOrders = await PurchaseModel.find({
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
