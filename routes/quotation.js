const express = require('express');
const router = express.Router();
const { Admin, Quotations } = require('./database');

router.post("/save-quotation", async (req, res) => {
    try {
        const {
            Quotation_id = '',
            projectName,
            buyerName = '',
            buyerAddress = '',
            buyerPhone = '',
            date,
            items = [],
            total = 0,
            CGST_total = 0,
            SGST_total = 0,
            roundOff = 0,
            grandTotal = 0,
        } = req.body;

        // Validate required fields
        if (!items.length || total <= 0) {
            return res.status(400).json({
                message: 'Missing required fields or invalid data: buyer, address, phone, items, or total.',
            });
        }

        // Fetch admin details
        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Check if invoice already exists
        const existingQuotation = await Projects.findOne({ Quotation_id: QuotationId });
        if (existingQuotation) {
            return res.status(400).json({
                message: 'Quotation already exists',
                project: existingQuotation,
            });
        }

        // Create a new project with the provided data
        const quotation = new Quotations({
            admin: admin._id,
            project_name: projectName,
            buyer_name: buyerName,
            buyer_address: buyerAddress,
            buyer_phone: buyerPhone,
            date,
            items,
            total,
            CGST_total,
            SGST_total,
            round_Off: roundOff,
            grandTotal: grandTotal,
        });

        // Save the project
        const savedQuotaion = await quotaion.save();

        // Respond with success message and data
        res.status(201).json({
            message: ' successfully',
            project: savedProject,
        });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

module.exports = router;