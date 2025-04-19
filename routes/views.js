const express = require('express');
const path = require('path');
const router = express.Router();
const log = require("electron-log"); // Import electron-log in the preload process


// Serve HTML files
const pages = [
    { route: '/', file: 'index.html' },
    { route: '/dashboard', file: 'dashboard.html' },
    { route: '/invoice', file: 'invoice.html' },
    { route: '/quotation', file: 'quotation.html' },
    { route: '/wayBill', file: 'wayBill.html' },
    { route: '/purchaseorder', file: 'purchaseOrder.html' },
    { route: '/service', file: 'service.html' },
    { route: '/stock', file: 'stock.html' },
    { route: '/employee', file: 'employee.html' },
    { route: '/database', file: 'database.html' },
    { route: '/analytics', file: 'analytics.html' },
    { route: '/settings', file: 'settings.html' },
];

pages.forEach(({ route, file }) => {
    router.get(route, (req, res) => {
        res.sendFile(path.join(__dirname, '../public', file));
    });
});

module.exports = router;
