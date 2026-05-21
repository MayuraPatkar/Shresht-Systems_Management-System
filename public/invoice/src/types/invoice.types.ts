/**
 * Invoice Module Types
 */

interface IInvoiceAddress {
    line1: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
}

interface ICustomerSnapshot {
    name?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    billing_address?: IInvoiceAddress;
    shipping_address?: IInvoiceAddress;
}

interface IConsignee {
    name?: string;
    address?: IInvoiceAddress;
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

interface InvoiceItem {
    item_id?: string;
    description: string;
    hsn_sac?: string;
    HSN_SAC?: string; // legacy support
    unit?: string;
    quantity: number;
    unit_price: number;
    taxable_value?: number;
    gst_rate?: number;
    rate?: number; // legacy support
    discount_percent?: number;
    total?: number;
}

interface NonInvoiceItem {
    description: string;
    price: number;
    rate: number;
}

interface PaymentRecord {
    payment_date: string;
    payment_mode: string;
    paid_amount: number;
    extra_details?: string;
}

interface Invoice {
    _id?: string;
    invoice_no: string;
    invoice_id: string; // legacy
    quotation_id?: string;
    purchase_order_id?: string;
    invoice_date: string;
    project_name: string;
    po_number?: string;
    po_date?: string;
    dc_number?: string;
    dc_date?: string;
    service_after_months?: number;
    service_stage?: string;
    margin?: number;
    
    // Sub-documents
    customer_id?: string;
    customer_snapshot?: ICustomerSnapshot;
    consignee?: IConsignee;
    totals_original?: ITotals;
    totals_duplicate?: ITotals;

    // Legacy fields (maintained for backward compatibility)
    customer_name?: string;
    customer_address?: string;
    customer_phone?: string;
    customer_email?: string;
    customer_GSTIN?: string;
    consignee_name?: string;
    consignee_address?: string;
    total_amount_original?: number;
    total_amount_duplicate?: number;
    total_tax_original?: number;
    total_tax_duplicate?: number;
    total_paid_amount?: number;
    payment_status: 'Paid' | 'Partial' | 'Unpaid' | string;
    declaration?: string;
    termsAndConditions?: string;
    items_original: InvoiceItem[];
    items_duplicate: InvoiceItem[];
    non_items_original: NonInvoiceItem[];
    non_items_duplicate: NonInvoiceItem[];
    payments: PaymentRecord[];
    createdAt?: string;
    updatedAt?: string;
}
