/**
 * Service Module Type Definitions
 */

interface ServiceItem {
    description: string;
    HSN_SAC?: string;
    quantity: number;
    unit_price: number;
    rate: number;
    gst_rate?: number;
}

interface ServiceNonItem {
    description: string;
    price: number;
    rate: number;
    gst_rate?: number;
}

interface ServicePayment {
    payment_date: string;
    payment_mode: string;
    paid_amount: number;
    extra_details?: string;
    payment_ref?: string;
}

interface Service {
    _id?: string;
    service_id: string;
    invoice_id: string;
    customer_name?: string;
    project_name?: string;
    service_date: string;
    service_stage: number;
    service_month?: number;
    next_service_month?: number;
    next_service_date?: string;
    service_status?: 'Paused' | 'Active' | 'Scheduled' | 'Completed' | '';
    items: ServiceItem[];
    non_items: ServiceNonItem[];
    total_amount_no_tax: number;
    total_tax: number;
    total_amount_with_tax: number;
    total_paid_amount?: number;
    payments?: ServicePayment[];
    notes?: string;
    declaration?: string;
    terms_and_conditions?: string;
    invoice_date?: string;
    createdAt?: string;
    updatedAt?: string;
    invoice_details?: {
        customer_name?: string;
        customer_phone?: string;
        customer_address?: string;
        project_name?: string;
        customer_id?: string;
    };
}

interface ServiceInvoiceOption {
    invoice_id: string;
    customer_name?: string;
    project_name?: string;
}

interface ServiceFilters {
    search: string;
    date: 'all' | 'today' | 'week' | 'month';
    paymentStatus: 'all' | 'unpaid' | 'paid' | 'partial';
    sort: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
}

interface ServiceState {
    currentTab: 'due' | 'all' | 'completed';
    selectedServiceId: string | null;
    selectedInvoiceId: string | null;
    allInvoices: ServiceInvoiceOption[];
    dueServices: Service[];
    allServices: Service[];
    completedServices: Service[];
    currentFormStep: number;
    isEditing: boolean;
    filters: ServiceFilters;
}
