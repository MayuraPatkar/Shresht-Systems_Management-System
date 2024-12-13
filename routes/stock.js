const express = require('express');
const router = express.Router();
const { Stock } = require('./database'); // Correctly import the Stock model

// Helper function to generate item ID
function generateItemId() {
    const prefix = 'I';
    const randomId = Math.floor(100 + Math.random() * 900); // Generates a random 3-digit number
    return `${prefix}${randomId}`;
}

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
    const { name, unitPrice, quantity, adminId } = req.body;

    try {
        // Validate input
        if (!name || isNaN(unitPrice) || isNaN(quantity) || !adminId) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        // Check if item already exists
        const existingItem = await Stock.findOne({ name, admin: adminId });

        if (existingItem) {
            return res.status(400).json({ error: 'Item already exists in stock' });
        }

        // Generate unique item ID
        const itemId = generateItemId();

        // Add new stock item
        const newItem = new Stock({
            itemId,
            name,
            unitPrice,
            quantity,
            admin: adminId,
        });

        await newItem.save();
        res.status(201).json({ message: 'Item added successfully', itemId });
    } catch (error) {
        console.error('Error adding stock item:', error);
        res.status(500).json({ error: 'Failed to add stock item' });
    }
});

// Route to Add Quantity to Existing Stock
router.post('/addToStock', async (req, res) => {
    const { itemId, quantity } = req.body;

    try {
        if (!itemId || isNaN(quantity)) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        const item = await Stock.findOne({ itemId });
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

        const item = await Stock.findOne({ itemId });
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
    const { itemId, name, unitPrice, quantity } = req.body;

    try {
        if (!itemId || !name || isNaN(unitPrice) || isNaN(quantity)) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        const item = await Stock.findOne({ itemId });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        item.name = name;
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
