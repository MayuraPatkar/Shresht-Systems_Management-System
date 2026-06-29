import { Router, Request, Response } from 'express';
import { EWayBillModel, InvoiceModel } from '../models';
import logger from '../utils/logger';

const router: Router = Router();

// Route to get all e-way bills
router.get("/all", async (req: Request, res: Response) => {
    try {
        const allEWayBills = await EWayBillModel.find().sort({ createdAt: -1 });
        return res.status(200).json(allEWayBills);
    } catch (error: unknown) {
        logger.error("E-Way Bill fetch failed", { service: "ewaybill", error: (error as Error).message });
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * Route: Save or Update E-Way Bill
 * Description: Creates a new E-Way Bill or updates an existing one.
 */
router.post("/save-ewaybill", async (req: Request, res: Response) => {
    try {
        let {
            _id = '',  // MongoDB _id for updates
            eWayBillNo = '',  // External E-Way Bill number
            eWayBillStatus = 'Draft',
            invoiceId = '',
            fromAddress = '',
            toAddress = '',
            transportMode = '',
            vehicleNumber = '',
            transporterId = '',
            transporterName = '',
            distanceKm = 0,
            eWayBillDate,
            items = [] as any[],
            totalTaxableValue = 0,
            cgst = 0,
            sgst = 0,
            totalInvoiceValue = 0,
        } = req.body;

        // Transform items to match new IEWayBillItem schema
        const transformedItems = items.map((item: any) => ({
            item_id: item.item_id || item.stock_id || undefined,
            description: item.description || '',
            hsn_sac: item.hsn_sac || '',
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            taxable_value: Number(item.taxable_value) || (Number(item.quantity) * Number(item.unit_price)) || 0,
            gst_rate: Number(item.gst_rate) || Number(item.rate) || 0
        }));

        // Calculate totals if not provided
        if (!totalTaxableValue) {
            totalTaxableValue = transformedItems.reduce((sum: number, item: any) => sum + item.taxable_value, 0);
        }
        if (!cgst && !sgst) {
            transformedItems.forEach((item: any) => {
                const taxAmount = (item.taxable_value * item.gst_rate) / 100;
                cgst += taxAmount / 2;
                sgst += taxAmount / 2;
            });
        }
        if (!totalInvoiceValue) {
            totalInvoiceValue = totalTaxableValue + cgst + sgst;
        }

        // Build totals sub-document
        const totals = {
            taxable_value: totalTaxableValue,
            cgst,
            sgst,
            total_tax: cgst + sgst,
            grand_total: totalInvoiceValue
        };

        // Build address sub-documents (accept string or structured)
        const fromAddr = typeof fromAddress === 'string'
            ? { line1: fromAddress } : fromAddress;
        const toAddr = typeof toAddress === 'string'
            ? { line1: toAddress } : toAddress;

        // Resolve the invoice reference if invoiceId is provided
        let invoiceRef = undefined;
        if (invoiceId) {
            const invoice = await InvoiceModel.findOne({ invoice_no: invoiceId });
            if (invoice) {
                invoiceRef = invoice._id;
            }
        }

        let eWayBill: any = null;

        // Try to find existing document by _id
        if (_id) {
            eWayBill = await EWayBillModel.findById(_id);
        }

        if (eWayBill) {
            // ---------------------------------------------------------
            // SCENARIO 1: UPDATE EXISTING E-WAY BILL
            // ---------------------------------------------------------
            eWayBill.ewaybill_no = eWayBillNo;
            eWayBill.ewaybill_status = eWayBillStatus;
            
            if (invoiceId && invoiceRef) {
                eWayBill.invoice_id = { id: invoiceId, ref: invoiceRef };
            } else if (invoiceId) {
                // In case invoice isn't found in DB yet but we still want to save it as draft
                eWayBill.invoice_id = { id: invoiceId, ref: new (require('mongoose').Types.ObjectId)() }; 
            }

            eWayBill.from_address = fromAddr;
            eWayBill.to_address = toAddr;
            eWayBill.transport = {
                mode: transportMode,
                vehicle_number: vehicleNumber,
                transporter_id: transporterId,
                transporter_name: transporterName,
                distance_km: Number(distanceKm) || 0
            };
            if (eWayBillDate) eWayBill.ewaybill_date = new Date(eWayBillDate);
            eWayBill.items = transformedItems;
            eWayBill.totals = totals;
        } else {
            // ---------------------------------------------------------
            // SCENARIO 2: CREATE NEW E-WAY BILL
            // ---------------------------------------------------------
            let newInvoiceIdObj = undefined;
            if (invoiceId && invoiceRef) {
                newInvoiceIdObj = { id: invoiceId, ref: invoiceRef };
            } else if (invoiceId) {
                newInvoiceIdObj = { id: invoiceId, ref: new (require('mongoose').Types.ObjectId)() };
            }

            eWayBill = new EWayBillModel({
                ewaybill_no: eWayBillNo,
                ewaybill_status: eWayBillStatus,
                invoice_id: newInvoiceIdObj,
                from_address: fromAddr,
                to_address: toAddr,
                transport: {
                    mode: transportMode,
                    vehicle_number: vehicleNumber,
                    transporter_id: transporterId,
                    transporter_name: transporterName,
                    distance_km: Number(distanceKm) || 0
                },
                ewaybill_date: eWayBillDate ? new Date(eWayBillDate) : undefined,
                items: transformedItems,
                totals,
            });
        }

        const savedEWayBill = await eWayBill.save();

        res.status(201).json({
            message: 'E-Way Bill saved successfully',
            eWayBill: savedEWayBill,
            _id: savedEWayBill._id
        });
    } catch (error: unknown) {
        logger.error('E-Way Bill save failed', { service: "ewaybill", error: (error as Error).message });
        res.status(500).json({ message: 'Internal server error', error: (error as Error).message });
    }
});

// Route to get recent e-way bills (supports filtering by archived/deleted status)
router.get("/recent-ewaybills", async (req: Request, res: Response) => {
    try {
        const { status, deleted } = req.query;
        let query: any = {};

        if (deleted === 'true') {
            query['deletion.is_deleted'] = true;
        } else {
            query['deletion.is_deleted'] = false;
        }

        if (status === 'archived') {
            query.is_archived = true;
        } else {
            query.is_archived = { $ne: true };
        }

        let queryBuilder = EWayBillModel.find(query).sort({ createdAt: -1 });
        if (status !== 'archived' && deleted !== 'true') {
            queryBuilder = queryBuilder.limit(10);
        }

        const recentEWayBills = await queryBuilder
            .select("ewaybill_no invoice_id ewaybill_status from_address to_address transport ewaybill_date totals createdAt is_archived deletion");

        res.status(200).json({
            message: "Recent e-way bills retrieved successfully",
            eWayBill: recentEWayBills,
        });
    } catch (error: unknown) {
        logger.error("Recent e-way bills fetch failed", { service: "ewaybill", error: (error as Error).message });
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Let the view router handle /ewaybill/details and /ewaybill/form — must be BEFORE /:eWayBillId wildcard
router.get('/details', (_req: Request, _res: Response, next: Function) => next('router'));
router.get('/form', (_req: Request, _res: Response, next: Function) => next('router'));

// Route to get an e-way bill by ID
router.get("/:eWayBillId", async (req: Request, res: Response) => {
    try {
        const { eWayBillId } = req.params;
        const eWayBill = await EWayBillModel.findById(eWayBillId);
        if (!eWayBill) {
            return res.status(404).json({ message: 'E-Way Bill not found' });
        }
        res.status(200).json({ message: "E-Way Bill retrieved successfully", eWayBill });
    } catch (error: unknown) {
        logger.error("Single e-way bill fetch failed", { service: "ewaybill", eWayBillId: req.params.eWayBillId, error: (error as Error).message });
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Route to soft delete an e-way bill
router.delete("/:eWayBillId", async (req: Request, res: Response) => {
    try {
        const { eWayBillId } = req.params;
        const username = String((req.query && req.query.username) || (req.headers && req.headers['x-username']) || (req.body && req.body.username) || 'Admin');
        const eWayBill = await EWayBillModel.findById(eWayBillId);
        if (!eWayBill) {
            return res.status(404).json({ message: 'E-Way Bill not found' });
        }
        eWayBill.deletion = {
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: username
        };
        await eWayBill.save();
        res.status(200).json({ message: 'E-Way Bill deleted successfully' });
    } catch (error: unknown) {
        logger.error("E-Way Bill deletion failed", { service: "ewaybill", eWayBillId: req.params.eWayBillId, error: (error as Error).message });
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Search e-way bills
router.get('/search/:query', async (req: Request, res: Response) => {
    const { query } = req.params;
    const { status, deleted } = req.query;
    if (!query) return res.status(400).send('Query parameter is required.');

    let queryObj: any = {};
    if (deleted === 'true') {
        queryObj['deletion.is_deleted'] = true;
    } else {
        queryObj['deletion.is_deleted'] = false;
    }

    if (status === 'archived') {
        queryObj.is_archived = true;
    } else {
        queryObj.is_archived = { $ne: true };
    }

    try {
        queryObj.$or = [
            { ewaybill_no: { $regex: query, $options: 'i' } },
            { 'from_address.line1': { $regex: query, $options: 'i' } },
            { 'to_address.line1': { $regex: query, $options: 'i' } },
            { 'transport.vehicle_number': { $regex: query, $options: 'i' } },
            { 'transport.transporter_name': { $regex: query, $options: 'i' } }
        ];

        const ewaybills = await EWayBillModel.find(queryObj);

        if (ewaybills.length === 0) {
            return res.status(404).send('No e-way bills found.');
        } else {
            return res.status(200).json({ eWayBills: ewaybills });
        }
    } catch (err: unknown) {
        logger.error("E-Way Bill search failed", { service: "ewaybill", query, error: (err as Error).message });
        return res.status(500).send('Failed to fetch e-way bills.');
    }
});

// Check if e-way bill exists for an invoice (by invoice_no string)
router.get('/check-invoice/:invoiceId', async (req: Request, res: Response) => {
    try {
        const { invoiceId } = req.params;

        // First, try to find the invoice to get its MongoDB _id
        const invoice = await InvoiceModel.findOne({ invoice_no: invoiceId });

        if (!invoice) {
            // Invoice doesn't exist, so no e-way bill for it either
            return res.status(200).json({ exists: false });
        }

        // Check if any e-way bill references this invoice
        // Schema defines invoice_id as object { id, ref }, so we check against ref
        const existingEWayBill = await EWayBillModel.findOne({ "invoice_id.ref": invoice._id });

        res.status(200).json({ exists: !!existingEWayBill });
    } catch (error: unknown) {
        logger.error("Check invoice e-way bill failed", { service: "ewaybill", error: (error as Error).message });
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Check if e-way bill number already exists
router.get('/check-ewaybill-no/:ewaybillNo', async (req: Request, res: Response) => {
    try {
        const { ewaybillNo } = req.params;
        const { excludeId } = req.query; // Optional: exclude a specific e-waybill ID (for edit mode)

        // Build query to find e-waybill with this number
        const query: any = { ewaybill_no: ewaybillNo };

        // If excludeId is provided, exclude that specific e-waybill from the check
        if (excludeId) {
            query._id = { $ne: excludeId };
        }

        const existingEWayBill = await EWayBillModel.findOne(query);

        res.status(200).json({ exists: !!existingEWayBill });
    } catch (error: unknown) {
        logger.error("Check e-way bill number failed", { service: "ewaybill", error: (error as Error).message });
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Route: Archive E-Way Bill
router.put("/:eWayBillId/archive", async (req: Request, res: Response) => {
    try {
        const { eWayBillId } = req.params;
        const eWayBill = await EWayBillModel.findById(eWayBillId);
        if (!eWayBill) {
            return res.status(404).json({ message: 'E-Way Bill not found' });
        }
        eWayBill.is_archived = true;
        await eWayBill.save();
        res.status(200).json({ message: 'E-Way Bill archived successfully', eWayBill });
    } catch (error: unknown) {
        logger.error("E-Way Bill archiving failed", { service: "ewaybill", eWayBillId: req.params.eWayBillId, error: (error as Error).message });
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Route: Restore Archived E-Way Bill
router.put("/:eWayBillId/restore", async (req: Request, res: Response) => {
    try {
        const { eWayBillId } = req.params;
        const eWayBill = await EWayBillModel.findById(eWayBillId);
        if (!eWayBill) {
            return res.status(404).json({ message: 'E-Way Bill not found' });
        }
        eWayBill.is_archived = false;
        await eWayBill.save();
        res.status(200).json({ message: 'E-Way Bill restored successfully', eWayBill });
    } catch (error: unknown) {
        logger.error("E-Way Bill restore failed", { service: "ewaybill", eWayBillId: req.params.eWayBillId, error: (error as Error).message });
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Route: Restore Soft-Deleted E-Way Bill from Trash
router.post("/restoreItem", async (req: Request, res: Response) => {
    const { itemId } = req.body;
    try {
        const eWayBill = await EWayBillModel.findById(itemId);
        if (!eWayBill) {
            return res.status(404).json({ error: 'E-Way Bill not found' });
        }
        eWayBill.deletion = {
            is_deleted: false,
            deleted_at: undefined,
            deleted_by: undefined
        };
        await eWayBill.save();
        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('E-Way Bill restore failed', { service: "ewaybill", itemId, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to restore e-way bill' });
    }
});

// Route: Permanently Delete E-Way Bill
router.post("/hardDeleteItem", async (req: Request, res: Response) => {
    const { itemId } = req.body;
    try {
        const result = await EWayBillModel.deleteOne({ _id: itemId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'E-Way Bill not found' });
        }
        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('E-Way Bill permanent deletion failed', { service: "ewaybill", itemId, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to permanently delete e-way bill' });
    }
});

// Route: Bulk Restore E-Way Bills
router.post("/bulkRestore", async (req: Request, res: Response) => {
    const { itemIds } = req.body;
    try {
        await EWayBillModel.updateMany(
            { _id: { $in: itemIds } },
            {
                $set: {
                    "deletion.is_deleted": false,
                    "deletion.deleted_at": undefined,
                    "deletion.deleted_by": undefined
                }
            }
        );
        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Bulk e-way bill restore failed', { service: "ewaybill", count: itemIds?.length, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to bulk restore e-way bills' });
    }
});

// Route: Bulk Permanently Delete E-Way Bills
router.post("/bulkHardDelete", async (req: Request, res: Response) => {
    const { itemIds } = req.body;
    try {
        await EWayBillModel.deleteMany({ _id: { $in: itemIds } });
        res.json({ success: true });
    } catch (error: unknown) {
        logger.error('Bulk e-way bill permanent deletion failed', { service: "ewaybill", count: itemIds?.length, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to bulk permanently delete e-way bills' });
    }
});

export default router;
