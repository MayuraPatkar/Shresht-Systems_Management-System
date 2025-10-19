const express = require('express');
const router = express.Router();
const { Stock } = require('../models');
const log = require("electron-log"); // Import electron-log in the preload process

// Route to get all stock items
router.get('/all', async (req, res) => {
    try {
        const stockData = await Stock.find().sort({ item_name: 1 });
        res.status(200).json(stockData);
    } catch (error) {
        log.error('Error fetching stock data:', error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// Route to Get Stock Data
router.get('/getStock', async (req, res) => {
    try {
        const stockData = await Stock.find();
        res.status(200).json(stockData);
    } catch (error) {
        log.error('Error fetching stock data:', error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// Route to Add Item to Stock
router.post('/addItem', async (req, res) => {
    const { itemName, HSN_SAC, specifications, company, category, type, unitPrice, quantity, GST, min_quantity } = req.body;

    try {
        // Input validation
        if (!itemName || !itemName.trim()) {
            return res.status(400).json({ error: 'Item name is required' });
        }
        
        if (unitPrice && (isNaN(unitPrice) || unitPrice < 0)) {
            return res.status(400).json({ error: 'Unit price must be a valid positive number' });
        }
        
        if (quantity && (isNaN(quantity) || quantity < 0)) {
            return res.status(400).json({ error: 'Quantity must be a valid positive number' });
        }
        
        if (GST && (isNaN(GST) || GST < 0 || GST > 100)) {
            return res.status(400).json({ error: 'GST must be a valid number between 0 and 100' });
        }

        // Check if item already exists
        const existingItem = await Stock.findOne({ item_name: itemName.trim() });

        if (existingItem) {
            return res.status(400).json({ error: 'Item already exists in stock' });
        }

        // Add new stock item
        const newItem = new Stock({
            item_name: itemName.trim(),
            HSN_SAC,
            specifications,
            company,
            category,
            type: type || 'material',
            unit_price: unitPrice,
            quantity,
            GST,
            min_quantity: min_quantity || 5,
        });

        await newItem.save();
        res.status(201).json({
            message: 'Item added successfully',
            item: newItem
        });
    } catch (error) {
        log.error('Error adding stock item:', error);
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

        res.status(200).json({ message: 'Stock updated successfully' });
    } catch (error) {
        log.error('Error updating stock:', error);
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

        res.status(200).json({ message: 'Stock updated successfully' });
    } catch (error) {
        log.error('Error updating stock:', error);
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

// Route to Edit Item Details
router.post('/editItem', async (req, res) => {
    const { itemId, itemName, HSN_SAC, specifications, company, category, type, unitPrice, quantity, GST, min_quantity } = req.body;

    try {
        // Input validation
        if (!itemName || !itemName.trim()) {
            return res.status(400).json({ error: 'Item name is required' });
        }
        
        if (unitPrice && (isNaN(unitPrice) || unitPrice < 0)) {
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
            item_name: itemName.trim(), 
            _id: { $ne: itemId } 
        });

        if (existingItem) {
            return res.status(400).json({ error: 'Item with this name already exists' });
        }

        const item = await Stock.findOne({ _id: itemId });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        item.item_name = itemName.trim();
        item.HSN_SAC = HSN_SAC;
        item.specifications = specifications,
        item.company = company;
        item.category = category;
        item.type = type;
        item.unit_price = unitPrice;
        item.quantity = quantity;
        item.GST = GST;
        item.min_quantity = min_quantity;
        item.updatedAt = new Date();
        await item.save();

        res.status(200).json({ message: 'Item updated successfully' });
    } catch (error) {
        log.error('Error editing item:', error);
        res.status(500).json({ error: 'Failed to edit item' });
    }
});

router.get("/get-stock-item", async (req, res) => {
    try {
        const itemName = req.query.item;
        if (!itemName) return res.status(400).json({ message: "Item name required" });

        const stockItem = await Stock.findOne({ item_name: itemName });
        if (!stockItem) return res.status(404).json({ message: "Stock item not found" });

        res.json({
            itemName: stockItem.item_name,
            HSN_SAC: stockItem.HSN_SAC,
            specifications: stockItem.specifications,
            unitPrice: stockItem.unit_price,
            GST: stockItem.GST
        });
    } catch (error) {
        log.error("Error fetching stock item:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/get-names", async (req, res) => {
    try {
        const stockItems = await Stock.find({}, { item_name: 1 });
        res.json(stockItems.map(item => item.item_name));
    } catch (error) {
        log.error("Error fetching stock item names:", error);
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
            res.json({ found: false });
        }
    } catch (error) {
        log.error("Error searching stock item:", error);
        res.status(500).json({ error: "Failed to search stock item" });
    }
});

// Delete stock item
router.post('/deleteItem', async (req, res) => {
    const { itemId } = req.body;
    try {
        const result = await Stock.deleteOne({ _id: itemId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json({ success: true });
    } catch (error) {
        log.error('Error deleting stock item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

module.exports = router;
