const express = require('express');
const router = express.Router();
const { EWayBills } = require('../models');
const logger = require('../utils/logger');

// Import ID generator functions
const { previewNextId, generateNextId } = require('../utils/idGenerator');

// Route to get all e-way bills
router.get("/all", async (req, res) => {
    try {
        const allEWayBills = await EWayBills.find().sort({ createdAt: -1 });
        return res.status(200).json(allEWayBills);
    } catch (error) {
        logger.error("E-Way Bill fetch failed", { service: "ewaybill", error: error.message });
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
        const ewaybill_id = await previewNextId('eWayBill');
        return res.status(200).json({ ewaybill_id });
    } catch (error) {
        logger.error('E-Way Bill preview generation failed', { service: "ewaybill", error: error.message || error });
        return res.status(500).json({ error: 'Failed to generate e-way bill id' });
    }
});

/**
 * Route: Save or Update E-Way Bill
 * Description: Creates a new E-Way Bill (generating a fresh ID) or updates an existing one.
 */
router.post("/save-ewaybill", async (req, res) => {
    try {
        let {
            eWayBillId = '', // Could be a preview ID (new) or existing ID (update)
            eWayBillNo = '',  // External E-Way Bill number
            eWayBillStatus = 'Draft',
            projectName,
            buyerName = '',
            buyerAddress = '',
            buyerPhone = '',
            buyerEmail = '',
            transportMode = '',
            vehicleNumber = '',
            placeSupply = '',
            eWayBillDate,
            items = [],
        } = req.body;

        if (!projectName) {
            return res.status(400).json({
                message: 'Missing required fields or invalid data: projectName',
            });
        }

        // Attempt to find an existing document using the provided ID
        let eWayBill = null;
        if (eWayBillId) {
            eWayBill = await EWayBills.findOne({ ewaybill_id: eWayBillId });
        }

        if (eWayBill) {
            // ---------------------------------------------------------
            // SCENARIO 1: UPDATE EXISTING E-WAY BILL
            // ---------------------------------------------------------
            eWayBill.ewaybill_no = eWayBillNo;
            eWayBill.ewaybill_status = eWayBillStatus;
            eWayBill.project_name = projectName;
            eWayBill.customer_name = buyerName;
            eWayBill.customer_address = buyerAddress;
            eWayBill.customer_phone = buyerPhone;
            eWayBill.customer_email = buyerEmail;
            eWayBill.transport_mode = transportMode;
            eWayBill.vehicle_number = vehicleNumber;
            eWayBill.place_supply = placeSupply;
            if (eWayBillDate) eWayBill.ewaybill_generated_at = new Date(eWayBillDate);
            eWayBill.items = items;
        } else {
            // ---------------------------------------------------------
            // SCENARIO 2: CREATE NEW E-WAY BILL
            // ---------------------------------------------------------

            // Generate the permanent ID now (increments the counter)
            const newId = await generateNextId('eWayBill');

            eWayBill = new EWayBills({
                ewaybill_id: newId,
                ewaybill_no: eWayBillNo,
                ewaybill_status: eWayBillStatus,
                project_name: projectName,
                customer_name: buyerName,
                customer_address: buyerAddress,
                customer_phone: buyerPhone,
                customer_email: buyerEmail,
                transport_mode: transportMode,
                vehicle_number: vehicleNumber,
                place_supply: placeSupply,
                ewaybill_generated_at: eWayBillDate ? new Date(eWayBillDate) : undefined,
                items,
                createdAt: new Date(),
            });
        }

        const savedEWayBill = await eWayBill.save();

        res.status(201).json({
            message: 'E-Way Bill saved successfully',
            eWayBill: savedEWayBill,
            ewaybill_id: savedEWayBill.ewaybill_id // Return the final ID
        });
    } catch (error) {
        logger.error('E-Way Bill save failed', { service: "ewaybill", error: error.message });
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Route to get the 10 most recent e-way bills
router.get("/recent-ewaybills", async (req, res) => {
    try {
        const recentEWayBills = await EWayBills.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select("project_name ewaybill_id ewaybill_no ewaybill_status customer_name customer_address place_supply ewaybill_generated_at createdAt");

        res.status(200).json({
            message: "Recent e-way bills retrieved successfully",
            eWayBill: recentEWayBills,
        });
    } catch (error) {
        logger.error("Recent e-way bills fetch failed", { service: "ewaybill", error: error.message });
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Route to get an e-way bill by ID
router.get("/:eWayBillId", async (req, res) => {
    try {
        const { eWayBillId } = req.params;
        const eWayBill = await EWayBills.findOne({ ewaybill_id: eWayBillId });
        if (!eWayBill) {
            return res.status(404).json({ message: 'E-Way Bill not found' });
        }
        res.status(200).json({ message: "E-Way Bill retrieved successfully", eWayBill });
    } catch (error) {
        logger.error("Single e-way bill fetch failed", { service: "ewaybill", eWayBillId: req.params.eWayBillId, error: error.message });
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Route to delete an e-way bill
router.delete("/:eWayBillId", async (req, res) => {
    try {
        const { eWayBillId } = req.params;
        const eWayBill = await EWayBills.findOne({ ewaybill_id: eWayBillId });
        if (!eWayBill) {
            return res.status(404).json({ message: 'E-Way Bill not found' });
        }
        await EWayBills.deleteOne({ ewaybill_id: eWayBillId });
        res.status(200).json({ message: 'E-Way Bill deleted successfully' });
    } catch (error) {
        logger.error("E-Way Bill deletion failed", { service: "ewaybill", eWayBillId: req.params.eWayBillId, error: error.message });
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Search e-way bills
router.get('/search/:query', async (req, res) => {
    const { query } = req.params;
    if (!query) return res.status(400).send('Query parameter is required.');

    try {
        const ewaybills = await EWayBills.find({
            $or: [
                { ewaybill_id: { $regex: query, $options: 'i' } },
                { ewaybill_no: { $regex: query, $options: 'i' } },
                { project_name: { $regex: query, $options: 'i' } },
                { customer_name: { $regex: query, $options: 'i' } },
                { customer_phone: { $regex: query, $options: 'i' } }
            ]
        });

        if (ewaybills.length === 0) {
            return res.status(404).send('No e-way bills found.');
        } else {
            return res.status(200).json({ eWayBills: ewaybills });
        }
    } catch (err) {
        logger.error("E-Way Bill search failed", { service: "ewaybill", query, error: err.message });
        return res.status(500).send('Failed to fetch e-way bills.');
    }
});

module.exports = router;
