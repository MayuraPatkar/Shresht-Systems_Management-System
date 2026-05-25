import { Types } from "mongoose";

export const QUOTATION_SCHEMA_VERSION = 2;

export const QUOTATION_STATUSES = ["Draft", "Sent", "Approved", "Rejected", "Converted", "Expired"] as const;
export type QuotationStatus = typeof QUOTATION_STATUSES[number];

type Address = {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
};

function money(value: unknown): number {
    const num = Number(value || 0);
    return Math.round((Number.isFinite(num) ? num : 0) * 100) / 100;
}

function toDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value as string);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function validityHasPassed(value?: Date): boolean {
    if (!value) return false;
    const endOfValidDay = new Date(value);
    endOfValidDay.setHours(23, 59, 59, 999);
    return endOfValidDay < new Date();
}

function addressFromLegacy(value: any): Address | undefined {
    if (!value) return undefined;
    if (typeof value === "string") return { line1: value };
    return {
        line1: value.line1 || value.address_line_1 || value.address || "",
        line2: value.line2 || value.address_line_2 || "",
        city: value.city || "",
        state: value.state || "",
        pincode: value.pincode || value.pin || "",
        country: value.country || "India",
    };
}

export function buildCustomerSnapshot(payload: any, customer?: any) {
    const source = customer || {};
    const contact = source.customer || {};
    const billingAddress = payload.customer_snapshot?.billing_address
        || payload.billing_address
        || source.billing_address
        || payload.buyerAddress
        || payload.customer_address;

    return {
        name: payload.customer_snapshot?.name || payload.buyerName || payload.customer_name || contact.name || [contact.first_name, contact.last_name].filter(Boolean).join(" "),
        phone: payload.customer_snapshot?.phone || payload.buyerPhone || payload.customer_phone || contact.phone || "",
        email: payload.customer_snapshot?.email || payload.buyerEmail || payload.customer_email || contact.email || "",
        gstin: payload.customer_snapshot?.gstin || payload.buyerGSTIN || payload.customer_GSTIN || source.gstin || "",
        billing_address: addressFromLegacy(billingAddress) || {},
    };
}

export function normalizeQuotationItem(item: any) {
    const quantity = money(item.quantity);
    const unitPrice = money(item.unit_price ?? item.price);
    const gstRate = money(item.gst_rate ?? item.rate);
    const taxableValue = money(item.taxable_value ?? quantity * unitPrice);
    const taxAmount = money((taxableValue * gstRate) / 100);
    const legacyTotal = item.rate && !item.gst_rate && !item.taxable_value ? item.rate : taxableValue + taxAmount;
    const total = money(item.total ?? legacyTotal);

    return {
        item_id: Types.ObjectId.isValid(item.item_id) ? item.item_id : undefined,
        description: item.description || item.item_name || "",
        specification: item.specification || item.specifications || "",
        hsn_sac: item.hsn_sac || item.HSN_SAC || "",
        unit: item.unit || "",
        unit_price: unitPrice,
        gst_rate: gstRate,
        quantity,
        discount_percent: money(item.discount_percent),
        taxable_value: taxableValue,
        total,
    };
}

export function normalizeOtherCharge(charge: any) {
    const price = money(charge.price ?? charge.unit_price);
    const gstRate = money(charge.gst_rate ?? charge.rate);
    const taxableValue = money(charge.taxable_value ?? price);
    const total = money(charge.total ?? taxableValue + (taxableValue * gstRate) / 100);

    return {
        description: charge.description || "",
        specification: charge.specification || "",
        price,
        gst_rate: gstRate,
        taxable_value: taxableValue,
        total,
    };
}

export function calculateQuotationTotals(items: any[] = [], otherCharges: any[] = [], discount = 0, placeOfSupply = "Karnataka") {
    const taxableBeforeDiscount = money([
        ...items.map(item => money(item.taxable_value ?? Number(item.quantity || 0) * Number(item.unit_price || 0))),
        ...otherCharges.map(charge => money(charge.taxable_value ?? charge.price)),
    ].reduce((sum, value) => sum + value, 0));

    const discountAmount = money(discount);
    const taxableValue = money(Math.max(taxableBeforeDiscount - discountAmount, 0));
    const discountRatio = taxableBeforeDiscount > 0 ? taxableValue / taxableBeforeDiscount : 1;

    const totalTax = money([
        ...items.map(item => money((money(item.taxable_value) * discountRatio * money(item.gst_rate)) / 100)),
        ...otherCharges.map(charge => money((money(charge.taxable_value) * discountRatio * money(charge.gst_rate)) / 100)),
    ].reduce((sum, value) => sum + value, 0));

    const isInterState = String(placeOfSupply || "").trim().toLowerCase() !== "karnataka";
    const igst = isInterState ? totalTax : 0;
    const cgst = isInterState ? 0 : money(totalTax / 2);
    const sgst = isInterState ? 0 : money(totalTax - cgst);
    const unroundedTotal = money(taxableValue + totalTax);
    const roundedGrandTotal = Math.round(unroundedTotal);

    return {
        taxable_value: taxableValue,
        total_tax: totalTax,
        cgst,
        sgst,
        igst,
        round_off: money(roundedGrandTotal - unroundedTotal),
        grand_total: money(roundedGrandTotal),
    };
}

