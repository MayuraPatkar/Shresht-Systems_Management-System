const express = require('express');
const path = require('path');
const router = express.Router();
const log = require("electron-log"); // Import electron-log in the preload process


// Serve HTML files
const pages = [
    { route: '/', file: 'index.html' },
    { route: '/dashboard', file: 'dashboard/dashboard.html' },
    { route: '/invoice', file: 'invoice/invoice.html' },
    { route: '/quotation', file: 'quotation/quotation.html' },
    { route: '/wayBill', file: 'waybill/wayBill.html' },
    { route: '/purchaseorder', file: 'purchaseOrder/purchaseOrder.html' },
    { route: '/service', file: 'service/service.html' },
    { route: '/stock', file: 'stock/stock.html' },
    { route: '/comms', file: 'comms/comms.html' },
    { route: '/employee', file: 'employees/employee.html' },
    { route: '/database', file: 'database.html' },
    { route: '/analytics', file: 'analytics/analytics.html' },
    { route: '/settings', file: 'settings/settings.html' },
];

pages.forEach(({ route, file }) => {
    router.get(route, (req, res) => {
        res.sendFile(path.join(__dirname, '../public', file));
    });
});

module.exports = router;
