const express = require('express');
const router = express.Router();
const { wayBills } = require('../models');
const logger = require('../utils/logger');

// Import ID generator functions
const { previewNextId, generateNextId } = require('../utils/idGenerator');

// Route to get all waybills
router.get("/all", async (req, res) => {
    try {
        const allWayBills = await wayBills.find().sort({ createdAt: -1 });
        return res.status(200).json(allWayBills);
    } catch (error) {
        logger.error("Waybill fetch failed", { service: "waybill", error: error.message });
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * Route: Generate a Preview ID
 * Description: returns the next likely ID for UI display.
 * Does NOT increment the database counter.
 */
router.get('/generate-id', async (req, res) => {
    try {
        const waybill_id = await previewNextId('wayBill');
        return res.status(200).json({ waybill_id });
    } catch (error) {
        logger.error('Waybill preview generation failed', { service: "waybill", error: error.message || error });
        return res.status(500).json({ error: 'Failed to generate waybill id' });
    }
});

/**
 * Route: Save or Update Waybill
 * Description: Creates a new Waybill (generating a fresh ID) or updates an existing one.
 */
router.post("/save-way-bill", async (req, res) => {
    try {
        let {
            wayBillId = '', // Could be a preview ID (new) or existing ID (update)
            projectName,
            buyerName = '',
            buyerAddress = '',
            buyerPhone = '',
            buyerEmail = '',
            transportMode = '',
            vehicleNumber = '',
            placeSupply = '',
            waybillDate,
            items = [],
        } = req.body;

        if (!projectName) {
            return res.status(400).json({
                message: 'Missing required fields or invalid data: projectName',
            });
        }

        // Attempt to find an existing document using the provided ID
        let wayBill = null;
        if (wayBillId) {
            wayBill = await wayBills.findOne({ waybill_id: wayBillId });
        }

        if (wayBill) {
            // ---------------------------------------------------------
            // SCENARIO 1: UPDATE EXISTING WAYBILL
            // ---------------------------------------------------------
            wayBill.project_name = projectName;
            wayBill.customer_name = buyerName;
            wayBill.customer_address = buyerAddress;
            wayBill.customer_phone = buyerPhone;
            wayBill.customer_email = buyerEmail;
            wayBill.transport_mode = transportMode;
            wayBill.vehicle_number = vehicleNumber;
            wayBill.place_supply = placeSupply;
            if (waybillDate) wayBill.waybill_date = new Date(waybillDate);
            wayBill.items = items;
        } else {
            // ---------------------------------------------------------
            // SCENARIO 2: CREATE NEW WAYBILL
            // ---------------------------------------------------------

            // Generate the permanent ID now (increments the counter)
            const newId = await generateNextId('wayBill');

            wayBill = new wayBills({
                waybill_id: newId,
                project_name: projectName,
                customer_name: buyerName,
                customer_address: buyerAddress,
                customer_phone: buyerPhone,
                customer_email: buyerEmail,
                transport_mode: transportMode,
                vehicle_number: vehicleNumber,
                place_supply: placeSupply,
                waybill_date: waybillDate ? new Date(waybillDate) : undefined,
                items,
                createdAt: new Date(),
            });
        }

        const savedWayBill = await wayBill.save();

        res.status(201).json({
            message: 'Way bill saved successfully',
            wayBill: savedWayBill,
            waybill_id: savedWayBill.waybill_id // Return the final ID
        });
    } catch (error) {
        logger.error('Waybill save failed', { service: "waybill", error: error.message });
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Route to get the 10 most recent way bills
router.get("/recent-way-bills", async (req, res) => {
    try {
        const recentWayBills = await wayBills.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select("project_name waybill_id customer_name customer_address place_supply waybill_date createdAt");

        res.status(200).json({
            message: "Recent way bills retrieved successfully",
            wayBill: recentWayBills,
        });
    } catch (error) {
        logger.error("Recent waybills fetch failed", { service: "waybill", error: error.message });
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Route to get a way bill by ID
router.get("/:wayBillId", async (req, res) => {
    try {
        const { wayBillId } = req.params;
        const wayBill = await wayBills.findOne({ waybill_id: wayBillId });
        if (!wayBill) {
            return res.status(404).json({ message: 'Way bill not found' });
        }
        res.status(200).json({ message: "Way bill retrieved successfully", wayBill });
    } catch (error) {
        logger.error("Single waybill fetch failed", { service: "waybill", wayBillId: req.params.wayBillId, error: error.message });
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Route to delete a way bill
router.delete("/:wayBillId", async (req, res) => {
    try {
        const { wayBillId } = req.params;
        const wayBill = await wayBills.findOne({ waybill_id: wayBillId });
        if (!wayBill) {
            return res.status(404).json({ message: 'Way bill not found' });
        }
        // Use correct field name for deletion (waybill_id)
        await wayBills.deleteOne({ waybill_id: wayBillId });
        res.status(200).json({ message: 'Way bill deleted successfully' });
    } catch (error) {
        logger.error("Waybill deletion failed", { service: "waybill", wayBillId: req.params.wayBillId, error: error.message });
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Search way bills
router.get('/search/:query', async (req, res) => {
    const { query } = req.params;
    if (!query) return res.status(400).send('Query parameter is required.');

    try {
        const way_bills = await wayBills.find({
            $or: [
                { waybill_id: { $regex: query, $options: 'i' } },
                { project_name: { $regex: query, $options: 'i' } },
                { customer_name: { $regex: query, $options: 'i' } },
                { customer_phone: { $regex: query, $options: 'i' } }
            ]
        });

        if (way_bills.length === 0) {
            return res.status(404).send('No way bills found.');
        } else {
            return res.status(200).json({ wayBills: way_bills });
        }
    } catch (err) {
        logger.error("Waybill search failed", { service: "waybill", query, error: err.message });
        return res.status(500).send('Failed to fetch way bills.');
    }
});

module.exports = router;