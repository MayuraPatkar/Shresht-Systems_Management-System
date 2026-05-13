/**
 * Type definitions for the Stock module.
 * All interfaces and external global declarations.
 */

// ─── Stock Item (from API) ───────────────────────────────────────────────────

interface StockItem {
    _id: string;
    item_name: string;
    hsn_sac: string;
    brand: string;
    purchase_price: number;
    stock_quantity: number;
    gst_rate: number;
    margin: number;
    min_stock_quantity: number;
    item_type: string;
    category: string;
    specifications?: string;
    unit?: string;
    selling_price?: number;
    remarks?: string;
    schema_version?: number;
    is_active?: boolean;
    is_deleted?: boolean;
    deleted_at?: string;
    deleted_by?: string;
    createdAt?: string;
    updatedAt?: string;
}

// ─── Quantity Modal State ────────────────────────────────────────────────────

interface QuantityModalData {
    action: string;
    itemId: string;
    itemName: string;
}

// ─── Sort State ──────────────────────────────────────────────────────────────

interface SortState {
    field: string | null;
    direction: 'asc' | 'desc';
}

// ─── Action option for table row dropdown ────────────────────────────────────

interface ActionOption {
    value: string;
    label: string;
    icon: string;
}

// ─── Electron API ────────────────────────────────────────────────────────────

interface ElectronAPI {
    showAlert1: (message: string) => void;
    showAlert2: (message: string) => void;
    receiveAlertResponse: (callback: (response: string) => void) => void;
    handlePrintEvent?: (content: string, action: string, name: string) => void;
}

// ─── Window augmentation for globals from shared scripts ─────────────────────

interface Window {
    electronAPI: ElectronAPI;
    formatIndian: (value: number | string, decimals?: number) => string;
    formatDateDisplay?: (date: Date) => string;
    handlePrint?: (content: string, action: string, name: string) => void;
}

// ─── External globals from shared scripts (loaded before stock module) ───────

declare function formatIndian(value: number | string, decimals?: number): string;
