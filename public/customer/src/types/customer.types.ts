/**
 * Customer Module Types
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

interface Customer {
    _id?: string;
    customer_id?: string;
    customer: ContactInfo;
    billing_address: Address;
    gstin?: string;
    customer_type: 'Commercial' | 'Individual' | 'Government';
    is_active: boolean;
    remarks?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface CustomerStats {
    total: number;
    active: number;
    inactive: number;
    b2b: number;
    b2c: number;
}

interface FullCustomerDetails {
    customer: Customer;
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
