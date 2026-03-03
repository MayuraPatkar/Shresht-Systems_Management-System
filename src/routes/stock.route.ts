import { Router, Request, Response } from 'express';
import { ItemModel, StockMovementModel } from '../models';
import logger from '../utils/logger';
import validators from '../middleware/validators';

const router: Router = Router();

// Helper function to log stock movements
async function logStockMovement(
    itemId: any,
    itemName: string,
    quantityChange: number,
    movementType: string,
    referenceType: string,
    referenceId: string | null = null,
    notes: string = ''
): Promise<void> {
    try {
        await StockMovementModel.create({
            item_id: itemId,
            item_name: itemName,
            quantity_change: quantityChange,
            movement_type: movementType,
            reference_type: referenceType,
            reference_id: referenceId,
            notes: notes
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
    const { item_name, HSN_SAC, specifications, company, category, type, unit_price, quantity, GST, min_quantity } = req.body;

    try {
        // Check if item already exists
        const existingItem = await ItemModel.findOne({ item_name: item_name.trim() });

        if (existingItem) {
            return res.status(400).json({ error: 'Item already exists in stock' });
        }

        // Add new stock item
        const newItem = new ItemModel({
            item_name: item_name.trim(),
            HSN_SAC,
            specifications,
            company,
            category,
            type: type || 'material',
            unit_price,
            quantity,
            GST,
            min_quantity: min_quantity || 5,
        });

        await newItem.save();

        // Log stock movement for initial quantity
        if (quantity && quantity > 0) {
            await logStockMovement(
                newItem._id,
                item_name.trim(),
                quantity,
                'in',
                'stock',
                newItem._id.toString(),
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

        item.quantity += quantity;
        await item.save();

        // Log stock movement
        await logStockMovement(
            item._id,
            item.item_name,
            quantity,
            'in',
            'stock',
            itemId,
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

        if (item.quantity < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        item.quantity -= quantity;
        await item.save();

        // Log stock movement
        await logStockMovement(
            item._id,
            item.item_name,
            quantity,
            'out',
            'stock',
            itemId,
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
    const { itemId, item_name, HSN_SAC, specifications, company, category, type, unit_price, GST, min_quantity } = req.body;

    try {
        // Input validation
        if (!item_name || !item_name.trim()) {
            return res.status(400).json({ error: 'Item name is required' });
        }

        if (unit_price && (isNaN(unit_price) || unit_price < 0)) {
            return res.status(400).json({ error: 'Unit price must be a valid positive number' });
        }

        if (GST && (isNaN(GST) || GST < 0 || GST > 100)) {
            return res.status(400).json({ error: 'GST must be a valid number between 0 and 100' });
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

        // Update item details (quantity is managed separately via stock in/out operations)
        item.item_name = item_name.trim();
        item.HSN_SAC = HSN_SAC;
        item.specifications = specifications;
        item.company = company;
        item.category = category;
        item.type = type;
        item.unit_price = unit_price;
        item.GST = GST;
        item.min_quantity = min_quantity;
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
                    HSN_SAC: stockItem.HSN_SAC,
                    unit_price: stockItem.unit_price,
                    GST: stockItem.GST
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

        // Log stock movement if item had quantity
        if (item.quantity > 0) {
            await logStockMovement(
                item._id,
                item.item_name,
                item.quantity,
                'out',
                'stock',
                itemId,
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
