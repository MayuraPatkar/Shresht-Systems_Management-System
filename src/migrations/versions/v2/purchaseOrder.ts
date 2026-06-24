import { Types } from "mongoose";
import { SupplierModel } from "../../../models/Supplier.model";
import { PurchaseOrderModel } from "../../../models/PurchaseOrder.model";
import { generateNextId } from "../../../utils/idGenerator";
import logger from "../../../utils/logger";
import { addressFromLegacy } from "./customer";

/**
 * Construct composite lookup key for supplier deduplication hierarchy
 */
function getSupplierKey(name: string, phone: string, email: string, gstin: string): string {
    const cleanGstin = String(gstin || "").trim().toUpperCase();
    const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanName = String(name || "").trim().toLowerCase();

    if (cleanGstin) return `gstin:${cleanGstin}`;
    if (cleanPhone) return `phone:${cleanPhone}`;
    if (cleanEmail) return `email:${cleanEmail}`;
    return `name:${cleanName}`;
}

/**
 * Runs supplier migration and PO migration.
 */
export async function migratePurchaseOrders(db: any): Promise<{
    migrated: number;
    skipped: number;
    failed: number;
    suppliersCreated: number;
    suppliersMerged: number;
}> {
    logger.info("Starting supplier migration and purchase order migration...");
    const report = { migrated: 0, skipped: 0, failed: 0, suppliersCreated: 0, suppliersMerged: 0 };

    const rawPurchaseCollection = db.collection("purchases");
    const purchaseordersCollection = db.collection("purchaseorders");

    // 1. Scan and Extract Suppliers from BOTH collections
    const legacyPurchases = await rawPurchaseCollection.find({}).toArray();
    const legacyPOs = await purchaseordersCollection.find({
        $or: [
            { schema_version: { $exists: false } },
            { schema_version: { $lt: 2 } },
        ]
    }).toArray();

    logger.info(`Found ${legacyPurchases.length} V1 purchases and ${legacyPOs.length} legacy POs.`);

    // Pre-load V2 suppliers
    const existingSuppliers = await SupplierModel.find({}).lean();
    logger.info(`Loaded ${existingSuppliers.length} existing suppliers for deduplication.`);

    const uniqueSuppliers: Array<{
        _id: Types.ObjectId;
        supplier_id: string;
        name: string;
        phone: string;
        email: string;
        gstin: string;
        address: string;
    }> = [];

    const supplierLookup = new Map<string, Types.ObjectId>();

    const registerSupplierKeys = (supplierDoc: any) => {
        const id = supplierDoc._id;
        const name = String(supplierDoc.supplier_name || "").trim();
        const phone = String(supplierDoc.phone || "").replace(/\D/g, "").slice(-10);
        const email = String(supplierDoc.email || "").trim().toLowerCase();
        const gstin = String(supplierDoc.gstin || "").trim().toUpperCase();

        if (gstin) supplierLookup.set(`gstin:${gstin}`, id);
        if (phone) supplierLookup.set(`phone:${phone}`, id);
        if (email) supplierLookup.set(`email:${email}`, id);
        if (name) supplierLookup.set(`name:${name.toLowerCase()}`, id);
    };

    for (const s of existingSuppliers) {
        uniqueSuppliers.push({
            _id: s._id as Types.ObjectId,
            supplier_id: s.supplier_id,
            name: s.supplier_name || "",
            phone: s.phone || "",
            email: s.email || "",
            gstin: s.gstin || "",
            address: s.billing_address?.line1 || "",
        });
        registerSupplierKeys(s);
    }

    // Process and deduplicate suppliers from all legacy documents
    const allLegacyDocs = [...legacyPurchases, ...legacyPOs];

    for (const doc of allLegacyDocs) {
        const name = doc.supplier_name || doc.supplier_snapshot?.name;
        const phone = doc.supplier_phone || doc.supplier_snapshot?.phone;
        const email = doc.supplier_email || doc.supplier_snapshot?.email;
        const gstin = doc.supplier_GSTIN || doc.supplier_snapshot?.gstin;
        const address = doc.supplier_address || doc.supplier_snapshot?.address;

        if (!name && !phone && !email && !gstin) {
            continue;
        }

        const cleanG = String(gstin || "").trim().toUpperCase();
        const cleanP = String(phone || "").replace(/\D/g, "").slice(-10);
        const cleanE = String(email || "").trim().toLowerCase();
        const cleanN = String(name || "").trim();

        let matched = uniqueSuppliers.find((us) => cleanG && us.gstin && us.gstin.toUpperCase() === cleanG);
        if (!matched) {
            matched = uniqueSuppliers.find((us) => cleanP && us.phone && us.phone.replace(/\D/g, "").slice(-10) === cleanP);
        }
        if (!matched) {
            matched = uniqueSuppliers.find((us) => cleanE && us.email && us.email.trim().toLowerCase() === cleanE);
        }
        if (!matched) {
            matched = uniqueSuppliers.find((us) => cleanN && us.name && us.name.trim().toLowerCase() === cleanN.toLowerCase());
        }

        if (matched) {
            let modified = false;
            if (!matched.gstin && cleanG) { matched.gstin = cleanG; modified = true; }
            if (!matched.phone && cleanP) { matched.phone = cleanP; modified = true; }
            if (!matched.email && cleanE) { matched.email = cleanE; modified = true; }
            if (!matched.address && address) { matched.address = typeof address === "string" ? address : (address?.line1 || ""); modified = true; }

            if (modified) {
                try {
                    await SupplierModel.updateOne(
                        { _id: matched._id },
                        {
                            $set: {
                                phone: matched.phone || "9999999999",
                                email: matched.email || undefined,
                                gstin: matched.gstin || undefined,
                                billing_address: addressFromLegacy(matched.address),
                                shipping_address: addressFromLegacy(matched.address),
                            },
                        }
                    );
                } catch (updateErr: unknown) {
                    const msg = updateErr instanceof Error ? updateErr.message : String(updateErr);
                    logger.error(`Failed to update supplier ${matched.supplier_id} during merge:`, { error: msg });
                }
            }
            registerSupplierKeys({
                _id: matched._id,
                supplier_name: cleanN,
                phone: cleanP,
                email: cleanE,
                gstin: cleanG,
            });
            report.suppliersMerged++;
        } else {
            try {
                const supplierObjectId = new Types.ObjectId();
                const supplierIdString = await generateNextId("supplier");

                const newSupplier = new SupplierModel({
                    _id: supplierObjectId,
                    schema_version: 1,
                    supplier_id: supplierIdString,
                    supplier_name: cleanN,
                    phone: cleanP || "9999999999",
                    email: cleanE || undefined,
                    gstin: cleanG || undefined,
                    billing_address: addressFromLegacy(address),
                    shipping_address: addressFromLegacy(address),
                    supplier_type: "Vendor",
                    is_active: true,
                    is_archived: false,
                    deletion: { is_deleted: false },
                    createdAt: doc.createdAt || new Date(),
                    updatedAt: doc.updatedAt || new Date(),
                });

                await newSupplier.save();
                report.suppliersCreated++;

                uniqueSuppliers.push({
                    _id: supplierObjectId,
                    supplier_id: supplierIdString,
                    name: cleanN,
                    phone: cleanP,
                    email: cleanE,
                    gstin: cleanG,
                    address: typeof address === "string" ? address : (address?.line1 || ""),
                });

                registerSupplierKeys({
                    _id: supplierObjectId,
                    supplier_name: cleanN,
                    phone: cleanP,
                    email: cleanE,
                    gstin: cleanG,
                });
            } catch (saveErr: unknown) {
                const msg = saveErr instanceof Error ? saveErr.message : String(saveErr);
                logger.error(`Failed to create supplier ${cleanN}:`, { error: msg });
            }
        }
    }



    // 3. Migrate legacy records already in purchaseorders collection
    for (const doc of legacyPOs) {
        try {
            // If it came from legacyPurchases, it is already migrated. Let's make sure we update it if needed.
            const name = doc.supplier_snapshot?.name || doc.supplier_name || "";
            const phone = doc.supplier_snapshot?.phone || doc.supplier_phone || "";
            const email = doc.supplier_snapshot?.email || doc.supplier_email || "";
            const gstin = doc.supplier_snapshot?.gstin || doc.supplier_GSTIN || "";
            const address = doc.supplier_snapshot?.address || doc.supplier_address || "";

            const supplierKey = getSupplierKey(name, phone, email, gstin);
            let supplierId = supplierLookup.get(supplierKey);

            if (!supplierId && doc.supplier_id) {
                supplierId = new Types.ObjectId(doc.supplier_id);
            }

            const supplierSnapshot = {
                name,
                gstin,
                phone,
                email,
                address: addressFromLegacy(address),
            };

            // Map items
            const mappedItems = Array.isArray(doc.items)
                ? doc.items.map((item: any) => {
                      const qty = Number(item.quantity || 0);
                      const price = Number(item.unit_price || item.price || 0);
                      const gstRate = Number(item.rate || item.gst_rate || 0);
                      const taxable = Math.round(qty * price * 100) / 100;
                      const tax = Math.round(((taxable * gstRate) / 100) * 100) / 100;

                      return {
                          item_id: item.item_id ? new Types.ObjectId(item.item_id) : undefined,
                          description: item.description || "",
                          specification: item.specification || "",
                          hsn_sac: item.hsn_sac || item.HSN_SAC || "",
                          unit: item.unit || "Nos",
                          quantity: qty,
                          unit_price: price,
                          taxable_value: taxable,
                          gst_rate: gstRate,
                          total: Math.round((taxable + tax) * 100) / 100,
                      };
                  })
                : [];

            const taxableValue = mappedItems.reduce((acc: number, it: any) => acc + (it.taxable_value || 0), 0);
            const totalTax = mappedItems.reduce((acc: number, it: any) => acc + (it.total || 0) - (it.taxable_value || 0), 0);
            const grandTotal = Number(doc.total_amount || 0);

            const addressState = supplierSnapshot.address?.state || "Karnataka";
            const isInterState = String(addressState).toLowerCase().trim() !== "karnataka";

            const igst = isInterState ? totalTax : 0;
            const cgst = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
            const sgst = isInterState ? 0 : Math.round((totalTax - cgst) * 100) / 100;

            const totals = doc.totals || {
                taxable_value: taxableValue,
                total_tax: totalTax,
                cgst,
                sgst,
                igst,
                round_off: Math.round((grandTotal - (taxableValue + totalTax)) * 100) / 100,
                grand_total: grandTotal,
            };

            const isReceived = !!doc.purchase_invoice_id || doc.purchase_invoice_no;

            await purchaseordersCollection.updateOne(
                { _id: doc._id },
                {
                    $set: {
                        schema_version: 2,
                        purchase_order_no: doc.purchase_order_no || doc.purchase_order_id,
                        purchase_invoice_no: doc.purchase_invoice_no || doc.purchase_invoice_id || undefined,
                        purchase_date: doc.purchase_date ? new Date(doc.purchase_date) : new Date(),
                        due_date: doc.due_date ? new Date(doc.due_date) : undefined,
                        purchase_status: doc.purchase_status || (isReceived ? "Received" : "Ordered"),
                        status: doc.status || (isReceived ? "Invoiced" : "Issued/Sent"),
                        purchase_type: doc.purchase_type || (isInterState ? "Interstate" : "Local"),
                        supplier_id: supplierId,
                        supplier_snapshot: supplierSnapshot,
                        items: mappedItems,
                        totals,
                        remarks: doc.remarks || `Migrated legacy PO record ${doc.purchase_order_no || doc.purchase_order_id}`,
                        deletion: doc.deletion || { is_deleted: Boolean(doc.is_deleted) },
                        is_archived: doc.is_archived ?? false,
                        createdAt: doc.createdAt || new Date(),
                        updatedAt: doc.updatedAt || new Date(),
                    }
                }
            );
            report.migrated++;
        } catch (err: unknown) {
            report.failed++;
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to migrate legacy PO record ${doc.purchase_order_no || doc._id}:`, { error: msg });
        }
    }

    logger.info(`PO migration completed. Migrated/Upgraded: ${report.migrated}, Skipped: ${report.skipped}, Failed: ${report.failed}`);
    return report;
}
