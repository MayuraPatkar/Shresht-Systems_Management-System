const express = require('express');
const router = express.Router();
const { Invoices, service } = require('./database');
const moment = require('moment');
const log = require("electron-log"); // Import electron-log in the preload process

// Function to generate a unique ID for each Invoice
function generateUniqueId() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits of the year
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month (0-based, so add 1)
    const day = now.getDate().toString().padStart(2, '0'); // Day of the month
    const randomNum = Math.floor(Math.random() * 10); // Random single-digit number
    return `${year}${month}${day}${randomNum}`;
}

// Route to generate a new service ID
router.get("/generate-id", async (req, res) => {
    let service_id;
    let isUnique = false;

    while (!isUnique) {
        service_id = generateUniqueId();
        const existingService = await service.findOne({ service_id: service_id });
        if (!existingService) {
            isUnique = true;
        }
    }

    res.status(200).json({ service_id: service_id });
});

// Get service notifications
router.get('/get-service', async (req, res) => {
    try {
        const currentDate = moment(); // Get current date

        // Fetch invoices where service_month is not zero
        const projects = await Invoices.find({ service_month: { $ne: 0 } });

        // Filter invoices based on service_month and createdAt
        const filteredProjects = projects.filter(project => {
            if (!project.createdAt || !project.service_month) return false;

            const createdDate = moment(project.invoice_date || project.createdAt); // Use invoice_date or createdAt if invoice_date is not available
            const targetDate = createdDate.add(project.service_month, 'months');

            return currentDate.isSameOrAfter(targetDate, 'day');
        });

        res.json({ projects: filteredProjects });
    } catch (error) {
        log.error("Error fetching services:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post('/update-nextService', async (req, res) => {
    try {
        const { invoice_id, next_service, fee_anount } = req.body;
        log.log(invoice_id, next_service);

        // Check if project exists
        const project = await Invoices.findOne({ invoice_id: invoice_id });
        if (!project) return res.status(404).json({ error: "Project not found" });

        // Update project with service_month
        if (next_service === "yes") {
            project.service_month = project.service_month * 2;
            await project.save();
        } else {
            project.service_month = 0;
            await project.save();
        }

        res.json({ message: "Service added successfully" });
    } catch (error) {
        log.error("Error adding service:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
