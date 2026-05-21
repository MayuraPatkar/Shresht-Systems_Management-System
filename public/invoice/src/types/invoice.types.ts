/**
 * Invoice Module Types
 */

enum InvoiceStatus {
    DRAFT = 'DRAFT',
    SENT = 'SENT',
    OVERDUE = 'OVERDUE',
    PARTIALLY_PAID = 'PARTIALLY_PAID',
    PAID = 'PAID',
    CANCELLED = 'CANCELLED',
    REFUNDED = 'REFUNDED'
}

interface InvoiceStatusDetail {
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
}

const INVOICE_STATUS_DETAILS: Record<InvoiceStatus, InvoiceStatusDetail> = {
    [InvoiceStatus.DRAFT]: { label: 'Draft', bgClass: 'bg-gray-100', textClass: 'text-gray-800', borderClass: 'from-gray-400 to-gray-500' },
    [InvoiceStatus.SENT]: { label: 'Sent', bgClass: 'bg-blue-100', textClass: 'text-blue-800', borderClass: 'from-blue-500 to-blue-600' },
    [InvoiceStatus.OVERDUE]: { label: 'Overdue', bgClass: 'bg-red-100', textClass: 'text-red-800', borderClass: 'from-red-500 to-red-600' },
    [InvoiceStatus.PARTIALLY_PAID]: { label: 'Partially Paid', bgClass: 'bg-orange-100', textClass: 'text-orange-800', borderClass: 'from-orange-500 to-orange-600' },
    [InvoiceStatus.PAID]: { label: 'Paid', bgClass: 'bg-green-100', textClass: 'text-green-800', borderClass: 'from-green-500 to-green-600' },
    [InvoiceStatus.CANCELLED]: { label: 'Cancelled', bgClass: 'bg-gray-200', textClass: 'text-gray-700', borderClass: 'from-gray-500 to-gray-600' },
    [InvoiceStatus.REFUNDED]: { label: 'Refunded', bgClass: 'bg-purple-100', textClass: 'text-purple-800', borderClass: 'from-purple-500 to-purple-600' }
};

function getInvoiceStatus(invoice: Invoice): InvoiceStatus {
    if (invoice.status) return invoice.status as InvoiceStatus;
    
    // Fallback: map legacy fields
    const legacyStatus = invoice.invoice_status;
    const paymentStatus = invoice.payment_status;
    if (legacyStatus === 'Draft') return InvoiceStatus.DRAFT;
    if (legacyStatus === 'Cancelled') return InvoiceStatus.CANCELLED;
    if (legacyStatus === 'Expired') return InvoiceStatus.OVERDUE;
    
    // Legacy Issued / other
    if (paymentStatus === 'Paid') return InvoiceStatus.PAID;
    if (paymentStatus === 'Partial') return InvoiceStatus.PARTIALLY_PAID;
    return InvoiceStatus.SENT;
}

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
    status?: InvoiceStatus;
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
    invoice_status?: string;
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
