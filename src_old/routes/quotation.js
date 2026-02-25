const express = require('express');
const router = express.Router();
const { Quotations } = require('../models');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

// Import ID generator functions
const { previewNextId, generateNextId, syncCounterIfNeeded } = require('../utils/idGenerator');

/**
 * Route: Generate a Preview ID
 * Description: Returns the next likely ID for UI display.
 * Does NOT increment the database counter.
 */
router.get("/generate-id", async (req, res) => {
    try {
        const quotation_id = await previewNextId('quotation');
        return res.status(200).json({ quotation_id });
    } catch (err) {
        logger.error('Error generating quotation preview', { error: err.message || err });
        return res.status(500).json({ error: 'Failed to generate quotation id' });
    }
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
        typeof item.description.trim() !== '' &&
        typeof item.quantity !== 'undefined' &&
        !isNaN(Number(item.quantity)) &&
        typeof item.unit_price !== 'undefined' &&
        !isNaN(Number(item.unit_price))
    );
}

/**
 * Route: Save or Update Quotation
 * Description: Creates a new Quotation (generating a fresh ID) or updates an existing one.
 */
router.post("/save-quotation", async (req, res) => {
    try {
        let {
            quotation_id = '', // Could be a preview ID (new) or existing ID (update)
            projectName,
            quotationDate,
            buyerName = '',
            buyerAddress = '',
            buyerPhone = '',
            buyerEmail = '',
            buyerGSTIN = '',
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
            duplicated_from = null, // Audit trail: source quotation ID if duplicated
            isCustomId = false, // Tracks if user manually entered a custom ID

        } = req.body;

        // Validate items array
        if (!Array.isArray(items)) {
            return res.status(400).json({ message: 'Items must be an array.' });
        }
        for (const item of items) {
            if (!isValidItem(item)) {
                return res.status(400).json({ message: 'Invalid item structure or missing fields.' });
            }
        }

        // Attempt to find an existing quotation using the provided ID
        let quotation = null;
        if (quotation_id) {
            quotation = await Quotations.findOne({ quotation_id: quotation_id });
        }

        if (quotation) {
            // ---------------------------------------------------------
            // SCENARIO 1: UPDATE EXISTING QUOTATION
            // ---------------------------------------------------------
            if (!projectName) {
                return res.status(400).json({ message: 'Project name is required for updates.' });
            }

            quotation.project_name = projectName;
            quotation.quotation_date = quotationDate;
            quotation.customer_name = buyerName;
            quotation.customer_address = buyerAddress;
            quotation.customer_phone = buyerPhone;
            quotation.customer_email = buyerEmail;
            quotation.customer_GSTIN = buyerGSTIN;
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
            // ---------------------------------------------------------
            // SCENARIO 2: CREATE NEW QUOTATION
            // ---------------------------------------------------------

            // Use provided custom ID only if user manually typed it, otherwise generate new
            let newId;
            if (isCustomId && quotation_id && quotation_id.trim()) {
                // Check if this custom ID already exists
                const existingCustom = await Quotations.findOne({ quotation_id: quotation_id.trim() });
                if (existingCustom) {
                    return res.status(400).json({ message: `Quotation ID "${quotation_id}" already exists. Please use a different ID.` });
                }
                newId = quotation_id.trim();
            } else {
                // Generate the permanent ID now (increments the counter)
                newId = await generateNextId('quotation');
            }

            if (!projectName) {
                return res.status(400).json({ message: 'Project name is required.' });
            }

            quotation = new Quotations({
                quotation_id: newId, // Use custom ID or freshly generated ID
                project_name: projectName,
                quotation_date: quotationDate,
                customer_name: buyerName,
                customer_address: buyerAddress,
                customer_phone: buyerPhone,
                customer_email: buyerEmail,
                customer_GSTIN: buyerGSTIN,
                items,
                non_items: non_items,
                total_tax: totalTax,
                total_amount_no_tax: totalAmountNoTax,
                total_amount_tax: totalAmountTax,
                subject,
                letter_1,
                letter_2,
                letter_3,
                headline: projectName,
                notes,
                termsAndConditions,
                duplicated_from, // Audit trail for duplicated quotations
                createdAt: new Date(),
            });
        }

        // Save the quotation
        const savedQuotation = await quotation.save();

        // If a custom ID was used for a NEW quotation, sync the counter to prevent collisions
        if (isCustomId && savedQuotation.quotation_id) {
            await syncCounterIfNeeded('quotation', savedQuotation.quotation_id);
        }

        res.status(201).json({
            message: 'Quotation saved successfully',
            quotation: savedQuotation,
            quotation_id: savedQuotation.quotation_id // Return the final ID
        });

    } catch (error) {
        logger.error('Error saving quotation:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Route to get the 10 most recent quotations
router.get("/recent-quotations", async (req, res) => {
    try {
        const recentQuotations = await Quotations.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select("project_name quotation_id quotation_date customer_name customer_address total_amount_tax");

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

// Search quotations
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