import { Router, Request, Response } from 'express';
import { PaymentModel, CustomerModel, SupplierModel, InvoiceModel, PurchaseModel, ServiceModel } from '../models';
import { Types } from 'mongoose';
import logger from '../utils/logger';

const router: Router = Router();

type PartyType = 'Customer' | 'Supplier';
type ReferenceType = 'Invoice' | 'Purchase' | 'Service' | 'Adjustment';

async function resolvePartyLink(party_type: string | undefined, partyIdRaw: any) {
    if (!party_type || !partyIdRaw) return undefined;
    const str = String(partyIdRaw || '').trim();
    if (!str) return undefined;

    try {
        if (party_type === 'Customer') {
            const c = Types.ObjectId.isValid(str)
                ? await CustomerModel.findById(str).lean()
                : await CustomerModel.findOne({
                    $or: [
                        { customer_id: str },
                        { 'customer.name': str },
                        { 'customer.phone': str },
                        { 'customer.email': str.toLowerCase() }
                    ]
                }).lean();
            if (c) {
                return {
                    type: party_type as PartyType,
                    id: c.customer_id || str,
                    ref: new Types.ObjectId(c._id)
                };
            }
        } else if (party_type === 'Supplier') {
            const s = Types.ObjectId.isValid(str)
                ? await SupplierModel.findById(str).lean()
                : await SupplierModel.findOne({
                    $or: [
                        { supplier_id: str },
                        { supplier_name: str },
                        { phone: str },
                        { email: str.toLowerCase() }
                    ]
                }).lean();
            if (s) {
                return {
                    type: party_type as PartyType,
                    id: s.supplier_id || str,
                    ref: new Types.ObjectId(s._id)
                };
            }
        }
    } catch (e) {
        logger.warn('resolvePartyLink error', e);
    }

    return { type: party_type as PartyType, id: str };
}

async function resolveReferenceLink(reference_type: string | undefined, referenceIdRaw: any) {
    if (!reference_type) return undefined;
    const str = String(referenceIdRaw || '').trim();
    if (!str) return { type: reference_type as ReferenceType };

    try {
        if (reference_type === 'Invoice') {
            const inv = Types.ObjectId.isValid(str)
                ? await InvoiceModel.findById(str).lean()
                : await InvoiceModel.findOne({ $or: [{ invoice_no: str }, { invoice_id: str }] }).lean();
            if (inv) {
                return {
                    type: reference_type as ReferenceType,
                    id: inv.invoice_id || inv.invoice_no || str,
                    ref: new Types.ObjectId(inv._id)
                };
            }
        } else if (reference_type === 'Purchase') {
            const pu = Types.ObjectId.isValid(str)
                ? await PurchaseModel.findById(str).lean()
                : await PurchaseModel.findOne({ $or: [{ purchase_invoice_no: str }, { purchase_order_no: str }] }).lean();
            if (pu) {
                return {
                    type: reference_type as ReferenceType,
                    id: pu.purchase_order_no || pu.purchase_invoice_no || str,
                    ref: new Types.ObjectId(pu._id)
                };
            }
        } else if (reference_type === 'Service') {
            const sv = Types.ObjectId.isValid(str)
                ? await ServiceModel.findById(str).lean()
                : await ServiceModel.findOne({ $or: [{ service_no: str }] }).lean();
            if (sv) {
                return {
                    type: reference_type as ReferenceType,
                    id: sv.service_no || str,
                    ref: new Types.ObjectId(sv._id)
                };
            }
        } else if (reference_type === 'Adjustment') {
            return { type: reference_type as ReferenceType, id: str || undefined };
        }
    } catch (e) {
        logger.warn('resolveReferenceLink error', e);
    }

    return { type: reference_type as ReferenceType, id: str };
}

function normalizePaymentResponse(payment: any) {
    if (!payment) return payment;
    const obj = typeof payment.toObject === 'function' ? payment.toObject() : { ...payment };
    const partyType = obj.party?.type || obj.party_type;
    const partyRef = obj.party?.ref || obj.party_id;
    const partyId = obj.party?.id;
    const referenceType = obj.reference?.type || obj.reference_type;
    const referenceRef = obj.reference?.ref || obj.reference_id;
    const referenceId = obj.reference?.id;

    return {
        ...obj,
        party_type: partyType,
        party_id: partyRef ? String(partyRef) : undefined,
        party_display_id: partyId,
        reference_type: referenceType,
        reference_id: referenceId || (referenceRef ? String(referenceRef) : undefined),
        reference_ref: referenceRef ? String(referenceRef) : undefined,
    };
}

