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
        const purchase_order_id = await previewNextId('purchaseOrder');
        return res.status(200).json({ purchase_order_id });
    } catch (err: unknown) {
        logger.error('Error generating purchase order preview', { error: (err as Error).message || err });
        return res.status(500).json({ error: 'Failed to generate purchase order id' });
    }
});

// Route to get all unique suppliers
router.get("/suppliers/list", async (req: Request, res: Response) => {
    try {
        // Get all unique supplier names with their details
        const suppliers = await PurchaseModel.aggregate([
            {
                $group: {
                    _id: "$supplier_name",
                    supplier_name: { $first: "$supplier_name" },
                    supplier_address: { $first: "$supplier_address" },
                    supplier_phone: { $first: "$supplier_phone" },
                    supplier_email: { $first: "$supplier_email" },
                    supplier_GSTIN: { $first: "$supplier_GSTIN" }
                }
            },
            {
                $match: {
                    _id: { $ne: null }  // also filters out empty strings
                }
            },
            {
                $sort: { supplier_name: 1 }
            }
        ]);

        res.status(200).json({
            message: "Suppliers retrieved successfully",
            suppliers: suppliers.map((s: any) => ({
                name: s.supplier_name,
                address: s.supplier_address,
                phone: s.supplier_phone,
                email: s.supplier_email,
                GSTIN: s.supplier_GSTIN
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
        let {
            purchaseOrderId = '', // Could be a preview ID (new) or existing ID (update)
            purchaseInvoiceId = '',
            purchaseDate = new Date(),
            supplierName = '',
            supplierAddress = '',
            supplierPhone = '',
            supplierEmail = '',
            supplierGSTIN = '',
            items = [] as any[],
            totalAmount = 0
        } = req.body;

        // Attempt to find an existing document using the provided ID
        let purchaseOrder: any = null;
        if (purchaseOrderId) {
            purchaseOrder = await PurchaseModel.findOne({ purchase_order_id: purchaseOrderId });
        }

        let previousItems: any[] = [];

        if (purchaseOrder) {
            // ---------------------------------------------------------
            // SCENARIO 1: UPDATE EXISTING PURCHASE ORDER
            // ---------------------------------------------------------

            // Capture previous items for stock reversal logic
            previousItems = Array.isArray(purchaseOrder.items) ? purchaseOrder.items : [];

            // Update fields
            purchaseOrder.purchase_invoice_id = purchaseInvoiceId;
            purchaseOrder.purchase_date = purchaseDate || new Date();
            purchaseOrder.supplier_name = supplierName;
            purchaseOrder.supplier_address = supplierAddress;
            purchaseOrder.supplier_phone = supplierPhone;
            purchaseOrder.supplier_email = supplierEmail;
            purchaseOrder.supplier_GSTIN = supplierGSTIN;
            purchaseOrder.items = items;
            purchaseOrder.total_amount = totalAmount;

        } else {
            // ---------------------------------------------------------
            // SCENARIO 2: CREATE NEW PURCHASE ORDER
            // ---------------------------------------------------------

            // Generate the permanent ID now (increments the counter)
            const newId = await generateNextId('purchaseOrder');

            purchaseOrder = new PurchaseModel({
                purchase_order_id: newId,
                purchase_invoice_id: purchaseInvoiceId,
                purchase_date: purchaseDate || new Date(),
                supplier_name: supplierName,
                supplier_address: supplierAddress,
                supplier_phone: supplierPhone,
                supplier_email: supplierEmail,
                supplier_GSTIN: supplierGSTIN,
                items,
                total_amount: totalAmount,
                createdAt: new Date(),
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
                    stockItem.quantity = Number(stockItem.quantity || 0) - reversalQty;
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
                stockItem.quantity = Number(stockItem.quantity || 0) + addQty;
                stockItem.unit_price = Number(item.unit_price) || stockItem.unit_price;
                stockItem.GST = Number(item.rate) || stockItem.GST;
                stockItem.specifications = item.specification || stockItem.specifications;
                stockItem.company = item.company || stockItem.company;
                stockItem.category = item.category || stockItem.category;
                stockItem.type = item.type || stockItem.type;
                stockItem.updatedAt = new Date();
                await stockItem.save();
            } else {
                await ItemModel.create({
                    item_name: itemName,
                    HSN_SAC: item.HSN_SAC || item.hsn_sac || "",
                    specifications: item.specification || "",
                    company: item.company || "",
                    category: item.category || "",
                    unit_price: Number(item.unit_price) || 0,
                    GST: Number(item.rate) || 0,
                    margin: 0,
                    quantity: addQty,
                    type: item.type || 'material',
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any);
            }
        }

        // 2. Sync Stock Movements (Update Existing, Create New, Delete Removed)
        const currentPOId = purchaseOrderId || (purchaseOrder ? purchaseOrder.purchase_order_id : 'NEW');

        // Fetch existing movements for this PO
        const existingMovements = await StockMovementModel.find({
            reference_type: 'purchase_order',
            reference_id: currentPOId
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
                movement.quantity_change = qty;
                movement.total_value = totalVal;
                // Update item_id if we can find the stock item
                const stockItem = await ItemModel.findOne({ item_name: itemName });
                if (stockItem) {
                    movement.item_id = stockItem._id;
                }
                await movement.save();

                // Remove from pool so we don't use it again
                movementPool.splice(matchIndex, 1);
            } else {
                // CREATE new movement - look up stock item to get ID
                const stockItem = await ItemModel.findOne({ item_name: itemName });
                await StockMovementModel.create({
                    timestamp: purchaseDate || new Date(),
                    item_id: stockItem ? stockItem._id : null,
                    item_name: itemName,
                    movement_type: 'in',
                    quantity_change: qty,
                    reference_type: 'purchase_order',
                    reference_id: currentPOId,
                    notes: `Purchase Order Received`,
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
            purchase_order_id: savedPurchaseOrder.purchase_order_id // Return the final ID
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
            .select("project_name purchase_order_id supplier_name supplier_address total_amount purchase_date createdAt");

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
        const purchaseOrder = await PurchaseModel.findOne({ purchase_order_id: purchaseOrderId });
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
        const purchaseOrder = await PurchaseModel.findOne({ purchase_order_id: purchaseOrderId });
        if (!purchaseOrder) {
            return res.status(404).json({ message: 'Purchase order not found' });
        }

        // Reverse stock changes (remove the quantity added)
        if (purchaseOrder.items && purchaseOrder.items.length > 0) {
            for (const item of purchaseOrder.items) {
                if (!item.description) continue;
                const stockItem = await ItemModel.findOne({ item_name: item.description }) as any;
                if (stockItem) {
                    stockItem.quantity = (stockItem.quantity || 0) - Number(item.quantity || 0);
                    await stockItem.save();
                }
            }
        }

        // Delete associated stock movements
        await StockMovementModel.deleteMany({
            reference_type: 'purchase_order',
            reference_id: purchaseOrderId
        });

        await PurchaseModel.deleteOne({ purchase_order_id: purchaseOrderId });
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
                { purchase_order_id: { $regex: query, $options: 'i' } },
                { project_name: { $regex: query, $options: 'i' } },
                { supplier_name: { $regex: query, $options: 'i' } },
                { supplier_phone: { $regex: query, $options: 'i' } }
            ]
        });

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
