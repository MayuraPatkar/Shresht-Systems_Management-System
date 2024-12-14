const express = require('express');
const router = express.Router();
const { Admin, Projects } = require('./database');

// Route to save invoice data
router.post("/save-invoice", async (req, res) => {
    try {
        const {
            buyer = '',
            address = '',
            phone = '',
            email = '',
            invoiceNumber = '',
            ewayBillNumber = '',
            date = '',
            placeToSupply = '',
            transportationMode = '',
            vehicleNo = '',
            items = [],
            total = 0,
            CGST_total = 0,
            SGST_total = 0,
            roundOff = 0,
            invoiceTotal = 0,
        } = req.body;

        // Validate required fields
        // if (!buyer || !address || !phone || !invoiceNumber || !items.length || total <= 0) {
        //     return res.status(400).json({
        //         message: 'Missing required fields or invalid data: buyer, address, phone, invoiceNumber, items, or total.',
        //     });
        // }

        // Fetch admin details
        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Check if invoice already exists
        const existingInvoice = await Projects.findOne({ invoice_number: invoiceNumber });
        if (existingInvoice) {
            return res.status(400).json({
                message: 'Invoice already exists',
                project: existingInvoice,
            });
        }

        // Create a new project with the provided data
        const project = new Projects({
            admin: admin._id,
            name: buyer,
            address,
            phone,
            email,
            invoice_number: invoiceNumber,
            E_Way_Bill_number: ewayBillNumber,
            date,
            place_to_supply: placeToSupply,
            transportation_mode: transportationMode,
            vehicle_no: vehicleNo,
            items,
            total,
            CGST_total,
            SGST_total,
            round_Off: roundOff,
            invoice_total: invoiceTotal,
        });

        // Save the project
        const savedProject = await project.save();

        // Respond with success message and data
        res.status(201).json({
            message: 'Invoice and project data saved successfully',
            project: savedProject,
        });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});


module.exports = router;