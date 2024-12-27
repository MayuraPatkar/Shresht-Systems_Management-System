const express = require('express');
const router = express.Router();
const { Admin, Purchases } = require('./database');

// Function to generate a unique ID for each purchase order
function generateUniqueId() {
    const timestamp = Date.now().toString(); // Current timestamp
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // Random 3-digit number
    return `PO-${timestamp}-${randomNum}`;
}

router.post("/save-purchase-order", async (req, res) => {
    try {
        let {
            purchase_order_id = '',
            projectName,
            handledBy,
            supplier_name = '',
            supplier_address = '',
            supplier_phone = '',
            supplier_email = '',
            supplier_GSTIN = '',
            items = [],
        } = req.body;

        // Validate required fields
        if (!projectName || !supplier_name || !supplier_address || !supplier_phone || !items.length) {
            return res.status(400).json({
                message: 'Missing required fields or invalid data: projectName, supplier_name, supplier_address, supplier_phone, items, or total.',
            });
        }

        // Fetch admin details
        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Generate a unique ID for the purchase order if not provided
        if (!purchase_order_id) {
            purchase_order_id = generateUniqueId();
        }

        // Check if purchase order already exists
        let purchaseOrder = await Purchases.findOne({ purchase_order_id: purchase_order_id });
        if (purchaseOrder) {
            // Update existing purchase order
            purchaseOrder.project_name = projectName;
            purchaseOrder.handledBy = handledBy;
            purchaseOrder.supplier_name = supplier_name;
            purchaseOrder.supplier_address = supplier_address;
            purchaseOrder.supplier_phone = supplier_phone;
            purchaseOrder.supplier_email = supplier_email;
            purchaseOrder.supplier_GSTIN = supplier_GSTIN;
            purchaseOrder.items = items;
        } else {
            // Create a new purchase order with the provided data
            purchaseOrder = new Purchases({
                admin: admin._id,
                purchase_order_id: purchase_order_id,
                project_name: projectName,
                handledBy: handledBy,
                supplier_name: supplier_name,
                supplier_address: supplier_address,
                supplier_phone: supplier_phone,
                supplier_email: supplier_email,
                supplier_GSTIN: supplier_GSTIN,
                items,
                createdAt: new Date(),
            });
        }

        // Save the purchase order
        const savedPurchaseOrder = await purchaseOrder.save();

        // Respond with success message and data
        res.status(201).json({
            message: 'Purchase order saved successfully',
            purchaseOrder: savedPurchaseOrder,
        });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Route to get the 5 most recent purchase orders
router.get("/recent-purchase-orders", async (req, res) => {
    try {
        // Fetch the 5 most recent purchase orders, sorted by creation date
        const recentPurchaseOrders = await Purchases.find()
            .sort({ createdAt: -1 }) // Assuming `createdAt` is a timestamp
            .limit(5)
            .select("project_name purchase_order_id");

        // Respond with the fetched purchase orders
        res.status(200).json({
            message: "Recent purchase orders retrieved successfully",
            purchaseOrder: recentPurchaseOrders,
        });
    } catch (error) {
        console.error("Error retrieving recent purchase orders:", error);
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
        console.error("Error retrieving purchase order:", error);
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
        console.error("Error deleting purchase order:", error);
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
        console.log(err);
        return res.status(500).send('Failed to fetch purchase orders.');
    }
});

module.exports = router;