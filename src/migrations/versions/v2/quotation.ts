import { Types } from "mongoose";
import { QuotationModel } from "../../../models/Quotation.model";
import { getCustomerKey, addressFromLegacy } from "./customer";
import logger from "../../../utils/logger";

/**
 * Runs quotation migration in batches.
 * Converts old quotation records to schema version 2.
 */
export async function migrateQuotations(
    db: any,
    lookupMap: Map<string, Types.ObjectId>
): Promise<{
    migrated: number;
    skipped: number;
    failed: number;
}> {
    logger.info("Starting legacy quotation migration...");
    const report = { migrated: 0, skipped: 0, failed: 0 };

    const rawQuotationCollection = db.collection("quotations");

    // Filter to find legacy quotations
    const legacyFilter = {
        $or: [
            { schema_version: { $exists: false } },
            { schema_version: { $lt: 2 } },
            { quotation_no: { $exists: false } },
        ],
    };

    const batchSize = 100;
    let lastId = null;
    let hasMore = true;

    while (hasMore) {
        const query: any = lastId ? { _id: { $gt: lastId }, ...legacyFilter } : legacyFilter;
        const batch: any[] = await rawQuotationCollection.find(query).sort({ _id: 1 }).limit(batchSize).toArray();

        if (batch.length === 0) {
            hasMore = false;
            break;
        }

        logger.info(`Processing batch of ${batch.length} legacy quotations...`);

        for (const doc of batch as any[]) {
            try {
                // If it is already migrated, skip it
                if (doc.schema_version === 2 && doc.quotation_no) {
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
                    logger.warn(`No resolved customer found for quotation ${doc.quotation_id || doc.quotation_no} (Key: ${customerKey})`);
                }

                // Map items
                const mappedItems = Array.isArray(doc.items)
                    ? doc.items.map((item: any) => {
                          const quantity = Number(item.quantity || 0);
                          const unitPrice = Number(item.unit_price || item.price || 0);
                          const gstRate = Number(item.rate || item.gst_rate || 0);
                          const taxable = Math.round(quantity * unitPrice * 100) / 100;
                          const itemTax = Math.round(((taxable * gstRate) / 100) * 100) / 100;

                          return {
                              item_id: item.item_id ? new Types.ObjectId(item.item_id) : undefined,
                              description: item.description || "",
                              specification: item.specification || "",
                              hsn_sac: item.hsn_sac || item.HSN_SAC || "",
                              unit: item.unit || "Nos",
                              unit_price: unitPrice,
                              rate: gstRate,
                              gst_rate: gstRate,
                              quantity,
                              taxable_value: taxable,
                              total: Math.round((taxable + itemTax) * 100) / 100,
                          };
                      })
                    : [];

                // Map non_items to other_charges
                const mappedOtherCharges = Array.isArray(doc.non_items)
                    ? doc.non_items.map((charge: any) => {
                          const price = Number(charge.price || 0);
                          const gstRate = Number(charge.rate || charge.gst_rate || 0);
                          const tax = Math.round(((price * gstRate) / 100) * 100) / 100;

                          return {
                              description: charge.description || "",
                              specification: charge.specification || "",
                              price,
                              rate: gstRate,
                              gst_rate: gstRate,
                              taxable_value: price,
                              total: Math.round((price + tax) * 100) / 100,
                          };
                      })
                    : [];

                // Calculate Totals CGST/SGST/IGST splits
                const taxableValue = Number(doc.total_amount_no_tax ?? doc.totals?.taxable_value ?? 0);
                const totalTax = Number(doc.total_tax ?? doc.totals?.total_tax ?? 0);
                const grandTotal = Number(doc.total_amount_tax ?? doc.totals?.grand_total ?? 0);

                const addressState = doc.customer_snapshot?.billing_address?.state || doc.customer_address || "Karnataka";
                const isInterState = String(addressState).toLowerCase().trim() !== "karnataka";

                const igst = isInterState ? totalTax : 0;
                const cgst = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
                const sgst = isInterState ? 0 : Math.round((totalTax - cgst) * 100) / 100;

                const totals = {
                    taxable_value: taxableValue,
                    total_tax: totalTax,
                    cgst,
                    sgst,
                    igst,
                    round_off: Math.round((grandTotal - (taxableValue + totalTax)) * 100) / 100,
                    grand_total: grandTotal,
                };

                // Map content fields
                const content = {
                    subject: doc.content?.subject || doc.subject || "",
                    headline: doc.content?.headline || doc.headline || doc.project_name || "",
                    letter_1: doc.content?.letter_1 || doc.letter_1 || "",
                    letter_2: doc.content?.letter_2 || doc.letter_2 || [],
                    letter_3: doc.content?.letter_3 || doc.letter_3 || "",
                    notes: doc.content?.notes || doc.notes || [],
                    terms_and_conditions: doc.content?.terms_and_conditions || doc.termsAndConditions || "",
                };

                // Map customer snapshot
                const customerSnapshot = {
                    name: doc.customer_snapshot?.name || oldCustName,
                    phone: doc.customer_snapshot?.phone || oldCustPhone,
                    email: doc.customer_snapshot?.email || oldCustEmail,
                    gstin: doc.customer_snapshot?.gstin || oldCustGstin,
                    billing_address: addressFromLegacy(doc.customer_snapshot?.billing_address || doc.customer_address),
                };

                // Determine quotation status and converted_invoice_id
                let status = doc.quotation_status || "Draft";
                let convertedInvoiceId = doc.converted_invoice_id ? new Types.ObjectId(doc.converted_invoice_id) : undefined;

                if (status === "Converted" || !convertedInvoiceId) {
                    const rawInvoiceCollection = db.collection("invoices");
                    const legacyQuotationId = doc.quotation_id || doc.quotation_no;
                    const queryConditions: any[] = [];
                    if (doc._id) queryConditions.push({ quotation_id: doc._id });
                    if (legacyQuotationId) {
                        queryConditions.push({ quotation_id: legacyQuotationId });
                        queryConditions.push({ quotation_no: legacyQuotationId });
                        queryConditions.push({ "quotation.quotation_id": legacyQuotationId });
                        queryConditions.push({ "quotation.quotation_no": legacyQuotationId });
                    }
                    
                    if (queryConditions.length > 0) {
                        const referencingInvoice = await rawInvoiceCollection.findOne({
                            $or: queryConditions
                        }, { projection: { _id: 1 } });

                        if (referencingInvoice) {
                            status = "Converted";
                            convertedInvoiceId = referencingInvoice._id;
                        }
                    }
                }

                // Run atomic update directly bypass mongoose validators for legacy document format
                await rawQuotationCollection.updateOne(
                    { _id: doc._id },
                    {
                        $set: {
                            schema_version: 2,
                            quotation_no: doc.quotation_no || doc.quotation_id,
                            quotation_status: status,
                            converted_invoice_id: convertedInvoiceId,
                            discount: Number(doc.discount || 0),
                            customer_id: customerId,
                            customer_snapshot: customerSnapshot,
                            items: mappedItems,
                            other_charges: mappedOtherCharges,
                            totals,
                            content,
                            deletion: doc.deletion || { is_deleted: Boolean(doc.is_deleted) },
                            is_deleted: doc.is_deleted ?? doc.deletion?.is_deleted ?? false,
                            is_archived: doc.is_archived ?? false,
                            // Preserve V1 original fields for audit trail / metadata
                            remarks: doc.remarks || `Migrated from quotation V1. Original ID: ${doc.quotation_id}`,
                        },
                        // We must remove quotation_id if quotation_no is the new identity, or leave it for legacy fallback
                    }
                );

                report.migrated++;
            } catch (err: unknown) {
                report.failed++;
                const msg = err instanceof Error ? err.message : String(err);
                logger.error(`Failed to migrate quotation ${doc.quotation_id || doc.quotation_no}:`, { error: msg });
            }
            lastId = doc._id;
        }
    }

    logger.info(`Legacy quotation migration complete. Migrated: ${report.migrated}, Skipped: ${report.skipped}, Failed: ${report.failed}`);
    return report;
}
