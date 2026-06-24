import { Types } from "mongoose";
import { SupplierModel } from "../../../models/Supplier.model";
import logger from "../../../utils/logger";

function addressFromLegacy(value: any) {
    if (!value) return undefined;
    if (typeof value === "string") {
        return {
            line1: value.trim(),
            line2: "",
            city: "",
            state: "Karnataka",
            pincode: ""
        };
    }
    return {
        line1: value.line1 || value.address_line_1 || value.address || "",
        line2: value.line2 || value.address_line_2 || "",
        city: value.city || "",
        state: value.state || "Karnataka",
        pincode: value.pincode || value.pin || ""
    };
}

/**
 * Migrates legacy purchases to V2 in-place.
 */
export async function migratePurchases(db: any): Promise<{
    migrated: number;
    skipped: number;
    failed: number;
}> {
    logger.info("Starting purchase migration...");
    const report = { migrated: 0, skipped: 0, failed: 0 };

    const rawPurchaseCollection = db.collection("purchases");
    const rawPurchaseOrderCollection = db.collection("purchaseorders");
    const legacyPurchases = await rawPurchaseCollection.find({}).toArray();

    logger.info(`Found ${legacyPurchases.length} legacy purchases.`);

    for (const doc of legacyPurchases) {
        try {
            // Check if already migrated
            if (doc.schema_version === 2) {
                report.skipped++;
                continue;
            }

            // Resolve supplier
            let supplierId: Types.ObjectId | undefined = undefined;
            const supplierDoc = await SupplierModel.findOne({
                $or: [
                    { gstin: doc.supplier_GSTIN },
                    { name: doc.supplier_name }
                ]
            });
            if (supplierDoc) {
                supplierId = supplierDoc._id;
            }

            // Resolve PO
            let poObjectId: Types.ObjectId | undefined = undefined;
            if (doc.purchase_order_id) {
                const poDoc = await rawPurchaseOrderCollection.findOne({
                    $or: [
                        { purchase_order_id: doc.purchase_order_id },
                        { po_no: doc.purchase_order_id }
                    ]
                });
                if (poDoc) {
                    poObjectId = poDoc._id;
                }
            }

            // Map supplier snapshot
            const supplierSnapshot = {
                name: doc.supplier_name || "",
                gstin: doc.supplier_GSTIN || "",
                phone: doc.supplier_phone || "",
                email: doc.supplier_email || "",
                address: addressFromLegacy(doc.supplier_address)
            };

            // Map items
            const mappedItems = Array.isArray(doc.items)
                ? doc.items.map((item: any) => {
                      const qty = Number(item.quantity || 0);
                      const price = Number(item.unit_price || item.rate || 0);
                      const gst = Number(item.rate || 18);
                      const taxable = qty * price;
                      return {
                          item_id: item.stock_id ? new Types.ObjectId(item.stock_id) : undefined,
                          description: item.description || "",
                          specification: item.specification || "",
                          hsn_sac: item.HSN_SAC || "",
                          brand: item.company || "",
                          item_type: item.type === "Asset" ? "Asset" : "Material",
                          category: item.category || "",
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
            let taxableValue = 0;
            let totalTax = 0;
            for (const item of mappedItems) {
                taxableValue += item.taxable_value;
                totalTax += (item.total - item.taxable_value);
            }
            const grandTotal = Number(doc.total_amount || (taxableValue + totalTax));

            const isInterState = String(supplierSnapshot.address?.state || "Karnataka").toLowerCase().trim() !== "karnataka";
            const igst = isInterState ? totalTax : 0;
            const cgst = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
            const sgst = isInterState ? 0 : Math.round((totalTax - cgst) * 100) / 100;

            const totals = {
                taxable_value: Math.round(taxableValue * 100) / 100,
                cgst,
                sgst,
                igst,
                total_tax: Math.round(totalTax * 100) / 100,
                round_off: Math.round((grandTotal - (taxableValue + totalTax)) * 100) / 100,
                grand_total: Math.round(grandTotal * 100) / 100
            };

            await rawPurchaseCollection.updateOne(
                { _id: doc._id },
                {
                    $set: {
                        schema_version: 2,
                        purchase_no: doc.purchase_invoice_id || String(doc._id),
                        purchase_order_no: doc.purchase_order_id || "",
                        purchase_order_id: poObjectId,
                        purchase_invoice_no: doc.purchase_invoice_id || "",
                        purchase_date: doc.purchase_date ? new Date(doc.purchase_date) : new Date(),
                        purchase_status: "Received",
                        purchase_type: isInterState ? "Interstate" : "Local",
                        supplier_id: supplierId,
                        supplier_snapshot: supplierSnapshot,
                        items: mappedItems,
                        totals,
                        remarks: `Migrated from legacy purchase. Original ID: ${doc.purchase_invoice_id}`,
                        total_paid_amount: grandTotal,
                        payment_status: "Paid",
                        payments: [
                            {
                                payment_date: doc.purchase_date ? new Date(doc.purchase_date) : new Date(),
                                payment_mode: "Cash",
                                paid_amount: grandTotal,
                                extra_details: "Auto-migrated payment ledger"
                            }
                        ],
                        deletion: doc.deletion || { is_deleted: false },
                        is_archived: false
                    },
                    $unset: {
                        purchase_order_id_string: "",
                        supplier_name: "",
                        supplier_address: "",
                        supplier_phone: "",
                        supplier_email: "",
                        supplier_GSTIN: "",
                        total_amount: ""
                    }
                }
            );

            report.migrated++;
        } catch (err: unknown) {
            report.failed++;
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to migrate purchase document ${doc.purchase_invoice_id || doc._id}:`, { error: msg });
        }
    }

    return report;
}
