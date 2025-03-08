const express = require('express');
const router = express.Router();
const { Invoices } = require('./database');

// Get service notifications
router.get('/get-service', async (req, res) => {
    try {
        const services = [];
        const projects = await Invoices.find();

        projects.forEach(project => {
            if (project.service_month === 0) {
                services.push(project);
            }
        });

        res.json({ services });
    } catch (error) {
        console.error("Error fetching services:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
