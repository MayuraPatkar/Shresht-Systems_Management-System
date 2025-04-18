const express = require('express');
const router = express.Router();
const { Invoices } = require('./database');
const moment = require('moment');
const log = require("electron-log"); // Import electron-log in the preload process


// Get service notifications
router.get('/get-service', async (req, res) => {
    try {
        const currentDate = moment(); // Get current date

        // Fetch invoices where service_month is not zero
        const projects = await Invoices.find({ service_month: { $ne: 0 } });

        // Filter invoices based on service_month and createdAt
        const filteredProjects = projects.filter(project => {
            if (!project.createdAt || !project.service_month) return false;

            const createdDate = moment(project.createdAt);
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
        const { invoice_id, next_service } = req.body;
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
