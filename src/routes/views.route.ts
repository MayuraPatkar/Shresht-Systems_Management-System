import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';

const router: Router = Router();

// Serve HTML files
const pages: Array<{ route: string; file: string }> = [
    { route: '/', file: 'index.html' },
    { route: '/dashboard', file: 'dashboard/dashboard.html' },
    { route: '/customer', file: 'customer/customer.html' },
    { route: '/customer/details', file: 'customer/customer_details.html' },
    { route: '/supplier', file: 'supplier/supplier.html' },
    { route: '/supplier/details', file: 'supplier/supplier_details.html' },
    { route: '/invoice', file: 'invoice/invoice.html' },
    { route: '/quotation', file: 'quotation/quotation.html' },
    { route: '/ewaybill', file: 'ewaybill/eWayBill.html' },
    { route: '/purchaseorder', file: 'purchaseOrder/purchaseOrder.html' },
    { route: '/service', file: 'service/service.html' },
    { route: '/payment', file: 'payment/payment.html' },
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
    router.get(route, (req: Request, res: Response, next: NextFunction) => {
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

export default router;
