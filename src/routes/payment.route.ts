import { Router, Request, Response, NextFunction } from 'express';
import { PaymentModel, CustomerModel, SupplierModel, InvoiceModel, PurchaseModel, PurchaseOrderModel, ServiceModel } from '../models';
import { Types } from 'mongoose';
import logger from '../utils/logger';
import { syncReferencePayments } from '../utils/paymentSync';

const router: Router = Router();

type PartyType = 'Customer' | 'Supplier';
type ReferenceType = 'Invoice' | 'Purchase' | 'PurchaseOrder' | 'Service' | 'Adjustment';

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
                : await PurchaseModel.findOne({ $or: [{ purchase_invoice_no: str }, { purchase_no: str }] }).lean();
            if (pu) {
                return {
                    type: reference_type as ReferenceType,
                    id: pu.purchase_no || pu.purchase_invoice_no || str,
                    ref: new Types.ObjectId(pu._id)
                };
            }
        } else if (reference_type === 'PurchaseOrder') {
            const pu = Types.ObjectId.isValid(str)
                ? await PurchaseOrderModel.findById(str).lean()
                : await PurchaseOrderModel.findOne({ $or: [{ purchase_invoice_no: str }, { purchase_order_no: str }] }).lean();
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

function normalizePaymentResponse(
    payment: any, 
    customerMap?: Map<string, any>, 
    supplierMap?: Map<string, any>,
    invoiceMap?: Map<string, any>,
    purchaseMap?: Map<string, any>,
    serviceMap?: Map<string, any>
) {
    if (!payment) return payment;
    const obj = typeof payment.toObject === 'function' ? payment.toObject() : { ...payment };
    let partyType = obj.party?.type || obj.party_type;
    let partyRef = obj.party?.ref || obj.party_id;
    let partyId = obj.party?.id || obj.party_display_id;
    const referenceType = obj.reference?.type || obj.reference_type;
    const referenceRef = obj.reference?.ref || obj.reference_id;
    const referenceId = obj.reference?.id;

    // Dynamically resolve party from reference if it is missing
    if (!partyRef && referenceRef) {
        if (referenceType === 'Invoice' && invoiceMap) {
            const inv = invoiceMap.get(referenceRef.toString());
            if (inv && inv.customer_id) {
                partyType = 'Customer';
                partyRef = inv.customer_id;
            }
        } else if ((referenceType === 'Purchase' || referenceType === 'PurchaseOrder') && purchaseMap) {
            const pu = purchaseMap.get(referenceRef.toString());
            if (pu && pu.supplier_id) {
                partyType = 'Supplier';
                partyRef = pu.supplier_id;
            }
        } else if (referenceType === 'Service' && serviceMap && invoiceMap) {
            const sv = serviceMap.get(referenceRef.toString());
            if (sv && sv.invoice_id) {
                const inv = invoiceMap.get(sv.invoice_id.toString());
                if (inv && inv.customer_id) {
                    partyType = 'Customer';
                    partyRef = inv.customer_id;
                }
            }
        }
    }

    let partyName = undefined;
    if (partyType === 'Customer' && partyRef && customerMap) {
        const c = customerMap.get(partyRef.toString());
        if (c) {
            partyName = c.customer?.name;
            if (!partyId) partyId = c.customer_id;
        }
    } else if (partyType === 'Supplier' && partyRef && supplierMap) {
        const s = supplierMap.get(partyRef.toString());
        if (s) {
            partyName = s.supplier_name;
            if (!partyId) partyId = s.supplier_id;
        }
    }

    return {
        ...obj,
        party_type: partyType,
        party_id: partyRef ? String(partyRef) : undefined,
        party_display_id: partyId,
        party_name: partyName,
        reference_type: referenceType,
        reference_id: referenceId || (referenceRef ? String(referenceRef) : undefined),
        reference_ref: referenceRef ? String(referenceRef) : undefined,
    };
}

async function enrichSinglePayment(payment: any) {
    if (!payment) return payment;
    const obj = typeof payment.toObject === 'function' ? payment.toObject() : { ...payment };
    let partyType = obj.party?.type || obj.party_type;
    let partyRef = obj.party?.ref || obj.party_id;
    let partyId = obj.party?.id || obj.party_display_id;
    const referenceType = obj.reference?.type || obj.reference_type;
    const referenceRef = obj.reference?.ref || obj.reference_id;

    // Dynamically resolve party from reference if it is missing
    if (!partyRef && referenceRef) {
        if (referenceType === 'Invoice') {
            const inv = await InvoiceModel.findById(referenceRef, { customer_id: 1 }).lean();
            if (inv && inv.customer_id) {
                partyType = 'Customer';
                partyRef = inv.customer_id;
            }
        } else if (referenceType === 'Purchase') {
            const pu = await PurchaseModel.findById(referenceRef, { supplier_id: 1 }).lean();
            if (pu && pu.supplier_id) {
                partyType = 'Supplier';
                partyRef = pu.supplier_id;
            }
        } else if (referenceType === 'PurchaseOrder') {
            const pu = await PurchaseOrderModel.findById(referenceRef, { supplier_id: 1 }).lean();
            if (pu && pu.supplier_id) {
                partyType = 'Supplier';
                partyRef = pu.supplier_id;
            }
        } else if (referenceType === 'Service') {
            const sv = await ServiceModel.findById(referenceRef, { invoice_id: 1 }).lean();
            if (sv && sv.invoice_id) {
                const inv = await InvoiceModel.findById(sv.invoice_id, { customer_id: 1 }).lean();
                if (inv && inv.customer_id) {
                    partyType = 'Customer';
                    partyRef = inv.customer_id;
                }
            }
        }
    }

    let partyName = undefined;
    if (partyType === 'Customer' && partyRef) {
        const c = await CustomerModel.findById(partyRef, { 'customer.name': 1, customer_id: 1 }).lean();
        if (c) {
            partyName = c.customer?.name;
            if (!partyId) partyId = c.customer_id;
        }
    } else if (partyType === 'Supplier' && partyRef) {
        const s = await SupplierModel.findById(partyRef, { supplier_name: 1, supplier_id: 1 }).lean();
        if (s) {
            partyName = s.supplier_name;
            if (!partyId) partyId = s.supplier_id;
        }
    }

    const norm = normalizePaymentResponse(obj);
    norm.party_type = partyType;
    norm.party_id = partyRef ? String(partyRef) : undefined;
    norm.party_display_id = partyId;
    norm.party_name = partyName;

    // Check if this payment is already refunded by an active refund payment
    const refunds = await PaymentModel.find({
        refunded_payment_ref: payment._id,
        is_refund: true,
        'deletion.is_deleted': { $ne: true }
    }, { _id: 1, amount: 1 }).lean();
    
    const refundSum = refunds.reduce((sum, r) => sum + (r.amount || 0), 0);
    norm.is_already_refunded = refundSum > 0;
    if (refunds.length > 0) {
        norm.refund_payment_id = String(refunds[0]._id);
    }
    
    if (norm.status !== 'Cancelled' && norm.status !== 'Failed') {
        if (refundSum >= norm.amount) {
            norm.status = 'Refunded';
        } else if (refundSum > 0) {
            norm.status = 'Partially Refunded';
        }
    }
    
    return norm;
}

async function normalizePaymentResponses(payments: any[]) {
    const paymentIds = payments.map(p => p._id);
    const activeRefunds = await PaymentModel.find({
        refunded_payment_ref: { $in: paymentIds },
        is_refund: true,
        'deletion.is_deleted': { $ne: true }
    }, { refunded_payment_ref: 1, amount: 1 }).lean();
    
    const refundMap = new Map<string, number>();
    for (const r of activeRefunds) {
        if (r.refunded_payment_ref) {
            const refStr = r.refunded_payment_ref.toString();
            refundMap.set(refStr, (refundMap.get(refStr) || 0) + (r.amount || 0));
        }
    }
    
    const customers = await CustomerModel.find({}, { 'customer.name': 1, customer_id: 1 }).lean();
    const suppliers = await SupplierModel.find({}, { supplier_name: 1, supplier_id: 1 }).lean();
    const customerMap = new Map(customers.map(c => [c._id.toString(), c]));
    const supplierMap = new Map(suppliers.map(s => [s._id.toString(), s]));

    const invoices = await InvoiceModel.find({}, { customer_id: 1 }).lean();
    const purchases = await PurchaseModel.find({}, { supplier_id: 1 }).lean();
    const purchaseOrders = await PurchaseOrderModel.find({}, { supplier_id: 1 }).lean();
    const services = await ServiceModel.find({}, { invoice_id: 1 }).lean();

    const invoiceMap = new Map(invoices.map(i => [i._id.toString(), i] as [string, any]));
    const purchaseMap = new Map<string, any>([
        ...purchases.map(p => [p._id.toString(), p] as [string, any]),
        ...purchaseOrders.map(po => [po._id.toString(), po] as [string, any])
    ]);
    const serviceMap = new Map(services.map(s => [s._id.toString(), s] as [string, any]));

    return payments.map(p => {
        const norm = normalizePaymentResponse(p, customerMap, supplierMap, invoiceMap, purchaseMap, serviceMap);
        const refStr = p._id.toString();
        const refundSum = refundMap.get(refStr) || 0;
        norm.is_already_refunded = refundSum > 0;
        
        if (norm.status !== 'Cancelled' && norm.status !== 'Failed') {
            if (refundSum >= norm.amount) {
                norm.status = 'Refunded';
            } else if (refundSum > 0) {
                norm.status = 'Partially Refunded';
            }
        }
        return norm;
    });
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
            parties = await CustomerModel.find(
                { 'deletion.is_deleted': { $ne: true } },
                { 'customer.name': 1, 'customer.first_name': 1, 'customer.last_name': 1, 'customer.phone': 1, 'customer.email': 1, gstin: 1, _id: 1 }
            ).lean();
            res.json(parties.map(p => {
                const c = p.customer || {};
                const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ');
                return {
                    id: p._id,
                    name: c.name || fullName || 'Unnamed Customer',
                    phone: c.phone || '',
                    email: c.email || '',
                    gstin: p.gstin || ''
                };
            }));
        } else if (type === 'Supplier') {
            parties = await SupplierModel.find(
                { 'deletion.is_deleted': { $ne: true } },
                { 'supplier_name': 1, 'phone': 1, 'email': 1, 'gstin': 1, _id: 1 }
            ).lean();
            res.json(parties.map(p => ({
                id: p._id,
                name: p.supplier_name || 'Unnamed Supplier',
                phone: p.phone || '',
                email: p.email || '',
                gstin: p.gstin || ''
            })));
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
        res.status(200).json({ success: true, payments: await normalizePaymentResponses(payments) });
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
        res.status(200).json({ success: true, payments: await normalizePaymentResponses(payments) });
    } catch (error: unknown) {
        logger.error('Error searching payments:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * GET /payment/:id
 * Get single payment by MongoDB _id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const paramId = String(req.params.id || '');
    if (!Types.ObjectId.isValid(paramId)) {
        return next();
    }
    try {
        const payment = await PaymentModel.findById(paramId).lean();
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        res.status(200).json({ success: true, payment: await enrichSinglePayment(payment) });
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
            is_refund,
            refunded_payment_ref,
            remarks,
            status
        } = req.body;

        if (!amount || !direction || !mode) {
            return res.status(400).json({
                success: false,
                message: 'Amount, direction, and mode are required'
            });
        }

        if (is_refund && refunded_payment_ref) {
            const existingRefund = await PaymentModel.findOne({
                refunded_payment_ref,
                is_refund: true,
                'deletion.is_deleted': { $ne: true }
            });
            if (existingRefund) {
                return res.status(400).json({
                    success: false,
                    message: 'This payment has already been refunded'
                });
            }
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
            is_refund: is_refund || false,
            refunded_payment_ref: refunded_payment_ref || undefined,
            remarks: remarks || undefined,
            status: status || 'Completed'
        } as any);
        await payment.save();

        if (payment.reference?.type && payment.reference?.ref) {
            await syncReferencePayments(payment.reference.type as any, payment.reference.ref);
        }

        logger.info('Payment created', { paymentId: payment._id, direction, amount, mode });
        res.status(201).json({ success: true, message: 'Payment created successfully', payment: await enrichSinglePayment(payment) });
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
            is_refund,
            refunded_payment_ref,
            remarks,
            status
        } = req.body;

        const oldReferenceType = (payment as any).reference?.type;
        const oldReferenceRef = (payment as any).reference?.ref;

        if (is_refund && refunded_payment_ref) {
            const existingRefund = await PaymentModel.findOne({
                refunded_payment_ref,
                is_refund: true,
                _id: { $ne: new Types.ObjectId(req.params.id as string) },
                'deletion.is_deleted': { $ne: true }
            });
            if (existingRefund) {
                return res.status(400).json({
                    success: false,
                    message: 'This payment has already been refunded'
                });
            }
        }

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
        if (is_refund !== undefined) payment.is_refund = is_refund;
        if (refunded_payment_ref !== undefined) (payment as any).refunded_payment_ref = refunded_payment_ref || undefined;
        if (remarks !== undefined) (payment as any).remarks = remarks || undefined;
        if (status !== undefined) (payment as any).status = status;

        await payment.save();

        // Sync new reference
        if (payment.reference?.type && payment.reference?.ref) {
            await syncReferencePayments(payment.reference.type as any, payment.reference.ref);
        }

        // Sync old reference if it changed
        if (oldReferenceType && oldReferenceRef && (String(oldReferenceType) !== String(payment.reference?.type) || String(oldReferenceRef) !== String(payment.reference?.ref))) {
            await syncReferencePayments(oldReferenceType as any, oldReferenceRef);
        }

        logger.info('Payment updated', { paymentId: payment._id });
        res.status(200).json({ success: true, message: 'Payment updated successfully', payment: await enrichSinglePayment(payment) });
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

        if (payment.reference?.type && payment.reference?.ref) {
            await syncReferencePayments(payment.reference.type as any, payment.reference.ref);
        }

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

router.get('/get-reference-details/:type/:id', async (req: Request, res: Response) => {
    try {
        const type = String(req.params.type);
        const id = String(req.params.id);
        let details: any = null;

        const isObjectId = Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id;

        if (type === 'Invoice') {
            details = isObjectId
                ? await InvoiceModel.findById(id).lean()
                : await InvoiceModel.findOne({ $or: [{ invoice_id: id }, { invoice_no: id }] }).lean();
        } else if (type === 'Purchase') {
            details = isObjectId
                ? await PurchaseModel.findById(id).lean()
                : await PurchaseModel.findOne({ $or: [{ purchase_no: id }, { purchase_invoice_no: id }] }).lean();
        } else if (type === 'PurchaseOrder') {
            details = isObjectId
                ? await PurchaseOrderModel.findById(id).lean()
                : await PurchaseOrderModel.findOne({ $or: [{ purchase_order_no: id }, { purchase_invoice_no: id }] }).lean();
        } else if (type === 'Service') {
            details = isObjectId
                ? await ServiceModel.findById(id).lean()
                : await ServiceModel.findOne({ $or: [{ service_no: id }, { service_id: id }] }).lean();
        }

        if (details) {
            res.json({ success: true, details });
        } else {
            res.status(404).json({ success: false, message: 'Reference not found' });
        }
    } catch (error: unknown) {
        logger.error('Error fetching reference details:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

export default router;
