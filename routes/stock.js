const express = require('express');
const router = express.Router();
const { Stock } = require('./database');
const log = require("electron-log"); // Import electron-log in the preload process



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
    const { itemName, HSN_SAC, unitPrice, quantity, GST, min_quantity } = req.body;

    try {

        // Check if item already exists
        const existingItem = await Stock.findOne({ item_name: itemName });

        if (existingItem) {
            return res.status(400).json({ error: 'Item already exists in stock' });
        }

        // Add new stock item
        const newItem = new Stock({
            item_name: itemName,
            HSN_SAC,
            unit_price: unitPrice,
            quantity,
            GST,
            // margin: threshold,
            min_quantity: min_quantity || 5,
            type: 'material',
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
    const { itemId, itemName, HSN_SAC, unitPrice, quantity, GST, min_quantity } = req.body;

    try {

        const item = await Stock.findOne({ _id: itemId });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        item.item_name = itemName;
        item.HSN_SAC = HSN_SAC;
        item.unit_price = unitPrice;
        item.quantity = quantity;
        item.GST = GST;
        item.min_quantity = min_quantity;
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


module.exports = router;
