const express = require('express');
const router = express.Router();
const { Admin, Invoices } = require('./database');

// Function to generate a unique ID for each invoice
function generateUniqueId() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits of the year
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month (0-based, so add 1)
    const day = now.getDate().toString().padStart(2, '0'); // Day of the month
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // Random 3-digit number
    return `INV-${year}${month}${day}-${randomNum}`;
}

router.post("/save-invoice", async (req, res) => {
    try {
        const {
            invoiceId = '',
            projectName,
            poNumber = '',
            poDate,
            dcNumber = '',
            dcDate,
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

        // Validate required fields
        if (!projectName || !buyerName || !buyerAddress || !buyerPhone || !items.length) {
            return res.status(400).json({
                message: 'Missing required fields or invalid data: projectName, buyerName, buyerAddress, buyerPhone, or items.',
            });
        }

        // Fetch admin details
        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Generate a unique ID for the invoice if not provided
        let generatedInvoiceId = invoiceId;
        if (!invoiceId) {
            generatedInvoiceId = generateUniqueId();
        }

        // Check if invoice already exists
        const existingInvoice = await Invoices.findOne({ invoice_id: generatedInvoiceId });
        if (existingInvoice) {
            // Update the existing invoice
            existingInvoice.project_name = projectName;
            existingInvoice.po_number = poNumber;
            existingInvoice.po_date = poDate;
            existingInvoice.dc_number = dcNumber;
            existingInvoice.dc_date = dcDate;
            existingInvoice.eway_bill_number = ewayBillNumber;
            existingInvoice.date = date;
            existingInvoice.buyer_name = buyerName;
            existingInvoice.buyer_address = buyerAddress;
            existingInvoice.buyer_phone = buyerPhone;
            existingInvoice.consignee_name = consigneeName;
            existingInvoice.consignee_address = consigneeAddress;
            existingInvoice.items = items;
            existingInvoice.due_amount = due_amount;
            existingInvoice.status = status;

            // Save the updated invoice
            const updatedInvoice = await existingInvoice.save();

            // Respond with success message and data
            return res.status(200).json({
                message: 'Invoice updated successfully',
                invoice: updatedInvoice,
            });
        } else {
            // Create a new invoice with the provided data
            const invoice = new Invoices({
                admin: admin._id,
                project_name: projectName,
                invoice_id: generatedInvoiceId,
                po_number: poNumber,
                po_date: poDate,
                dc_number: dcNumber,
                dc_date: dcDate,
                eway_bill_number: ewayBillNumber,
                date,
                buyer_name: buyerName,
                buyer_address: buyerAddress,
                buyer_phone: buyerPhone,
                consignee_name: consigneeName,
                consignee_address: consigneeAddress,
                items,
                due_amount,
                status
            });

            // Save the new invoice
            const savedInvoice = await invoice.save();

            // Respond with success message and data
            return res.status(201).json({
                message: 'Invoice saved successfully',
                invoice: savedInvoice,
            });
        }
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Route to get the 5 most recent invoices with optional filter
router.get("/recent-invoices", async (req, res) => {
    try {
        // Fetch the 5 most recent invoices, sorted by creation date
        const recentInvoices = await Invoices.find()
            .sort({ createdAt: -1 }) // Assuming `createdAt` is a timestamp
            .limit(5)
            .select("project_name invoice_id date status"); // Select only the required fields

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