import { Types } from "mongoose";
import logger from "../../../utils/logger";

/**
 * Migrates payments nested in invoices and purchases to the standalone payments collection.
 * Updates the references in the source collections as well.
 */
export async function migratePayments(db: any): Promise<{
    migrated: number;
    failed: number;
}> {
    logger.info("Starting payment extraction and migration...");
    const report = { migrated: 0, failed: 0 };

    const rawInvoiceCollection = db.collection("invoices");
    const rawPurchaseCollection = db.collection("purchases");
    const rawPaymentCollection = db.collection("payments");

    // 1. Process Invoice Payments (Customer payments coming IN)
    const invoices = await rawInvoiceCollection.find({
        $and: [
            { payments: { $exists: true } },
            { payments: { $not: { $size: 0 } } }
        ]
    }).toArray();

    logger.info(`Found ${invoices.length} invoices with nested payments.`);

    for (const inv of invoices) {
        try {
            const updatedPayments: any[] = [];
            let changed = false;

            for (const p of inv.payments || []) {
                const paymentId = p._id ? new Types.ObjectId(p._id) : new Types.ObjectId();
                const paymentDate = p.payment_date ? new Date(p.payment_date) : new Date();
                const amount = Number(p.paid_amount || p.amount || 0);
                const mode = ["Cash", "UPI", "Bank Transfer", "Cheque"].includes(p.payment_mode)
                    ? p.payment_mode
                    : "Cash";

                // Create or update V2 Payment document
                const paymentDoc = {
                    _id: paymentId,
                    schema_version: 2,
                    payment_date: paymentDate,
                    amount: amount,
                    direction: "IN",
                    party: {
                        type: "Customer",
                        id: inv.customer_snapshot?.id || (inv.customer_id ? String(inv.customer_id) : undefined),
                        ref: inv.customer_id ? new Types.ObjectId(inv.customer_id) : undefined
                    },
                    reference: {
                        type: "Invoice",
                        id: inv.invoice_no || inv.invoice_id || "",
                        ref: inv._id
                    },
                    mode: mode,
                    transaction_details: p.extra_details || p.transaction_details || "",
                    is_advance: false,
                    is_refund: false,
                    status: "Completed",
                    remarks: `Migrated from invoice: ${inv.invoice_no || inv.invoice_id}`,
                    deletion: { is_deleted: false },
                    createdAt: inv.createdAt || new Date(),
                    updatedAt: inv.updatedAt || new Date()
                };

                await rawPaymentCollection.updateOne(
                    { _id: paymentId },
                    { $set: paymentDoc },
                    { upsert: true }
                );

                updatedPayments.push({
                    payment_date: paymentDate,
                    payment_mode: mode,
                    paid_amount: amount,
                    extra_details: p.extra_details || "",
                    payment_ref: paymentId
                });

                report.migrated++;
                changed = true;
            }

            if (changed) {
                await rawInvoiceCollection.updateOne(
                    { _id: inv._id },
                    { $set: { payments: updatedPayments } }
                );
            }
        } catch (err: unknown) {
            report.failed++;
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to migrate payments for invoice ${inv.invoice_id}:`, { error: msg });
        }
    }

    // 2. Process Purchase Payments (Supplier payments going OUT)
    const purchases = await rawPurchaseCollection.find({
        $and: [
            { payments: { $exists: true } },
            { payments: { $not: { $size: 0 } } }
        ]
    }).toArray();

    logger.info(`Found ${purchases.length} purchases with nested payments.`);

    for (const pur of purchases) {
        try {
            const updatedPayments: any[] = [];
            let changed = false;

            for (const p of pur.payments || []) {
                const paymentId = p._id ? new Types.ObjectId(p._id) : new Types.ObjectId();
                const paymentDate = p.payment_date ? new Date(p.payment_date) : new Date();
                const amount = Number(p.paid_amount || p.amount || 0);
                const mode = ["Cash", "UPI", "Bank Transfer", "Cheque"].includes(p.payment_mode)
                    ? p.payment_mode
                    : "Cash";

                // Create or update V2 Payment document
                const paymentDoc = {
                    _id: paymentId,
                    schema_version: 2,
                    payment_date: paymentDate,
                    amount: amount,
                    direction: "OUT",
                    party: {
                        type: "Supplier",
                        id: pur.supplier_snapshot?.id || (pur.supplier_id ? String(pur.supplier_id) : undefined),
                        ref: pur.supplier_id ? new Types.ObjectId(pur.supplier_id) : undefined
                    },
                    reference: {
                        type: "Purchase",
                        id: pur.purchase_no || pur.purchase_invoice_no || "",
                        ref: pur._id
                    },
                    mode: mode,
                    transaction_details: p.extra_details || p.transaction_details || "",
                    is_advance: false,
                    is_refund: false,
                    status: "Completed",
                    remarks: `Migrated from purchase: ${pur.purchase_no || pur.purchase_invoice_no}`,
                    deletion: { is_deleted: false },
                    createdAt: pur.createdAt || new Date(),
                    updatedAt: pur.updatedAt || new Date()
                };

                await rawPaymentCollection.updateOne(
                    { _id: paymentId },
                    { $set: paymentDoc },
                    { upsert: true }
                );

                updatedPayments.push({
                    payment_date: paymentDate,
                    payment_mode: mode,
                    paid_amount: amount,
                    extra_details: p.extra_details || "",
                    payment_ref: paymentId
                });

                report.migrated++;
                changed = true;
            }

            if (changed) {
                await rawPurchaseCollection.updateOne(
                    { _id: pur._id },
                    { $set: { payments: updatedPayments } }
                );
            }
        } catch (err: unknown) {
            report.failed++;
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to migrate payments for purchase ${pur.purchase_no}:`, { error: msg });
        }
    }

    logger.info(`Payment migration completed. Total payments migrated: ${report.migrated}, Failed: ${report.failed}`);
    return report;
}
