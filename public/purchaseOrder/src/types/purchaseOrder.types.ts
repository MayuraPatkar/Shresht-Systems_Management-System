// @ts-nocheck
interface PurchaseOrder {
    purchase_order_id: string;
    purchase_invoice_id?: string;
    purchase_date: string;
    createdAt?: string;
    supplier_name: string;
    supplier_address: string;
    supplier_phone: string;
    supplier_email?: string;
    supplier_GSTIN?: string;
    items: PurchaseOrderItem[];
    total_amount: number;
}

interface PurchaseOrderItem {
    description: string;
    HSN_SAC?: string;
    hsn_sac?: string;
    company?: string;
    type?: 'Material' | 'Asset';
    category?: string;
    quantity: number | string;
    unit_price: number | string;
    rate: number | string;
    specification?: string;
}
