import { Types } from 'mongoose';
import { InvoiceModel, PurchaseModel, ServiceModel, PaymentModel } from '../models';
import logger from './logger';

export async function syncReferencePayments(referenceType: 'Invoice' | 'Purchase' | 'Service', referenceRef: Types.ObjectId | string | undefined) {
    if (!referenceType || !referenceRef) return;

    try {
        const refId = typeof referenceRef === 'string' ? new Types.ObjectId(referenceRef) : referenceRef;

        // Fetch all non-deleted payments for this reference
        const payments = await PaymentModel.find({
            "reference.type": referenceType,
            "reference.ref": refId,
            "deletion.is_deleted": { $ne: true }
        }).sort({ payment_date: 1 }).lean();

        const hasRefund = payments.some(p => p.is_refund);
        const totalPaid = payments.reduce((sum, p) => {
            if (p.is_refund) {
                return sum - (p.amount || 0);
            }
            return sum + (p.amount || 0);
        }, 0);

        const embeddedPayments = payments.map(p => ({
            payment_date: p.payment_date,
            paid_amount: p.is_refund ? -(p.amount || 0) : (p.amount || 0),
            payment_mode: p.mode,
            extra_details: p.remarks || p.transaction_details || '',
            payment_ref: p._id
        }));

        if (referenceType === 'Invoice') {
            const invoice = await InvoiceModel.findById(refId);
            if (invoice) {
                invoice.payments = embeddedPayments;
                invoice.total_paid_amount = totalPaid;
                
                // Recalculate status
                const totalDue = (typeof invoice.total_amount_duplicate !== 'undefined' && invoice.total_amount_duplicate !== null)
                    ? invoice.total_amount_duplicate
                    : (invoice.total_amount_original || 0);

                if (totalPaid <= 0) {
                    invoice.payment_status = hasRefund ? 'Refunded' : 'Unpaid';
                } else if (totalPaid >= totalDue - 0.01) {
                    invoice.payment_status = hasRefund ? 'Partially Refunded' : 'Paid';
                } else {
                    invoice.payment_status = hasRefund ? 'Partially Refunded' : 'Partial';
                }

                if (typeof invoice.updatePaymentStatus === 'function') {
                    invoice.updatePaymentStatus();
                }
                await invoice.save();
                logger.info(`Synced payments for Invoice ${refId}. Total Paid: ${totalPaid}`);
            }
        } else if (referenceType === 'Purchase') {
            const purchase = await PurchaseModel.findById(refId);
            if (purchase) {
                purchase.payments = embeddedPayments;
                purchase.total_paid_amount = totalPaid;

                const grandTotal = purchase.totals?.grand_total || 0;
                if (totalPaid <= 0) {
                    purchase.payment_status = hasRefund ? 'Refunded' : 'Unpaid';
                } else if (totalPaid >= grandTotal - 0.01) {
                    purchase.payment_status = hasRefund ? 'Partially Refunded' : 'Paid';
                } else {
                    purchase.payment_status = hasRefund ? 'Partially Refunded' : 'Partial';
                }
                await purchase.save();
                logger.info(`Synced payments for Purchase ${refId}. Total Paid: ${totalPaid}`);
            }
        } else if (referenceType === 'Service') {
            const service = await ServiceModel.findById(refId);
            if (service) {
                service.payments = embeddedPayments as any[];
                service.total_paid_amount = totalPaid;

                const grandTotal = service.totals?.grand_total || 0;
                if (totalPaid <= 0) {
                    service.payment_status = hasRefund ? 'Refunded' : 'Unpaid';
                } else if (totalPaid >= grandTotal - 0.01) {
                    service.payment_status = hasRefund ? 'Partially Refunded' : 'Paid';
                } else {
                    service.payment_status = hasRefund ? 'Partially Refunded' : 'Partial';
                }
                await service.save();
                logger.info(`Synced payments for Service ${refId}. Total Paid: ${totalPaid}`);
            }
        }
    } catch (error) {
        logger.error(`Error syncing payments for ${referenceType} ${referenceRef}:`, error);
    }
}
