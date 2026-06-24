import { Types } from "mongoose";
import logger from "../../../utils/logger";

/**
 * Migrates legacy service documents to V2 in-place.
 */
export async function migrateServices(db: any): Promise<{
    migrated: number;
    skipped: number;
    failed: number;
}> {
    logger.info("Starting service migration...");
    const report = { migrated: 0, skipped: 0, failed: 0 };

    const rawServiceCollection = db.collection("services");
    const rawInvoiceCollection = db.collection("invoices");
    const legacyServices = await rawServiceCollection.find({}).toArray();

    logger.info(`Found ${legacyServices.length} legacy services.`);

    for (const doc of legacyServices) {
        try {
            // Check if already migrated
            if (doc.schema_version === 2) {
                report.skipped++;
                continue;
            }

            // Resolve invoice doc ref
            let invoiceObjectId: Types.ObjectId | undefined = undefined;
            if (doc.invoice_id) {
                const inv = await rawInvoiceCollection.findOne({
                    $or: [
                        { invoice_id: doc.invoice_id },
                        { invoice_no: doc.invoice_id }
                    ]
                });
                if (inv) {
                    invoiceObjectId = inv._id;
                }
            }

            if (!invoiceObjectId) {
                logger.warn(`No invoice document found for service: ${doc.service_id} (Ref Invoice ID: ${doc.invoice_id})`);
                invoiceObjectId = new Types.ObjectId(); // Fallback ObjectId to satisfy required validator
            }

            // Map items
            const mappedItems = Array.isArray(doc.items)
                ? doc.items.map((item: any) => {
                      const qty = Number(item.quantity || 0);
                      const price = Number(item.unit_price || item.rate || 0);
                      const gst = Number(item.rate || 18);
                      const taxable = qty * price;
                      return {
                          description: item.description || "",
                          hsn_sac: item.HSN_SAC || "",
                          unit: "Nos",
                          quantity: qty,
                          unit_price: price,
                          taxable_value: taxable,
                          gst_rate: gst,
                          rate: gst,
                          total: Math.round((taxable * (1 + gst / 100)) * 100) / 100
                      };
                  })
                : [];

            // Map non-items / charges
            let otherCharges = undefined;
            if (Array.isArray(doc.non_items) && doc.non_items.length > 0) {
                const first = doc.non_items[0];
                otherCharges = {
                    description: first.description || "Other Charges",
                    price: Number(first.price || 0),
                    total: Number(first.rate || first.price || 0)
                };
            }

            // Map totals
            const totalTax = Number(doc.total_tax || 0);
            const totalTaxable = Number(doc.total_amount_no_tax || 0);
            const grandTotal = Number(doc.total_amount_with_tax || 0);

            const totals = {
                taxable_value: totalTaxable,
                cgst: Math.round((totalTax / 2) * 100) / 100,
                sgst: Math.round((totalTax / 2) * 100) / 100,
                igst: 0,
                total_tax: totalTax,
                round_off: Math.round((grandTotal - (totalTaxable + totalTax)) * 100) / 100,
                grand_total: grandTotal
            };

            // Map payments
            const mappedPayments = Array.isArray(doc.payments)
                ? doc.payments.map((p: any) => ({
                      payment_date: p.payment_date ? new Date(p.payment_date) : undefined,
                      payment_mode: p.payment_mode || "Cash",
                      paid_amount: Number(p.paid_amount || 0),
                      extra_details: p.extra_details || ""
                  }))
                : [];

            await rawServiceCollection.updateOne(
                { _id: doc._id },
                {
                    $set: {
                        schema_version: 2,
                        service_no: doc.service_id,
                        service_id: doc.service_id,
                        invoice_id: invoiceObjectId,
                        service_stage: Number(doc.service_stage || 0),
                        service_status: Number(doc.service_stage || 0) >= 2 ? "Completed" : "Open",
                        items: mappedItems,
                        other_charges: otherCharges,
                        discount: 0,
                        totals,
                        total_tax: totalTax,
                        total_amount_no_tax: totalTaxable,
                        total_amount_with_tax: grandTotal,
                        fee_amount: Number(doc.fee_amount || 0),
                        content: {
                            declaration: doc.declaration || "",
                            terms_and_conditions: doc.terms_and_conditions || ""
                        },
                        remarks: doc.notes || "",
                        total_paid_amount: Number(doc.total_paid_amount || 0),
                        payment_status: doc.payment_status || "Unpaid",
                        payments: mappedPayments,
                        deletion: doc.deletion || { is_deleted: false }
                    },
                    $unset: {
                        non_items: "",
                        notes: "",
                        declaration: "",
                        terms_and_conditions: ""
                    }
                }
            );

            report.migrated++;
        } catch (err: unknown) {
            report.failed++;
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to migrate service document ${doc.service_id || doc._id}:`, { error: msg });
        }
    }

    return report;
}
