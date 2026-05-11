import { Router, Request, Response } from 'express';
import { ItemModel, StockMovementModel, SettingsModel } from '../models';
import logger from '../utils/logger';
import validators from '../middleware/validators';

const router: Router = Router();

// ─── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_INACTIVE_THRESHOLD_MONTHS = 3;

// Helper function to log stock movements (aligned with new StockMovement schema)
async function logStockMovement(
    itemId: any,
    itemName: string,
    quantity: number,
    direction: 'IN' | 'OUT',
    stockBefore: number,
    stockAfter: number,
    referenceType: string,
    referenceId: string | null = null,
    referenceNumber: string = '',
    remarks: string = ''
): Promise<void> {
    try {
        await StockMovementModel.create({
            item_id: itemId,
            item_name: itemName,
            direction,
            quantity,
            stock_before: stockBefore,
            stock_after: stockAfter,
            reference: {
                type: referenceType,
                id: referenceId || undefined,
                number: referenceNumber || undefined
            },
            remarks
        } as any);
    } catch (error: unknown) {
        logger.error('Stock movement log failed', { service: "stock", error: (error as Error).message });
    }
}

/**
 * Refresh is_active status for all items.
 * Items with no stock movement in the last 3 months are marked inactive.
 * Runs as a background fire-and-forget task — errors are logged, not thrown.
 */
async function refreshActiveStatus(): Promise<void> {
    try {
        // Read threshold from settings, fall back to default
        const settings = await SettingsModel.findOne().lean() as any;
        const thresholdMonths = settings?.notifications?.stock_inactive_months ?? DEFAULT_INACTIVE_THRESHOLD_MONTHS;

        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - thresholdMonths);

        // Get all active items that are not deleted
        const activeItems = await ItemModel.find({ is_active: true, "deletion.is_deleted": { $ne: true } }, { _id: 1 }).lean();

        for (const item of activeItems) {
            const lastMovement = await StockMovementModel.findOne(
                { item_id: item._id },
                { createdAt: 1 }
            ).sort({ createdAt: -1 }).lean();

            // If no movement at all, check item creation date
            const lastActivity = lastMovement
                ? (lastMovement as any).createdAt
                : (item as any).createdAt;

            if (lastActivity && lastActivity < cutoff) {
                await ItemModel.updateOne({ _id: item._id }, { is_active: false });
                logger.info('Item deactivated due to inactivity', {
                    service: 'stock',
                    itemId: item._id,
                    lastActivity
                });
            }
        }
    } catch (error: unknown) {
        logger.error('Active status refresh failed', { service: 'stock', error: (error as Error).message });
    }
}

