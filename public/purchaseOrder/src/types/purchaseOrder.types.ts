// @ts-nocheck
interface IAddress {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
}

interface ISupplierSnapshot {
    name?: string;
    gstin?: string;
    phone?: string;
    email?: string;
    address?: IAddress;
}

interface IPurchaseItem {
    item_id?: string;
    description?: string;
    specification?: string;
    hsn_sac?: string;
    brand?: string;
    category?: string;
    item_type?: "Material" | "Asset";
    unit?: string;
    quantity?: number;
    unit_price?: number;
    taxable_value?: number;
    gst_rate?: number;
    total?: number;
}

interface ITotals {
    taxable_value?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    total_tax?: number;
    round_off?: number;
    grand_total?: number;
}

interface IPurchase {
    purchase_order_no?: string;
    purchase_invoice_no?: string;
    purchase_date: string | Date;
    due_date?: string | Date;
    purchase_status?: "Draft" | "Ordered" | "Received" | "Cancelled" | "Expired";
    purchase_type?: "Local" | "Interstate" | "Import";
    supplier_id?: string;
    supplier_snapshot?: ISupplierSnapshot;
    items?: IPurchaseItem[];
    totals?: ITotals;
    remarks?: string;
    createdAt?: string;
    updatedAt?: string;
}
