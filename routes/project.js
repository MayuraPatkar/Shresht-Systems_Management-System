const express = require('express');
const router = express.Router();
const { Admin, Projects } = require('./database');

router.post("/save-invoice", async (req, res) => {
    try {
        const {
            projectName,
            buyer = '',
            address = '',
            phone = '',
            email = '',
            invoiceNumber = '',
            poNumber = '',
            poDate,
            dcNumber = '',
            dcDate,
            ewayBillNumber = '',
            date,
            placeToSupply = '',
            transportationMode = '',
            vehicleNo = '',
            items = [],
            total = 0,
            CGST_total = 0,
            SGST_total = 0,
            roundOff = 0,
            invoiceTotal = 0,
            buyerName = '',
            buyerAddress = '',
            buyerPhone = '',
            consigneeName = '',
            consigneeAddress = '',
        } = req.body;

        // Validate required fields
        // if (!buyer || !address || !phone || !invoiceNumber || !items.length || total <= 0) {
        //     return res.status(400).json({
        //         message: 'Missing required fields or invalid data: buyer, address, phone, invoiceNumber, items, or total.',
        //     });
        // }

        // Fetch admin details
        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Check if invoice already exists
        const existingInvoice = await Projects.findOne({ invoice_number: invoiceNumber });
        if (existingInvoice) {
            return res.status(400).json({
                message: 'Invoice already exists',
                project: existingInvoice,
            });
        }

        // Create a new project with the provided data
        const project = new Projects({
            admin: admin._id,
            project_name: projectName,
            po_number: poNumber,
            po_date: poDate,
            dc_number: dcNumber,
            dc_date: dcDate,
            name: buyer,
            address,
            phone,
            email,
            invoice_number: invoiceNumber,
            E_Way_Bill_number: ewayBillNumber,
            date,
            place_to_supply: placeToSupply,
            transportation_mode: transportationMode,
            vehicle_no: vehicleNo,
            buyer_name: buyerName,
            buyer_address: buyerAddress,
            buyer_phone: buyerPhone,
            consignee_name: consigneeName,
            consignee_address: consigneeAddress,
            items,
            total,
            CGST_total,
            SGST_total,
            round_Off: roundOff,
            invoice_total: invoiceTotal,
        });

        // Save the project
        const savedProject = await project.save();

        // Respond with success message and data
        res.status(201).json({
            message: 'Invoice and project data saved successfully',
            project: savedProject,
        });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});



// Route to get the 5 most recent projects
router.get("/recent-projects", async (req, res) => {
    try {
        // Fetch the 5 most recent projects, sorted by creation date
        const recentProjects = await Projects.find()
            .sort({ createdAt: -1 }) // Assuming `createdAt` is a timestamp
            .limit(5)
            .select("project_name invoice_number date"); // Select only the required fields

        // Respond with the fetched projects
        res.status(200).json({
            message: "Recent projects retrieved successfully",
            projects: recentProjects,
        });
    } catch (error) {
        console.error("Error retrieving recent projects:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

router.get("/:invoice_number", async (req, res) => {
    try {
        const { invoice_number } = req.params;

        // Fetch the invoice data from the database
        const invoice = await Projects.findOne({ invoice_number });
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Render the page with the invoice data
        res.render("invoice", { invoice });
    } catch (error) {
        console.error("Error fetching invoice:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

router.get("/invoice/edit/:invoice_number", async (req, res) => {
    try {
        const { invoice_number } = req.params;

        // Fetch the invoice data from the database
        const invoice = await Projects.findOne({ invoice_number });
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Render the page with the invoice data
        res.render("invoice_edit", { invoice });
    } catch (error) {
        console.error("Error fetching invoice:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});





module.exports = router;