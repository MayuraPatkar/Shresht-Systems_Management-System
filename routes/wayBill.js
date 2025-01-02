const express = require('express');
const router = express.Router();
const { Admin, wayBills } = require('./database');

router.post("/save-way-bill", async (req, res) => {
    try {
        let {
            way_bill_id = '',
            projectName,
            handledBy,
            buyer_name = '',
            buyer_address = '',
            buyer_phone = '',
            transport_mode = '',
            vehicle_number = '',
            place_supply = '',
            items = [],
        } = req.body;

        // Validate required fields
        if (!projectName) {
            return res.status(400).json({
                message: 'Missing required fields or invalid data: projectName',
            });
        }

        // Fetch admin details
        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Check if way bill already exists
        let wayBill = await wayBills.findOne({ wayBill_id: way_bill_id });
        if (wayBill) {
            // Update existing way bill
            wayBill.project_name = projectName;
            wayBill.handledBy = handledBy;
            wayBill.buyer_name = buyer_name;
            wayBill.buyer_address = buyer_address;
            wayBill.buyer_phone = buyer_phone;
            wayBill.transport_mode = transport_mode;
            wayBill.vehicle_number = vehicle_number;
            wayBill.place_supply = place_supply;
            wayBill.items = items;
        } else {
            // Create a new way bill with the provided data
            wayBill = new wayBills({
                admin: admin._id,
                wayBill_id: way_bill_id,
                project_name: projectName,
                handledBy: handledBy,
                buyer_name: buyer_name,
                buyer_address: buyer_address,
                buyer_phone: buyer_phone,
                transport_mode: transport_mode,
                vehicle_number: vehicle_number,
                place_supply: place_supply,
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
        console.error('Error saving data:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Route to get the 5 most recent way bills
router.get("/recent-way-bills", async (req, res) => {
    try {
        // Fetch the 5 most recent way bills, sorted by creation date
        const recentWayBills = await wayBills.find()
            .sort({ createdAt: -1 }) // Assuming `createdAt` is a timestamp
            .limit(5)
            .select("project_name wayBill_id");

        // Respond with the fetched way bills
        res.status(200).json({
            message: "Recent way bills retrieved successfully",
            wayBill: recentWayBills,
        });
    } catch (error) {
        console.error("Error retrieving recent way bills:", error);
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
        const wayBill = await wayBills.findOne({ wayBill_id: wayBillId });
        if (!wayBill) {
            return res.status(404).json({ message: 'Way bill not found' });
        }

        // Respond with the fetched way bill
        res.status(200).json({
            message: "Way bill retrieved successfully",
            wayBill,
        });

    } catch (error) {
        console.error("Error retrieving way bill:", error);
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
        const wayBill = await wayBills.findOne({ wayBill_id: wayBillId });
        if (!wayBill) {
            return res.status(404).json({ message: 'Way bill not found' });
        }

        // Delete the way bill
        await WayBills.deleteOne({ wayBill_id: wayBillId });

        // Respond with success message
        res.status(200).json({ message: 'Way bill deleted successfully' });
    } catch (error) {
        console.error("Error deleting way bill:", error);
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
                { wayBill_id: { $regex: query, $options: 'i' } },
                { project_name: { $regex: query, $options: 'i' } },
                { buyer_name: { $regex: query, $options: 'i' } },
                { buyer_phone: { $regex: query, $options: 'i' } }
            ]
        });

        if (way_bills.length === 0) {
            return res.status(404).send('No way bills found.');
        } else {
            return res.status(200).json({ wayBills: way_bills });
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send('Failed to fetch way bills.');
    }
});

module.exports = router;