const express = require('express');
const router = express.Router();
const { stock } = require('./database');

// Helper function to generate item ID
function generateItemId() {
    const prefix = 'I';
    const randomId = Math.floor(100 + Math.random() * 900); // Generates a random 3-digit number
    return `${prefix}${randomId}`;
}

// Route to Get Stock Data
router.get('/getStock', async (req, res) => {
    try {
        const stockData = await stock.find();
        res.status(200).json(stockData);
    } catch (error) {
        console.error('Error fetching stock data:', error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// Route to Add Item to Stock
router.post('/addItem', async (req, res) => {
    const { itemName, unitPrice, quantity } = req.body;
    try {
        // Validate input
        if (!itemName || isNaN(unitPrice) || isNaN(quantity)) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        // Check if item already exists
        let existingItem = await stock.findOne({ name: itemName });

        if (existingItem) {
            return res.status(400).json({ error: 'Item already exists in stock' });
        }

        // Generate unique item ID
        const itemId = generateItemId();

        // Add new stock item
        const newItem = new stock({
            itemId: itemId,
            name: itemName,
            unitPrice: unitPrice,
            quantity: quantity
        });

        await newItem.save();
        res.status(201).json({ message: 'Item added successfully', itemId });
    } catch (error) {
        console.error('Error adding stock item:', error);
        res.status(500).json({ error: 'Failed to add stock data' });
    }
});

// Route to Add Quantity to Existing Stock
router.post('/addToStock', async (req, res) => {
    const { itemId, quantity } = req.body;
    try {
        if (!itemId || isNaN(quantity)) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        const item = await stock.findOne({ _id: itemId });
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

        const item = await stock.findOne({ _id: itemId });
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
    const { itemId, itemName, unitPrice, quantity } = req.body;

    try {
        if (!itemId || !itemName || isNaN(unitPrice) || isNaN(quantity)) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        const item = await stock.findOne({ _id: itemId });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        item.name = itemName;
        item.unitPrice = unitPrice;
        item.quantity = quantity;
        await item.save();

        res.status(200).json({ message: 'Item updated successfully' });
    } catch (error) {
        console.error('Error editing item:', error);
        res.status(500).json({ error: 'Failed to edit item' });
    }
});

module.exports = router;
