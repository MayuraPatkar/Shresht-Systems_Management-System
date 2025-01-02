const express = require('express');
const router = express.Router();
const { Admin, Invoices } = require('./database');

// get service notifications
router.get('/notifications', async (req, res) => {
    const services = await Invoices.find();
    res.json({ notifications: services });
});

module.exports = router;