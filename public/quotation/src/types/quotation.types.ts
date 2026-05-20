interface Quotation {
    quotation_id: string;
    project_name: string;
    quotation_date: string;
    customer_name: string;
    customer_address: string;
    customer_phone: string;
    customer_email: string;
    customer_GSTIN?: string;
    items: QuotationItem[];
    non_items: QuotationNonItem[];
}

interface QuotationItem {
    description: string;
    quantity: number;
    unit_price: number;
    rate: number;
    HSN_SAC?: string;
    specification?: string;
}

interface QuotationNonItem {
    description: string;
    price: number;
    rate: number;
}

