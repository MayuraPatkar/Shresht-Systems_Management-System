const express = require('express');
const router = express.Router();
const { Stock, StockMovement } = require('../models');
const logger = require('../utils/logger');
const validators = require('../middleware/validators'); // Import validators

// Helper function to log stock movements
async function logStockMovement(itemName, quantityChange, movementType, referenceType, referenceId = null, notes = '') {
    try {
        await StockMovement.create({
            item_name: itemName,
            quantity_change: quantityChange,
            movement_type: movementType,
            reference_type: referenceType,
            reference_id: referenceId,
            notes: notes
        });
    } catch (error) {
        logger.error('Error logging stock movement:', error);
    }
}

// Route to get all stock items
router.get('/all', async (req, res) => {
    try {
        const stockData = await Stock.find().sort({ item_name: 1 });
        res.status(200).json(stockData);
    } catch (error) {
        logger.error('Error fetching stock data:', error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// Route to Add Item to Stock
router.post('/addItem', validators.createStock, async (req, res) => {
    const { item_name, HSN_SAC, specifications, company, category, type, unit_price, quantity, GST, min_quantity } = req.body;

    try {
        // Check if item already exists
        const existingItem = await Stock.findOne({ item_name: item_name.trim() });

        if (existingItem) {
            return res.status(400).json({ error: 'Item already exists in stock' });
        }

        // Add new stock item
        const newItem = new Stock({
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
    } catch (error) {
        logger.error('Error adding stock item:', error);
        res.status(500).json({ error: 'Failed to add stock item' });
    }
});

// Route to Add Quantity to Existing Stock
router.post('/addToStock', async (req, res) => {
    const { itemId, quantity } = req.body;

    try {

        const item = await Stock.findOne({ _id: itemId });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        item.quantity += quantity;
        await item.save();
        
        // Log stock movement
        await logStockMovement(
            item.item_name,
            quantity,
            'in',
            'stock',
            itemId,
            'Stock added manually'
        );

        res.status(200).json({ message: 'Stock updated successfully' });
    } catch (error) {
        logger.error('Error updating stock:', error);
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

// Route to Remove Quantity from Stock
router.post('/removeFromStock', async (req, res) => {
    const { itemId, quantity } = req.body;

    try {
        if (!itemId || isNaN(quantity)) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        const item = await Stock.findOne({ _id: itemId });
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
            item.item_name,
            quantity,
            'out',
            'stock',
            itemId,
            'Stock removed manually'
        );

        res.status(200).json({ message: 'Stock updated successfully' });
    } catch (error) {
        logger.error('Error updating stock:', error);
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

// Route to Edit Item Details
router.post('/editItem', async (req, res) => {
    const { itemId, item_name, HSN_SAC, specifications, company, category, type, unit_price, quantity, GST, min_quantity } = req.body;

    try {
        // Input validation
        if (!item_name || !item_name.trim()) {
            return res.status(400).json({ error: 'Item name is required' });
        }

        if (unit_price && (isNaN(unit_price) || unit_price < 0)) {
            return res.status(400).json({ error: 'Unit price must be a valid positive number' });
        }

        if (quantity && (isNaN(quantity) || quantity < 0)) {
            return res.status(400).json({ error: 'Quantity must be a valid positive number' });
        }

        if (GST && (isNaN(GST) || GST < 0 || GST > 100)) {
            return res.status(400).json({ error: 'GST must be a valid number between 0 and 100' });
        }

        // Check if another item with the same name exists (excluding current item)
        const existingItem = await Stock.findOne({
            item_name: item_name.trim(),
            _id: { $ne: itemId }
        });

        if (existingItem) {
            return res.status(400).json({ error: 'Item with this name already exists' });
        }

        const item = await Stock.findOne({ _id: itemId });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Calculate quantity change for logging
        const oldQuantity = item.quantity || 0;
        const newQuantity = quantity || 0;
        const quantityDiff = newQuantity - oldQuantity;

        item.item_name = item_name.trim();
        item.HSN_SAC = HSN_SAC;
        item.specifications = specifications;
        item.company = company;
        item.category = category;
        item.type = type;
        item.unit_price = unit_price;
        item.quantity = quantity;
        item.GST = GST;
        item.min_quantity = min_quantity;
        item.updatedAt = new Date();
        await item.save();
        
        // Log stock movement if quantity changed
        if (quantityDiff !== 0) {
            await logStockMovement(
                item_name.trim(),
                Math.abs(quantityDiff),
                quantityDiff > 0 ? 'in' : 'out',
                'stock',
                itemId,
                `Stock adjustment via edit (${oldQuantity} → ${newQuantity})`
            );
        }

        res.status(200).json({ message: 'Item updated successfully' });
    } catch (error) {
        logger.error('Error editing item:', error);
        res.status(500).json({ error: 'Failed to edit item' });
    }
});

router.get("/get-stock-item", async (req, res) => {
    try {
        const itemName = req.query.item;
        if (!itemName) return res.status(400).json({ message: "Item name required" });

        const stockItem = await Stock.findOne({ item_name: itemName });
        if (!stockItem) return res.status(404).json({ message: "Stock item not found" });

        res.json(stockItem);
    } catch (error) {
        logger.error("Error fetching stock item:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/get-names", async (req, res) => {
    try {
        const stockItems = await Stock.find({}, { item_name: 1 });
        res.json(stockItems.map(item => item.item_name));
    } catch (error) {
        logger.error("Error fetching stock item names:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Route to search for stock item by name and get specifications
router.get('/search/:itemName', async (req, res) => {
    try {
        const itemName = req.params.itemName.trim();
        const stockItem = await Stock.findOne({
            item_name: { $regex: new RegExp(`^${itemName}$`, 'i') }
        });

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
            res.json({stockItem

// Delete stock item
router.post('/deleteItem', async (req, res) => {
    const { itemId } = req.body;
    try {
        const item = await Stock.findOne({ _id: itemId });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        // Log stock movement if item had quantity
        if (item.quantity > 0) {
            await logStockMovement(
                item.item_name,
                item.quantity,
                'out',
                'stock',
                itemId,
                'Item deleted from stock'
            );
        }
        
        const result = await Stock.deleteOne({ _id: itemId });
        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting stock item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

module.exports = router;
