const express = require('express');
const router = express.Router();
const { Quotations } = require('./database');
const log = require("electron-log"); // Import electron-log in the preload process


// Function to generate a unique ID for each quotation
function generateUniqueId() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits of the year
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month (0-based, so add 1)
    const day = now.getDate().toString().padStart(2, '0'); // Day of the month
    const randomNum = Math.floor(Math.random() * 10); // Random single-digit number
    return `${year}${month}${day}${randomNum}`;
}

// Route to generate a new quotation ID
router.get("/generate-id", async (req, res) => {
    let quotationId;
    let isUnique = false;

    while (!isUnique) {
        quotationId = generateUniqueId();
        const existingQuotation = await Quotations.findOne({ quotation_id: quotationId });
        if (!existingQuotation) {
            isUnique = true;
        }
    }
    res.status(200).json({ quotation_id: quotationId });
});

// Route to save a new quotation or update an existing one
router.post("/save-quotation", async (req, res) => {
    try {
        let {
            quotation_id = '',
            projectName,
            buyerName = '',
            buyerAddress = '',
            buyerPhone = '',
            items = [],
        } = req.body;

        // Validate required fields
        if (!quotation_id || !projectName) {
            return res.status(400).json({
                message: 'Missing required fields or invalid data: Qotation ID, projectName',
            });
        }

        // Check if quotation already exists
        let quotation = await Quotations.findOne({ quotation_id: quotation_id });
        if (quotation) {
            // Update existing quotation
            quotation.project_name = projectName;
            quotation.buyer_name = buyerName;
            quotation.buyer_address = buyerAddress;
            quotation.buyer_phone = buyerPhone;
            quotation.items = items;
        } else {
            // Create a new quotation with the provided data
            quotation = new Quotations({
                quotation_id: quotation_id,
                project_name: projectName,
                buyer_name: buyerName,
                buyer_address: buyerAddress,
                buyer_phone: buyerPhone,
                items,
                createdAt: new Date(),
            });
        }

        // Save the quotation
        const savedQuotation = await quotation.save();

        // Respond with success message and data
        res.status(201).json({
            message: 'Quotation saved successfully',
            quotation: savedQuotation,
        });
    } catch (error) {
        log.error('Error saving data:', error);
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
            .select("project_name quotation_id buyer_name buyer_address");

        // Respond with the fetched quotation
        res.status(200).json({
            message: "Recent quotation retrieved successfully",
            quotation: recentquotation,
        });
    } catch (error) {
        log.error("Error retrieving recent quotation:", error);
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
        log.error("Error retrieving recent quotation:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

// Route to delete a quotation
router.delete("/:quotationId", async (req, res) => {
    try {
        const { quotationId } = req.params;

        // Fetch the quotation by ID
        const quotation = await Quotations.findOne({ quotation_id: quotationId });
        if (!quotation) {
            return res.status(404).json({ message: 'Quotation not found' });
        }

        // Delete the quotation
        await Quotations.deleteOne({ quotation_id: quotationId });

        // Respond with success message
        res.status(200).json({ message: 'Quotation deleted successfully' });
    } catch (error) {
        log.error("Error deleting quotation:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

// Search quotation by ID, owner name, or phone number
router.get('/search/:query', async (req, res) => {
    const { query } = req.params;
   if (!query) {
        return res.status(400).send('Query parameter is required.');
    }

    try {
        const quotation = await Quotations.find({
            $or: [
                { quotation_id: { $regex: query, $options: 'i' } },
                { project_name: { $regex: query, $options: 'i' } },
                { buyer_name: { $regex: query, $options: 'i' } },
                { buyer_phone: { $regex: query, $options: 'i' } }
            ]
        });

        if (quotation.length === 0) {
            return res.status(404).send('No quotation found.');
        } else {
            return res.status(200).json({ quotation });
        }
    } catch (err) {
        log.log(err);
        return res.status(500).send('Failed to fetch quotation.');
    }
});

module.exports = router;