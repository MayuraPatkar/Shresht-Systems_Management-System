const express = require('express');
const router = express.Router();
const { Invoices } = require('../models');
const moment = require('moment');
const log = require("electron-log");

// Function to generate a unique ID for each Service
function generateUniqueId() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10);
    return `${year}${month}${day}${randomNum}`;
}

// Route to generate a new service ID
router.get("/generate-id", async (req, res) => {
    let service_id;
    let attempts = 0;
    const maxAttempts = 10;

    // Try up to 10 times before adding more randomness
    while (attempts < maxAttempts) {
        service_id = generateUniqueId();
        // Use exists() for faster query
        const exists = await Invoices.exists({ invoice_id: service_id });
        if (!exists) {
            return res.status(200).json({ service_id: service_id });
        }
        attempts++;
    }

    // If still not unique after 10 attempts, add timestamp milliseconds
    service_id = generateUniqueId() + Date.now().toString().slice(-3);
    res.status(200).json({ service_id: service_id });
});

// Route to get all services (invoices with service_month > 0)
router.get('/all', async (req, res) => {
    try {
        // Only select necessary fields for list views
        const services = await Invoices.find({ service_month: { $ne: 0 } })
            .select('invoice_id project_name customer_name customer_phone customer_email service_month service_stage createdAt invoice_date')
            .sort({ createdAt: -1 })
            .lean(); // Use lean() for better performance
        return res.status(200).json(services);
    } catch (error) {
        log.error("Error fetching services:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get service notifications (all invoices with service_month > 0 and due)
router.get('/get-service', async (req, res) => {
    try {
        const currentDate = moment();
        // Fetch only necessary fields for better performance
        const projects = await Invoices.find({ service_month: { $ne: 0 } })
            .select('invoice_id project_name customer_name customer_phone customer_email service_month service_stage createdAt invoice_date')
            .lean();

        // Filter invoices based on service_month and invoice_date/createdAt
        const filteredProjects = projects.filter(project => {
            if (!project.createdAt && !project.invoice_date) return false;
            if (!project.service_month) return false;

            const createdDate = moment(project.invoice_date || project.createdAt);
            const targetDate = createdDate.clone().add(project.service_month, 'months');
            return currentDate.isSameOrAfter(targetDate, 'day');
        });

        res.json({ projects: filteredProjects });
    } catch (error) {
        log.error("Error fetching services:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update next service status
router.post('/update-nextService', async (req, res) => {
    try {
        const { invoice_id, next_service } = req.body;
        log.log(invoice_id, next_service);

        // Check if project exists
        const project = await Invoices.findOne({ invoice_id: invoice_id });
        if (!project) return res.status(404).json({ error: "Project not found" });

        // Update project with service_month
        if (next_service === "yes") {
            // Double the service_month interval for next service
            project.service_month = project.service_month * 2;
            await project.save();
        } else {
            // Mark as no further service
            project.service_month = 0;
            await project.save();
        }

        res.json({ message: "Service updated successfully" });
    } catch (error) {
        log.error("Error updating service:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Route to save a new service entry and update service_stage in invoice
router.post('/save-service', async (req, res) => {
    try {
        const {
            service_id,
            invoice_id,
            fee_amount,
            service_date,
            service_stage,
            items,
            non_items,
            total_tax,
            total_amount_no_tax,
            total_amount_with_tax,
            notes
        } = req.body;

        // 1. Save service entry in the service collection
        const { service } = require('../models');
        await service.create({
            service_id,
            invoice_id,
            fee_amount,
            service_date,
            service_stage,
            items: items || [],
            non_items: non_items || [],
            total_tax: total_tax || 0,
            total_amount_no_tax: total_amount_no_tax || 0,
            total_amount_with_tax: total_amount_with_tax || 0,
            notes: notes || ''
        });

        // 2. Update only service_stage in the invoice
        const invoice = await Invoices.findOne({ invoice_id });
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        if (typeof service_stage !== "undefined") {
            invoice.service_stage = service_stage;
            await invoice.save();
        }

        res.json({ message: "Service saved and invoice service_stage updated successfully" });
    } catch (error) {
        log.error("Error saving service info:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Search services by customer name, project name, or invoice ID
router.get('/search/:query', async (req, res) => {
    try {
        const query = req.params.query;
        const currentDate = moment();
        
        // Search in invoices where service_month is not zero
        const projects = await Invoices.find({
            service_month: { $ne: 0 },
            $or: [
                { customer_name: { $regex: query, $options: 'i' } },
                { project_name: { $regex: query, $options: 'i' } },
                { invoice_id: { $regex: query, $options: 'i' } }
            ]
        });

        // Filter based on service due date
        const filteredProjects = projects.filter(project => {
            if (!project.createdAt && !project.invoice_date) return false;
            if (!project.service_month) return false;

            const createdDate = moment(project.invoice_date || project.createdAt);
            const targetDate = createdDate.clone().add(project.service_month, 'months');
            return currentDate.isSameOrAfter(targetDate, 'day');
        });

        res.json({ service: filteredProjects });
    } catch (error) {
        log.error("Error searching services:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
