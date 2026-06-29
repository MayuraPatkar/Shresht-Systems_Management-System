import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { CustomerModel, InvoiceModel, ItemModel, QuotationModel } from '../models';
import logger from '../utils/logger';
import { previewNextId, generateNextId, syncCounterIfNeeded } from '../utils/idGenerator';
import {
    normalizeQuotationDocument,
    normalizeQuotationPayload,
    QUOTATION_SCHEMA_VERSION,
    QUOTATION_STATUSES,
} from '../utils/quotationSchema';

const router: Router = Router();

function activeQuotationQuery(extra: any = {}) {
    return {
        'deletion.is_deleted': { $ne: true },
        is_deleted: { $ne: true },
        is_archived: { $ne: true },
        ...extra,
    };
}

async function findCustomer(customerId?: string) {
    if (!customerId || !Types.ObjectId.isValid(customerId)) return null;
    return CustomerModel.findOne({ _id: customerId, 'deletion.is_deleted': false }).lean();
}

async function enrichItemsFromStock(items: any[]) {
    return Promise.all((items || []).map(async item => {
        let stockItem: any = null;
        if (item.item_id && Types.ObjectId.isValid(item.item_id)) {
            stockItem = await ItemModel.findById(item.item_id).lean();
        }
        if (!stockItem && item.description) {
            stockItem = await ItemModel.findOne({
                item_name: { $regex: new RegExp(`^${String(item.description).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                'deletion.is_deleted': { $ne: true },
            }).lean();
        }

        if (!stockItem) return item;
        return {
            ...item,
            item_id: item.item_id || stockItem._id,
            description: item.description || stockItem.item_name,
            specification: item.specification || stockItem.specifications || '',
            hsn_sac: item.hsn_sac || stockItem.hsn_sac || '',
            unit: item.unit || stockItem.unit || '',
            unit_price: Number(item.unit_price || stockItem.selling_price || stockItem.purchase_price || 0),
            gst_rate: Number(item.gst_rate || stockItem.gst_rate || 0),
        };
    }));
}

function isDraftSaveRequest(body: any): boolean {
    return body.save_as_draft === true ||
        body.save_as_draft === 'true' ||
        body.saveAsDraft === true ||
        body.saveAsDraft === 'true';
}

function draftItemHasContent(item: any): boolean {
    return Boolean(
        String(item.description || item.item_name || '').trim() ||
        String(item.hsn_sac || item.HSN_SAC || '').trim() ||
        String(item.specification || item.specifications || '').trim() ||
        String(item.unit || '').trim() ||
        item.item_id ||
        Number(item.quantity) > 0 ||
        Number(item.unit_price ?? item.price) > 0 ||
        Number(item.gst_rate ?? item.rate) > 0
    );
}

function prepareDraftItems(items: any[] = []) {
    return items
        .filter(draftItemHasContent)
        .map(item => {
            if (Number(item.quantity) > 0) return item;
            const { quantity: _quantity, ...draftItem } = item;
            return draftItem;
        });
}

async function expireStaleQuotations() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    await QuotationModel.updateMany(
        activeQuotationQuery({
            valid_till: { $lt: now },
            quotation_status: { $nin: ['Converted', 'Rejected', 'Expired'] },
        }),
        { $set: { quotation_status: 'Expired' } }
    );
}

function buildListQuery(req: Request) {
    const { status, customer_id, expired, converted, includeDeleted, startDate, endDate } = req.query;
    const query: any = includeDeleted === 'true'
        ? {}
        : status === 'archived'
            ? { 'deletion.is_deleted': { $ne: true }, is_deleted: { $ne: true }, is_archived: true }
            : activeQuotationQuery();

    if (status !== 'archived' && status && QUOTATION_STATUSES.includes(status as any)) query.quotation_status = status;
    if (customer_id && Types.ObjectId.isValid(String(customer_id))) query.customer_id = customer_id;
    if (converted === 'true') query.converted_invoice_id = { $exists: true, $ne: null };
    if (expired === 'true') {
        query.$or = [{ quotation_status: 'Expired' }, { valid_till: { $lt: new Date() } }];
    }
    if (startDate || endDate) {
        query.quotation_date = {};
        if (startDate) query.quotation_date.$gte = new Date(String(startDate));
        if (endDate) query.quotation_date.$lte = new Date(String(endDate));
    }

    return query;
}

router.get("/generate-id", async (_req: Request, res: Response) => {
    try {
        const quotation_no = await previewNextId('quotation');
        return res.status(200).json({ quotation_no, quotation_id: quotation_no });
    } catch (err: unknown) {
        logger.error('Error generating quotation preview', { error: (err as Error).message || err });
        return res.status(500).json({ error: 'Failed to generate quotation id' });
    }
});

router.get("/all", async (req: Request, res: Response) => {
    try {
        await expireStaleQuotations();
        const quotations = await QuotationModel.find(buildListQuery(req)).populate('customer_id', 'customer_type').sort({ createdAt: -1 }).lean();
        return res.status(200).json(quotations.map(normalizeQuotationDocument));
    } catch (error: unknown) {
        logger.error("Error fetching quotations:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/save-quotation", async (req: Request, res: Response) => {
    try {
        const isDraftSave = isDraftSaveRequest(req.body);
        const incomingId = String(req.body.quotation_no || req.body.quotation_id || '').trim();
        const customer = await findCustomer(req.body.customer_id || req.body.buyerCustomerId);
        const rawItems = isDraftSave ? prepareDraftItems(req.body.items || []) : (req.body.items || []);
        const enrichedItems = await enrichItemsFromStock(rawItems);
        const payload = normalizeQuotationPayload({ ...req.body, items: enrichedItems }, customer);

        if (isDraftSave) {
            payload.quotation_status = 'Draft';
            if (!payload.project_name) {
                payload.project_name = 'Untitled Quotation Draft';
            }
            payload.items = (payload.items || []).map((item: any) => {
                if (Number(item.quantity) > 0) return item;
                const { quantity: _quantity, ...draftItem } = item;
                return draftItem;
            });
        }

        if (!isDraftSave && !payload.project_name) {
            return res.status(400).json({ message: 'Project name is required.' });
        }
        if (!isDraftSave && !payload.customer_snapshot?.name) {
            return res.status(400).json({ message: 'Customer name is required.' });
        }
        if (!isDraftSave && (!Array.isArray(payload.items) || payload.items.length === 0)) {
            return res.status(400).json({ message: 'At least one quotation item is required.' });
        }

        const isUpdate = req.body.isUpdate === true || req.body.isUpdate === 'true';
        let quotation: any = null;
        if (isUpdate && incomingId) {
            quotation = await QuotationModel.findOne({ $or: [{ quotation_no: incomingId }, { quotation_id: incomingId }] } as any);
        }

        if (!quotation) {
            // Always generate next ID server-side for new quotations
            const newId = await generateNextId('quotation');
            quotation = new QuotationModel({ ...payload, quotation_no: newId });
        } else {
            if (quotation.quotation_status === 'Converted') {
                return res.status(409).json({ message: 'Converted quotations cannot be edited.' });
            }
            // Keep quotation_no immutable: ignore payload or incomingId override
            Object.assign(quotation, payload, { quotation_no: quotation.quotation_no });
        }

        quotation.schema_version = QUOTATION_SCHEMA_VERSION;
        quotation.is_deleted = false;
        quotation.deletion = { ...(quotation.deletion || {}), is_deleted: false };

        const savedQuotation = await quotation.save();

        const normalized = normalizeQuotationDocument(savedQuotation);
        return res.status(201).json({
            message: 'Quotation saved successfully',
            quotation: normalized,
            quotation_no: normalized.quotation_no,
            quotation_id: normalized.quotation_no,
        });
    } catch (error: unknown) {
        logger.error('Error saving quotation:', error);
        return res.status(500).json({ message: 'Internal server error', error: (error as Error).message });
    }
});

router.get("/recent-quotations", async (req: Request, res: Response) => {
    try {
        await expireStaleQuotations();
        const query = req.query.status === 'archived'
            ? { 'deletion.is_deleted': { $ne: true }, is_deleted: { $ne: true }, is_archived: true }
            : activeQuotationQuery();
        const recentQuotations = await QuotationModel.find(query)
            .populate('customer_id', 'customer_type')
            .sort({ createdAt: -1 })
            .limit(25)
            .lean();

        return res.status(200).json({
            message: "Recent quotations retrieved successfully",
            quotation: recentQuotations.map(normalizeQuotationDocument),
        });
    } catch (error: unknown) {
        logger.error("Error retrieving recent quotations:", error);
        return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

router.patch("/:quotationId/status", async (req: Request, res: Response) => {
    try {
        const status = req.body.quotation_status || req.body.status;
        if (!QUOTATION_STATUSES.includes(status)) {
            return res.status(400).json({ message: 'Invalid quotation status.' });
        }
        const quotation = await QuotationModel.findOneAndUpdate(
            activeQuotationQuery({ quotation_no: req.params.quotationId }),
            { $set: { quotation_status: status } },
            { returnDocument: "after" }
        );
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
        return res.status(200).json({ quotation: normalizeQuotationDocument(quotation) });
    } catch (error: unknown) {
        logger.error("Error updating quotation status:", error);
        return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

router.put("/:quotationId/archive", async (req: Request, res: Response) => {
    try {
        const quotation = await QuotationModel.findOneAndUpdate(
            activeQuotationQuery({ quotation_no: req.params.quotationId }),
            { $set: { is_archived: true } },
            { returnDocument: "after" }
        );
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
        return res.status(200).json({ message: 'Quotation archived successfully', quotation: normalizeQuotationDocument(quotation) });
    } catch (error: unknown) {
        logger.error("Error archiving quotation:", error);
        return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

router.put("/:quotationId/restore-from-archive", async (req: Request, res: Response) => {
    try {
        const quotation = await QuotationModel.findOneAndUpdate(
            { quotation_no: req.params.quotationId, is_archived: true, is_deleted: { $ne: true }, 'deletion.is_deleted': { $ne: true } },
            { $set: { is_archived: false } },
            { returnDocument: "after" }
        );
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
        return res.status(200).json({ message: 'Quotation restored from archive successfully', quotation: normalizeQuotationDocument(quotation) });
    } catch (error: unknown) {
        logger.error("Error restoring quotation from archive:", error);
        return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

router.post("/:quotationId/convert-to-invoice", async (req: Request, res: Response) => {
    try {
        const quotation = await QuotationModel.findOne(activeQuotationQuery({ quotation_no: req.params.quotationId }));
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
        if ((quotation as any).converted_invoice_id || quotation.quotation_status === 'Converted') {
            return res.status(409).json({ message: 'Quotation has already been converted.', converted_invoice_id: (quotation as any).converted_invoice_id });
        }
        if (quotation.quotation_status !== 'Approved') {
            return res.status(400).json({ message: 'Only approved quotations can be converted to invoices.' });
        }

        const normalized = normalizeQuotationDocument(quotation);
        const invoiceNo = await generateNextId('invoice');
        const invoice = new InvoiceModel({
            schema_version: 2,
            invoice_no: invoiceNo,
            quotation_id: quotation._id,
            project_name: normalized.project_name,
            invoice_date: req.body.invoice_date || new Date(),
            invoice_status: 'Draft',
            customer_id: normalized.customer_id,
            customer_snapshot: normalized.customer_snapshot,
            items_original: normalized.items,
            items_duplicate: normalized.items,
            other_charges: normalized.other_charges?.[0],
            discount: normalized.discount,
            totals_original: normalized.totals,
            totals_duplicate: normalized.totals,
            content: {
                declaration: '',
                terms_and_conditions: normalized.content?.terms_and_conditions || '',
            },
        });
        const savedInvoice = await invoice.save();

        quotation.quotation_status = 'Converted';
        (quotation as any).converted_invoice_id = savedInvoice._id;
        await quotation.save();

        return res.status(201).json({
            message: 'Quotation converted to invoice successfully',
            quotation: normalizeQuotationDocument(quotation),
            invoice: savedInvoice,
            invoice_no: invoiceNo,
            invoice_id: invoiceNo,
        });
    } catch (error: unknown) {
        logger.error("Error converting quotation:", error);
        return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

router.post("/:quotationId/restore", async (req: Request, res: Response) => {
    try {
        const quotation = await QuotationModel.findOneAndUpdate(
            { quotation_no: req.params.quotationId },
            {
                $set: {
                    is_deleted: false,
                    'deletion.is_deleted': false,
                },
                $unset: {
                    deleted_at: 1,
                    deleted_by: 1,
                    'deletion.deleted_at': 1,
                    'deletion.deleted_by': 1,
                },
            },
            { returnDocument: "after" }
        );
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
        return res.status(200).json({ message: 'Quotation restored successfully', quotation: normalizeQuotationDocument(quotation) });
    } catch (error: unknown) {
        logger.error("Error restoring quotation:", error);
        return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

router.get('/search/:query', async (req: Request, res: Response) => {
    const { query } = req.params;
    if (!query) return res.status(400).send('Query parameter is required.');

    try {
        await expireStaleQuotations();
        const regex = { $regex: query, $options: 'i' };
        const quotations = await QuotationModel.find(activeQuotationQuery({
            $or: [
                { quotation_no: regex },
                { quotation_id: regex } as any,
                { project_name: regex },
                { quotation_status: regex },
                { 'customer_snapshot.name': regex },
                { 'customer_snapshot.phone': regex },
                { 'customer_snapshot.email': regex },
            ],
        })).populate('customer_id', 'customer_type').lean();

        if (quotations.length === 0) return res.status(404).send('No quotations found.');
        return res.status(200).json({ quotation: quotations.map(normalizeQuotationDocument) });
    } catch (err: unknown) {
        logger.error(err);
        return res.status(500).send('Failed to fetch quotations.');
    }
});

// Get all soft-deleted (trashed) quotations — MUST be before /:quotationId
router.get("/trash", async (_req: Request, res: Response) => {
    try {
        const deleted = await QuotationModel.find({
            $or: [
                { 'deletion.is_deleted': true },
                { is_deleted: true },
            ],
        }).populate('customer_id', 'customer_type').sort({ 'deletion.deleted_at': -1 }).lean();
        return res.status(200).json({ quotation: deleted.map(normalizeQuotationDocument) });
    } catch (error: unknown) {
        logger.error("Error fetching trashed quotations:", error);
        return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Let the view router handle /quotation/details and /quotation/form — must be BEFORE /:quotationId wildcard
router.get('/details', (_req: Request, _res: Response, next: Function) => next('router'));
router.get('/form', (_req: Request, _res: Response, next: Function) => next('router'));

router.get("/:quotationId", async (req: Request, res: Response) => {
    try {
        const { quotationId } = req.params;
        if (!quotationId) return res.status(400).json({ message: 'Quotation ID is required.' });

        await expireStaleQuotations();
        const quotation = await QuotationModel.findOne({ $or: [{ quotation_no: quotationId }, { quotation_id: quotationId }] } as any);
        if (!quotation) {
            return res.status(404).json({ message: 'Quotation not found' });
        }

        return res.status(200).json({
            message: "Quotation retrieved successfully",
            quotation: normalizeQuotationDocument(quotation),
        });
    } catch (error: unknown) {
        logger.error("Error retrieving quotation:", error);
        return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Restore all soft-deleted quotations
router.post("/trash/restore-all", async (_req: Request, res: Response) => {
    try {
        const result = await QuotationModel.updateMany(
            { $or: [{ 'deletion.is_deleted': true }, { is_deleted: true }] },
            {
                $set: { is_deleted: false, 'deletion.is_deleted': false },
                $unset: { deleted_at: 1, deleted_by: 1, 'deletion.deleted_at': 1, 'deletion.deleted_by': 1 },
            }
        );
        return res.status(200).json({ message: `Restored ${result.modifiedCount} quotation(s)` });
    } catch (error: unknown) {
        logger.error("Error restoring all quotations:", error);
        return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Permanently delete all trashed quotations
router.delete("/trash", async (_req: Request, res: Response) => {
    try {
        const result = await QuotationModel.deleteMany({
            $or: [{ 'deletion.is_deleted': true }, { is_deleted: true }],
        });
        return res.status(200).json({ message: `Permanently deleted ${result.deletedCount} quotation(s)` });
    } catch (error: unknown) {
        logger.error("Error permanently deleting all quotations:", error);
        return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

// Permanently delete a single trashed quotation
router.delete("/trash/:quotationId", async (req: Request, res: Response) => {
    try {
        const result = await QuotationModel.findOneAndDelete({ quotation_no: req.params.quotationId });
        if (!result) return res.status(404).json({ message: 'Quotation not found in trash' });
        return res.status(200).json({ message: 'Quotation permanently deleted' });
    } catch (error: unknown) {
        logger.error("Error permanently deleting quotation:", error);
        return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

router.delete("/:quotationId", async (req: Request, res: Response) => {
    try {
        const quotation = await QuotationModel.findOneAndUpdate(
            activeQuotationQuery({ quotation_no: req.params.quotationId }),
            {
                $set: {
                    is_deleted: true,
                    deleted_at: new Date(),
                    deleted_by: String(req.body?.deleted_by || req.query.deleted_by || 'Admin'),
                    'deletion.is_deleted': true,
                    'deletion.deleted_at': new Date(),
                    'deletion.deleted_by': String(req.body?.deleted_by || req.query.deleted_by || 'Admin'),
                },
            },
            { returnDocument: "after" }
        );
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
        return res.status(200).json({ message: 'Quotation archived successfully', quotation: normalizeQuotationDocument(quotation) });
    } catch (error: unknown) {
        logger.error("Error deleting quotation:", error);
        return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
});

export default router;
