/**
 * E-Way Bill Module Types
 */

interface EWayBillItem {
    stock_id?: string | null;
    description: string;
    hsn_sac: string;
    quantity: number;
    unit_price: number;
    gst_rate: number;
    taxable_value?: number;
    total?: number;
}

interface TransportDetails {
    mode: 'Road' | 'Rail' | 'Air' | 'Ship' | '';
    vehicle_number?: string;
    transporter_id?: string;
    transporter_name?: string;
    distance_km?: number;
}

interface EWayBill {
    _id?: string;
    ewaybill_no?: string;
    ewaybill_status: 'Draft' | 'Generated' | 'Cancelled' | 'Expired';
    ewaybill_date?: string;
    ewaybill_generated_at?: string;
    invoice_id?: string | { _id: string; invoice_no?: string; invoice_id?: string };
    from_address?: string;
    to_address?: string;
    transport?: TransportDetails;
    items?: EWayBillItem[];
    total_taxable_value?: number;
    cgst?: number;
    sgst?: number;
    total_invoice_value?: number;
    totals?: {
        taxable_value?: number;
        cgst?: number;
        sgst?: number;
        igst?: number;
        total_tax?: number;
        round_off?: number;
        grand_total?: number;
    };
    is_archived?: boolean;
    deletion?: {
        is_deleted: boolean;
        deleted_at?: string;
        deleted_by?: string;
    };
    createdAt?: string;
    updatedAt?: string;
}

interface EWayBillFormPayload {
    _id: string;
    invoiceId: string;
    eWayBillNo: string;
    eWayBillStatus: 'Draft' | 'Generated' | 'Cancelled' | 'Expired';
    eWayBillDate: string;
    fromAddress: string;
    toAddress: string;
    transportMode: 'Road' | 'Rail' | 'Air' | 'Ship' | '';
    vehicleNumber: string;
    transporterId: string;
    transporterName: string;
    distanceKm: number;
    items: Array<{
        stock_id?: string;
        description: string;
        hsn_sac: string;
        quantity: number | string;
        unit_price: number | string;
        gst_rate: number | string;
    }>;
}
