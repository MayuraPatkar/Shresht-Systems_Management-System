const express = require('express');
const router = express.Router();
const { Admin, Invoices, Stock } = require('./database');

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
            ewayBillNumber = '',
            buyerName = '',
            buyerAddress = '',
            buyerPhone = '',
            consigneeName = '',
            consigneeAddress = '',
            date,
            items = [],
            due_amount,
            status = 'unpaid'
        } = req.body;

        if (!invoiceId || !projectName) {
            return res.status(400).json({ message: 'Missing required fields: invoiceId, projectName.' });
        }

        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
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
                dc_number: dcNumber, dc_date: dcDate, service_month, E_Way_Bill_number: ewayBillNumber,
                date, buyer_name: buyerName, buyer_address: buyerAddress, buyer_phone: buyerPhone,
                consignee_name: consigneeName, consignee_address: consigneeAddress, items,
                due_amount, status
            });

            const updatedInvoice = await existingInvoice.save();
            return res.status(200).json({ message: 'Invoice updated successfully', invoice: updatedInvoice });
        } else {
            // Deduct stock for new invoice
            for (let item of items) {
                const stockItem = await Stock.findOne({ itemName: item.description });
                if (!stockItem || stockItem.quantity < item.quantity) {
                    return res.status(400).json({ message: `Not enough stock for ${item.description}` });
                }
                stockItem.quantity -= item.quantity;
                await stockItem.save();
            }

            // Create a new invoice
            const invoice = new Invoices({
                admin: admin._id, project_name: projectName, invoice_id: invoiceId, po_number: poNumber,
                po_date: poDate, dc_number: dcNumber, dc_date: dcDate, service_month,
                E_Way_Bill_number: ewayBillNumber, date, buyer_name: buyerName, buyer_address: buyerAddress,
                buyer_phone: buyerPhone, consignee_name: consigneeName, consignee_address: consigneeAddress,
                items, due_amount, status
            });

            const savedInvoice = await invoice.save();
            return res.status(201).json({ message: 'Invoice saved successfully', invoice: savedInvoice });
        }
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});


// Route to get the 5 most recent invoices
router.get("/recent-invoices", async (req, res) => {
    try {
        // Fetch the 5 most recent invoices, sorted by creation date
        const recentInvoices = await Invoices.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select("project_name invoice_id date status");

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

module.exports = router;