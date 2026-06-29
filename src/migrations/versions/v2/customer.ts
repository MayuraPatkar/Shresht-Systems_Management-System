import { Types } from "mongoose";
import { CustomerModel, ICustomer } from "../../../models/Customer.model";
import { generateNextId } from "../../../utils/idGenerator";
import logger from "../../../utils/logger";

interface RawCustomerData {
    name: string;
    phone: string;
    email: string;
    gstin: string;
    address: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export function addressFromLegacy(value: any) {
    if (!value) {
        return {
            line1: "",
            line2: "",
            city: "",
            state: "Karnataka",
            pincode: "",
            country: "India"
        };
    }

    if (typeof value === "string") {
        let remaining = value;

        // Pincode: Match first occurrence of exactly 6 consecutive digits
        let pincode = "";
        const pincodeRegex = /\b\d{6}\b/;
        const pincodeMatch = remaining.match(pincodeRegex);
        if (pincodeMatch) {
            pincode = pincodeMatch[0];
            remaining = remaining.replace(pincodeRegex, "");
        }

        // Country: India, USA, UK, UAE (whole words, case insensitive), default India
        let country = "India";
        const countryRegex = /\b(India|USA|UK|UAE)\b/i;
        const countryMatch = remaining.match(countryRegex);
        if (countryMatch) {
            const matchedCountry = countryMatch[0].trim();
            const upper = matchedCountry.toUpperCase();
            if (upper === "INDIA") country = "India";
            else if (upper === "USA") country = "USA";
            else if (upper === "UK") country = "UK";
            else if (upper === "UAE") country = "UAE";
            else country = matchedCountry;
            remaining = remaining.replace(countryRegex, "");
        }

        // State: Indian states list (case insensitive), default Karnataka
        let state = "Karnataka";
        const states = ['Karnataka', 'Maharashtra', 'Kerala', 'Tamil\\s+Nadu', 'Delhi', 'Goa', 'Andhra\\s+Pradesh'];
        const stateRegex = new RegExp(`\\b(${states.join('|')})\\b`, 'i');
        const stateMatch = remaining.match(stateRegex);
        if (stateMatch) {
            const matchedState = stateMatch[0].trim();
            const lower = matchedState.toLowerCase();
            if (lower === "karnataka") state = "Karnataka";
            else if (lower === "maharashtra") state = "Maharashtra";
            else if (lower === "kerala") state = "Kerala";
            else if (lower === "tamil nadu") state = "Tamil Nadu";
            else if (lower === "delhi") state = "Delhi";
            else if (lower === "goa") state = "Goa";
            else if (lower === "andhra pradesh") state = "Andhra Pradesh";
            else state = matchedState;
            remaining = remaining.replace(stateRegex, "");
        }

        // Put ALL remaining text into line1, clean up extra spaces and commas, and trim
        let line1 = remaining.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim();
        // Remove leading/trailing commas, hyphens, and spaces
        line1 = line1.replace(/^[-,\s]+|[-,\s]+$/g, "").trim();

        return {
            line1,
            line2: "",
            city: "",
            state,
            pincode,
            country
        };
    }

    // If it's already an object, trim all its string fields and clean line2 if it is '-'
    let line1 = String(value.line1 || value.address_line_1 || value.address || "").trim();
    line1 = line1.replace(/^[-,\s]+|[-,\s]+$/g, "").trim();
    
    let line2 = String(value.line2 || value.address_line_2 || "").trim();
    if (line2 === "-") line2 = "";
    
    const city = String(value.city || "").trim();
    const state = String(value.state || "Karnataka").trim();
    const pincode = String(value.pincode || value.pin || "").trim();
    const country = String(value.country || "India").trim();

    return {
        line1,
        line2,
        city,
        state,
        pincode,
        country
    };
}

/**
 * Construct composite lookup key for customer deduplication hierarchy
 */
export function getCustomerKey(name: string, phone: string, email: string, gstin: string): string {
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
 * Runs customer migration
 * Scans quotations, invoices, services, and purchases for customer information.
 * Deduplicates them and saves unique customers.
 * Returns a lookup map from customerKey to customerObjectId.
 */
export async function migrateCustomers(db: any): Promise<{
    lookupMap: Map<string, Types.ObjectId>;
    report: {
        migrated: number;
        skipped: number;
        failed: number;
        duplicatesMerged: number;
    };
}> {
    logger.info("Starting customer extraction and deduplication...");
    const lookupMap = new Map<string, Types.ObjectId>();
    const report = { migrated: 0, skipped: 0, failed: 0, duplicatesMerged: 0 };

    // 1. Pre-load existing customers from V2 collection to ensure idempotency
    const existingCustomers = await CustomerModel.find({}).lean();
    logger.info(`Loaded ${existingCustomers.length} existing customers for deduplication.`);

    const uniqueCustomers: Array<{
        _id: Types.ObjectId;
        customer_id: string;
        name: string;
        phone: string;
        email: string;
        gstin: string;
        address: string;
    }> = [];

    // Helper to map keys to loaded customers
    const registerLookupKeys = (customerDoc: any) => {
        const id = customerDoc._id;
        const name = String(customerDoc.customer?.name || "").trim();
        const phone = String(customerDoc.customer?.phone || "").replace(/\D/g, "").slice(-10);
        const email = String(customerDoc.customer?.email || "").trim().toLowerCase();
        const gstin = String(customerDoc.gstin || "").trim().toUpperCase();

        if (gstin) lookupMap.set(`gstin:${gstin}`, id);
        if (phone) lookupMap.set(`phone:${phone}`, id);
        if (email) lookupMap.set(`email:${email}`, id);
        if (name) lookupMap.set(`name:${name.toLowerCase()}`, id);
    };

    for (const c of existingCustomers) {
        uniqueCustomers.push({
            _id: c._id as Types.ObjectId,
            customer_id: c.customer_id,
            name: c.customer?.name || "",
            phone: c.customer?.phone || "",
            email: c.customer?.email || "",
            gstin: c.gstin || "",
            address: c.billing_address?.line1 || "",
        });
        registerLookupKeys(c);
    }

    // 2. Scan legacy collections for customer data
    const extractedData: RawCustomerData[] = [];

    const scanCollection = async (collectionName: string) => {
        try {
            const collections = await db.listCollections({ name: collectionName }).toArray();
            if (collections.length === 0) {
                logger.info(`Collection ${collectionName} does not exist. Skipping scan.`);
                return;
            }
            const items = await db.collection(collectionName).find({}).toArray();
            logger.info(`Scanning collection: ${collectionName} (${items.length} records)`);
            for (const doc of items) {
                const name = doc.customer_name || doc.buyerName || doc.customer_snapshot?.name;
                const phone = doc.customer_phone || doc.buyerPhone || doc.customer_snapshot?.phone;
                const email = doc.customer_email || doc.buyerEmail || doc.customer_snapshot?.email;
                const gstin = doc.customer_GSTIN || doc.buyerGSTIN || doc.customer_snapshot?.gstin;
                const address = doc.customer_address || doc.buyerAddress || doc.customer_snapshot?.billing_address;

                if (name || phone || email || gstin) {
                    extractedData.push({
                        name: String(name || "").trim(),
                        phone: String(phone || "").trim(),
                        email: String(email || "").trim(),
                        gstin: String(gstin || "").trim(),
                        address: typeof address === "string" ? address : (address?.line1 || ""),
                        createdAt: doc.createdAt,
                        updatedAt: doc.updatedAt,
                    });
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`Error scanning collection ${collectionName} for customers:`, { error: msg });
        }
    };

    await scanCollection("quotations");
    await scanCollection("invoices");
    await scanCollection("services");

    logger.info(`Scanned and found ${extractedData.length} raw customer references.`);

    // 3. Deduplicate and Create/Merge Customers
    for (const raw of extractedData) {
        if (!raw.name && !raw.phone && !raw.email && !raw.gstin) {
            report.skipped++;
            continue;
        }

        const cleanG = String(raw.gstin || "").trim().toUpperCase();
        const cleanP = String(raw.phone || "").replace(/\D/g, "").slice(-10);
        const cleanE = String(raw.email || "").trim().toLowerCase();
        const cleanN = String(raw.name || "").trim();

        // Check if there is an existing match using hierarchy
        let matched = uniqueCustomers.find((uc) => cleanG && uc.gstin && uc.gstin.toUpperCase() === cleanG);
        if (!matched) {
            matched = uniqueCustomers.find((uc) => cleanP && uc.phone && uc.phone.replace(/\D/g, "").slice(-10) === cleanP);
        }
        if (!matched) {
            matched = uniqueCustomers.find((uc) => cleanE && uc.email && uc.email.trim().toLowerCase() === cleanE);
        }
        if (!matched) {
            matched = uniqueCustomers.find((uc) => cleanN && uc.name && uc.name.trim().toLowerCase() === cleanN.toLowerCase());
        }

        if (matched) {
            // Merge empty fields
            let modified = false;
            if (!matched.gstin && cleanG) { matched.gstin = cleanG; modified = true; }
            if (!matched.phone && cleanP) { matched.phone = cleanP; modified = true; }
            if (!matched.email && cleanE) { matched.email = cleanE; modified = true; }
            if (!matched.address && raw.address) { matched.address = raw.address; modified = true; }

            if (modified) {
                try {
                    const nameParts = matched.name.split(/\s+/);
                    const firstName = nameParts[0] || matched.name;
                    const lastName = nameParts.slice(1).join(" ") || "";
                    await CustomerModel.updateOne(
                        { _id: matched._id },
                        {
                            $set: {
                                "customer.phone": matched.phone,
                                "customer.email": matched.email,
                                gstin: matched.gstin || undefined,
                                billing_address: addressFromLegacy(matched.address),
                                shipping_address: addressFromLegacy(matched.address),
                                customer_type: matched.gstin ? "Commercial" : "Individual",
                            },
                        }
                    );
                } catch (updateErr: unknown) {
                    const msg = updateErr instanceof Error ? updateErr.message : String(updateErr);
                    logger.error(`Failed to update customer ${matched.customer_id} during merge:`, { error: msg });
                }
            }

            // Register all keys of this merge to lookup map
            registerLookupKeys({
                _id: matched._id,
                customer: { name: cleanN, phone: cleanP, email: cleanE },
                gstin: cleanG,
            });
            report.duplicatesMerged++;
        } else {
            // Create new customer document
            try {
                const customerObjectId = new Types.ObjectId();
                const customerIdString = await generateNextId("customer");
                const nameParts = cleanN.split(/\s+/);
                const firstName = nameParts[0] || cleanN;
                const lastName = nameParts.slice(1).join(" ") || "";

                const newCustomer = new CustomerModel({
                    _id: customerObjectId,
                    schema_version: 1,
                    customer_id: customerIdString,
                    customer: {
                        first_name: firstName,
                        last_name: lastName,
                        name: cleanN,
                        phone: cleanP,
                        email: cleanE,
                    },
                    contact_person: {
                        first_name: firstName,
                        last_name: lastName,
                        name: cleanN,
                        phone: cleanP,
                        email: cleanE,
                    },
                    gstin: cleanG || undefined,
                    billing_address: addressFromLegacy(raw.address),
                    shipping_address: addressFromLegacy(raw.address),
                    customer_type: cleanG ? "Commercial" : "Individual",
                    is_active: true,
                    is_archived: false,
                    deletion: { is_deleted: false },
                    createdAt: raw.createdAt || new Date(),
                    updatedAt: raw.updatedAt || new Date(),
                });

                await newCustomer.save();
                report.migrated++;

                // Register in memory unique list and lookup map
                const ucItem = {
                    _id: customerObjectId,
                    customer_id: customerIdString,
                    name: cleanN,
                    phone: cleanP,
                    email: cleanE,
                    gstin: cleanG,
                    address: raw.address,
                };
                uniqueCustomers.push(ucItem);
                registerLookupKeys({
                    _id: customerObjectId,
                    customer: { name: cleanN, phone: cleanP, email: cleanE },
                    gstin: cleanG,
                });
            } catch (saveErr: unknown) {
                report.failed++;
                const msg = saveErr instanceof Error ? saveErr.message : String(saveErr);
                logger.error(`Failed to create new customer for ${cleanN}:`, { error: msg });
            }
        }
    }

    logger.info(`Customer migration completed. Migrated: ${report.migrated}, Merged: ${report.duplicatesMerged}, Failed: ${report.failed}`);
    return { lookupMap, report };
}