// Route to get all stock items
router.get('/all', async (req: Request, res: Response) => {
    try {
        // Fire-and-forget: refresh is_active status in the background
        refreshActiveStatus();

        // Return ALL items (active and soft-deleted) so the frontend can filter them locally.
        const stockData = await ItemModel.find({}).sort({ item_name: 1 }).lean();
        const mappedData = stockData.map((item: any) => ({
            ...item,
            purchase_price: item.purchase_price ?? item.unit_price ?? 0,
            gst_rate: item.gst_rate ?? item.GST ?? 0,
            stock_quantity: item.stock_quantity ?? item.quantity ?? 0,
            min_stock_quantity: item.min_stock_quantity ?? item.min_quantity ?? (item.unit === 'm' ? 100 : 10),
            brand: item.brand ?? item.company ?? '',
            hsn_sac: item.hsn_sac ?? item.HSN_SAC ?? '',
            item_type: item.item_type ?? item.type ?? 'Material'
        }));
        res.status(200).json(mappedData);
    } catch (error: unknown) {
        logger.error('Error fetching stock data', { service: "stock", error: (error as Error).message });
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// Route to Add Item to Stock
router.post('/addItem', validators.createStock, async (req: Request, res: Response) => {
    const { item_name, hsn_sac, specifications, brand, category, item_type, unit, purchase_price, selling_price, margin, stock_quantity, gst_rate, min_stock_quantity, remarks } = req.body;

    try {
        // Check if active item already exists
        const existingItem = await ItemModel.findOne({
            item_name: item_name.trim(),
            "deletion.is_deleted": { $ne: true }
        });

        if (existingItem) {
            return res.status(400).json({ error: 'Item already exists in stock' });
        }

        // Compute selling_price / margin defaults to keep them consistent
        const effectiveMargin = margin || 0;
        const effectiveSellingPrice = selling_price
            ? selling_price
            : Math.round(purchase_price * (1 + effectiveMargin / 100) * 100) / 100;

        // Add new stock item
        const newItem = new ItemModel({
            item_name: item_name.trim(),
            hsn_sac,
            specifications,
            brand,
            category,
            item_type: item_type || 'Material',
            unit,
            purchase_price,
            selling_price: effectiveSellingPrice,
            margin: effectiveMargin,
            gst_rate,
            stock_quantity: stock_quantity || 0,
            min_stock_quantity: min_stock_quantity || (unit === 'm' ? 100 : 10),
            remarks,
        });

        await newItem.save();

        // Log stock movement for initial quantity
        const qty = stock_quantity || 0;
        if (qty > 0) {
            await logStockMovement(
                newItem._id,
                item_name.trim(),
                qty,
                'IN',
                0,
                qty,
                'Manual',
                newItem._id.toString(),
                '',
                'Initial stock entry'
            );
        }

        res.status(201).json({
            message: 'Item added successfully',
            item: newItem
        });
    } catch (error: unknown) {
        logger.error('Stock item addition failed', { service: "stock", error: (error as Error).message });
        res.status(500).json({ error: 'Failed to add stock item' });
    }
});

// Route to Add Quantity to Existing Stock
router.post('/addToStock', async (req: Request, res: Response) => {
    const { itemId, quantity } = req.body;

    try {
        const item = await ItemModel.findOne({ _id: itemId }) as any;
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const stockBefore = item.stock_quantity || 0;
        item.stock_quantity = stockBefore + quantity;
        // Re-activate item on stock movement
        if (!item.is_active) item.is_active = true;
        await item.save();

        // Log stock movement
        await logStockMovement(
            item._id,
            item.item_name,
            quantity,
            'IN',
            stockBefore,
            item.stock_quantity,
            'Manual',
            itemId,
            '',
            'Stock added manually'
        );

        res.status(200).json({ message: 'Stock updated successfully' });
    } catch (error: unknown) {
        logger.error('Stock increment failed', { service: "stock", itemId, quantity, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

// Route to Remove Quantity from Stock
router.post('/removeFromStock', async (req: Request, res: Response) => {
    const { itemId, quantity } = req.body;

    try {
        if (!itemId || isNaN(quantity)) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        const item = await ItemModel.findOne({ _id: itemId }) as any;
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const stockBefore = item.stock_quantity || 0;
        if (stockBefore < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        item.stock_quantity = stockBefore - quantity;
        // Re-activate item on stock movement
        if (!item.is_active) item.is_active = true;
        await item.save();

        // Log stock movement
        await logStockMovement(
            item._id,
            item.item_name,
            quantity,
            'OUT',
            stockBefore,
            item.stock_quantity,
            'Manual',
            itemId,
            '',
            'Stock removed manually'
        );

        res.status(200).json({ message: 'Stock updated successfully' });
    } catch (error: unknown) {
        logger.error('Stock decrement failed', { service: "stock", itemId, quantity, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

// Route to Edit Item Details
router.post('/editItem', async (req: Request, res: Response) => {
    const { itemId, item_name, hsn_sac, specifications, brand, category, item_type, unit, purchase_price, selling_price, margin, stock_quantity, gst_rate, min_stock_quantity, remarks } = req.body;

    try {
        // Input validation
        if (!item_name || !item_name.trim()) {
            return res.status(400).json({ error: 'Item name is required' });
        }

        if (purchase_price && (isNaN(purchase_price) || purchase_price < 0)) {
            return res.status(400).json({ error: 'Purchase price must be a valid positive number' });
        }

        if (gst_rate && (isNaN(gst_rate) || gst_rate < 0 || gst_rate > 100)) {
            return res.status(400).json({ error: 'GST rate must be a valid number between 0 and 100' });
        }

        // Check if another active item with the same name exists (excluding current item)
        const existingItem = await ItemModel.findOne({
            item_name: item_name.trim(),
            _id: { $ne: itemId },
            "deletion.is_deleted": { $ne: true }
        });

        if (existingItem) {
            return res.status(400).json({ error: 'Item with this name already exists' });
        }

        const item = await ItemModel.findOne({ _id: itemId }) as any;
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Update item details
        item.item_name = item_name.trim();
        item.hsn_sac = hsn_sac;
        item.specifications = specifications;
        item.brand = brand;
        item.category = category;
        item.item_type = item_type;
        item.unit = unit;
        item.purchase_price = purchase_price;
        item.selling_price = selling_price;
        item.margin = margin;
        item.stock_quantity = stock_quantity;
        item.gst_rate = gst_rate;
        item.min_stock_quantity = min_stock_quantity || (unit === 'm' ? 100 : 10);
        item.remarks = remarks;
        await item.save();

        res.status(200).json({ message: 'Item updated successfully' });
    } catch (error: unknown) {
        logger.error('Stock item edit failed', { service: "stock", itemId, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to edit item' });
    }
});


router.get("/get-stock-item", async (req: Request, res: Response) => {
    try {
        const itemName = req.query.item as string;
        if (!itemName) return res.status(400).json({ message: "Item name required" });

        const stockItem = await ItemModel.findOne({
            item_name: itemName,
            "deletion.is_deleted": { $ne: true }
        }).lean() as any;
        if (!stockItem) return res.json(null); // Return null instead of 404 to avoid console errors

        const mappedItem = {
            ...stockItem,
            purchase_price: stockItem.purchase_price ?? stockItem.unit_price ?? 0,
            gst_rate: stockItem.gst_rate ?? stockItem.GST ?? 0,
            stock_quantity: stockItem.stock_quantity ?? stockItem.quantity ?? 0,
            min_stock_quantity: stockItem.min_stock_quantity ?? stockItem.min_quantity ?? 5,
            brand: stockItem.brand ?? stockItem.company ?? '',
            hsn_sac: stockItem.hsn_sac ?? stockItem.HSN_SAC ?? '',
            item_type: stockItem.item_type ?? stockItem.type ?? 'Material'
        };
        res.json(mappedItem);
    } catch (error: unknown) {
        logger.error("Stock item fetch failed", { service: "stock", error: (error as Error).message });
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/get-names", async (req: Request, res: Response) => {
    try {
        const stockItems = await ItemModel.find({ "deletion.is_deleted": { $ne: true } }, { item_name: 1 });
        res.json(stockItems.map(item => item.item_name));
    } catch (error: unknown) {
        logger.error("Stock names fetch failed", { service: "stock", error: (error as Error).message });
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get stock items with IDs for autocomplete (used by reports)
router.get("/get-items-with-ids", async (req: Request, res: Response) => {
    try {
        const stockItems = await ItemModel.find({ "deletion.is_deleted": { $ne: true } }, { _id: 1, item_name: 1 });
        res.json(stockItems.map(item => ({ id: item._id, name: item.item_name })));
    } catch (error: unknown) {
        logger.error("Stock items fetch failed", { service: "stock", error: (error as Error).message });
        res.status(500).json({ message: "Internal server error" });
    }
});

// Route to search for stock item by name and get specifications
router.get('/search/:itemName', async (req: Request, res: Response) => {
    try {
        const itemName = (req.params.itemName as string).trim();
        const stockItem = await ItemModel.findOne({
            item_name: { $regex: new RegExp(`^${itemName}$`, 'i') },
            "deletion.is_deleted": { $ne: true }
        }).lean() as any;

        if (stockItem) {
            res.json({
                found: true,
                item: {
                    item_name: stockItem.item_name,
                    specifications: stockItem.specifications,
                    hsn_sac: stockItem.hsn_sac ?? stockItem.HSN_SAC ?? '',
                    purchase_price: stockItem.purchase_price ?? stockItem.unit_price ?? 0,
                    gst_rate: stockItem.gst_rate ?? stockItem.GST ?? 0
                }
            });
        } else {
            res.json({ found: false });
        }
    } catch (error: unknown) {
        logger.error('Stock search failed', { service: "stock", error: (error as Error).message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete stock item
router.post('/deleteItem', async (req: Request, res: Response) => {
    const { itemId, username } = req.body;
    try {
        const item = await ItemModel.findOne({ _id: itemId }) as any;
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Log stock movement if item had stock
        const stockQty = item.stock_quantity || 0;
        if (stockQty > 0) {
            await logStockMovement(
                item._id,
                item.item_name,
                stockQty,
                'OUT',
                stockQty,
                0,
                'Manual',
                itemId,
                '',
                'Item deleted from stock'
            );
        }

        if (!item.deletion) {
            item.deletion = {};
        }
        item.deletion.is_deleted = true;
        item.deletion.deleted_at = new Date();
        item.deletion.deleted_by = username || 'Admin';
        await item.save();

        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Stock item deletion failed', { service: "stock", itemId, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// Restore stock item
router.post('/restoreItem', async (req: Request, res: Response) => {
    const { itemId } = req.body;
    try {
        const item = await ItemModel.findOne({ _id: itemId }) as any;
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        if (item.deletion) {
            item.deletion.is_deleted = false;
            item.deletion.deleted_at = undefined;
            item.deletion.deleted_by = undefined;
            await item.save();
        }

        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Stock item restore failed', { service: "stock", itemId, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to restore item' });
    }
});

export default router;
