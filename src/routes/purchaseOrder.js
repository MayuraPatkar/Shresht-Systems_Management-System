const express = require('express');
const router = express.Router();
const { Purchases, Stock } = require('../models');
const logger = require('../utils/logger');

// Import ID generator functions
const { previewNextId, generateNextId } = require('../utils/idGenerator');

/**
 * Route: Generate a Preview ID
 * Description: returns the next likely ID for UI display.
 * Does NOT increment the database counter.
 */
router.get("/generate-id", async (req, res) => {
    try {
        const purchase_order_id = await previewNextId('purchaseOrder');
        return res.status(200).json({ purchase_order_id });
    } catch (err) {
        logger.error('Error generating purchase order preview', { error: err.message || err });
        return res.status(500).json({ error: 'Failed to generate purchase order id' });
    }
});

/**
 * Route: Save or Update Purchase Order
 * Description: Creates a new PO (generating a fresh ID) or updates an existing one.
 */
router.post("/save-purchase-order", async (req, res) => {
    try {
        let {
            purchaseOrderId = '', // Could be a preview ID (new) or existing ID (update)
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

        // Attempt to find an existing document using the provided ID
        let purchaseOrder = null;
        if (purchaseOrderId) {
            purchaseOrder = await Purchases.findOne({ purchase_order_id: purchaseOrderId });
        }

        let previousItems = [];

        if (purchaseOrder) {
            // ---------------------------------------------------------
            // SCENARIO 1: UPDATE EXISTING PURCHASE ORDER
            // ---------------------------------------------------------

            // Capture previous items for stock reversal logic
            previousItems = Array.isArray(purchaseOrder.items) ? purchaseOrder.items : [];

            // Update fields
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
            // ---------------------------------------------------------
            // SCENARIO 2: CREATE NEW PURCHASE ORDER
            // ---------------------------------------------------------

            // Generate the permanent ID now (increments the counter)
            const newId = await generateNextId('purchaseOrder');

            purchaseOrder = new Purchases({
                purchase_order_id: newId,
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

        // ---------------------------------------------------------
        // STOCK MANAGEMENT LOGIC
        // ---------------------------------------------------------

        // 1. Revert previous items if updating
        if (previousItems.length > 0) {
            for (const prevItem of previousItems) {
                if (!prevItem.description) continue;
                let stockItem = await Stock.findOne({ item_name: prevItem.description });
                if (stockItem) {
                    stockItem.quantity = Number(stockItem.quantity || 0) - Number(prevItem.quantity || 0);
                    await stockItem.save();
                }
            }
        }

        // 2. Add current items to stock
        for (const item of items) {
            if (!item.description) continue;

            let stockItem = await Stock.findOne({ item_name: item.description });

            if (stockItem) {
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

        // Save the document
        const savedPurchaseOrder = await purchaseOrder.save();

        res.status(201).json({
            message: 'Purchase order saved successfully',
            purchaseOrder: savedPurchaseOrder,
            purchase_order_id: savedPurchaseOrder.purchase_order_id // Return the final ID
        });
    } catch (error) {
        logger.error('Error saving purchase order:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Route to get the 10 most recent purchase orders
router.get("/recent-purchase-orders", async (req, res) => {
    try {
        const recentPurchaseOrders = await Purchases.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select("project_name purchase_order_id supplier_name supplier_address total_amount");

        res.status(200).json({
            message: "Recent purchase orders retrieved successfully",
            purchaseOrder: recentPurchaseOrders,
        });
    } catch (error) {
        logger.error("Error retrieving recent purchase orders:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Route to get a purchase order by ID
router.get("/:purchaseOrderId", async (req, res) => {
    try {
        const { purchaseOrderId } = req.params;
        const purchaseOrder = await Purchases.findOne({ purchase_order_id: purchaseOrderId });
        if (!purchaseOrder) {
            return res.status(404).json({ message: 'Purchase order not found' });
        }
        res.status(200).json({ message: "Purchase order retrieved successfully", purchaseOrder });
    } catch (error) {
        logger.error("Error retrieving purchase order:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Route to delete a purchase order
router.delete("/:purchaseOrderId", async (req, res) => {
    try {
        const { purchaseOrderId } = req.params;
        const purchaseOrder = await Purchases.findOne({ purchase_order_id: purchaseOrderId });
        if (!purchaseOrder) {
            return res.status(404).json({ message: 'Purchase order not found' });
        }
        await Purchases.deleteOne({ purchase_order_id: purchaseOrderId });
        res.status(200).json({ message: 'Purchase order deleted successfully' });
    } catch (error) {
        logger.error("Error deleting purchase order:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Search purchase orders
router.get('/search/:query', async (req, res) => {
    const { query } = req.params;
    if (!query) return res.status(400).send('Query parameter is required.');

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