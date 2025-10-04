const express = require('express');
const router = express.Router();
const { Quotations } = require('./database');
const log = require("electron-log");

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
router.post("/save-quotation", async (req, res) => {
    try {
        let {
            quotation_id = '',
            projectName,
            quotationDate,
            buyerName = '',
            buyerAddress = '',
            buyerPhone = '',
            buyerEmail = '',
            items = [],
            non_items = [],
            totalTax = 0,
            totalAmountNoTax = 0,
            totalAmountTax = 0,

            subject = '',
            letter_1 = '',
            letter_2 = [],
            letter_3 = '',
            headline = '',
            notes = [],
            termsAndConditions = '',

        } = req.body;

        // Validate required fields
        if (!quotation_id || !projectName) {
            return res.status(400).json({
                message: 'Missing required fields: Quotation ID, projectName',
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
            quotation.project_name = projectName;
            quotation.quotation_date = quotationDate;
            quotation.customer_name = buyerName;
            quotation.customer_address = buyerAddress;
            quotation.customer_phone = buyerPhone;
            quotation.customer_email = buyerEmail;
            quotation.items = items;
            quotation.non_items = non_items;
            quotation.total_tax = totalTax;
            quotation.total_amount_no_tax = totalAmountNoTax;
            quotation.total_amount_tax = totalAmountTax;
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
                project_name: projectName,
                quotation_date: quotationDate,
                customer_name: buyerName,
                customer_address: buyerAddress,
                customer_phone: buyerPhone,
                customer_email: buyerEmail,
                items,
                non_items: non_items,
                total_tax: totalTax,
                total_amount_no_tax: totalAmountNoTax,
                total_amount_tax: totalAmountTax,
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
        log.error('Error saving data:', error);
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
        log.error("Error retrieving recent quotations:", error);
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
        log.error("Error retrieving quotation:", error);
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
        log.error("Error deleting quotation:", error);
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
        log.error(err);
        return res.status(500).send('Failed to fetch quotations.');
    }
});

module.exports = router;