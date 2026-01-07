const express = require('express');
const router = express.Router();
const { EWayBills } = require('../models');
const logger = require('../utils/logger');

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
 * Route: Save or Update E-Way Bill
 * Description: Creates a new E-Way Bill or updates an existing one.
 */
router.post("/save-ewaybill", async (req, res) => {
    try {
        let {
            _id = '',  // MongoDB _id for updates
            eWayBillNo = '',  // External E-Way Bill number
            eWayBillStatus = 'Draft',
            invoiceId = '',
            fromAddress = '',
            toAddress = '',
            transportMode = '',
            vehicleNumber = '',
            transporterId = '',
            transporterName = '',
            distanceKm = 0,
            eWayBillDate,
            items = [],
            totalTaxableValue = 0,
            cgst = 0,
            sgst = 0,
            totalInvoiceValue = 0,
        } = req.body;

        // Transform items to match schema field names
        const transformedItems = items.map(item => ({
            description: item.description || '',
            hsn_sac: item.hsn_sac || item.HSN_SAC || '',
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            taxable_value: Number(item.taxable_value) || (Number(item.quantity) * Number(item.unit_price)) || 0,
            gst_rate: Number(item.gst_rate) || Number(item.rate) || 0
        }));

        // Calculate totals if not provided
        if (!totalTaxableValue) {
            totalTaxableValue = transformedItems.reduce((sum, item) => sum + item.taxable_value, 0);
        }
        if (!cgst && !sgst) {
            transformedItems.forEach(item => {
                const taxAmount = (item.taxable_value * item.gst_rate) / 100;
                cgst += taxAmount / 2;
                sgst += taxAmount / 2;
            });
        }
        if (!totalInvoiceValue) {
            totalInvoiceValue = totalTaxableValue + cgst + sgst;
        }

        let eWayBill = null;

        // Try to find existing document by _id
        if (_id) {
            eWayBill = await EWayBills.findById(_id);
        }

        if (eWayBill) {
            // ---------------------------------------------------------
            // SCENARIO 1: UPDATE EXISTING E-WAY BILL
            // ---------------------------------------------------------
            eWayBill.ewaybill_no = eWayBillNo;
            eWayBill.ewaybill_status = eWayBillStatus;
            eWayBill.invoice_id = invoiceId || undefined;
            eWayBill.from_address = fromAddress;
            eWayBill.to_address = toAddress;
            eWayBill.transport = {
                mode: transportMode,
                vehicle_number: vehicleNumber,
                transporter_id: transporterId,
                transporter_name: transporterName,
                distance_km: Number(distanceKm) || 0
            };
            if (eWayBillDate) eWayBill.ewaybill_generated_at = new Date(eWayBillDate);
            eWayBill.items = transformedItems;
            eWayBill.total_taxable_value = totalTaxableValue;
            eWayBill.cgst = cgst;
            eWayBill.sgst = sgst;
            eWayBill.total_invoice_value = totalInvoiceValue;
        } else {
            // ---------------------------------------------------------
            // SCENARIO 2: CREATE NEW E-WAY BILL
            // ---------------------------------------------------------
            eWayBill = new EWayBills({
                ewaybill_no: eWayBillNo,
                ewaybill_status: eWayBillStatus,
                invoice_id: invoiceId || undefined,
                from_address: fromAddress,
                to_address: toAddress,
                transport: {
                    mode: transportMode,
                    vehicle_number: vehicleNumber,
                    transporter_id: transporterId,
                    transporter_name: transporterName,
                    distance_km: Number(distanceKm) || 0
                },
                ewaybill_generated_at: eWayBillDate ? new Date(eWayBillDate) : undefined,
                items: transformedItems,
                total_taxable_value: totalTaxableValue,
                cgst,
                sgst,
                total_invoice_value: totalInvoiceValue
            });
        }

        const savedEWayBill = await eWayBill.save();

        res.status(201).json({
            message: 'E-Way Bill saved successfully',
            eWayBill: savedEWayBill,
            _id: savedEWayBill._id
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
            .select("ewaybill_no ewaybill_status from_address to_address transport ewaybill_generated_at total_invoice_value createdAt");

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
        const eWayBill = await EWayBills.findById(eWayBillId);
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
        const eWayBill = await EWayBills.findById(eWayBillId);
        if (!eWayBill) {
            return res.status(404).json({ message: 'E-Way Bill not found' });
        }
        await EWayBills.deleteOne({ _id: eWayBillId });
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
                { ewaybill_no: { $regex: query, $options: 'i' } },
                { from_address: { $regex: query, $options: 'i' } },
                { to_address: { $regex: query, $options: 'i' } },
                { 'transport.vehicle_number': { $regex: query, $options: 'i' } },
                { 'transport.transporter_name': { $regex: query, $options: 'i' } }
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

// Check if e-way bill exists for an invoice (by invoice_id string)
router.get('/check-invoice/:invoiceId', async (req, res) => {
    try {
        const { invoiceId } = req.params;

        // First, try to find the invoice to get its MongoDB _id
        const { Invoices } = require('../models');
        const invoice = await Invoices.findOne({ invoice_id: invoiceId });

        if (!invoice) {
            // Invoice doesn't exist, so no e-way bill for it either
            return res.status(200).json({ exists: false });
        }

        // Check if any e-way bill references this invoice
        // Schema defines invoice_id as ObjectId, so we must strictly use the resolved _id
        const existingEWayBill = await EWayBills.findOne({ invoice_id: invoice._id });

        res.status(200).json({ exists: !!existingEWayBill });
    } catch (error) {
        logger.error("Check invoice e-way bill failed", { service: "ewaybill", error: error.message });
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Check if e-way bill number already exists
router.get('/check-ewaybill-no/:ewaybillNo', async (req, res) => {
    try {
        const { ewaybillNo } = req.params;

        const existingEWayBill = await EWayBills.findOne({ ewaybill_no: ewaybillNo });

        res.status(200).json({ exists: !!existingEWayBill });
    } catch (error) {
        logger.error("Check e-way bill number failed", { service: "ewaybill", error: error.message });
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

module.exports = router;
