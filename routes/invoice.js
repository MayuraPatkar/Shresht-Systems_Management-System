const express = require('express');
const router = express.Router();
const { Invoices, Stock } = require('./database');
const log = require("electron-log"); // Import electron-log in the preload process


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
        log.error("Error fetching invoices:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});


router.post("/save-invoice", async (req, res) => {
    try {
        const {
            type,
            invoiceId = '',
            invoiceDate = '',
            projectName,
            poNumber = '',
            poDate,
            dcNumber = '',
            dcDate,
            serviceMonth = 0,
            margin = 0,
            wayBillNumber = '',
            buyerName = '',
            buyerAddress = '',
            buyerPhone = '',
            buyerEmail = '',
            consigneeName = '',
            consigneeAddress = '',
            items = [],
            totalAmountOriginal = 0,
            totalAmountDuplicate = 0,
            totalTaxOriginal = 0,
            totalTaxDuplicate = 0
        } = req.body;

        let total_amount_original = totalAmountOriginal;
        let total_amount_duplicate = totalAmountDuplicate;
        let total_tax_original = totalTaxOriginal;
        let total_tax_duplicate = totalTaxDuplicate;

        if (!invoiceId || !projectName) {
            return res.status(400).json({ message: 'Missing required fields: invoiceId, projectName.' });
        }

        const existingInvoice = await Invoices.findOne({ invoice_id: invoiceId });

        let items_original = existingInvoice?.items_original || [];
        let items_duplicate = existingInvoice?.items_duplicate || [];

        if (type === 'original') {
            items_original = items;                // overwrite originals
            // leave duplicate untouched
        } else if (type === 'duplicate') {
            items_duplicate = items;               // overwrite duplicates
            // originals stay as‐is
        } else {
            return res.status(400).json({ message: 'type must be "original" or "duplicate"' });
        }

        if (existingInvoice) {
            if (totalAmountOriginal == 0 && totalTaxOriginal == 0) {
                total_amount_original = existingInvoice.total_amount_original;
                total_tax_original = existingInvoice.total_tax_original;
            }
            if (totalAmountDuplicate == 0 && totalTaxDuplicate == 0) {
                total_amount_duplicate = existingInvoice.total_amount_duplicate;
                total_tax_duplicate = existingInvoice.total_tax_duplicate;
            }
        } else {
            total_amount_original = total_amount_original;
            total_tax_original = total_tax_original;
            total_amount_duplicate = total_amount_original;
            total_tax_duplicate = total_tax_original;
        }

        if (existingInvoice) {
            // Update stock: revert previous items
            for (let prev of existingInvoice.items_original) {
                await Stock.updateOne({ item_name: prev.description }, { $inc: { quantity: prev.quantity } });
            }
            // Update stock: deduct new items (allow negative)
            for (let cur of items_original) {
                await Stock.updateOne({ item_name: cur.description }, { $inc: { quantity: -cur.quantity } });
            }

            // Update the invoice
            Object.assign(existingInvoice, {
                project_name: projectName,
                invoice_date: invoiceDate,
                po_number: poNumber,
                po_date: poDate,
                dc_number: dcNumber,
                dc_date: dcDate,
                service_month: serviceMonth,
                margin: margin,
                Waybill_id: wayBillNumber,
                customer_name: buyerName,
                customer_address: buyerAddress,
                customer_phone: buyerPhone,
                customer_email: buyerEmail,
                consignee_name: consigneeName,
                consignee_address: consigneeAddress,
                items_original: items_original,
                items_duplicate: items_duplicate,
                total_amount_original: total_amount_original,
                total_amount_duplicate: total_amount_duplicate,
                total_tax_original: total_tax_original,
                total_tax_duplicate: total_tax_duplicate,
            });

            const updatedInvoice = await existingInvoice.save();
            return res.status(200).json({ message: 'Invoice updated successfully', invoice: updatedInvoice });
        } else {
            // Deduct stock for new invoice (allow negative)
            for (let item of items_original) {
                const stockItem = await Stock.findOne({ item_name: item.description });
                if (stockItem) {
                    stockItem.quantity -= item.quantity;
                    await stockItem.save();
                }
            }

            // Create a new invoice
            const invoice = new Invoices({
                invoice_id: invoiceId,
                invoice_date: invoiceDate || new Date(),
                project_name: projectName,
                po_number: poNumber,
                po_date: poDate,
                dc_number: dcNumber,
                dc_date: dcDate,
                service_month: serviceMonth,
                margin: margin,
                Waybill_id: wayBillNumber,
                customer_name: buyerName,
                customer_address: buyerAddress,
                customer_phone: buyerPhone,
                customer_email: buyerEmail,
                consignee_name: consigneeName,
                consignee_address: consigneeAddress,
                items_original: items,
                items_duplicate: items,
                total_amount_original: total_amount_original,
                total_amount_duplicate: total_amount_duplicate,
                total_tax_original: total_tax_original,
                total_tax_duplicate: total_tax_duplicate,
            });

            const savedInvoice = await invoice.save();
            return res.status(201).json({ message: 'Invoice saved successfully', invoice: savedInvoice });
        }
    } catch (error) {
        log.error('Error saving data:', error);
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
            .select("project_name invoice_id customer_name customer_phone customer_address payment_status total_amount_duplicate total_paid_amount");

        // Respond with the fetched invoices
        res.status(200).json({
            message: "Recent invoices retrieved successfully",
            invoices: recentInvoices,
        });
    } catch (error) {
        log.error("Error retrieving recent invoices:", error);
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
        log.error("Error fetching invoice:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});


router.post("/save-payment", async (req, res) => {
    try {
        const {
            invoiceId,
            paymentStatus,
            paymentMode,
            paymentDate,
            paidAmount = 0
        } = req.body;

        const invoice = await Invoices.findOne({ invoice_id: invoiceId });
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Ensure total_paid_amount is initialized
        invoice.total_paid_amount = Number(invoice.total_paid_amount || 0);

        // Push new payment
        invoice.payments.push({
            payment_date: paymentDate,
            paid_amount: Number(paidAmount),
            payment_mode: paymentMode
        });

        // Update total_paid_amount
        invoice.total_paid_amount += Number(paidAmount);
        invoice.payment_status = paymentStatus;

        if (
            paymentStatus === 'Paid' &&
            invoice.total_amount_duplicate > invoice.total_paid_amount
        ) {
            const remaining_amount = invoice.total_amount_duplicate - invoice.total_paid_amount;

            invoice.payments.push({
                payment_date: new Date(),
                paid_amount: Number(remaining_amount),
                payment_mode: 'Cash'
            });

            invoice.total_paid_amount += Number(remaining_amount);
        }

        if (invoice.total_amount_duplicate >= invoice.total_paid_amount) {
            invoice.payment_status = 'Paid';
        }

        await invoice.save();

        res.status(200).json({ message: "Payment saved successfully." });
    } catch (error) {
        console.error("Error saving payment:", error);
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
                    { customer_name: { $regex: query, $options: 'i' } },
                    { customer_phone: { $regex: query, $options: 'i' } },
                    { customer_email: { $regex: query, $options: 'i' } },
                ]
            });
        }

        if (invoices.length === 0) {
            return res.status(404).send('No invoice found.');
        } else {
            return res.status(200).json({ invoices });
        }
    } catch (err) {
        log.log(err);
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
        log.error("Error deleting invoice:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

module.exports = router;