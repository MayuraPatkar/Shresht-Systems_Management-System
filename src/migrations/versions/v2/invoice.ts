import { Types } from "mongoose";
import { InvoiceModel, InvoiceStatus } from "../../../models/Invoice.model";
import { getCustomerKey, addressFromLegacy } from "./customer";
import logger from "../../../utils/logger";

/**
 * Maps items to V2 invoice items
 */
function mapInvoiceItems(items: any[]): any[] {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || item.price || 0);
        const gstRate = Number(item.rate || item.gst_rate || 0);
        const taxable = Math.round(quantity * unitPrice * 100) / 100;
        const tax = Math.round(((taxable * gstRate) / 100) * 100) / 100;

        return {
            item_id: item.item_id ? new Types.ObjectId(item.item_id) : undefined,
            description: item.description || "",
            hsn_sac: item.hsn_sac || item.HSN_SAC || "",
            unit: item.unit || "Nos",
            quantity,
            unit_price: unitPrice,
            taxable_value: taxable,
            gst_rate: gstRate,
            discount_percent: Number(item.discount_percent || 0),
            total: Math.round((taxable + tax) * 100) / 100,
        };
    });
}

/**
 * Runs invoice migration in batches.
 */
export async function migrateInvoices(
    db: any,
    lookupMap: Map<string, Types.ObjectId>
): Promise<{
    migrated: number;
    skipped: number;
    failed: number;
}> {
    logger.info("Starting legacy invoice migration...");
    const report = { migrated: 0, skipped: 0, failed: 0 };

    const rawInvoiceCollection = db.collection("invoices");
    const rawQuotationCollection = db.collection("quotations");

    // Filter to find legacy invoices
    const legacyFilter = {
        $or: [
            { schema_version: { $exists: false } },
            { schema_version: { $lt: 2 } },
        ],
    };

    const batchSize = 100;
    let lastId = null;
    let hasMore = true;

    while (hasMore) {
        const query: any = lastId ? { _id: { $gt: lastId }, ...legacyFilter } : legacyFilter;
        const batch: any[] = await rawInvoiceCollection.find(query).sort({ _id: 1 }).limit(batchSize).toArray();

        if (batch.length === 0) {
            hasMore = false;
            break;
        }

        logger.info(`Processing batch of ${batch.length} legacy invoices...`);

        for (const doc of batch as any[]) {
            try {
                // Skip if already migrated
                if (doc.schema_version === 2) {
                    report.skipped++;
                    lastId = doc._id;
                    continue;
                }

                const oldCustName = doc.customer_name || "";
                const oldCustPhone = doc.customer_phone || "";
                const oldCustEmail = doc.customer_email || "";
                const oldCustGstin = doc.customer_GSTIN || "";

                // Find resolved customer ID
                const customerKey = getCustomerKey(oldCustName, oldCustPhone, oldCustEmail, oldCustGstin);
                const customerId = lookupMap.get(customerKey);

                if (!customerId) {
                    logger.warn(`No resolved customer found for invoice ${doc.invoice_id} (Key: ${customerKey})`);
                }

                // Resolve quotation _id from legacy quotation_id string
                let quotationObjectId: Types.ObjectId | undefined = undefined;
                if (doc.quotation_id) {
                    const qDoc = await rawQuotationCollection.findOne({
                        $or: [
                            { quotation_id: doc.quotation_id },
                            { quotation_no: doc.quotation_id },
                        ],
                    });
                    if (qDoc) {
                        quotationObjectId = qDoc._id;
                    }
                }

                // Generate customer snapshot
                const customerSnapshot = {
                    name: doc.customer_snapshot?.name || oldCustName,
                    phone: doc.customer_snapshot?.phone || oldCustPhone,
                    email: doc.customer_snapshot?.email || oldCustEmail,
                    gstin: doc.customer_snapshot?.gstin || oldCustGstin,
                    billing_address: addressFromLegacy(doc.customer_snapshot?.billing_address || doc.customer_address),
                };

                // Generate consignee snapshot
                const consignee = doc.consignee || (doc.consignee_name || doc.consignee_address ? {
                    name: doc.consignee_name || "",
                    address: addressFromLegacy(doc.consignee_address),
                } : undefined);

                // Map items
                const itemsOriginal = mapInvoiceItems(doc.items_original);
                const itemsDuplicate = mapInvoiceItems(doc.items_duplicate);

                // Map delivery challan
                const deliveryChallan = doc.delivery_challan || (doc.dc_number || doc.dc_date ? {
                    number: doc.dc_number || "",
                    date: doc.dc_date ? new Date(doc.dc_date) : undefined,
                } : undefined);

                // Map totals original and duplicate
                const buildTotalsObj = (totalAmt: number, taxAmt: number) => {
                    const grandTotal = Number(totalAmt || 0);
                    const totalTax = Number(taxAmt || 0);
                    const taxableValue = Math.round((grandTotal - totalTax) * 100) / 100;

                    const addressState = customerSnapshot.billing_address?.state || "Karnataka";
                    const isInterState = String(addressState).toLowerCase().trim() !== "karnataka";

                    const igst = isInterState ? totalTax : 0;
                    const cgst = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
                    const sgst = isInterState ? 0 : Math.round((totalTax - cgst) * 100) / 100;

                    return {
                        taxable_value: taxableValue,
                        total_tax: totalTax,
                        cgst,
                        sgst,
                        igst,
                        round_off: Math.round((grandTotal - (taxableValue + totalTax)) * 100) / 100,
                        grand_total: grandTotal,
                    };
                };

                const totalsOriginal = doc.totals_original || buildTotalsObj(
                    doc.total_amount_original || 0,
                    doc.total_tax_original || 0
                );
                const totalsDuplicate = doc.totals_duplicate || buildTotalsObj(
                    doc.total_amount_duplicate || 0,
                    doc.total_tax_duplicate || 0
                );

                // Map payments array
                const mappedPayments = Array.isArray(doc.payments)
                    ? doc.payments.map((p: any) => ({
                          payment_date: p.payment_date ? new Date(p.payment_date) : undefined,
                          payment_mode: p.payment_mode || "Cash",
                          paid_amount: Number(p.paid_amount || 0),
                          extra_details: p.extra_details || "",
                          payment_ref: p.payment_ref ? new Types.ObjectId(p.payment_ref) : undefined,
                      }))
                    : [];

                // Map content
                const content = {
                    declaration: doc.content?.declaration || doc.declaration || "",
                    terms_and_conditions: doc.content?.terms_and_conditions || doc.termsAndConditions || "",
                };

                // Map other charges
                let otherCharges = doc.other_charges;
                if (!otherCharges && Array.isArray(doc.non_items_original) && doc.non_items_original.length > 0) {
                    const first = doc.non_items_original[0];
                    otherCharges = {
                        description: first.description || "Other Charges",
                        price: Number(first.price || 0),
                        total: Number(first.rate || first.price || 0),
                    };
                }

                // Map Status
                let statusVal = InvoiceStatus.DRAFT;
                const legacyStatus = String(doc.status || "").toUpperCase();
                if (legacyStatus === "PAID") statusVal = InvoiceStatus.PAID;
                else if (legacyStatus === "PARTIALLY_PAID" || legacyStatus === "PARTIAL") statusVal = InvoiceStatus.PARTIALLY_PAID;
                else if (legacyStatus === "OVERDUE" || legacyStatus === "EXPIRED") statusVal = InvoiceStatus.OVERDUE;
                else if (legacyStatus === "CANCELLED") statusVal = InvoiceStatus.CANCELLED;
                else if (legacyStatus === "REFUNDED") statusVal = InvoiceStatus.REFUNDED;
                else if (legacyStatus === "SENT" || legacyStatus === "ISSUED") statusVal = InvoiceStatus.SENT;

                // Sum up payments from mappedPayments
                let calculatedPaidAmount = mappedPayments.reduce((sum: number, p: any) => sum + (p.paid_amount || 0), 0);

                // Also check payments collection for any linked payments
                const rawPaymentCollection = db.collection("payments");
                const legacyInvoiceId = doc.invoice_id || doc.invoice_no;
                const queryConditions: any[] = [];
                if (doc._id) {
                    queryConditions.push({ "reference.ref": doc._id }, { reference_id: doc._id.toString() });
                }
                if (legacyInvoiceId) {
                    queryConditions.push({ reference_id: legacyInvoiceId });
                    queryConditions.push({ "reference.id": legacyInvoiceId });
                }

                if (queryConditions.length > 0) {
                    const linkedPayments = await rawPaymentCollection.find({
                        $or: queryConditions,
                        "deletion.is_deleted": { $ne: true }
                    }).toArray();

                    const linkedSum = linkedPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
                    if (linkedSum > calculatedPaidAmount) {
                        calculatedPaidAmount = linkedSum;
                    }
                }

                // Determine payment status based on calculatedPaidAmount and totalsOriginal
                let calculatedPaymentStatus = doc.payment_status || "Unpaid";
                if (calculatedPaymentStatus === "Unpaid" || calculatedPaymentStatus === "Partial" || !doc.payment_status) {
                    const targetTotal = totalsOriginal.grand_total || 0;
                    if (targetTotal > 0) {
                        if (calculatedPaidAmount >= targetTotal) {
                            calculatedPaymentStatus = "Paid";
                        } else if (calculatedPaidAmount > 0) {
                            calculatedPaymentStatus = "Partial";
                        } else {
                            calculatedPaymentStatus = "Unpaid";
                        }
                    }
                }

                // Update document bypass mongoose validators for legacy fields
                await rawInvoiceCollection.updateOne(
                    { _id: doc._id },
                    {
                        $set: {
                            schema_version: 2,
                            invoice_no: doc.invoice_no || doc.invoice_id,
                            invoice_id: doc.invoice_id || doc.invoice_no,
                            quotation_id: quotationObjectId,
                            project_name: doc.project_name || "",
                            invoice_date: doc.invoice_date ? new Date(doc.invoice_date) : new Date(),
                            due_date: doc.due_date ? new Date(doc.due_date) : undefined,
                            status: statusVal,
                            invoice_status: doc.invoice_status || "Draft",
                            delivery_challan: deliveryChallan,
                            customer_id: customerId,
                            customer_snapshot: customerSnapshot,
                            consignee,
                            items_original: itemsOriginal,
                            items_duplicate: itemsDuplicate,
                            other_charges: otherCharges,
                            discount: Number(doc.discount || 0),
                            totals_original: totalsOriginal,
                            totals_duplicate: totalsDuplicate,
                            total_paid_amount: calculatedPaidAmount || Number(doc.total_paid_amount || 0),
                            payment_status: calculatedPaymentStatus,
                            payments: mappedPayments,
                            content,
                            deletion: doc.deletion || { is_deleted: Boolean(doc.is_deleted) },
                            is_archived: doc.is_archived ?? false,
                            remarks: doc.remarks || `Migrated from invoice V1. Original ID: ${doc.invoice_id}`,
                        },
                    }
                );

                report.migrated++;
            } catch (err: unknown) {
                report.failed++;
                const msg = err instanceof Error ? err.message : String(err);
                logger.error(`Failed to migrate invoice ${doc.invoice_id}:`, { error: msg });
            }
            lastId = doc._id;
        }
    }

    logger.info(`Legacy invoice migration complete. Migrated: ${report.migrated}, Skipped: ${report.skipped}, Failed: ${report.failed}`);
    return report;
}
