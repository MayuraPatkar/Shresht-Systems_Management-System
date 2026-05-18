/**
 * Supplier Module Types
 */

interface ContactInfo {
    first_name: string;
    last_name?: string;
    name?: string;
    phone: string;
    alternate_phone?: string;
    email: string;
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
    supplier: ContactInfo;
    billing_address: Address;
    gstin?: string;
    supplier_type: 'Vendor' | 'Manufacturer' | 'Distributor' | 'Service Provider';
    is_active: boolean;
    remarks?: string;
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

