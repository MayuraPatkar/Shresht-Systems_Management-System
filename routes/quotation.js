const express = require('express');
const router = express.Router();
const { Admin, Quotations } = require('./database');

// Function to generate a unique ID for each quotation
function generateUniqueId() {
    const timestamp = Date.now().toString(); // Current timestamp
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // Random 3-digit number
    return `QTN-${timestamp}-${randomNum}`;
}

router.post("/save-quotation", async (req, res) => {
    try {
        const {
            projectName,
            buyerName = '',
            buyerAddress = '',
            buyerPhone = '',
            items = [],
            totalAmount = 0,
            CGSTTotal = 0,
            SGSTTotal = 0,
            roundOff = 0,
            grandTotal = 0,
        } = req.body;

        // Validate required fields
        if (!projectName || !buyerName || !buyerAddress || !buyerPhone || !items.length || totalAmount <= 0) {
            return res.status(400).json({
                message: 'Missing required fields or invalid data: projectName, buyerName, buyerAddress, buyerPhone, items, or total.',
            });
        }

        // Fetch admin details
        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Generate a unique ID for the quotation
        const quotationId = generateUniqueId();

        // Check if quotation already exists
        const existingQuotation = await Quotations.findOne({ quotation_id: quotationId });
        if (existingQuotation) {
            return res.status(400).json({
                message: 'Quotation already exists',
                quotation: existingQuotation,
            });
        }

        // Create a new quotation with the provided data
        const quotation = new Quotations({
            admin: admin._id,
            quotation_id: quotationId,
            project_name: projectName,
            buyer_name: buyerName,
            buyer_address: buyerAddress,
            buyer_phone: buyerPhone,
            items,
            totalAmount,
            CGSTTotal,
            SGSTTotal,
            round_Off: roundOff,
            grand_total: grandTotal,
            createdAt: new Date(),
        });

        // Save the quotation
        const savedQuotation = await quotation.save();

        // Respond with success message and data
        res.status(201).json({
            message: 'Quotation saved successfully',
            quotation: savedQuotation,
        });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Route to get the 5 most recent quotation
router.get("/recent-quotations", async (req, res) => {
    try {

        // Fetch the 5 most recent quotation, sorted by creation date
        const recentquotation = await Quotations.find()
            .sort({ createdAt: -1 }) // Assuming `createdAt` is a timestamp
            .limit(5)
            .select("project_name quotation_id");

        // Respond with the fetched quotation
        res.status(200).json({
            message: "Recent quotation retrieved successfully",
            quotation: recentquotation,
        });
    } catch (error) {
        console.error("Error retrieving recent quotation:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

// Route to get the 5 most recent quotation
router.get("/:quotationId", async (req, res) => {
    try {
        const { quotationId } = req.params;

        // Fetch the quotation by ID
        const quotation = await Quotations.findOne({ quotation_id: quotationId });
        if (!quotation) {
            return res.status(404).json({ message: 'Quotation not found' });
        }

        // Respond with the fetched quotation
        res.status(200).json({
            message: "Quotation retrieved successfully",
            quotation,
        });

    } catch (error) {
        console.error("Error retrieving recent quotation:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

module.exports = router;