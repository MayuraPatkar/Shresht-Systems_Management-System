import { Router, Request, Response, NextFunction } from 'express';
import { PaymentModel, CustomerModel, SupplierModel, VoucherModel, AdminModel, CounterModel } from '../models';
import { Types } from 'mongoose';
import logger from '../utils/logger';

const router: Router = Router();

type PartyType = 'Customer' | 'Supplier';

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

/**
 * GET /voucher/next-number
 * Get the next voucher number preview
 */
router.get('/next-number', async (req: Request, res: Response) => {
    try {
        const year = new Date().getFullYear();
        const counterId = `voucher-${year}`;
        const docDay = await CounterModel.findOne({ _id: counterId }).lean();
        const seq = docDay && typeof docDay.seq === 'number' ? docDay.seq + 1 : 1;
        const voucherNumber = `PV-${year}-${String(seq).padStart(4, '0')}`;
        res.status(200).json({ success: true, voucherNumber });
    } catch (error: unknown) {
        logger.error('Error previewing voucher number:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * GET /voucher/list
 * Get list of vouchers with optional filters
 */
router.get('/list', async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, voucherNumber, paymentMethod, partyType, partyName, amountMin, amountMax, paidTowards } = req.query;
        const filter: any = { is_deleted: { $ne: true } };

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate as string);
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                filter.date.$lte = end;
            }
        }
        if (voucherNumber) {
            filter.voucherNumber = { $regex: voucherNumber as string, $options: 'i' };
        }
        if (paymentMethod) {
            filter.paymentMethod = paymentMethod as string;
        }
        if (partyType) {
            filter.partyType = partyType as string;
        }
        if (partyName) {
            filter.partyName = { $regex: partyName as string, $options: 'i' };
        }
        if (amountMin !== undefined && amountMin !== '') {
            filter.amount = filter.amount || {};
            filter.amount.$gte = Number(amountMin);
        }
        if (amountMax !== undefined && amountMax !== '') {
            filter.amount = filter.amount || {};
            filter.amount.$lte = Number(amountMax);
        }
        if (paidTowards) {
            filter.paidTowards = { $regex: paidTowards as string, $options: 'i' };
        }

        const vouchers = await VoucherModel.find(filter).sort({ date: -1, createdAt: -1 }).lean();
        res.status(200).json({ success: true, vouchers });
    } catch (error: unknown) {
        logger.error('Error listing vouchers:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * GET /voucher/by-no/:no
 * Get voucher by its voucherNumber
 */
router.get('/by-no/:no', async (req: Request, res: Response) => {
    try {
        const voucher = await VoucherModel.findOne({
            voucherNumber: req.params.no,
            is_deleted: { $ne: true }
        }).lean();

        if (!voucher) {
            return res.status(404).json({ success: false, message: 'Voucher not found' });
        }

        const admin = await AdminModel.findOne().lean() as any;
        const companyInfo = {
            name: admin?.company_name || 'Shresht Systems',
            address: admin?.address ? [admin.address.line1, admin.address.line2, admin.address.city, admin.address.state, admin.address.pincode].filter(Boolean).join(', ') : '',
            phone: admin?.phone?.ph1 || '',
            email: admin?.email || '',
            gstin: admin?.gstin || '',
            website: admin?.website || ''
        };

        res.status(200).json({ success: true, voucher, company: companyInfo });
    } catch (error: unknown) {
        logger.error('Error fetching voucher by number:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * GET /voucher/:id
 * Get voucher by MongoDB ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    // Let the page router handle /voucher/form and /voucher/details instead of
    // attempting to cast those reserved page names to MongoDB ObjectIds.
    const voucherId = String(req.params.id);
    if (!Types.ObjectId.isValid(voucherId)) return next();

    try {
        const voucher = await VoucherModel.findById(voucherId).lean();
        if (!voucher || (voucher as any).is_deleted) {
            return res.status(404).json({ success: false, message: 'Voucher not found' });
        }

        const admin = await AdminModel.findOne().lean() as any;
        const companyInfo = {
            name: admin?.company_name || 'Shresht Systems',
            address: admin?.address ? [admin.address.line1, admin.address.line2, admin.address.city, admin.address.state, admin.address.pincode].filter(Boolean).join(', ') : '',
            phone: admin?.phone?.ph1 || '',
            email: admin?.email || '',
            gstin: admin?.gstin || '',
            website: admin?.website || ''
        };

        res.status(200).json({ success: true, voucher, company: companyInfo });
    } catch (error: unknown) {
        logger.error('Error fetching voucher by ID:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * POST /voucher/create
 * Create a new voucher, and create a corresponding Payment transaction
 */
router.post('/create', async (req: Request, res: Response) => {
    try {
        const {
            date,
            partyName,
            partyType,
            amount,
            amountInWords,
            paymentMethod,
            chequeNumber,
            bankName,
            chequeDate,
            referenceNumber,
            paidTowards,
            createdBy
        } = req.body;

        if (!partyName || !partyType || !amount || !paymentMethod || !paidTowards) {
            return res.status(400).json({ success: false, message: 'Missing required voucher fields' });
        }

        // 1. Generate unique auto-incrementing Voucher Number
        const dateObj = date ? new Date(date) : new Date();
        const voucherYear = dateObj.getFullYear();
        const counterId = `voucher-${voucherYear}`;
        const counterDoc = await CounterModel.findOneAndUpdate(
            { _id: counterId },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        const seqNum = counterDoc.seq;
        const voucherNumber = `PV-${voucherYear}-${String(seqNum).padStart(4, '0')}`;

        // 2. Resolve party link for Payment transaction
        let partyLink: any = undefined;
        if (partyType === 'Customer' || partyType === 'Supplier') {
            partyLink = await resolvePartyLink(partyType, partyName);
        }

        // 3. Construct transaction details for Payment
        let transactionDetails = '';
        if (paymentMethod === 'Cheque') {
            transactionDetails = `Cheque No: ${chequeNumber || ''}, Bank: ${bankName || ''}${chequeDate ? ', Date: ' + new Date(chequeDate).toLocaleDateString('en-IN') : ''}`;
        } else if (paymentMethod === 'Bank Transfer') {
            transactionDetails = `Bank: ${bankName || ''}, Ref: ${referenceNumber || ''}`;
        } else if (paymentMethod === 'UPI') {
            transactionDetails = `UPI Ref: ${referenceNumber || ''}`;
        }

        // 4. Create and save corresponding Payment transaction in ledger
        const payment = new PaymentModel({
            payment_date: dateObj,
            amount: Number(amount),
            direction: 'OUT', // Vouchers are cash OUT payments
            party: partyLink,
            mode: paymentMethod,
            transaction_details: transactionDetails || undefined,
            is_advance: false,
            remarks: paidTowards,
            status: 'Completed',
            voucher_no: voucherNumber
        } as any);
        await payment.save();

        // 5. Create and save the Voucher linked to the Payment transaction
        const voucher = new VoucherModel({
            voucherNumber,
            date: dateObj,
            partyName,
            partyType,
            amount: Number(amount),
            amountInWords,
            paymentMethod,
            chequeNumber: paymentMethod === 'Cheque' ? chequeNumber : undefined,
            bankName: (paymentMethod === 'Cheque' || paymentMethod === 'Bank Transfer') ? bankName : undefined,
            chequeDate: paymentMethod === 'Cheque' ? chequeDate : undefined,
            referenceNumber: (paymentMethod === 'Bank Transfer' || paymentMethod === 'UPI') ? referenceNumber : undefined,
            paidTowards,
            createdBy,
            transactionId: payment._id
        });
        await voucher.save();

        res.status(201).json({ success: true, voucher, paymentId: payment._id });
    } catch (error: unknown) {
        logger.error('Error creating voucher:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * DELETE /voucher/:id
 * Delete a voucher and its associated payment transaction
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const voucher = await VoucherModel.findById(req.params.id);
        if (!voucher) {
            return res.status(404).json({ success: false, message: 'Voucher not found' });
        }

        voucher.is_deleted = true;
        await voucher.save();

        if (voucher.transactionId) {
            const payment = await PaymentModel.findById(voucher.transactionId);
            if (payment) {
                payment.deletion = {
                    is_deleted: true,
                    deleted_at: new Date(),
                    deleted_by: 'admin'
                };
                await payment.save();
            }
        }

        logger.info('Voucher soft-deleted', { voucherId: voucher._id });
        res.status(200).json({ success: true, message: 'Voucher deleted successfully' });
    } catch (error: unknown) {
        logger.error('Error deleting voucher:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

export default router;
