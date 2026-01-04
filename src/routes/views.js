const express = require('express');
const path = require('path');
const router = express.Router();


// Serve HTML files
const pages = [
    { route: '/', file: 'index.html' },
    { route: '/dashboard', file: 'dashboard/dashboard.html' },
    { route: '/invoice', file: 'invoice/invoice.html' },
    { route: '/quotation', file: 'quotation/quotation.html' },
    { route: '/wayBill', file: 'waybill/wayBill.html' },
    { route: '/purchaseorder', file: 'purchaseOrder/purchaseOrder.html' },
    { route: '/service', file: 'service/service_v2.html' },
    { route: '/stock', file: 'stock/stock.html' },
    { route: '/comms', file: 'comms/comms.html' },
    { route: '/reports', file: 'reports/reports.html' },
    { route: '/employee', file: 'employees/employee.html' },
    { route: '/database', file: 'database.html' },
    { route: '/analytics', file: 'analytics/analytics.html' },
    { route: '/calculations', file: 'calculations/calculations.html' },
    { route: '/settings', file: 'settings/settings.html' },
];

// Serve HTML pages - exact route only (not sub-paths)
pages.forEach(({ route, file }) => {
    router.get(route, (req, res, next) => {
        // Check if this is exactly the route (not a sub-path like /invoice/something)
        // req.baseUrl + req.path gives the full matched path
        const fullPath = req.baseUrl + req.path;

        if (fullPath === route || fullPath === route + '/') {
            res.sendFile(path.join(__dirname, '../../public', file));
        } else {
            next(); // Let other routes handle sub-paths
        }
    });
});

module.exports = router;