function normalizePaymentResponses(payments: any[]) {
    return payments.map(normalizePaymentResponse);
}

/**
 * GET /payment/get-parties/:type
 * Fetch party names for suggestions
 */
router.get('/get-parties/:type', async (req: Request, res: Response) => {
    try {
        const type = req.params.type; // 'Customer' or 'Supplier'
        let parties: any[] = [];

        if (type === 'Customer') {
            parties = await CustomerModel.find({ 'deletion.is_deleted': { $ne: true } }, { 'customer.name': 1, _id: 1 }).lean();
            res.json(parties.map(p => ({ id: p._id, name: p.customer.name })));
        } else if (type === 'Supplier') {
            parties = await SupplierModel.find({ 'deletion.is_deleted': { $ne: true } }, { 'supplier_name': 1, _id: 1 }).lean();
            res.json(parties.map(p => ({ id: p._id, name: p.supplier_name })));
        } else {
            res.status(400).json({ success: false, message: 'Invalid party type' });
        }
    } catch (error: unknown) {
        logger.error('Error fetching parties:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * GET /payment/get-party-details/:type/:partyName
 * Fetch details for a specific party
 */
router.get('/get-party-details/:type/:partyName', async (req: Request, res: Response) => {
    try {
        const { type, partyName } = req.params;
        let party: any = null;

        if (type === 'Customer') {
            party = await CustomerModel.findOne({
                'customer.name': partyName,
                'deletion.is_deleted': { $ne: true }
            }).lean();
        } else if (type === 'Supplier') {
            party = await SupplierModel.findOne({
                'supplier_name': partyName,
                'deletion.is_deleted': { $ne: true }
            }).lean();
        }

        if (!party) {
            return res.status(404).json({ success: false, message: 'Party not found' });
        }

        res.json({ success: true, party });
    } catch (error: unknown) {
        logger.error('Error fetching party details:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * GET /payment/all
 * Fetch all non-deleted payments, newest first
 */
router.get('/all', async (req: Request, res: Response) => {
    try {
        const payments = await PaymentModel.find({
            'deletion.is_deleted': { $ne: true }
        }).sort({ payment_date: -1 }).lean();
        res.status(200).json({ success: true, payments: normalizePaymentResponses(payments) });
    } catch (error: unknown) {
        logger.error('Error fetching payments:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * GET /payment/summary
 * Aggregate stats: total in, total out, balance, counts by mode
 */
router.get('/summary', async (req: Request, res: Response) => {
    try {
        const payments = await PaymentModel.find({
            'deletion.is_deleted': { $ne: true }
        }).lean() as any[];

        const totalIn = payments
            .filter(p => p.direction === 'IN')
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        const totalOut = payments
            .filter(p => p.direction === 'OUT')
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        const modeBreakdown: Record<string, { count: number; total: number }> = {};
        for (const p of payments) {
            if (!modeBreakdown[p.mode]) {
                modeBreakdown[p.mode] = { count: 0, total: 0 };
            }
            modeBreakdown[p.mode].count++;
            modeBreakdown[p.mode].total += p.amount || 0;
        }

        res.status(200).json({
            success: true,
            summary: {
                totalIn,
                totalOut,
                netBalance: totalIn - totalOut,
                totalPayments: payments.length,
                modeBreakdown
            }
        });
    } catch (error: unknown) {
        logger.error('Error fetching payment summary:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * GET /payment/search/:query
 * Search by remarks, transaction_details, party_type, reference_type
 */
router.get('/search/:query', async (req: Request, res: Response) => {
    try {
        const query = req.params.query;
        const payments = await PaymentModel.find({
            'deletion.is_deleted': { $ne: true },
            $or: [
                { remarks: { $regex: query, $options: 'i' } },
                { transaction_details: { $regex: query, $options: 'i' } },
                { 'party.type': { $regex: query, $options: 'i' } },
                { 'party.id': { $regex: query, $options: 'i' } },
                { 'reference.type': { $regex: query, $options: 'i' } },
                { 'reference.id': { $regex: query, $options: 'i' } },
                { party_type: { $regex: query, $options: 'i' } },
                { reference_type: { $regex: query, $options: 'i' } },
                { mode: { $regex: query, $options: 'i' } },
                { direction: { $regex: query, $options: 'i' } }
            ]
        } as any).sort({ payment_date: -1 }).lean();
        res.status(200).json({ success: true, payments: normalizePaymentResponses(payments) });
    } catch (error: unknown) {
        logger.error('Error searching payments:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * GET /payment/:id
 * Get single payment by MongoDB _id
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const payment = await PaymentModel.findById(req.params.id).lean();
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        res.status(200).json({ success: true, payment: normalizePaymentResponse(payment) });
    } catch (error: unknown) {
        logger.error('Error fetching payment:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * POST /payment/create
 * Create a new payment record
 */
router.post('/create', async (req: Request, res: Response) => {
    try {
        const {
            payment_date,
            amount,
            direction,
            party_type,
            party_id,
            reference_type,
            reference_id,
            mode,
            transaction_details,
            is_advance,
            remarks
        } = req.body;

        if (!amount || !direction || !mode) {
            return res.status(400).json({
                success: false,
                message: 'Amount, direction, and mode are required'
            });
        }

        const party = await resolvePartyLink(party_type, party_id);
        const reference = await resolveReferenceLink(reference_type, reference_id);

        const payment = new PaymentModel({
            payment_date: payment_date || new Date(),
            amount: Number(amount),
            direction,
            party,
            reference,
            mode,
            transaction_details: transaction_details || undefined,
            is_advance: is_advance || false,
            remarks: remarks || undefined
        } as any);
        await payment.save();

        logger.info('Payment created', { paymentId: payment._id, direction, amount, mode });
        res.status(201).json({ success: true, message: 'Payment created successfully', payment: normalizePaymentResponse(payment) });
    } catch (error: unknown) {
        logger.error('Error creating payment:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * PUT /payment/:id
 * Update an existing payment
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const payment = await PaymentModel.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        const {
            payment_date,
            amount,
            direction,
            party_type,
            party_id,
            reference_type,
            reference_id,
            mode,
            transaction_details,
            is_advance,
            remarks
        } = req.body;

        if (payment_date !== undefined) payment.payment_date = payment_date;
        if (amount !== undefined) payment.amount = Number(amount);
        if (direction !== undefined) payment.direction = direction;
        if (party_type !== undefined || party_id !== undefined) {
            const nextPartyType = party_type !== undefined
                ? party_type
                : ((payment as any).party?.type || (payment as any).party_type);
            const nextPartyId = party_id !== undefined
                ? party_id
                : ((payment as any).party?.ref || (payment as any).party?.id || (payment as any).party_id);
            (payment as any).party = await resolvePartyLink(nextPartyType, nextPartyId);
        }
        if (reference_type !== undefined || reference_id !== undefined) {
            const nextReferenceType = reference_type !== undefined
                ? reference_type
                : ((payment as any).reference?.type || (payment as any).reference_type);
            const nextReferenceId = reference_id !== undefined
                ? reference_id
                : ((payment as any).reference?.id || (payment as any).reference?.ref || (payment as any).reference_id);
            (payment as any).reference = await resolveReferenceLink(nextReferenceType, nextReferenceId);
        }
        if (mode !== undefined) payment.mode = mode;
        if (transaction_details !== undefined) (payment as any).transaction_details = transaction_details || undefined;
        if (is_advance !== undefined) payment.is_advance = is_advance;
        if (remarks !== undefined) (payment as any).remarks = remarks || undefined;

        await payment.save();

        logger.info('Payment updated', { paymentId: payment._id });
        res.status(200).json({ success: true, message: 'Payment updated successfully', payment: normalizePaymentResponse(payment) });
    } catch (error: unknown) {
        logger.error('Error updating payment:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * DELETE /payment/:id
 * Soft-delete a payment
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const payment = await PaymentModel.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        payment.deletion = {
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: 'admin'
        };
        await payment.save();

        logger.info('Payment soft-deleted', { paymentId: payment._id });
        res.status(200).json({ success: true, message: 'Payment deleted successfully' });
    } catch (error: unknown) {
        logger.error('Error deleting payment:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.get('/get-party-details-by-id/:type/:id', async (req: Request, res: Response) => {
    try {
        const { type, id } = req.params;
        let party: any = null;

        if (type === 'Customer') {
            party = await CustomerModel.findById(id).lean();
        } else if (type === 'Supplier') {
            party = await SupplierModel.findById(id).lean();
        }

        if (party) {
            res.json({ success: true, party });
        } else {
            res.status(404).json({ success: false, message: 'Party not found' });
        }
    } catch (error: unknown) {
        logger.error('Error fetching party details by ID:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

export default router;
