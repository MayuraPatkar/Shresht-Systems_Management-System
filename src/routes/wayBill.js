const express = require('express');
const router = express.Router();
const { wayBills } = require('../models');
const log = require("electron-log"); // Import electron-log in the preload process

// Route to get all waybills
router.get("/all", async (req, res) => {
    try {
        const allWayBills = await wayBills.find().sort({ createdAt: -1 });
        return res.status(200).json(allWayBills);
    } catch (error) {
        log.error("Error fetching waybills:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/save-way-bill", async (req, res) => {
    try {
        let {
            wayBillId = '',
            projectName,
            buyerName = '',
            buyerAddress = '',
            buyerPhone = '',
            buyerEmail = '',
            transportMode = '',
            vehicleNumber = '',
            placeSupply = '',
            items = [],
        } = req.body;

        // Validate required fields
        if (!projectName) {
            return res.status(400).json({
                message: 'Missing required fields or invalid data: projectName',
            });
        }

        // Check if way bill already exists
        let wayBill = await wayBills.findOne({ waybill_id: wayBillId });
        if (wayBill) {
            // Update existing way bill
            wayBill.project_name = projectName;
            wayBill.customer_name = buyerName;
            wayBill.customer_address = buyerAddress;
            wayBill.customer_phone = buyerPhone;
            wayBill.customer_email = buyerEmail;
            wayBill.transport_mode = transportMode;
            wayBill.vehicle_number = vehicleNumber;
            wayBill.place_supply = placeSupply;
            wayBill.items = items;
        } else {
            // Create a new way bill with the provided data
            wayBill = new wayBills({
                waybill_id: wayBillId,
                project_name: projectName,
                customer_name: buyerName,
                customer_address: buyerAddress,
                customer_phone: buyerPhone,
                customer_email: buyerEmail,
                transport_mode: transportMode,
                vehicle_number: vehicleNumber,
                place_supply: placeSupply,
                items,
                createdAt: new Date(),
            });
        }

        // Save the way bill
        const savedWayBill = await wayBill.save();

        // Respond with success message and data
        res.status(201).json({
            message: 'Way bill saved successfully',
            wayBill: savedWayBill,
        });
    } catch (error) {
        log.error('Error saving data:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Route to get the 10 most recent way bills
router.get("/recent-way-bills", async (req, res) => {
    try {
        // Fetch the 10 most recent way bills, sorted by creation date
        const recentWayBills = await wayBills.find()
            .sort({ createdAt: -1 }) // Assuming `createdAt` is a timestamp
            .limit(10)
            .select("project_name waybill_id customer_name customer_address place_supply");

        // Respond with the fetched way bills
        res.status(200).json({
            message: "Recent way bills retrieved successfully",
            wayBill: recentWayBills,
        });
    } catch (error) {
        log.error("Error retrieving recent way bills:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

// Route to get a way bill by ID
router.get("/:wayBillId", async (req, res) => {
    try {
        const { wayBillId } = req.params;

        // Fetch the way bill by ID
        const wayBill = await wayBills.findOne({ waybill_id: wayBillId });
        if (!wayBill) {
            return res.status(404).json({ message: 'Way bill not found' });
        }

        // Respond with the fetched way bill
        res.status(200).json({
            message: "Way bill retrieved successfully",
            wayBill,
        });

    } catch (error) {
        log.error("Error retrieving way bill:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

// Route to delete a way bill
router.delete("/:wayBillId", async (req, res) => {
    try {
        const { wayBillId } = req.params;

        // Fetch the way bill by ID
        const wayBill = await wayBills.findOne({ waybill_id: wayBillId });
        if (!wayBill) {
            return res.status(404).json({ message: 'Way bill not found' });
        }

        // Delete the way bill
        await wayBills.deleteOne({ wayBill_id: wayBillId });

        // Respond with success message
        res.status(200).json({ message: 'Way bill deleted successfully' });
    } catch (error) {
        log.error("Error deleting way bill:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

// Search way bills by ID, project name, buyer name, or phone number
router.get('/search/:query', async (req, res) => {
    const { query } = req.params;
    if (!query) {
        return res.status(400).send('Query parameter is required.');
    }

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
        log.log(err);
        return res.status(500).send('Failed to fetch way bills.');
    }
});

module.exports = router;
