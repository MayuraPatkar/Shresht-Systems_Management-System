import { Types } from "mongoose";
import logger from "../../../utils/logger";
import { addressFromLegacy } from "./customer";

/**
 * Migrates legacy EWayBill documents to V2 in-place.
 */
export async function migrateEWayBills(db: any): Promise<{
    migrated: number;
    skipped: number;
    failed: number;
}> {
    logger.info("Starting e-way bill migration...");
    const report = { migrated: 0, skipped: 0, failed: 0 };

    const rawEWayBillCollection = db.collection("ewaybills");
    const rawInvoiceCollection = db.collection("invoices");
    const legacyEWayBills = await rawEWayBillCollection.find({}).toArray();

    logger.info(`Found ${legacyEWayBills.length} legacy e-way bills.`);

    for (const doc of legacyEWayBills) {
        try {
            // Check if already migrated
            if (doc.schema_version === 2) {
                report.skipped++;
                continue;
            }

            // Resolve invoice
            let invoiceIdObj: any = undefined;
            if (doc.invoice_id) {
                const inv = await rawInvoiceCollection.findOne({ _id: new Types.ObjectId(doc.invoice_id) });
                if (inv) {
                    invoiceIdObj = {
                        id: inv.invoice_no || inv.invoice_id || "",
                        ref: inv._id
                    };
                }
            }

            if (!invoiceIdObj) {
                logger.warn(`No invoice document found for ewaybill: ${doc.ewaybill_no || doc._id} (Invoice Ref ID: ${doc.invoice_id})`);
                invoiceIdObj = {
                    id: "UNKNOWN",
                    ref: doc.invoice_id || new Types.ObjectId()
                };
            }

            // Map items
            const mappedItems = Array.isArray(doc.items)
                ? doc.items.map((item: any) => {
                      const qty = Number(item.quantity || 0);
                      const price = Number(item.unit_price || 0);
                      const gst = Number(item.gst_rate || item.rate || 0);
                      const taxable = Number(item.taxable_value || (qty * price));
                      return {
                          item_id: item.stock_id ? new Types.ObjectId(item.stock_id) : undefined,
                          description: item.description || "",
                          hsn_sac: item.hsn_sac || item.HSN_SAC || "",
                          unit: "Nos",
                          quantity: qty,
                          unit_price: price,
                          taxable_value: taxable,
                          gst_rate: gst,
                          total: Math.round((taxable * (1 + gst / 100)) * 100) / 100
                      };
                  })
                : [];

            // Map totals
            const taxableValue = Number(doc.total_taxable_value || 0);
            const cgst = Number(doc.cgst || 0);
            const sgst = Number(doc.sgst || 0);
            const grandTotal = Number(doc.total_invoice_value || 0);
            const totalTax = cgst + sgst;

            const totals = {
                taxable_value: taxableValue,
                cgst,
                sgst,
                igst: 0,
                total_tax: totalTax,
                round_off: Math.round((grandTotal - (taxableValue + totalTax)) * 100) / 100,
                grand_total: grandTotal
            };

            await rawEWayBillCollection.updateOne(
                { _id: doc._id },
                {
                    $set: {
                        schema_version: 2,
                        ewaybill_no: doc.ewaybill_no || "",
                        ewaybill_status: doc.ewaybill_status || "Draft",
                        ewaybill_date: doc.ewaybill_generated_at ? new Date(doc.ewaybill_generated_at) : undefined,
                        invoice_id: invoiceIdObj,
                        from_address: addressFromLegacy(doc.from_address),
                        to_address: addressFromLegacy(doc.to_address),
                        transport: doc.transport || {
                            mode: "Road",
                            vehicle_number: "",
                            transporter_id: "",
                            transporter_name: "",
                            distance_km: 0
                        },
                        items: mappedItems,
                        totals,
                        remarks: `Migrated legacy EWayBill: ${doc.ewaybill_no}`,
                        is_archived: false,
                        deletion: doc.deletion || { is_deleted: false }
                    },
                    $unset: {
                        ewaybill_generated_at: "",
                        total_taxable_value: "",
                        total_invoice_value: ""
                    }
                }
            );

            report.migrated++;
        } catch (err: unknown) {
            report.failed++;
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to migrate e-way bill document ${doc.ewaybill_no || doc._id}:`, { error: msg });
        }
    }

    return report;
}
