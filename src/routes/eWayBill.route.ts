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

        // Transform items to match schema field names
        const transformedItems = items.map((item: any) => ({
            stock_id: item.stock_id ? item.stock_id : undefined,
            description: item.description || '',
            hsn_sac: item.hsn_sac || item.HSN_SAC || '',
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
            eWayBill.invoice_id = invoiceId || undefined;
            eWayBill.from_address = fromAddress;
            eWayBill.to_address = toAddress;
            eWayBill.transport = {
                mode: transportMode,
                vehicle_number: vehicleNumber,
                transporter_id: transporterId,
                transporter_name: transporterName,
                distance_km: Number(distanceKm) || 0
            };
            if (eWayBillDate) eWayBill.ewaybill_generated_at = new Date(eWayBillDate);
            eWayBill.items = transformedItems;
            eWayBill.total_taxable_value = totalTaxableValue;
            eWayBill.cgst = cgst;
            eWayBill.sgst = sgst;
            eWayBill.total_invoice_value = totalInvoiceValue;
        } else {
            // ---------------------------------------------------------
            // SCENARIO 2: CREATE NEW E-WAY BILL
            // ---------------------------------------------------------
            eWayBill = new EWayBillModel({
                ewaybill_no: eWayBillNo,
                ewaybill_status: eWayBillStatus,
                invoice_id: invoiceId || undefined,
                from_address: fromAddress,
                to_address: toAddress,
                transport: {
                    mode: transportMode,
                    vehicle_number: vehicleNumber,
                    transporter_id: transporterId,
                    transporter_name: transporterName,
                    distance_km: Number(distanceKm) || 0
                },
                ewaybill_generated_at: eWayBillDate ? new Date(eWayBillDate) : undefined,
                items: transformedItems,
                total_taxable_value: totalTaxableValue,
                cgst,
                sgst,
                total_invoice_value: totalInvoiceValue
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

// Route to get the 10 most recent e-way bills
router.get("/recent-ewaybills", async (req: Request, res: Response) => {
    try {
        const recentEWayBills = await EWayBillModel.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('invoice_id', 'invoice_id')
            .select("ewaybill_no invoice_id ewaybill_status from_address to_address transport ewaybill_generated_at total_invoice_value createdAt");

        res.status(200).json({
            message: "Recent e-way bills retrieved successfully",
            eWayBill: recentEWayBills,
        });
    } catch (error: unknown) {
        logger.error("Recent e-way bills fetch failed", { service: "ewaybill", error: (error as Error).message });
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Route to get an e-way bill by ID
router.get("/:eWayBillId", async (req: Request, res: Response) => {
    try {
        const { eWayBillId } = req.params;
        const eWayBill = await EWayBillModel.findById(eWayBillId).populate('invoice_id', 'invoice_id');
        if (!eWayBill) {
            return res.status(404).json({ message: 'E-Way Bill not found' });
        }
        res.status(200).json({ message: "E-Way Bill retrieved successfully", eWayBill });
    } catch (error: unknown) {
        logger.error("Single e-way bill fetch failed", { service: "ewaybill", eWayBillId: req.params.eWayBillId, error: (error as Error).message });
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Route to delete an e-way bill
router.delete("/:eWayBillId", async (req: Request, res: Response) => {
    try {
        const { eWayBillId } = req.params;
        const eWayBill = await EWayBillModel.findById(eWayBillId);
        if (!eWayBill) {
            return res.status(404).json({ message: 'E-Way Bill not found' });
        }
        await EWayBillModel.deleteOne({ _id: eWayBillId });
        res.status(200).json({ message: 'E-Way Bill deleted successfully' });
    } catch (error: unknown) {
        logger.error("E-Way Bill deletion failed", { service: "ewaybill", eWayBillId: req.params.eWayBillId, error: (error as Error).message });
        res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Search e-way bills
router.get('/search/:query', async (req: Request, res: Response) => {
    const { query } = req.params;
    if (!query) return res.status(400).send('Query parameter is required.');

    try {
        const ewaybills = await EWayBillModel.find({
            $or: [
                { ewaybill_no: { $regex: query, $options: 'i' } },
                { from_address: { $regex: query, $options: 'i' } },
                { to_address: { $regex: query, $options: 'i' } },
                { 'transport.vehicle_number': { $regex: query, $options: 'i' } },
                { 'transport.transporter_name': { $regex: query, $options: 'i' } }
            ]
        } as any);

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

// Check if e-way bill exists for an invoice (by invoice_id string)
router.get('/check-invoice/:invoiceId', async (req: Request, res: Response) => {
    try {
        const { invoiceId } = req.params;

        // First, try to find the invoice to get its MongoDB _id
        const invoice = await InvoiceModel.findOne({ invoice_id: invoiceId });

        if (!invoice) {
            // Invoice doesn't exist, so no e-way bill for it either
            return res.status(200).json({ exists: false });
        }

        // Check if any e-way bill references this invoice
        // Schema defines invoice_id as ObjectId, so we must strictly use the resolved _id
        const existingEWayBill = await EWayBillModel.findOne({ invoice_id: invoice._id });

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

export default router;
