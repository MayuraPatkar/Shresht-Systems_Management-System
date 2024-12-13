const express = require('express');
const router = express.Router();
const { Admin, Projects } = require('./database');

// Route to save data
router.post("/save-invoice", async (req, res) => {
    try {
        const {
            buyer,
            address,
            phone,
            email = '', // Optional, defaults to empty string if not provided
            invoiceNumber,
            ewayBillNumber,
            date,
            items,
            totalAmount,
        } = req.body;

        // Validate required fields
        if (!buyer || !address || !phone || !invoiceNumber || !items || !totalAmount) {
            return res.status(400).json({
                message: 'Missing required fields: buyer, address, phone, invoiceNumber, items, or totalAmount',
            });
        }

        // Fetch admin details
        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Create a new project with buyer details
        const project = new Projects({
            admin: admin._id,
            name: buyer,
            address,
            phone,
            email,
        });

        // Save the project
        const savedProject = await project.save();

        // Prepare invoice data
        const invoice = new Invoice({
            admin: admin._id,
            project: savedProject._id,
            invoiceNumber,
            ewayBillNumber,
            date,
            items,
            totalAmount,
        });

        // Save the invoice
        const savedInvoice = await invoice.save();

        // Respond with success message and data
        res.status(200).json({
            message: 'Invoice and project data saved successfully',
            project: savedProject,
            invoice: savedInvoice,
        });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ message: 'Error saving data', error: error.message });
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