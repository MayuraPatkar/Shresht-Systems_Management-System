import { Router, Request, Response } from 'express';
import { ItemModel, StockMovementModel } from '../models';
import logger from '../utils/logger';
import validators from '../middleware/validators';

const router: Router = Router();

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

// Route to get all stock items
router.get('/all', async (req: Request, res: Response) => {
    try {
        const stockData = await ItemModel.find().sort({ item_name: 1 });
        res.status(200).json(stockData);
    } catch (error: unknown) {
        logger.error('Error fetching stock data', { service: "stock", error: (error as Error).message });
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// Route to Add Item to Stock
router.post('/addItem', validators.createStock, async (req: Request, res: Response) => {
    const { item_name, hsn_sac, specifications, brand, category, item_type, purchase_price, stock_quantity, gst_rate, min_stock_quantity } = req.body;

    try {
        // Check if item already exists
        const existingItem = await ItemModel.findOne({ item_name: item_name.trim() });

        if (existingItem) {
            return res.status(400).json({ error: 'Item already exists in stock' });
        }

        // Add new stock item
        const newItem = new ItemModel({
            item_name: item_name.trim(),
            hsn_sac,
            specifications,
            brand,
            category,
            item_type: item_type || 'Material',
            purchase_price,
            stock_quantity: stock_quantity || 0,
            gst_rate,
            min_stock_quantity: min_stock_quantity || 5,
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
    const { itemId, item_name, hsn_sac, specifications, brand, category, item_type, purchase_price, gst_rate, min_stock_quantity } = req.body;

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

        // Check if another item with the same name exists (excluding current item)
        const existingItem = await ItemModel.findOne({
            item_name: item_name.trim(),
            _id: { $ne: itemId }
        });

        if (existingItem) {
            return res.status(400).json({ error: 'Item with this name already exists' });
        }

        const item = await ItemModel.findOne({ _id: itemId }) as any;
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Update item details (stock_quantity is managed separately via stock in/out operations)
        item.item_name = item_name.trim();
        item.hsn_sac = hsn_sac;
        item.specifications = specifications;
        item.brand = brand;
        item.category = category;
        item.item_type = item_type;
        item.purchase_price = purchase_price;
        item.gst_rate = gst_rate;
        item.min_stock_quantity = min_stock_quantity;
        item.updatedAt = new Date();
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

        const stockItem = await ItemModel.findOne({ item_name: itemName });
        if (!stockItem) return res.json(null); // Return null instead of 404 to avoid console errors

        res.json(stockItem);
    } catch (error: unknown) {
        logger.error("Stock item fetch failed", { service: "stock", error: (error as Error).message });
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/get-names", async (req: Request, res: Response) => {
    try {
        const stockItems = await ItemModel.find({}, { item_name: 1 });
        res.json(stockItems.map(item => item.item_name));
    } catch (error: unknown) {
        logger.error("Stock names fetch failed", { service: "stock", error: (error as Error).message });
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get stock items with IDs for autocomplete (used by reports)
router.get("/get-items-with-ids", async (req: Request, res: Response) => {
    try {
        const stockItems = await ItemModel.find({}, { _id: 1, item_name: 1 });
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
            item_name: { $regex: new RegExp(`^${itemName}$`, 'i') }
        }) as any;

        if (stockItem) {
            res.json({
                found: true,
                item: {
                    item_name: stockItem.item_name,
                    specifications: stockItem.specifications,
                    hsn_sac: stockItem.hsn_sac,
                    purchase_price: stockItem.purchase_price,
                    gst_rate: stockItem.gst_rate
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
    const { itemId } = req.body;
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

        await ItemModel.deleteOne({ _id: itemId });
        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Stock item deletion failed', { service: "stock", itemId, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

export default router;
