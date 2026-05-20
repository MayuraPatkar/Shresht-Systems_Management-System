/**
 * Reports Module - Type Definitions
 */

interface SavedReport {
    _id: string;
    report_type: 'stock' | 'gst' | 'data_worksheet' | 'purchase_gst';
    report_name?: string;
    generated_at?: string;
    created_at?: string;
    parameters?: any;
    data?: any;
}

interface StockMovement {
    timestamp: string;
    item_name: string;
    movement_type: 'in' | 'out' | 'adjustment';
    quantity_change: number;
    reference_type?: string;
    reference_id?: string;
    notes?: string;
}

interface StockReportSummary {
    total_in: number;
    total_out: number;
    total_adjustments: number;
    net_change: number;
}

interface GstSummary {
    totalTaxableValue: number;
    totalCGST: number;
    totalSGST: number;
    totalGST: number;
}

interface GstTaxRateBreakdown {
    rate: number;
    description: string;
    taxableValue: number;
    cgst: number;
    sgst: number;
}

interface GstHsnBreakdown {
    hsn: string;
    description: string;
    taxableValue: number;
    cgst: number;
    sgst: number;
}

interface GstInvoice {
    invoice_id: string;
    date: string;
    customer: string;
    taxableValue: number;
    cgst: number;
    sgst: number;
    total: number;
}

interface GstReportData {
    summary: GstSummary | null;
    taxRateBreakdown: GstTaxRateBreakdown[];
    hsnBreakdown?: GstHsnBreakdown[];
    invoices: GstInvoice[];
}

interface PurchaseGstItem {
    purchase_order_id: string;
    purchase_invoice_id?: string;
    date: string;
    supplier: string;
    taxableValue: number;
    cgst: number;
    sgst: number;
    total: number;
}

interface PurchaseGstReportData {
    summary: GstSummary | null;
    taxRateBreakdown: GstTaxRateBreakdown[];
    purchases: PurchaseGstItem[];
}

interface WorksheetInputData {
    systemSize: number;
    month: string;
    consumptionUnits: number;
    fuelCharges: number;
    tax: number;
    sanctionedLoad: number;
    demandRate: number;
    additionalCharges: number;
    unitsPerDay: number;
    avgConsumptionRate: number;
    sgyWithRate: number;
    sgyWithoutRate: number;
    exceedUnitRate: number;
}

interface WorksheetCalculations {
    consumptionUnits: number;
    fuelCharges: number;
    tax: number;
    demandCharge: number;
    additionalCharges: number;
    monthlyFixedBill: number;
    avgFuelCharges: number;
    avgTax: number;
    dailyProduction: number;
    monthlyProduction: number;
    solarMinusConsumption: number;
    exceedUnits: number;
    oneMonthConsumption: number;
    totalElectricityBill: number;
    sgyWithExceedUnitTotal: number;
    sgyWithExceedUnitRate: number;
    sgyWithFixedBill: number;
    sgyWithActualBill: number;
    sgyWithMESCOMPay: number;
    sgyWithSolarSaved: number;
    sgyWithoutExceedUnitTotal: number;
    sgyWithoutExceedUnitRate: number;
    sgyWithoutFixedBill: number;
    sgyWithoutActualBill: number;
    sgyWithoutMESCOMPay: number;
    sgyWithoutSolarSaved: number;
}