export function normalizeQuotationPayload(payload: any, customer?: any) {
    const items = Array.isArray(payload.items) ? payload.items.map(normalizeQuotationItem) : [];
    const rawOtherCharges = payload.other_charges ?? payload.non_items ?? [];
    const other_charges = Array.isArray(rawOtherCharges)
        ? rawOtherCharges.map(normalizeOtherCharge)
        : rawOtherCharges && typeof rawOtherCharges === "object"
            ? [normalizeOtherCharge(rawOtherCharges)]
            : [];
    const customerSnapshot = buildCustomerSnapshot(payload, customer);
    const validTill = toDate(payload.valid_till || payload.validTill);
    const explicitStatus = QUOTATION_STATUSES.includes(payload.quotation_status) ? payload.quotation_status : "Draft";
    const status: QuotationStatus = explicitStatus !== "Converted" && validityHasPassed(validTill) ? "Expired" : explicitStatus;
    const totals = calculateQuotationTotals(items, other_charges, payload.discount, customerSnapshot.billing_address?.state);

    return {
        schema_version: QUOTATION_SCHEMA_VERSION,
        quotation_no: payload.quotation_no || payload.quotation_id,
        quotation_date: toDate(payload.quotation_date || payload.quotationDate) || new Date(),
        valid_till: validTill,
        quotation_status: status,
        project_name: payload.project_name || payload.projectName,
        customer_id: Types.ObjectId.isValid(payload.customer_id || payload.buyerCustomerId) ? (payload.customer_id || payload.buyerCustomerId) : undefined,
        customer_snapshot: customerSnapshot,
        items,
        other_charges,
        discount: money(payload.discount),
        totals: payload.totals ? { ...totals, ...payload.totals } : totals,
        content: {
            subject: payload.content?.subject || payload.subject || "",
            headline: payload.content?.headline || payload.headline || payload.project_name || payload.projectName || "",
            letter_1: payload.content?.letter_1 || payload.letter_1 || "",
            letter_2: payload.content?.letter_2 || payload.letter_2 || [],
            letter_3: payload.content?.letter_3 || payload.letter_3 || "",
            notes: payload.content?.notes || payload.notes || [],
            terms_and_conditions: payload.content?.terms_and_conditions || payload.termsAndConditions || "",
        },
        duplicated_from: payload.duplicated_from || null,
    };
}

export function normalizeQuotationDocument(doc: any) {
    const q = typeof doc?.toObject === "function" ? doc.toObject() : { ...(doc || {}) };
    const normalized = normalizeQuotationPayload({
        ...q,
        quotation_id: q.quotation_id || q.quotation_no,
        buyerName: q.customer_name,
        buyerAddress: q.customer_address,
        buyerPhone: q.customer_phone,
        buyerEmail: q.customer_email,
        buyerGSTIN: q.customer_GSTIN,
        non_items: q.non_items,
        totalTax: q.total_tax,
        totalAmountNoTax: q.total_amount_no_tax,
        totalAmountTax: q.total_amount_tax,
    });

    const validTill = q.valid_till ? new Date(q.valid_till) : undefined;
    const computedStatus = q.quotation_status !== "Converted" && validityHasPassed(validTill)
        ? "Expired"
        : (q.quotation_status || normalized.quotation_status);

    return {
        ...q,
        ...normalized,
        _id: q._id,
        quotation_no: q.quotation_no || q.quotation_id,
        quotation_id: q.quotation_no || q.quotation_id,
        quotation_status: computedStatus,
        converted_invoice_id: q.converted_invoice_id,
        deletion: q.deletion || { is_deleted: Boolean(q.is_deleted) },
        is_deleted: q.is_deleted ?? q.deletion?.is_deleted ?? false,
        deleted_at: q.deleted_at || q.deletion?.deleted_at,
        deleted_by: q.deleted_by || q.deletion?.deleted_by,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        customer_name: normalized.customer_snapshot.name,
        customer_address: [
            normalized.customer_snapshot.billing_address?.line1,
            normalized.customer_snapshot.billing_address?.line2,
            [normalized.customer_snapshot.billing_address?.city, normalized.customer_snapshot.billing_address?.state].filter(Boolean).join(", "),
            [normalized.customer_snapshot.billing_address?.country, normalized.customer_snapshot.billing_address?.pincode].filter(Boolean).join(" - ")
        ].filter(Boolean).join("\n"),
        customer_phone: normalized.customer_snapshot.phone,
        customer_email: normalized.customer_snapshot.email,
        customer_GSTIN: normalized.customer_snapshot.gstin,
        non_items: normalized.other_charges,
        total_tax: normalized.totals.total_tax,
        total_amount_no_tax: normalized.totals.taxable_value,
        total_amount_tax: normalized.totals.grand_total,
        subject: normalized.content.subject,
        headline: normalized.content.headline,
        letter_1: normalized.content.letter_1,
        letter_2: normalized.content.letter_2,
        letter_3: normalized.content.letter_3,
        notes: normalized.content.notes,
        termsAndConditions: normalized.content.terms_and_conditions,
        customer_type: q.customer_id?.customer_type || '',
    };
}
