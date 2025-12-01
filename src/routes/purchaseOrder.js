const express = require('express');
const router = express.Router();
const { Purchases, Stock } = require('../models');
const logger = require('../utils/logger'); // Custom logger

// Function to generate a unique ID for each purchaseOrder
const { generateNextId } = require('../utils/idGenerator');

// Route to generate a new purchaseOrder ID
router.get("/generate-id", async (req, res) => {
    try {
        const peek = req.query.peek === 'true';
        const purchase_order_id = await generateNextId('purchaseOrder', { peek });
        return res.status(200).json({ purchase_order_id });
    } catch (err) {
        logger.error('Error generating purchase order id', { error: err.message || err });
        return res.status(500).json({ error: 'Failed to generate purchase order id' });
    }
});

router.post("/save-purchase-order", async (req, res) => {
    try {
        let {
            purchaseOrderId = '',
            purchaseInvoiceId = '',
            purchaseDate = new Date(),
            supplierName = '',
            supplierAddress = '',
            supplierPhone = '',
            supplierEmail = '',
            supplierGSTIN = '',
            items = [],
            totalAmount = 0
        } = req.body;

        // Validate required fields
        if (!purchaseOrderId) {
            return res.status(400).json({
                message: 'Missing required fields or invalid data: purchase order id',
            });
        }

        // Check if purchase order already exists
        let purchaseOrder = await Purchases.findOne({ purchase_order_id: purchaseOrderId });
        let previousItems = [];
        if (purchaseOrder) {
            // Save previous items for stock adjustment
            previousItems = Array.isArray(purchaseOrder.items) ? purchaseOrder.items : [];

            // Update existing purchase order
            purchaseOrder.purchase_order_id = purchaseOrderId;
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
            // Check if we need to increment the counter for this ID
            const expectedId = await generateNextId('purchaseOrder', { peek: true });
            if (purchaseOrderId === expectedId) {
                await generateNextId('purchaseOrder'); // Increment
            }

            // Create a new purchase order with the provided data
            purchaseOrder = new Purchases({
                purchase_order_id: purchaseOrderId,
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

        // --- STOCK MANAGEMENT LOGIC START ---

        // If updating, first revert previous items from stock
        if (previousItems.length > 0) {
            for (const prevItem of previousItems) {
                if (!prevItem.description) continue;
                let stockItem = await Stock.findOne({ item_name: prevItem.description });
                if (stockItem) {
                    stockItem.quantity = Number(stockItem.quantity || 0) - Number(prevItem.quantity || 0);
                    // // Prevent negative stock
                    // if (stockItem.quantity < 0) stockItem.quantity = 0;
                    await stockItem.save();
                }
            }
        }

        // Now add new items to stock
        for (const item of items) {
            if (!item.description) continue;

            let stockItem = await Stock.findOne({ item_name: item.description });

            if (stockItem) {
                // Update existing stock item
                stockItem.quantity = Number(stockItem.quantity || 0) + Number(item.quantity || 0);
                stockItem.unit_price = Number(item.unit_price) || stockItem.unit_price;
                stockItem.GST = Number(item.rate) || stockItem.GST;
                stockItem.specifications = item.specification || stockItem.specifications;
                stockItem.company = item.company || stockItem.company;
                stockItem.category = item.category || stockItem.category;
                stockItem.type = item.type || stockItem.type;
                stockItem.updatedAt = new Date();
                await stockItem.save();
            } else {
                // Create new stock item
                await Stock.create({
                    item_name: item.description,
                    HSN_SAC: item.HSN_SAC || item.hsn_sac || "",
                    specifications: item.specification || "",
                    company: item.company || "",
                    category: item.category || "",
                    unit_price: Number(item.unit_price) || 0,
                    GST: Number(item.rate) || 0,
                    margin: 0,
                    quantity: Number(item.quantity) || 0,
                    type: item.type || 'material',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }
        // --- STOCK MANAGEMENT LOGIC END ---

        // Save the purchase order
        const savedPurchaseOrder = await purchaseOrder.save();

        // Respond with success message and data
        res.status(201).json({
            message: 'Purchase order saved successfully',
            purchaseOrder: savedPurchaseOrder,
        });
    } catch (error) {
        logger.error('Error saving data:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Route to get the 10 most recent purchase orders
router.get("/recent-purchase-orders", async (req, res) => {
    try {
        // Fetch the 10 most recent purchase orders, sorted by creation date
        const recentPurchaseOrders = await Purchases.find()
            .sort({ createdAt: -1 }) // Assuming `createdAt` is a timestamp
            .limit(10)
            .select("project_name purchase_order_id supplier_name supplier_address total_amount");

        // Respond with the fetched purchase orders
        res.status(200).json({
            message: "Recent purchase orders retrieved successfully",
            purchaseOrder: recentPurchaseOrders,
        });
    } catch (error) {
        logger.error("Error retrieving recent purchase orders:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

// Route to get a purchase order by ID
router.get("/:purchaseOrderId", async (req, res) => {
    try {
        const { purchaseOrderId } = req.params;

        // Fetch the purchase order by ID
        const purchaseOrder = await Purchases.findOne({ purchase_order_id: purchaseOrderId });
        if (!purchaseOrder) {
            return res.status(404).json({ message: 'Purchase order not found' });
        }

        // Respond with the fetched purchase order
        res.status(200).json({
            message: "Purchase order retrieved successfully",
            purchaseOrder,
        });

    } catch (error) {
        logger.error("Error retrieving purchase order:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

// Route to delete a purchase order
router.delete("/:purchaseOrderId", async (req, res) => {
    try {
        const { purchaseOrderId } = req.params;

        // Fetch the purchase order by ID
        const purchaseOrder = await Purchases.findOne({ purchase_order_id: purchaseOrderId });
        if (!purchaseOrder) {
            return res.status(404).json({ message: 'Purchase order not found' });
        }

        // Delete the purchase order
        await Purchases.deleteOne({ purchase_order_id: purchaseOrderId });

        // Respond with success message
        res.status(200).json({ message: 'Purchase order deleted successfully' });
    } catch (error) {
        logger.error("Error deleting purchase order:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

// Search purchase orders by ID, project name, buyer name, or phone number
router.get('/search/:query', async (req, res) => {
    const { query } = req.params;
    if (!query) {
        return res.status(400).send('Query parameter is required.');
    }

    try {
        const purchaseOrders = await Purchases.find({
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
    } catch (err) {
        logger.error(err);
        return res.status(500).send('Failed to fetch purchase orders.');
    }
});

module.exports = router;
