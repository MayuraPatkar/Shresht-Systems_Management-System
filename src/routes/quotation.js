const express = require('express');
const router = express.Router();
const { Quotations } = require('../models');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

// Function to generate a unique ID for each quotation
function generateUniqueId() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10);
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

// Route to get all quotations
router.get("/all", async (req, res) => {
    try {
        const quotations = await Quotations.find().sort({ createdAt: -1 });
        return res.status(200).json(quotations);
    } catch (error) {
        logger.error("Error fetching quotations:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Helper: Validate item structure
function isValidItem(item) {
    return (
        typeof item === 'object' &&
        typeof item.description === 'string' &&
        item.description.trim() !== '' &&
        typeof item.quantity !== 'undefined' &&
        !isNaN(Number(item.quantity)) &&
        typeof item.unit_price !== 'undefined' &&
        !isNaN(Number(item.unit_price))
    );
}

// Route to save a new quotation or update an existing one
// Route to save a new quotation or update an existing one
router.post("/save-quotation", async (req, res) => {
    try {
        // FIX #1: This block now correctly expects snake_case for all fields
        let {
            quotation_id = '',
            project_name,
            quotation_date,
            customer_name = '',
            customer_address = '',
            customer_phone = '',
            customer_email = '',
            items = [],
            non_items = [],
            total_tax = 0,
            total_amount_no_tax = 0,
            total_amount_tax = 0,
            subject = '',
            letter_1 = '',
            letter_2 = [],
            letter_3 = '',
            headline = '',
            notes = [],
            termsAndConditions = '',
        } = req.body;

        // Validate required fields
        if (!quotation_id || !project_name) {
            return res.status(400).json({
                message: 'Missing required fields: quotation_id, project_name',
            });
        }

        // Validate items array
        if (!Array.isArray(items)) {
            return res.status(400).json({ message: 'Items must be an array.' });
        }
        for (const item of items) {
            if (!isValidItem(item)) {
                return res.status(400).json({ message: 'Invalid item structure or missing fields.' });
            }
        }

        // Check if quotation already exists
        let quotation = await Quotations.findOne({ quotation_id: quotation_id });
        if (quotation) {
            // Update existing quotation
            // FIX #2: This block now correctly USES snake_case variables
            quotation.project_name = project_name;
            quotation.quotation_date = quotation_date;
            quotation.customer_name = customer_name;
            quotation.customer_address = customer_address;
            quotation.customer_phone = customer_phone;
            quotation.customer_email = customer_email;
            quotation.items = items;
            quotation.non_items = non_items;
            quotation.total_tax = total_tax;
            quotation.total_amount_no_tax = total_amount_no_tax;
            quotation.total_amount_tax = total_amount_tax;
            quotation.subject = subject;
            quotation.letter_1 = letter_1;
            quotation.letter_2 = letter_2;
            quotation.letter_3 = letter_3;
            quotation.headline = headline;
            quotation.notes = notes;
            quotation.termsAndConditions = termsAndConditions;
        } else {
            // Create a new quotation with the provided data
            quotation = new Quotations({
                quotation_id: quotation_id,
                project_name: project_name,
                quotation_date: quotation_date,
                customer_name: customer_name,
                customer_address: customer_address,
                customer_phone: customer_phone,
                customer_email: customer_email,
                items,
                non_items: non_items,
                total_tax: total_tax,
                total_amount_no_tax: total_amount_no_tax,
                total_amount_tax: total_amount_tax,
                subject,
                letter_1,
                letter_2,
                letter_3,
                headline,
                notes,
                termsAndConditions,
                createdAt: new Date(),
            });
        }

        // Save the quotation
        const savedQuotation = await quotation.save();

        res.status(201).json({
            message: 'Quotation saved successfully',
            quotation: savedQuotation,
        });
    } catch (error) {
        logger.error('Error saving data:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Route to get the 5 most recent quotations
router.get("/recent-quotations", async (req, res) => {
    try {
        const recentQuotations = await Quotations.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select("project_name quotation_id customer_name customer_address total_amount_tax");

        res.status(200).json({
            message: "Recent quotations retrieved successfully",
            quotation: recentQuotations,
        });
    } catch (error) {
        logger.error("Error retrieving recent quotations:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

// Route to get a quotation by ID
router.get("/:quotationId", async (req, res) => {
    try {
        const { quotationId } = req.params;

        if (!quotationId) {
            return res.status(400).json({ message: 'Quotation ID is required.' });
        }

        const quotation = await Quotations.findOne({ quotation_id: quotationId });
        if (!quotation) {
            return res.status(404).json({ message: 'Quotation not found' });
        }

        res.status(200).json({
            message: "Quotation retrieved successfully",
            quotation,
        });

    } catch (error) {
        logger.error("Error retrieving quotation:", error);
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

        if (!quotationId) {
            return res.status(400).json({ message: 'Quotation ID is required.' });
        }

        const quotation = await Quotations.findOne({ quotation_id: quotationId });
        if (!quotation) {
            return res.status(404).json({ message: 'Quotation not found' });
        }

        await Quotations.deleteOne({ quotation_id: quotationId });

        res.status(200).json({ message: 'Quotation deleted successfully' });
    } catch (error) {
        logger.error("Error deleting quotation:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

// Search quotations by ID, project name, buyer name, phone, or email
router.get('/search/:query', async (req, res) => {
    const { query } = req.params;
    if (!query) {
        return res.status(400).send('Query parameter is required.');
    }

    try {
        const quotations = await Quotations.find({
            $or: [
                { quotation_id: { $regex: query, $options: 'i' } },
                { project_name: { $regex: query, $options: 'i' } },
                { customer_name: { $regex: query, $options: 'i' } },
                { customer_phone: { $regex: query, $options: 'i' } },
                { customer_email: { $regex: query, $options: 'i' } }
            ]
        });

        if (quotations.length === 0) {
            return res.status(404).send('No quotations found.');
        } else {
            return res.status(200).json({ quotation: quotations });
        }
    } catch (err) {
        logger.error(err);
        return res.status(500).send('Failed to fetch quotations.');
    }
});

module.exports = router;
