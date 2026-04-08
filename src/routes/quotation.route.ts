import { Router, Request, Response } from 'express';
import { QuotationModel } from '../models';
import logger from '../utils/logger';
import { previewNextId, generateNextId, syncCounterIfNeeded } from '../utils/idGenerator';

const router: Router = Router();

/**
 * Route: Generate a Preview ID
 * Description: Returns the next likely ID for UI display.
 * Does NOT increment the database counter.
 */
router.get("/generate-id", async (req: Request, res: Response) => {
    try {
        const quotation_id = await previewNextId('quotation');
        return res.status(200).json({ quotation_id });
    } catch (err: unknown) {
        logger.error('Error generating quotation preview', { error: (err as Error).message || err });
        return res.status(500).json({ error: 'Failed to generate quotation id' });
    }
});

// Route to get all quotations
router.get("/all", async (req: Request, res: Response) => {
    try {
        const quotations = await QuotationModel.find().sort({ createdAt: -1 });
        return res.status(200).json(quotations);
    } catch (error: unknown) {
        logger.error("Error fetching quotations:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Helper: Validate item structure
function isValidItem(item: any): boolean {
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

/**
 * Route: Save or Update Quotation
 * Description: Creates a new Quotation (generating a fresh ID) or updates an existing one.
 */
router.post("/save-quotation", async (req: Request, res: Response) => {
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
            other_charges = null as any,
            discount = 0,
            totalTax = 0,
            totalAmountNoTax = 0,
            totalAmountTax = 0,

            subject = '',
            letter_1 = '',
            letter_2 = [] as string[],
            letter_3 = '',
            headline = '',
            notes = [] as string[],
            termsAndConditions = '',
            duplicated_from = null as string | null, // Audit trail: source quotation ID if duplicated
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

        // Build customer_snapshot sub-document
        const customer_snapshot: any = {};
        if (buyerName) customer_snapshot.name = buyerName;
        if (buyerPhone) customer_snapshot.phone = buyerPhone;
        if (buyerEmail) customer_snapshot.email = buyerEmail;
        if (buyerGSTIN) customer_snapshot.gstin = buyerGSTIN;
        if (buyerAddress) {
            // Accept address as string (legacy) or structured object
            if (typeof buyerAddress === 'string') {
                customer_snapshot.billing_address = { line1: buyerAddress };
            } else {
                customer_snapshot.billing_address = buyerAddress;
            }
        }

        // Build totals sub-document
        const totals = {
            total_tax: totalTax,
            taxable_value: totalAmountNoTax,
            grand_total: totalAmountTax
        };

        // Build content sub-document
        const content = {
            subject,
            letter_1,
            letter_2,
            letter_3,
            headline: headline || projectName,
            notes,
            terms_and_conditions: termsAndConditions
        };

        // Attempt to find an existing quotation using the provided ID
        let quotation: any = null;
        if (quotation_id) {
            quotation = await QuotationModel.findOne({ quotation_no: quotation_id });
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
            quotation.customer_snapshot = customer_snapshot;
            quotation.items = items;
            quotation.other_charges = other_charges;
            quotation.discount = discount;
            quotation.totals = totals;
            quotation.content = content;

        } else {
            // ---------------------------------------------------------
            // SCENARIO 2: CREATE NEW QUOTATION
            // ---------------------------------------------------------

            // Use provided custom ID only if user manually typed it, otherwise generate new
            let newId: string;
            if (isCustomId && quotation_id && quotation_id.trim()) {
                // Check if this custom ID already exists
                const existingCustom = await QuotationModel.findOne({ quotation_no: quotation_id.trim() });
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

            quotation = new QuotationModel({
                quotation_no: newId,
                project_name: projectName,
                quotation_date: quotationDate,
                customer_snapshot,
                items,
                other_charges,
                discount,
                totals,
                content,
                duplicated_from, // Audit trail for duplicated quotations
            });
        }

        // Save the quotation
        const savedQuotation = await quotation.save();

        // If a custom ID was used for a NEW quotation, sync the counter to prevent collisions
        if (isCustomId && savedQuotation.quotation_no) {
            await syncCounterIfNeeded('quotation', savedQuotation.quotation_no);
        }

        res.status(201).json({
            message: 'Quotation saved successfully',
            quotation: savedQuotation,
            quotation_id: savedQuotation.quotation_no // Return the final ID
        });

    } catch (error: unknown) {
        logger.error('Error saving quotation:', error);
        res.status(500).json({ message: 'Internal server error', error: (error as Error).message });
    }
});

// Route to get the 10 most recent quotations
router.get("/recent-quotations", async (req: Request, res: Response) => {
    try {
        const recentQuotations = await QuotationModel.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select("project_name quotation_no quotation_date customer_snapshot totals");

        res.status(200).json({
            message: "Recent quotations retrieved successfully",
            quotation: recentQuotations,
        });
    } catch (error: unknown) {
        logger.error("Error retrieving recent quotations:", error);
        res.status(500).json({
            message: "Internal server error",
            error: (error as Error).message,
        });
    }
});

// Route to get a quotation by ID
router.get("/:quotationId", async (req: Request, res: Response) => {
    try {
        const { quotationId } = req.params;

        if (!quotationId) {
            return res.status(400).json({ message: 'Quotation ID is required.' });
        }

        const quotation = await QuotationModel.findOne({ quotation_no: quotationId });
        if (!quotation) {
            return res.status(404).json({ message: 'Quotation not found' });
        }

        res.status(200).json({
            message: "Quotation retrieved successfully",
            quotation,
        });

    } catch (error: unknown) {
        logger.error("Error retrieving quotation:", error);
        res.status(500).json({
            message: "Internal server error",
            error: (error as Error).message,
        });
    }
});

// Route to delete a quotation
router.delete("/:quotationId", async (req: Request, res: Response) => {
    try {
        const { quotationId } = req.params;

        if (!quotationId) {
            return res.status(400).json({ message: 'Quotation ID is required.' });
        }

        const quotation = await QuotationModel.findOne({ quotation_no: quotationId });
        if (!quotation) {
            return res.status(404).json({ message: 'Quotation not found' });
        }

        await QuotationModel.deleteOne({ quotation_no: quotationId });

        res.status(200).json({ message: 'Quotation deleted successfully' });
    } catch (error: unknown) {
        logger.error("Error deleting quotation:", error);
        res.status(500).json({
            message: "Internal server error",
            error: (error as Error).message,
        });
    }
});

// Search quotations
router.get('/search/:query', async (req: Request, res: Response) => {
    const { query } = req.params;
    if (!query) {
        return res.status(400).send('Query parameter is required.');
    }

    try {
        const quotations = await QuotationModel.find({
            $or: [
                { quotation_no: { $regex: query, $options: 'i' } },
                { project_name: { $regex: query, $options: 'i' } },
                { 'customer_snapshot.name': { $regex: query, $options: 'i' } },
                { 'customer_snapshot.phone': { $regex: query, $options: 'i' } },
                { 'customer_snapshot.email': { $regex: query, $options: 'i' } }
            ]
        } as any);

        if (quotations.length === 0) {
            return res.status(404).send('No quotations found.');
        } else {
            return res.status(200).json({ quotation: quotations });
        }
    } catch (err: unknown) {
        logger.error(err);
        return res.status(500).send('Failed to fetch quotations.');
    }
});

export default router;
