const express = require('express');
const router = express.Router();
const { Admin, Customer, Invoice } = require('./database');

// Helper function to generate item ID
function generateItemId() {
    const prefix = 'C';
    const randomId = Math.floor(100 + Math.random() * 900); // Generates a random 3-digit number
    return `${prefix}${randomId}`;
}

// Route to save customer and invoice data
router.post("/save-invoice", async (req, res) => {
    try {
        const data = req.body;
        console.log(data);

        const admin = await Admin.findOne();

        const customer_ = await customer.findOne();

        // Generate unique item ID
        const cId = generateItemId();

        // 1. Save Customer Data
        const customer = new Customer({
            admin: admin._id,
            c_id: cId,
            name: data.buyer,
            address: data.address,
            phone: data.phone,
            email: data.email,
        });
        const savedCustomer = await customer.save();

        // 2. Save Invoice Data
        // const invoice = new Invoice({
        //     customer: savedCustomer._id,
        //     invoice_number: data.invoice_number,
        //     date: new Date(data.date),
        //     total: data.total,
        // });
        // const savedInvoice = await invoice.save();

        res.status(200).json({
            message: 'Invoice and customer data saved successfully',
            // invoice: savedInvoice,
            customer: savedCustomer,
        });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ message: 'Error saving invoice or customer data', error });
    }
});

// Example route to fetch all invoices
router.get("/invoices", async (req, res) => {
    try {
        const invoices = await Invoice.find().populate('customer');  // Populate customer data in invoices
        res.status(200).json(invoices);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ message: 'Error fetching invoices', error });
    }
});


router.get("/details", (req, res) => {
    // Mock data for the invoice
    const invoiceDetails = {
        projectName: "Sample Project",
        invoiceNumber: "INV/001",
        items: [
            { description: "Item A", qty: 2, price: 500 },
            { description: "Item B", qty: 1, price: 300 },
        ],
    };

    res.json(invoiceDetails);
});

module.exports = router;