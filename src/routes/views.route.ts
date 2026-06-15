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
    { route: '/invoice/details', file: 'invoice/invoice_details.html' },
    { route: '/invoice/form', file: 'invoice/invoice_form.html' },
    { route: '/quotation', file: 'quotation/quotation.html' },
    { route: '/quotation/details', file: 'quotation/quotation_details.html' },
    { route: '/quotation/form', file: 'quotation/quotation_form.html' },
    { route: '/ewaybill', file: 'ewaybill/eWayBill.html' },
    { route: '/ewaybill/details', file: 'ewaybill/eWayBill_details.html' },
    { route: '/ewaybill/form', file: 'ewaybill/eWayBill_form.html' },
    { route: '/purchaseorder', file: 'purchaseOrder/purchaseOrder.html' },
    { route: '/purchaseorder/details', file: 'purchaseOrder/purchaseOrder_details.html' },
    { route: '/purchaseorder/form', file: 'purchaseOrder/purchaseOrder_form.html' },
    { route: '/purchase', file: 'purchase/purchase.html' },
    { route: '/purchase/details', file: 'purchase/purchase_details.html' },
    { route: '/purchase/form', file: 'purchase/purchase_form.html' },
    { route: '/service', file: 'service/service.html' },
    { route: '/service/details', file: 'service/service_details.html' },
    { route: '/payment', file: 'payment/payment.html' },
    { route: '/payment/details', file: 'payment/payment_details.html' },
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
