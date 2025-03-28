const express = require('express');
const router = express.Router();
const { Stock } = require('./database');


// Route to Get Stock Data
router.get('/getStock', async (req, res) => {
    try {
        const stockData = await Stock.find();
        res.status(200).json(stockData);
    } catch (error) {
        console.error('Error fetching stock data:', error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// Route to Add Item to Stock
router.post('/addItem', async (req, res) => {
    const { itemName, HSN_SAC, unitPrice, quantity, threshold, GST, min_quantity } = req.body;

    try {

        // Check if item already exists
        const existingItem = await Stock.findOne({ itemName });

        if (existingItem) {
            return res.status(400).json({ error: 'Item already exists in stock' });
        }

        // Add new stock item
        const newItem = new Stock({
            itemName,
            HSN_SAC,
            unitPrice,
            quantity,
            GST,
            threshold,
            min_quantity
        });

        await newItem.save();
        res.status(201).json({
            message: 'Item added successfully',
            item: newItem
        });
    } catch (error) {
        console.error('Error adding stock item:', error);
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
        console.error('Error updating stock:', error);
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
        console.error('Error updating stock:', error);
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

// Route to Edit Item Details
router.post('/editItem', async (req, res) => {
    const { itemId, name, HSN_SAC, unitPrice, quantity, threshold, GST, min_quantity } = req.body;

    try {

        const item = await Stock.findOne({ _id: itemId });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        item.name = name;
        item.HSN_SAC = HSN_SAC;
        item.unitPrice = unitPrice;
        item.quantity = quantity;
        item.threshold = threshold;
        item.GST = GST;
        item.min_quantity = min_quantity;
        await item.save();

        res.status(200).json({ message: 'Item updated successfully' });
    } catch (error) {
        console.error('Error editing item:', error);
        res.status(500).json({ error: 'Failed to edit item' });
    }
});

router.get("/get-stock-item", async (req, res) => {
    try {
        const itemName = req.query.item;
        if (!itemName) return res.status(400).json({ message: "Item name required" });

        const stockItem = await Stock.findOne({ itemName });
        if (!stockItem) return res.status(404).json({ message: "Stock item not found" });

        res.json({
            itemName: stockItem.itemName,
            HSN_SAC: stockItem.HSN_SAC,
            unitPrice: stockItem.unitPrice,
            GST: stockItem.GST
        });
    } catch (error) {
        console.error("Error fetching stock item:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


module.exports = router;
