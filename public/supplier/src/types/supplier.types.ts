/**
 * Supplier Module Types
 */

interface SupplierBankDetails {
    account_name?: string;
    account_number?: string;
    ifsc?: string;
    bank_name?: string;
}

interface Address {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
}

interface Supplier {
    _id?: string;
    supplier_id?: string;
    supplier_name: string;
    phone: string;
    email: string;
    billing_address: Address;
    gstin?: string;
    supplier_type: 'Vendor' | 'Manufacturer' | 'Distributor' | 'Service Provider';
    is_active: boolean;
    remarks?: string;
    bank_details?: SupplierBankDetails;
    createdAt?: string;
    updatedAt?: string;
}

interface SupplierStats {
    total: number;
    active: number;
    inactive: number;
    commercial: number;
}

interface FullSupplierDetails {
    supplier: Supplier;
    stats: {
        totalQuotations: number;
        totalInvoices: number;
        totalServices: number;
        totalPaidAmount: number;
        totalInvoicedAmount: number;
        pendingBalance: number;
    };
    quotations: any[];
    invoices: any[];
    services: any[];
    payments: any[];
}

