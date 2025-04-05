const express = require('express');
const router = express.Router();
const { Invoices, Stock } = require('./database');

// Function to generate a unique ID for each Invoice
function generateUniqueId() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits of the year
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month (0-based, so add 1)
    const day = now.getDate().toString().padStart(2, '0'); // Day of the month
    const randomNum = Math.floor(Math.random() * 10); // Random single-digit number
    return `${year}${month}${day}${randomNum}`;
}

// Route to generate a new Invoice ID
router.get("/generate-id", async (req, res) => {
    let invoice_id;
    let isUnique = false;

    while (!isUnique) {
        invoice_id = generateUniqueId();
        const existingInvoice = await Invoices.findOne({ invoice_id: invoice_id });
        if (!existingInvoice) {
            isUnique = true;
        }
    }

    res.status(200).json({ invoice_id: invoice_id });
});

router.get("/get-all", async (req, res) => {
    try {
        const invoices = await Invoices.find();
        return res.status(200).json({ invoices });
    } catch (error) {
        console.error("Error fetching invoices:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});


router.post("/save-invoice", async (req, res) => {
    try {
        const {
            invoiceId = '',
            projectName,
            poNumber = '',
            poDate,
            dcNumber = '',
            dcDate,
            service_month = 0,
            wayBillNumber = '',
            buyerName = '',
            buyerAddress = '',
            buyerPhone = '',
            consigneeName = '',
            consigneeAddress = '',
            paidAmount = 0,
            paymentStatus = '',
            paymentMode = '',
            paymentDate = null,
            items = [],
            totalAmount = 0,
        } = req.body;

        const date = new Date();

        if (!invoiceId || !projectName) {
            return res.status(400).json({ message: 'Missing required fields: invoiceId, projectName.' });
        }

        const existingInvoice = await Invoices.findOne({ invoice_id: invoiceId });

        if (existingInvoice) {
            // Calculate stock difference
            const prevItems = existingInvoice.items;
            const stockChanges = {};

            for (let prevItem of prevItems) {
                stockChanges[prevItem.description] = (stockChanges[prevItem.description] || 0) + prevItem.quantity;
            }
            for (let newItem of items) {
                stockChanges[newItem.description] = (stockChanges[newItem.description] || 0) - newItem.quantity;
            }

            for (let [itemName, change] of Object.entries(stockChanges)) {
                if (change !== 0) {
                    const stockItem = await Stock.findOne({ itemName });
                    if (stockItem) {
                        stockItem.quantity += change;
                        if (stockItem.quantity < 0) {
                            return res.status(400).json({ message: `Not enough stock for ${itemName}` });
                        }
                        await stockItem.save();
                    }
                }
            }

            // Update the invoice
            Object.assign(existingInvoice, {
                project_name: projectName, po_number: poNumber, po_date: poDate,
                dc_number: dcNumber, dc_date: dcDate, service_month, Way_Bill_number: wayBillNumber,
                date, buyer_name: buyerName, buyer_address: buyerAddress, buyer_phone: buyerPhone,
                consignee_name: consigneeName, consignee_address: consigneeAddress, items,
                totalAmount: totalAmount, paidAmount: paidAmount, paymentStatus: paymentStatus,
                paymentMode: paymentMode, paymentDate: paymentDate
            });

            const updatedInvoice = await existingInvoice.save();
            return res.status(200).json({ message: 'Invoice updated successfully', invoice: updatedInvoice });
        } else {
            // Deduct stock for new invoice
            for (let item of items) {
                const stockItem = await Stock.findOne({ itemName: item.description });
                if (stockItem && stockItem.quantity >= item.quantity) {
                    stockItem.quantity -= item.quantity;
                    await stockItem.save();
                }
            }

            // Create a new invoice
            const invoice = new Invoices({
                invoice_id: invoiceId, project_name: projectName, po_number: poNumber,
                po_date: poDate, dc_number: dcNumber, dc_date: dcDate, service_month,
                Way_Bill_number: wayBillNumber, date, buyer_name: buyerName, buyer_address: buyerAddress,
                buyer_phone: buyerPhone, consignee_name: consigneeName, consignee_address: consigneeAddress,
                items, totalAmount: totalAmount, paidAmount: paidAmount, paymentStatus: paymentStatus,
                paymentMode: paymentMode, paymentDate: paymentDate
            });

            const savedInvoice = await invoice.save();
            return res.status(201).json({ message: 'Invoice saved successfully', invoice: savedInvoice });
        }
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});


// Route to get the 10 most recent invoices
router.get("/recent-invoices", async (req, res) => {
    try {
        // Fetch the 5 most recent invoices, sorted by creation date
        const recentInvoices = await Invoices.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select("project_name invoice_id buyer_name buyer_phone buyer_address paymentStatus");

        // Respond with the fetched invoices
        res.status(200).json({
            message: "Recent invoices retrieved successfully",
            invoices: recentInvoices,
        });
    } catch (error) {
        console.error("Error retrieving recent invoices:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

// Route to get a specific invoice by ID
router.get("/:invoice_id", async (req, res) => {
    try {
        const { invoice_id } = req.params;

        // Fetch the invoice data from the database
        const invoice = await Invoices.findOne({ invoice_id });
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Respond with the invoice data
        res.status(200).json({ invoice });
    } catch (error) {
        console.error("Error fetching invoice:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Search invoice by ID, owner name, or phone number
router.get('/search/:query', async (req, res) => {
    const { query } = req.params;
    if (!query) {
        return res.status(400).send('Query parameter is required.');
    }
    let invoices = [];
    try {
        if (query === 'unpaid') {
            invoices = await Invoices.find({
                $or: [
                    { paymentStatus: { $regex: query, $options: 'i' } }
                ]
            });
        } else {
             invoices = await Invoices.find({
                $or: [
                    { invoice_id: { $regex: query, $options: 'i' } },
                    { project_name: { $regex: query, $options: 'i' } },
                    { buyer_name: { $regex: query, $options: 'i' } },
                    { buyer_phone: { $regex: query, $options: 'i' } }
                ]
            });
        }

        if (invoices.length === 0) {
            return res.status(404).send('No invoice found.');
        } else {
            return res.status(200).json({ invoices });
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send('Failed to fetch invoice.');
    }
});

// Route to delete a invoice
router.delete("/:invoiceId", async (req, res) => {
    try {
        const { invoiceId } = req.params;

        // Fetch the invoiceId by ID
        const invoice = await Invoices.findOne({ invoice_id: invoiceId });
        if (!invoice) {
            return res.status(404).json({ message: 'invoice not found' });
        }

        // Delete the invoice
        await Invoices.deleteOne({ invoice_id: invoiceId });

        // Respond with success message
        res.status(200).json({ message: 'invoice deleted successfully' });
    } catch (error) {
        console.error("Error deleting invoice:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

module.exports = router;