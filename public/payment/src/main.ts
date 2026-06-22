/**
 * payment.ts
 *
 * Frontend logic for the Payments tab.
 * Handles CRUD, filtering, search, and summary display.
 *
 * Compile:  npx tsc -p tsconfig.public.json
 * Output:   public/payment/main.js
 */

// ── Interfaces ─────────────────────────────────────────
interface IPaymentRecord {
    _id: string;
    schema_version: number;
    payment_date: string;
    amount: number;
    direction: 'IN' | 'OUT';
    party?: {
        type?: 'Customer' | 'Supplier';
        id?: string;
        ref?: string;
    };
    party_type?: 'Customer' | 'Supplier';
    party_id?: string;
    party_display_id?: string;
    reference?: {
        type?: 'Invoice' | 'Purchase' | 'Service' | 'Adjustment';
        id?: string;
        ref?: string;
    };
    reference_type?: 'Invoice' | 'Purchase' | 'Service' | 'Adjustment';
    reference_id?: string;
    reference_ref?: string;
    mode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
    transaction_details?: string;
    is_advance: boolean;
    is_refund?: boolean;
    refunded_payment_ref?: string;
    is_already_refunded?: boolean;
    refund_payment_id?: string;
    remarks?: string;
    voucher_no?: string;
    status: string; // Added status field
    createdBy?: string; // Added for audit tracking
    deletion: {
        is_deleted: boolean;
        deleted_at?: string;
        deleted_by?: string;
    };
    createdAt: string;
    updatedAt: string;
}

interface IPaymentPayload {
    direction: 'IN' | 'OUT';
    amount: number;
    payment_date: string;
    mode: string;
    party_type?: string;
    party_id?: string;
    reference_type?: string;
    reference_id?: string;
    transaction_details?: string;
    is_advance: boolean;
    is_refund?: boolean;
    refunded_payment_ref?: string;
    remarks?: string;
    status: string; // Added status field
}

interface IApiResponse {
    success: boolean;
    message?: string;
    payments?: IPaymentRecord[];
    payment?: IPaymentRecord;
}

// Extend Window for globally-exposed payment UI handlers
interface Window {
    _paymentUI: {
        editPayment: (id: string) => void;
        viewPayment: (id: string) => void;
        refundPayment?: (id: string) => void;
        printPayment?: (id: string) => void;
    };
    validateCurrentStep?: () => Promise<boolean>;
}
(function (): void {
    'use strict';

    // ── State ───────────────────────────────
    let allPayments: IPaymentRecord[] = [];
    let filteredPayments: IPaymentRecord[] = [];
    let paginationManager: any = null;
    let currentFilter: string = 'all';
    let editingId: string | null = null;
    let refundedPaymentId: string | null = null;
    let selectedDetailsPayment: IPaymentRecord | null = null;
    let submitPartyTypeOverride: 'Customer' | 'Supplier' | null = null;
    let shortcutsModalRef: HTMLElement | null = null;
    let validator: any = null;
    const advancedFilters = {
        txType: '',
        status: '',
        party: '',
        mode: '',
        referenceType: '',
        amountMin: null as number | null,
        amountMax: null as number | null,
        dateRange: 'all', // 'today', 'week', 'month', 'quarter', 'year', 'custom', 'all'
        startDate: '',
        endDate: ''
    };

    // ── DOM Refs ──────────────────────────────────────────
    const $tbody = document.getElementById('payment-tbody') as HTMLTableSectionElement;
    const $totalIn = document.getElementById('total-in') as HTMLElement | null;
    const $totalOut = document.getElementById('total-out') as HTMLElement | null;
    const $netBalance = document.getElementById('net-balance') as HTMLElement | null;
    const $totalCount = document.getElementById('total-count') as HTMLElement | null;
    const $filterCount = document.getElementById('filter-count') as HTMLElement | null;
    const $searchInput = document.getElementById('search-input') as HTMLInputElement;
    const $filterPopover = document.getElementById('filter-popover') as HTMLDivElement;
    const $filterBtn = document.getElementById('filter-btn') as HTMLButtonElement;
    const $refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;

    // Redesigned DOM elements
    const $trendMoneyIn = document.getElementById('trend-money-in') as HTMLElement | null;
    const $trendMoneyOut = document.getElementById('trend-money-out') as HTMLElement | null;
    const $netBalanceSub = document.getElementById('net-balance-sub') as HTMLElement | null;
    const $transactionsSub = document.getElementById('transactions-sub') as HTMLElement | null;
    const $filterChipsContainer = document.getElementById('filter-chips-container') as HTMLDivElement;
    const $chipsList = document.getElementById('chips-list') as HTMLDivElement;
    const $clearAllChips = document.getElementById('clear-all-chips') as HTMLButtonElement;
    const $searchSuggestions = document.getElementById('search-suggestions') as HTMLUListElement;
    const $paymentCardsMobile = document.getElementById('payment-cards-mobile') as HTMLDivElement;

    const $newSec = document.getElementById('new') as HTMLDivElement;
    const $homeSec = document.getElementById('home') as HTMLDivElement;
    const $homeBtn = document.getElementById('home-btn') as HTMLButtonElement;
    const $form = document.getElementById('payment-form') as HTMLFormElement;
    const $formPaymentId = document.getElementById('form-payment-id') as HTMLInputElement;
    const $modalTitle = document.getElementById('modal-title') as HTMLElement;
    const $modalSubtitle = document.getElementById('modal-subtitle') as HTMLElement;
    const $submitBtnText = document.getElementById('submit-btn-text') as HTMLElement;

    // Party DOM Refs
    const $partyNameInput = document.getElementById('form-party-name') as HTMLInputElement;
    const $partyIdHidden = document.getElementById('form-party-id-hidden') as HTMLInputElement;
    const $partySuggestions = document.getElementById('party-suggestions') as HTMLUListElement;
    const $partyDetailsContainer = document.getElementById('party-details-container') as HTMLElement;
    const $partyProfileCardContainer = document.getElementById('party-profile-card-container') as HTMLElement;
    const $previewPartyName = document.getElementById('preview-party-name') as HTMLElement;
    const $previewPartyPhone = document.getElementById('preview-party-phone') as HTMLElement;
    const $previewPartyGstin = document.getElementById('preview-party-gstin') as HTMLElement;
    const $previewPartyEmail = document.getElementById('preview-party-email') as HTMLElement;
    const $previewPartyAddress = document.getElementById('preview-party-address') as HTMLElement;

    const $detailsModal = document.getElementById('payment-details-modal') as HTMLDivElement;
    const $detailsSubtitle = document.getElementById('details-subtitle') as HTMLElement;
    const $detailsIcon = document.getElementById('details-icon') as HTMLElement;
    const $detailsAmount = document.getElementById('details-amount') as HTMLElement;
    const $detailsDirection = document.getElementById('details-direction') as HTMLElement;
    const $detailsDate = document.getElementById('details-date') as HTMLElement;
    const $detailsMode = document.getElementById('details-mode') as HTMLElement;
    const $detailsParty = document.getElementById('details-party') as HTMLElement;
    const $detailsReference = document.getElementById('details-reference') as HTMLElement;
    const $detailsTransaction = document.getElementById('details-transaction') as HTMLElement;
    const $detailsTransactionLabel = document.getElementById('details-transaction-label') as HTMLElement | null;
    const $detailsRemarks = document.getElementById('details-remarks') as HTMLElement;

    // ── Helpers ───────────────────────────────────────────
    function formatCurrency(n: number): string {
        return '₹ ' + Number(n || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatDate(d: string | undefined): string {
        if (!d) return '-';
        const dt = new Date(d);
        return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function escapeHtml(value: string | undefined): string {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function valOrDash(value: string | undefined): string {
        const trimmed = String(value || '').trim();
        return trimmed || '-';
    }

    function updateTransactionDetailsFields(mode: string): void {
        const label = document.getElementById('label-transaction-details') || document.querySelector('label[for="form-transaction-details"]');
        const input = document.getElementById('form-transaction-details') as HTMLInputElement | null;
        if (!label || !input) return;

        if (mode === 'Cash') {
            label.innerHTML = '<i class="fas fa-map-marker-alt text-gray-500 mr-1"></i>Cash Location';
            input.placeholder = 'e.g. Counter 1, Main Office, Branch Name';
        } else if (mode === 'UPI') {
            label.innerHTML = '<i class="fas fa-mobile-alt text-gray-500 mr-1"></i>UPI Transaction ID';
            input.placeholder = 'e.g. UPI Ref / UTR / Transaction ID';
        } else if (mode === 'Bank Transfer') {
            label.innerHTML = '<i class="fas fa-university text-gray-500 mr-1"></i>Bank Name';
            input.placeholder = 'e.g. HDFC Bank, SBI';
        } else if (mode === 'Cheque') {
            label.innerHTML = '<i class="fas fa-money-check text-gray-500 mr-1"></i>Cheque Number & Bank';
            input.placeholder = 'e.g. Cheque No. 123456 - ICICI Bank';
        } else {
            label.innerHTML = '<i class="fas fa-info-circle text-gray-500 mr-1"></i>Transaction Details';
            input.placeholder = 'UTR / Cheque No. / Bank Ref.';
        }
    }

    function todayISO(): string {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function showToast(msg: string, isError?: boolean): void {
        const $toast = document.getElementById('toast') as HTMLElement;
        const $msg = document.getElementById('toast-message') as HTMLElement;
        if (!$toast || !$msg) return;
        $msg.textContent = msg;
        $toast.className = $toast.className.replace('bg-green-600', '').replace('bg-red-600', '');
        $toast.classList.add(isError ? 'bg-red-600' : 'bg-green-600');
        $toast.classList.remove('hidden');
        setTimeout(() => $toast.classList.add('hidden'), 3000);
    }

    function getReceiptHTML(
        payment: IPaymentRecord,
        companyInfo: any = null,
        partyDetails: { name: string; phone: string; gstin: string; email: string; address: string } | null = null,
        refDetails: { id: string; date: string; amount: number; paid: number; refunded: number; balance: number; status: string } | null = null
    ): string {
        const type = getTransactionTypeLabel(payment);
        const amountStr = formatCurrency(payment.amount);
        const dateStr = formatDate(payment.payment_date);
        
        // Company branding fallbacks
        const company = companyInfo || {
            company_name: 'SHRESHT SYSTEMS',
            address: { line1: 'Company Address', line2: '', city: '', state: '', pincode: '', country: 'India' },
            phone: { ph1: '0000000000', ph2: '' },
            email: 'email@company.com',
            website: 'www.company.com',
            gstin: 'GSTIN Number'
        };
        const companyName = (company.company_name || 'SHRESHT SYSTEMS').toUpperCase();
        const companyAddress = typeof company.address === 'string'
            ? company.address
            : [company.address?.line1, company.address?.line2, company.address?.city, company.address?.state ? company.address.state + (company.address.pincode ? ' - ' + company.address.pincode : '') : ''].filter(Boolean).join(', ') || 'Company Address';
        const companyPhone = company.phone ? `${company.phone.ph1}${company.phone.ph2 ? ' / ' + company.phone.ph2 : ''}` : '';
        
        // Status resolution
        let statusLabel = 'PAID';
        let statusBadgeClass = 'badge-paid';
        if (payment.is_refund) {
            statusLabel = 'REFUND';
            statusBadgeClass = 'badge-refunded';
        } else if (payment.is_already_refunded) {
            statusLabel = 'REFUNDED';
            statusBadgeClass = 'badge-refunded';
        } else if (payment.is_advance) {
            statusLabel = 'ADVANCE';
            statusBadgeClass = 'badge-partial'; // amber
        } else if (payment.status) {
            const statusLower = payment.status.toLowerCase();
            if (statusLower === 'partially paid' || statusLower === 'partial') {
                statusLabel = 'PARTIALLY PAID';
                statusBadgeClass = 'badge-partial';
            } else if (statusLower === 'pending') {
                statusLabel = 'PENDING';
                statusBadgeClass = 'badge-pending';
            }
        }

        // Party fields
        const partyName = partyDetails?.name || payment.party_name || '-';
        const partyPhone = partyDetails?.phone || '-';
        const partyGstin = partyDetails?.gstin || '-';
        const partyEmail = partyDetails?.email || '-';
        const partyAddress = partyDetails?.address || '-';

        // Settlement table
        let settlementHTML = '';
        if (refDetails && payment.reference_type === 'Invoice') {
            const outstanding = refDetails.balance;
            const isSettled = outstanding <= 0;
            const settlementStatusLabel = isSettled ? 'FULLY SETTLED' : 'OUTSTANDING';
            const settlementStatusClass = isSettled ? 'status-badge badge-paid' : 'status-badge badge-partial';
            
            settlementHTML = `
                <div class="settlement-card">
                    <div class="card-title">Invoice Settlement Summary</div>
                    <table class="settlement-table">
                        <thead>
                            <tr>
                                <th>Invoice Number</th>
                                <th class="amount-col">Invoice Amount</th>
                                <th class="amount-col">Amount Paid</th>
                                <th class="amount-col">Balance Amount</th>
                                <th style="text-align: center; width: 140px;">Settlement Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="strong">${refDetails.id}</td>
                                <td class="amount-col">₹&nbsp;${formatCurrency(refDetails.amount).replace('₹', '').trim()}</td>
                                <td class="amount-col">₹&nbsp;${formatCurrency(refDetails.paid).replace('₹', '').trim()}</td>
                                <td class="amount-col strong">₹&nbsp;${formatCurrency(outstanding).replace('₹', '').trim()}</td>
                                <td style="text-align: center;">
                                    <span class="${settlementStatusClass}" style="padding: 3px 10px; font-size: 9px;">${settlementStatusLabel}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }

        const printTimeStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <html>
            <head>
                <title>Payment Receipt - ${payment._id}</title>
                <style>
                    body {
                        font-family: 'Inter', system-ui, -apple-system, sans-serif;
                        margin: 0;
                        padding: 0;
                        color: #1e293b;
                        background-color: #ffffff;
                        line-height: 1.5;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    h1, h2, h3, p { margin: 0; }
                    .receipt-container {
                        width: 210mm;
                        max-width: 210mm;
                        min-height: 297mm;
                        margin: 30px auto;
                        padding: 30px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        box-sizing: border-box;
                        position: relative;
                        background: #ffffff url("../assets/icon2.png") no-repeat center/40%;
                    }
                    @media print {
                        @page {
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        .receipt-container {
                            margin: 0;
                            padding: 30px;
                            box-shadow: none;
                            border: none;
                            border-radius: 0;
                            width: 100%;
                            max-width: 100%;
                            min-height: 100%;
                        }
                    }
                    
                    /* Exact Invoice Header Banner styles */
                    .header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 20px 30px;
                        margin-bottom: 24px;
                        background: #1a365d;
                        border-radius: 12px;
                        color: #ffffff;
                        border: none;
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                        box-sizing: border-box;
                    }
                    .quotation-brand {
                        display: flex;
                        align-items: center;
                        gap: 20px;
                    }
                    .logo {
                        width: 80px;
                        height: 80px;
                        background: #ffffff;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                        box-sizing: border-box;
                    }
                    .logo img {
                        width: 50px;
                        height: 50px;
                        object-fit: contain;
                    }
                    .quotation-brand-text h1 {
                        margin: 0;
                        color: #ffffff;
                        font-size: 26px;
                        letter-spacing: -0.5px;
                        font-weight: 800;
                        line-height: 1.1;
                    }
                    .quotation-tagline {
                        margin: 4px 0 0 0;
                        color: #e2e8f0;
                        font-size: 13px;
                        font-weight: 500;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                    }
                    .company-details {
                        text-align: right;
                        line-height: 1.6;
                    }
                    .company-details p {
                        margin: 0;
                        color: #f1f5f9;
                        font-size: 12px;
                        font-weight: 500;
                    }
                    
                    /* Title & Badge Row */
                    .receipt-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
                    .receipt-title-box h2 { font-size: 24px; font-weight: 800; color: #1e3a66; letter-spacing: -0.5px; text-transform: uppercase; }
                    .receipt-meta { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 500; }
                    
                    /* Settlement Table */
                    .settlement-card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
                    .settlement-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    .settlement-table th { text-align: left; padding: 8px 10px; background-color: #f8fafc; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
                    .settlement-table td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: 500; color: #334155; }
                    .settlement-table td.strong { font-weight: 700; color: #1e293b; }
                    .settlement-table td.amount-col { text-align: right; }
                    .settlement-table th.amount-col { text-align: right; }
                    
                    /* Footer */
                    .footer-note { border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 32px; text-align: center; font-size: 10px; color: #94a3b8; font-weight: 500; }
                    
                    @media print {
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="receipt-container">
                    <!-- Brand Navy Header (Exact Invoice Style) -->
                    <div class="header">
                        <div class="quotation-brand">
                            <div class="logo">
                                <img src="../assets/icon.png" alt="SSMS Logo">
                            </div>
                            <div class="quotation-brand-text">
                                <h1>${companyName}</h1>
                                <p class="quotation-tagline">CCTV & Energy Solutions</p>
                            </div>
                        </div>
                        <div class="company-details">
                            <p>${companyAddress}</p>
                            <p>Ph: ${companyPhone}</p>
                            <p>GSTIN: ${company.gstin}</p>
                            <p>Email: ${company.email}</p>
                            <p>Website: ${company.website}</p>
                        </div>
                    </div>
                    
                    <!-- Title row -->
                    <div class="receipt-header-row">
                        <div class="receipt-title-box">
                            <h2>Payment Receipt</h2>
                            <div class="receipt-meta">
                                Receipt No: <span>${payment._id.substring(payment._id.length - 6).toUpperCase()}</span> &nbsp;|&nbsp; 
                                Date: <span>${dateStr}</span>
                            </div>
                        </div>
                        <div>
                            <span class="status-badge ${statusBadgeClass}">${statusLabel}</span>
                        </div>
                    </div>
                    
                    <!-- Settlement summary section -->
                    ${settlementHTML}
                    
                    <!-- Footer Note -->
                    <div class="footer-note">
                        This receipt confirms successful receipt of payment. Generated by SSMS ERP on ${printTimeStr}.
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    async function printPaymentReceipt(payment: IPaymentRecord): Promise<void> {
        // Fetch company info
        const companyInfo = (window as any).companyConfig ? await (window as any).companyConfig.getCompanyInfo() : null;

        // Fetch party details
        const partyType = payment.party_type || (payment.direction === 'IN' ? 'Customer' : 'Supplier');
        let partyDetails = null;
        if (payment.party_id) {
            try {
                const res = await fetch(`/payment/get-party-details-by-id/${partyType}/${payment.party_id}`);
                const data = await res.json();
                if (data.success && data.party) {
                    const p = data.party;
                    let address = null;
                    if (partyType === 'Customer') {
                        address = p.billing_address;
                    } else {
                        address = p.billing_address || p.address;
                    }
                    const addrStr = address ? [address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(', ') : '-';
                    partyDetails = {
                        name: (partyType === 'Customer' ? p.customer?.name || p.customer?.first_name : p.supplier_name) || '-',
                        phone: (partyType === 'Customer' ? p.customer?.phone : p.phone) || '-',
                        gstin: p.gstin || '-',
                        email: (partyType === 'Customer' ? p.customer?.email : p.email) || '-',
                        address: addrStr
                    };
                }
            } catch (e) {
                console.error('Failed to fetch party details for printing', e);
            }
        }

        // Fetch reference details
        let refDetails = null;
        if (payment.reference_id && payment.reference_type && payment.reference_type !== 'Adjustment') {
            try {
                const res = await fetch(`/payment/get-reference-details/${payment.reference_type}/${payment.reference_id}`);
                const data = await res.json();
                if (data.success && data.details) {
                    const details = data.details;
                    let idStr = '-';
                    let dateStr = '-';
                    let rawAmount = 0;
                    if (payment.reference_type === 'Invoice') {
                        idStr = details.invoice_no || details.invoice_id || '-';
                        dateStr = details.invoice_date ? formatDate(details.invoice_date) : '-';
                        rawAmount = details.totals?.grand_total || details.total_amount_original || details.amount || 0;
                    } else if (payment.reference_type === 'Purchase') {
                        idStr = details.purchase_invoice_no || details.purchase_order_no || '-';
                        dateStr = details.purchase_date ? formatDate(details.purchase_date) : '-';
                        rawAmount = details.totals?.grand_total || details.total_amount_original || details.amount || 0;
                    } else if (payment.reference_type === 'Service') {
                        idStr = details.service_no || '-';
                        dateStr = details.service_date ? formatDate(details.service_date) : '-';
                        rawAmount = details.totals?.grand_total || details.total_amount_original || details.amount || 0;
                    }
                    const rawPaid = details.total_paid_amount || 0;
                    const rawRefund = details.refund_amount || 0;
                    const rawBalance = Math.max(0, rawAmount - rawPaid + rawRefund);
                    refDetails = {
                        id: idStr,
                        date: dateStr,
                        amount: rawAmount,
                        paid: rawPaid,
                        refunded: rawRefund,
                        balance: rawBalance,
                        status: details.status || '-'
                    };
                }
            } catch (e) {
                console.error('Failed to fetch reference details for printing', e);
            }
        }

        const htmlContent = getReceiptHTML(payment, companyInfo, partyDetails, refDetails);
        const cleanPartyName = ((payment as any).party_name || payment.party_display_id || 'Receipt').replace(/[^a-zA-Z0-9-_]/g, '_');
        const paymentDate = payment.payment_date ? payment.payment_date.split('T')[0] : '';
        const filename = `PaymentReceipt-${cleanPartyName}${paymentDate ? '-' + paymentDate : ''}`;

        const electronAPI = (window as any).electronAPI;
        if (electronAPI && typeof electronAPI.handlePrintEvent === 'function') {
            electronAPI.handlePrintEvent(htmlContent, 'print', filename);
        } else {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.onload = () => {
                    printWindow.print();
                };
            } else {
                showToast('Popup blocked. Please allow popups to print receipt.', true);
            }
        }
    }



    function showSearchSuggestions(query: string) {
        if (!query) {
            $searchSuggestions.classList.add('hidden');
            $searchSuggestions.innerHTML = '';
            return;
        }
        
        const matches = allPayments.filter(p => {
            const party = ((p as any).party_name || p.party_display_id || p.party_id || '').toLowerCase();
            const ref = (p.reference_id || '').toLowerCase();
            const type = getTransactionTypeLabel(p).toLowerCase();
            const mode = (p.mode || '').toLowerCase();
            const amount = String(p.amount);
            const id = p._id.toLowerCase();
            const q = query.toLowerCase();
            
            return party.includes(q) || ref.includes(q) || type.includes(q) || mode.includes(q) || amount.includes(q) || id.includes(q);
        }).slice(0, 8);
        
        if (matches.length === 0) {
            $searchSuggestions.classList.add('hidden');
            $searchSuggestions.innerHTML = '';
            return;
        }
        
        $searchSuggestions.innerHTML = matches.map(p => {
            const type = getTransactionTypeLabel(p);
            const party = (p as any).party_name || p.party_display_id || p.party_id || '-';
            const amountStr = formatCurrency(p.amount);
            const ref = p.reference_id ? `Ref: ${p.reference_id}` : '';
            const isReceived = p.direction === 'IN';
            const colorClass = isReceived ? 'text-emerald-600' : 'text-rose-600';
            
            return `
            <li class="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-center justify-between text-xs transition-colors" data-id="${p._id}">
                <div>
                    <span class="font-bold text-slate-800">${escapeHtml(party)}</span>
                    <span class="text-slate-400 mx-1">•</span>
                    <span class="text-slate-500">${type} (${p.mode})</span>
                    ${ref ? `<span class="text-slate-400 mx-1">•</span><span class="text-blue-600 font-semibold">${escapeHtml(ref)}</span>` : ''}
                </div>
                <div class="font-extrabold ${colorClass}">
                    ${isReceived ? '+' : '-'}${amountStr}
                </div>
            </li>
            `;
        }).join('');
        
        $searchSuggestions.classList.remove('hidden');
        
        $searchSuggestions.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', () => {
                const id = li.dataset.id;
                if (id) {
                    $searchInput.value = id;
                    $searchSuggestions.classList.add('hidden');
                    applyFilter();
                }
            });
        });
    }

    // ── Party Profile Card ────────────────────────────────
    function renderPartyProfileCard() {
        if (!$partyProfileCardContainer) return;

        const hasPartySelected = $partyIdHidden && $partyIdHidden.value.trim() !== '';
        const partyName = $partyNameInput ? $partyNameInput.value.trim() : '';

        if (!hasPartySelected || !partyName) {
            $partyProfileCardContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500 text-center fade-in">
                    <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-3">
                        <i class="fas fa-user-tie text-xl"></i>
                    </div>
                    <p class="text-sm font-semibold text-gray-700">No Party Selected</p>
                    <p class="text-xs text-gray-400 mt-1 max-w-sm">Please search and select a customer or supplier profile in the search input above to view details.</p>
                </div>
            `;
            return;
        }

        const phone = $previewPartyPhone ? ($previewPartyPhone.textContent || '') : '';
        const email = $previewPartyEmail ? ($previewPartyEmail.textContent || '') : '';
        const gstin = $previewPartyGstin ? ($previewPartyGstin.textContent || '') : '';
        const address = $previewPartyAddress ? ($previewPartyAddress.textContent || '') : '';

        $partyProfileCardContainer.innerHTML = `
            <div class="bg-blue-50/40 rounded-xl p-5 border border-blue-100 flex flex-col md:flex-row gap-6 md:justify-between items-start fade-in">
                <div class="space-y-3 flex-1 w-full">
                    <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="text-base font-bold text-gray-900">${escapeHtml(partyName)}</h3>
                    </div>
                    <div class="text-sm text-gray-600 space-y-2">
                        <p class="flex items-start gap-2">
                            <i class="fas fa-map-marker-alt text-blue-500 mt-1 flex-shrink-0 w-4 text-center"></i>
                            <span class="leading-relaxed">${escapeHtml(address) || 'No Address Provided'}</span>
                        </p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-blue-100/50 w-full">
                            <p class="flex items-center gap-2">
                                <i class="fas fa-phone text-blue-500 flex-shrink-0 w-4 text-center"></i>
                                <span>${escapeHtml(phone) || 'No Phone Number'}</span>
                            </p>
                            <p class="flex items-center gap-2">
                                <i class="fas fa-envelope text-blue-500 flex-shrink-0 w-4 text-center"></i>
                                <span class="break-all">${escapeHtml(email) || 'No Email Address'}</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg p-3 border border-blue-100 flex flex-col justify-center items-start min-w-[180px] w-full md:w-auto shadow-sm">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">GSTIN</span>
                    <span class="text-sm font-bold text-gray-800 mt-1">${escapeHtml(gstin) || 'N/A (Consumer)'}</span>
                </div>
            </div>
        `;
    }

    function showInlineError(input: HTMLElement, message: string) {
        if (!input.id) {
            input.id = 'input-val-' + Math.random().toString(36).substring(2, 11);
        }
        clearInlineError(input);

        input.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/20');
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

        input.setAttribute('aria-invalid', 'true');
        const errorId = `${input.id}-error`;
        input.setAttribute('aria-describedby', errorId);

        const errorMsg = document.createElement('div');
        errorMsg.id = errorId;
        errorMsg.className = 'error-message-inline text-[11px] font-semibold text-red-600 mt-1 transition-all duration-200 ease-in-out';
        errorMsg.textContent = message;

        const parent = input.parentElement;
        if (parent) {
            parent.appendChild(errorMsg);
        }

        const clearHandler = () => {
            clearInlineError(input);
            input.removeEventListener('input', clearHandler);
            input.removeEventListener('change', clearHandler);
        };
        input.addEventListener('input', clearHandler);
        input.addEventListener('change', clearHandler);
    }

    // Export to window to allow reuse
    (window as any).showInlineError = showInlineError;

    function clearInlineError(input: HTMLElement) {
        input.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/20');
        input.style.borderColor = '';
        input.style.boxShadow = '';
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');

        const errorId = `${input.id}-error`;
        const errorMsg = document.getElementById(errorId);
        if (errorMsg) {
            errorMsg.remove();
        }
    }

    function clearFormErrors() {
        const form = document.getElementById('payment-form');
        if (!form) return;
        const errorMsgs = form.querySelectorAll('.error-message-inline');
        errorMsgs.forEach(el => el.remove());

        const errorInputs = form.querySelectorAll('[aria-invalid="true"]');
        errorInputs.forEach(input => {
            const htmlEl = input as HTMLElement;
            htmlEl.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/20');
            htmlEl.style.borderColor = '';
            htmlEl.style.boxShadow = '';
            htmlEl.removeAttribute('aria-invalid');
            htmlEl.removeAttribute('aria-describedby');
        });
    }

    // ── API ────────────────────────────────────────────────
    async function fetchPayments(): Promise<void> {
        try {
            const res = await fetch('/payment/all');
            const data: IApiResponse = await res.json();
            if (data.success) {
                allPayments = data.payments || [];
                applyFilter();
                updateSummary();
            }
        } catch (e) {
            console.error('Failed to fetch payments', e);
            $tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-red-500">Failed to load payments</td></tr>`;
        }
    }

    async function savePayment(payload: IPaymentPayload): Promise<IApiResponse> {
        const url: string = editingId ? `/payment/${editingId}` : '/payment/create';
        const method: string = editingId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return res.json();
    }


    async function fetchParties(type: 'Customer' | 'Supplier'): Promise<{id: string, name: string}[]> {
        try {
            const res = await fetch(`/payment/get-parties/${type}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            console.error('Failed to fetch parties', e);
            return [];
        }
    }

    async function fetchPartyDetails(type: 'Customer' | 'Supplier', partyName: string): Promise<void> {
        if (!partyName) {
            if ($previewPartyName) $previewPartyName.textContent = '';
            if ($previewPartyPhone) $previewPartyPhone.textContent = '';
            if ($previewPartyGstin) $previewPartyGstin.textContent = '';
            if ($previewPartyEmail) $previewPartyEmail.textContent = '';
            if ($previewPartyAddress) $previewPartyAddress.textContent = '';
            renderPartyProfileCard();
            return;
        }

        try {
            const res = await fetch(`/payment/get-party-details/${type}/${encodeURIComponent(partyName)}`);
            const data = await res.json();
            if (data.success && data.party) {
                const party = data.party;
                
                let name = partyName;
                let phone = '';
                let email = '';
                let address = null;

                if (type === 'Customer') {
                    const contact = party.customer;
                    name = contact?.name || contact?.first_name || partyName;
                    phone = contact?.phone || '';
                    email = contact?.email || '';
                    address = party.billing_address;
                } else if (type === 'Supplier') {
                    name = party.supplier_name || partyName;
                    phone = party.phone || '';
                    email = party.email || '';
                    address = party.billing_address || party.address;
                }

                if ($previewPartyName) $previewPartyName.textContent = name;
                if ($previewPartyPhone) $previewPartyPhone.textContent = phone;
                if ($previewPartyGstin) $previewPartyGstin.textContent = party.gstin || '';
                if ($previewPartyEmail) $previewPartyEmail.textContent = email;

                let addrStr = '';
                if (address) {
                    addrStr = [address.line1, address.line2, address.city, address.state, address.pincode]
                        .filter(Boolean).join(', ');
                }
                if ($previewPartyAddress) $previewPartyAddress.textContent = addrStr;

                // Update hidden ID
                $partyIdHidden.value = party._id;
                renderPartyProfileCard();
            } else {
                renderPartyProfileCard();
            }
        } catch (e) {
            console.error('Failed to fetch party details', e);
            renderPartyProfileCard();
        }
    }

    // ── Render ─────────────────────────────────────────────
    function getMonthlyTotal(direction: 'IN' | 'OUT', month: number, year: number): number {
        return allPayments
            .filter(p => {
                if (p.direction !== direction) return false;
                const d = new Date(p.payment_date);
                return d.getMonth() === month && d.getFullYear() === year;
            })
            .reduce((sum, p) => sum + (p.amount || 0), 0);
    }

    function formatCurrencyShort(num: number): string {
        if (num >= 100000) {
            return '₹' + (num / 100000).toFixed(2) + 'L';
        }
        return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    function getTransactionTypeLabel(p: IPaymentRecord): string {
        if (p.is_refund) {
            return p.direction === 'IN' ? 'Refund Received' : 'Refund Issued';
        }
        if (p.is_advance) {
            return p.direction === 'IN' ? 'Advance Received' : 'Advance Paid';
        }
        return p.direction === 'IN' ? 'Payment Received' : 'Payment Sent';
    }

    function getTransactionTypeBadge(p: IPaymentRecord): string {
        const type = getTransactionTypeLabel(p);
        let badgeClass = '';
        switch (type) {
            case 'Payment Received':
                badgeClass = 'bg-emerald-55 text-emerald-700 border border-emerald-200';
                break;
            case 'Payment Sent':
                badgeClass = 'bg-rose-55 text-rose-700 border border-rose-200';
                break;
            case 'Refund Issued':
                badgeClass = 'bg-orange-55 text-orange-700 border border-orange-200';
                break;
            case 'Refund Received':
                badgeClass = 'bg-teal-55 text-teal-700 border border-teal-200';
                break;
            case 'Advance Received':
                badgeClass = 'bg-amber-55 text-amber-700 border border-amber-200';
                break;
            case 'Advance Paid':
                badgeClass = 'bg-indigo-55 text-indigo-700 border border-indigo-200';
                break;
            default:
                badgeClass = 'bg-slate-55 text-slate-700 border border-slate-200';
        }
        return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide ${badgeClass}">${type}</span>`;
    }

    function getStatusBadge(status: string): string {
        const s = status || 'Completed';
        let badgeClass = '';
        switch (s) {
            case 'Completed':
                badgeClass = 'bg-green-50 text-green-700 border border-green-200';
                break;
            case 'Pending':
                badgeClass = 'bg-amber-50 text-amber-700 border border-amber-200';
                break;
            case 'Refunded':
                badgeClass = 'bg-blue-50 text-blue-700 border border-blue-200';
                break;
            case 'Partially Refunded':
                badgeClass = 'bg-sky-50 text-sky-700 border border-sky-200';
                break;
            case 'Cancelled':
                badgeClass = 'bg-slate-50 text-slate-700 border border-slate-200';
                break;
            case 'Failed':
                badgeClass = 'bg-red-50 text-red-700 border border-red-200';
                break;
            default:
                badgeClass = 'bg-slate-50 text-slate-700 border border-slate-200';
        }
        return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${badgeClass}">${s}</span>`;
    }

    function modeBadgeClass(modeVal: string | undefined): string {
        const val = modeVal || 'Cash';
        if (val === 'UPI') return 'badge-upi';
        if (val === 'Bank Transfer') return 'badge-bank';
        if (val === 'Cheque') return 'badge-cheque';
        return 'badge-cash';
    }

    function getReferenceLink(p: IPaymentRecord): string {
        if (!p.reference_id) return '-';
        return escapeHtml(p.reference_id);
    }

    async function handleReferenceClick(event: MouseEvent, type: string, refDbId: string, path: string) {
        event.preventDefault();
        event.stopPropagation();

        const link = event.currentTarget as HTMLAnchorElement || (event.target as HTMLElement).closest('a');
        const originalHtml = link ? link.innerHTML : null;

        // Show inline loading state on the link
        if (link) {
            link.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:0.8em;"></i>';
            (link as HTMLElement).style.pointerEvents = 'none';
        }

        const showAlert = (msg: string) => {
            if ((window as any).electronAPI?.showAlert1) {
                (window as any).electronAPI.showAlert1(msg);
            } else {
                alert(msg);
            }
        };

        const restoreLink = () => {
            if (link && originalHtml !== null) {
                link.innerHTML = originalHtml;
                (link as HTMLElement).style.pointerEvents = '';
            }
        };

        try {
            const res = await fetch(`/payment/get-reference-details/${type}/${refDbId}`);

            if (res.status === 404) {
                restoreLink();
                showAlert(`This ${type} record no longer exists. It may have been permanently deleted.`);
                return;
            }

            if (!res.ok) {
                restoreLink();
                showAlert(`Unable to verify the linked ${type} record. Server returned an error (${res.status}). Please try again.`);
                return;
            }

            const data = await res.json();
            if (data.success && data.details) {
                if (data.details.deletion?.is_deleted) {
                    restoreLink();
                    showAlert(`This ${type} record has been deleted and is no longer accessible.`);
                } else {
                    // Record exists and is active — navigate
                    window.location.href = path;
                }
            } else {
                restoreLink();
                showAlert(`This ${type} record no longer exists. It may have been permanently deleted.`);
            }
        } catch (err) {
            console.error('Error verifying reference document:', err);
            restoreLink();
            showAlert(`Could not reach the server to verify this ${type} record. Please check your connection and try again.`);
        }
    }
    (window as any).handleReferenceClick = handleReferenceClick;

    function getReferenceLinkHtml(p: IPaymentRecord): string {
        const refType = valOrDash(p.reference_type);
        const refId = valOrDash(p.reference_id);
        if (refId === '-' || !p.reference_type || !p.reference_id) return refType === '-' ? '-' : refType;
        if (p.reference_type === 'Adjustment') return `${escapeHtml(p.reference_type)}: ${escapeHtml(p.reference_id)}`;

        let path = '';
        if (p.reference_type === 'Invoice') {
            path = `../invoice/invoice.html?view=${p.reference_id}`;
        } else if (p.reference_type === 'Purchase') {
            path = `../purchase/purchase.html?view=${p.reference_id}`;
        } else if (p.reference_type === 'Service') {
            path = `../service/service.html?view=${p.reference_id}`;
        } else {
            return `${escapeHtml(p.reference_type)}: ${escapeHtml(p.reference_id)}`;
        }
        return `${escapeHtml(p.reference_type)}: <a href="${path}" onclick="handleReferenceClick(event, '${p.reference_type}', '${p.reference_id}', '${path}')" class="text-blue-600 hover:text-blue-800 hover:underline font-semibold" title="View Linked Document: ${escapeHtml(p.reference_type)} ${escapeHtml(p.reference_id)}">${escapeHtml(p.reference_id)}</a>`;
    }

    function updateSummary(): void {
        const totalIn: number = allPayments
            .filter((p: IPaymentRecord) => p.direction === 'IN')
            .reduce((s: number, p: IPaymentRecord) => s + (p.amount || 0), 0);
        const totalOut: number = allPayments
            .filter((p: IPaymentRecord) => p.direction === 'OUT')
            .reduce((s: number, p: IPaymentRecord) => s + (p.amount || 0), 0);
            
        if ($totalIn) $totalIn.textContent = formatCurrency(totalIn);
        if ($totalOut) $totalOut.textContent = formatCurrency(totalOut);
        if ($netBalance) $netBalance.textContent = formatCurrency(totalIn - totalOut);
        if ($totalCount) $totalCount.textContent = String(allPayments.length);

        // Trend calculations (cur month vs prev month)
        const now = new Date();
        const curMonth = now.getMonth();
        const curYear = now.getFullYear();
        const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
        const prevYear = curMonth === 0 ? curYear - 1 : curYear;

        const curIn = getMonthlyTotal('IN', curMonth, curYear);
        const prevIn = getMonthlyTotal('IN', prevMonth, prevYear);
        const curOut = getMonthlyTotal('OUT', curMonth, curYear);
        const prevOut = getMonthlyTotal('OUT', prevMonth, prevYear);

        const trendInPercent = prevIn === 0 ? (curIn > 0 ? 100 : 0) : Math.round(((curIn - prevIn) / prevIn) * 100);
        const trendOutPercent = prevOut === 0 ? (curOut > 0 ? 100 : 0) : Math.round(((curOut - prevOut) / prevOut) * 100);

        if ($trendMoneyIn) {
            $trendMoneyIn.innerHTML = trendInPercent >= 0 
                ? `<i class="fas fa-caret-up mr-0.5"></i>+${trendInPercent}% vs last month` 
                : `<i class="fas fa-caret-down mr-0.5"></i>${trendInPercent}% vs last month`;
            $trendMoneyIn.className = `text-[10px] font-bold flex items-center gap-0.5 ${trendInPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;
        }
        if ($trendMoneyOut) {
            $trendMoneyOut.innerHTML = trendOutPercent >= 0 
                ? `<i class="fas fa-caret-up mr-0.5"></i>+${trendOutPercent}% vs last month` 
                : `<i class="fas fa-caret-down mr-0.5"></i>${trendOutPercent}% vs last month`;
            $trendMoneyOut.className = `text-[10px] font-bold flex items-center gap-0.5 ${trendOutPercent >= 0 ? 'text-rose-655' : 'text-emerald-600'}`;
        }

        if ($netBalanceSub) {
            $netBalanceSub.textContent = `Received ${formatCurrencyShort(totalIn)} • Paid ${formatCurrencyShort(totalOut)}`;
        }

        // Transactions subtext
        const completed = allPayments.filter(p => p.status === 'Completed' || !['Pending', 'Failed', 'Cancelled'].includes(p.status)).length;
        const pending = allPayments.filter(p => p.status === 'Pending').length;
        if ($transactionsSub) {
            $transactionsSub.textContent = `Completed: ${completed} • Pending: ${pending}`;
        }
    }

    function parseLocalDate(dateStr: string | undefined): Date {
        if (!dateStr) return new Date();
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        }
        return new Date(dateStr);
    }

    function setDateBtnActive(btn: HTMLElement, isActive: boolean): void {
        if (isActive) {
            btn.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
            btn.classList.add('active', 'bg-blue-50', 'border-blue-200', 'text-blue-600', 'font-semibold');
        } else {
            btn.classList.remove('active', 'bg-blue-50', 'border-blue-200', 'text-blue-600', 'font-semibold');
            btn.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
        }
    }

    function getRangeDates(range: string, start?: string, end?: string): { min: Date | null, max: Date | null } {
        const now = new Date();
        let min: Date | null = null;
        let max: Date | null = null;
        
        const startOfDay = (d: Date) => { d.setHours(0,0,0,0); return d; };
        const endOfDay = (d: Date) => { d.setHours(23,59,59,999); return d; };
        
        switch (range) {
            case 'today':
                min = startOfDay(new Date());
                max = endOfDay(new Date());
                break;
            case 'week': {
                const currentDay = now.getDay();
                const diff = now.getDate() - currentDay;
                const startOfWeek = new Date(now);
                startOfWeek.setDate(diff);
                min = startOfDay(startOfWeek);
                max = endOfDay(new Date());
                break;
            }
            case 'month':
                min = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
                max = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
                break;
            case 'quarter': {
                const currentQuarter = Math.floor(now.getMonth() / 3);
                min = startOfDay(new Date(now.getFullYear(), currentQuarter * 3, 1));
                max = endOfDay(new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0));
                break;
            }
            case 'year':
                min = startOfDay(new Date(now.getFullYear(), 0, 1));
                max = endOfDay(new Date(now.getFullYear(), 11, 31));
                break;
            case 'custom':
                if (start) min = startOfDay(parseLocalDate(start));
                if (end) max = endOfDay(parseLocalDate(end));
                break;
        }
        return { min, max };
    }

    function applyFilter(): void {
        const query: string = ($searchInput.value || '').toLowerCase().trim();

        // Calculate Date bounds
        const { min: dateMin, max: dateMax } = getRangeDates(
            advancedFilters.dateRange, 
            advancedFilters.startDate, 
            advancedFilters.endDate
        );

        filteredPayments = allPayments.filter((p: IPaymentRecord) => {
            // Card quick-filter toggles
            if (currentFilter === 'IN' && p.direction !== 'IN') return false;
            if (currentFilter === 'OUT' && p.direction !== 'OUT') return false;
            if (currentFilter === 'Pending' && p.status !== 'Pending') return false;

            // Advanced filters
            if (advancedFilters.txType) {
                const type = getTransactionTypeLabel(p);
                if (type !== advancedFilters.txType) return false;
            }
            if (advancedFilters.status && p.status !== advancedFilters.status) return false;
            if (advancedFilters.mode && p.mode !== advancedFilters.mode) return false;
            if (advancedFilters.referenceType && p.reference_type !== advancedFilters.referenceType) return false;
            
            if (advancedFilters.party) {
                const name = ((p as any).party_name || '').toLowerCase();
                const displayId = (p.party_display_id || '').toLowerCase();
                const pId = (p.party_id || '').toLowerCase();
                const filterParty = advancedFilters.party.toLowerCase();
                if (!name.includes(filterParty) && !displayId.includes(filterParty) && !pId.includes(filterParty)) return false;
            }

            if (advancedFilters.amountMin !== null && p.amount < advancedFilters.amountMin) return false;
            if (advancedFilters.amountMax !== null && p.amount > advancedFilters.amountMax) return false;

            // Date Range check
            if (dateMin || dateMax) {
                const pDate = parseLocalDate(p.payment_date);
                if (dateMin && pDate < dateMin) return false;
                if (dateMax && pDate > dateMax) return false;
            }

            // Search filter
            if (query) {
                const searchable: string = [
                    p._id,
                    p.remarks, p.transaction_details, p.party_type, p.party_display_id, (p as any).party_name,
                    p.reference_type, p.reference_id, p.mode, p.direction, p.status,
                    String(p.amount)
                ].filter(Boolean).join(' ').toLowerCase();
                if (!searchable.includes(query)) return false;
            }

            return true;
        });

        if ($filterCount) $filterCount.textContent = String(filteredPayments.length);
        updateTabCounts();
        renderFilterChips();
        renderTable();
    }

    function renderTable(): void {
        if (!paginationManager) {
            paginationManager = new (window as any).TablePaginationManager(
                'payment-tbody',
                (paginatedData: any[]) => renderPage(paginatedData),
                25
            );
        }
        paginationManager.setData(filteredPayments);
    }

    function updateTabCounts(): void {
        const refTabs = document.querySelectorAll('#reference-type-filters .filter-tab');
        if (!refTabs.length) return;

        const counts: Record<string, number> = {
            all: allPayments.length,
            Invoice: 0,
            Purchase: 0,
            Service: 0,
            Adjustment: 0
        };

        allPayments.forEach(p => {
            const refType = p.reference_type;
            if (refType && refType in counts) {
                counts[refType]++;
            }
        });

        refTabs.forEach(tab => {
            const refVal = (tab as HTMLElement).dataset.ref || 'all';
            const count = counts[refVal] || 0;
            
            let badge = tab.querySelector('.tab-count-badge');
            if (!badge) {
                badge = document.createElement('span');
                tab.appendChild(badge);
            }
            badge.className = tab.classList.contains('active')
                ? 'tab-count-badge ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-600 transition-colors duration-150'
                : 'tab-count-badge ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-500 transition-colors duration-150';
            badge.textContent = count.toString();
        });
    }

    function renderPage(paginatedPayments: IPaymentRecord[]): void {
        // Empty state check
        if (paginatedPayments.length === 0) {
            const hasPayments = allPayments.length > 0;
            const emptyStateHTML = hasPayments ? `
                <tr>
                    <td colspan="7" class="px-6 py-16 text-center text-slate-455 bg-white align-middle h-full">
                        <div class="w-full h-full min-h-[320px] flex flex-col items-center justify-center text-center py-4 fade-in select-none">
                            <div class="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-dashed border-slate-300">
                                <i class="fas fa-search text-2xl"></i>
                            </div>
                            <h3 class="text-base font-bold text-slate-800 mb-1">No results found</h3>
                        </div>
                    </td>
                </tr>` : `
                <tr>
                    <td colspan="7" class="px-6 py-16 text-center text-slate-455 bg-white align-middle h-full">
                        <div class="w-full h-full min-h-[320px] flex flex-col items-center justify-center text-center py-4 fade-in select-none">
                            <div class="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-dashed border-slate-300">
                                <i class="fas fa-inbox text-2xl"></i>
                            </div>
                            <h3 class="text-base font-bold text-slate-800 mb-1">No Payments Found</h3>
                            <p class="text-xs text-slate-500 mb-5">Create your first payment to start tracking cash flow in the ledger.</p>
                            <button id="empty-new-payment-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all duration-150 active:scale-95 cursor-pointer">
                                <i class="fas fa-plus mr-1"></i>New Payment
                            </button>
                        </div>
                    </td>
                </tr>`;
            $tbody.innerHTML = emptyStateHTML;
            if ($paymentCardsMobile) {
                $paymentCardsMobile.innerHTML = hasPayments ? `
                    <div class="text-center py-10 bg-white rounded-xl border border-slate-200 p-6">
                        <i class="fas fa-search text-3xl text-slate-300 mb-2"></i>
                        <p class="text-sm font-bold text-slate-700">No results found</p>
                    </div>` : `
                    <div class="text-center py-10 bg-white rounded-xl border border-slate-200 p-6">
                        <i class="fas fa-inbox text-3xl text-slate-300 mb-2"></i>
                        <p class="text-sm font-bold text-slate-700">No Payments Found</p>
                        <p class="text-xs text-slate-500 mt-1">Create a payment transaction to begin.</p>
                    </div>`;
            }

            if (!hasPayments) {
                document.getElementById('empty-new-payment-btn')?.addEventListener('click', () => openModal(null));
            }
            return;
        }

        // Desktop table render
        $tbody.innerHTML = paginatedPayments.map((p: IPaymentRecord) => {
            const typeBadge = getTransactionTypeBadge(p);
            const statusBadge = getStatusBadge(p.status);
            const modeClass = modeBadgeClass(p.mode);
            const refLink = getReferenceLink(p);
            
            const isReceived = p.direction === 'IN';
            const amountPrefix = isReceived ? '+ ' : '- ';
            const amountColor = isReceived ? 'text-emerald-600' : 'text-rose-600';

            return `
            <tr class="payment-row border-b border-slate-100 hover:bg-slate-50 transition-all duration-150 group cursor-pointer" data-payment-id="${escapeHtml(p._id)}" tabindex="0">
                <td class="px-4 py-3 text-slate-850 font-medium whitespace-nowrap text-xs">${formatDate(p.payment_date)}</td>
                <td class="px-4 py-3 whitespace-nowrap">${typeBadge}</td>
                <td class="px-4 py-3 text-slate-700 text-xs font-semibold max-w-[150px] truncate" title="${escapeHtml((p as any).party_name || p.party_display_id || p.party_id || '-')}">
                    ${escapeHtml((p as any).party_name || p.party_display_id || p.party_id || '-')}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">${refLink}</td>
                <td class="px-4 py-3 whitespace-nowrap text-xs">
                    ${(p as any).voucher_no ? `
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer hover:bg-blue-100" onclick="event.stopPropagation(); window.location.href = '/voucher?voucherNumber=' + encodeURIComponent('${escapeHtml((p as any).voucher_no)}')">
                            ${escapeHtml((p as any).voucher_no)}
                        </span>
                    ` : '-'}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-xs">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${modeClass === 'badge-cash' ? 'bg-amber-50 text-amber-700 border-amber-200' : modeClass === 'badge-upi' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : modeClass === 'badge-bank' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}">
                        ${escapeHtml(p.mode)}
                    </span>
                </td>
                <td class="px-4 py-3 text-right font-bold text-xs whitespace-nowrap ${amountColor}">
                    ${amountPrefix}${formatCurrency(p.amount)}
                </td>
            </tr>`;
        }).join('');

        // Mobile cards render
        if ($paymentCardsMobile) {
            $paymentCardsMobile.innerHTML = paginatedPayments.map((p: IPaymentRecord) => {
                const type = getTransactionTypeLabel(p);
                const isReceived = p.direction === 'IN';
                const amountPrefix = isReceived ? '+ ' : '- ';
                const amountColor = isReceived ? 'text-emerald-600' : 'text-rose-600';
                
                return `
                <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col gap-2.5 active:bg-slate-50" onclick="window._paymentUI.viewPayment('${p._id}')">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold text-slate-450 uppercase tracking-wider">${formatDate(p.payment_date)}</span>
                        ${getStatusBadge(p.status)}
                    </div>
                    <div class="flex items-center justify-between mt-0.5">
                        <div>
                            <p class="text-sm font-bold text-slate-800">${escapeHtml((p as any).party_name || p.party_display_id || '-')}</p>
                            <p class="text-xs text-slate-500 font-medium mt-0.5">${type} • ${escapeHtml(p.mode)}</p>
                        </div>
                        <p class="text-sm font-extrabold ${amountColor}">${amountPrefix}${formatCurrency(p.amount)}</p>
                    </div>
                    ${p.reference_id ? `
                    <div class="bg-slate-50 rounded-lg p-2 flex items-center justify-between text-xs text-slate-600 border border-slate-100">
                        <span>Reference: <span class="font-bold text-slate-800">${escapeHtml(p.reference_type)}</span></span>
                        <span class="font-bold text-blue-600">${escapeHtml(p.reference_id)}</span>
                    </div>` : ''}
                </div>`;
            }).join('');
        }

        // Add standard click handlers for desktop rows
        $tbody.querySelectorAll<HTMLElement>('.payment-row').forEach(row => {
            row.addEventListener('click', () => {
                const id = row.dataset.paymentId;
                if (id) window.location.href = `/payment/details?id=${id}`;
            });
            row.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    const id = row.dataset.paymentId;
                    if (id) window.location.href = `/payment/details?id=${id}`;
                }
            });
        });
    }

    function toggleSection(showNew: boolean): void {
        const searchWrapper = document.getElementById('search-input')?.parentElement?.parentElement;
        const newPaymentBtn = document.getElementById('new-payment-btn');
        const refreshBtn = document.getElementById('refresh-btn');

        if (showNew) {
            $homeSec.classList.add('hidden');
            $newSec.classList.remove('hidden');
            $homeBtn.classList.remove('hidden');
            
            if (searchWrapper) searchWrapper.style.display = 'none';
            if (newPaymentBtn) newPaymentBtn.style.display = 'none';
            if (refreshBtn) refreshBtn.style.display = 'none';
        } else {
            $newSec.classList.add('hidden');
            $homeSec.classList.remove('hidden');
            $homeBtn.classList.add('hidden');

            if (searchWrapper) searchWrapper.style.display = 'flex';
            if (newPaymentBtn) newPaymentBtn.style.display = 'flex';
            if (refreshBtn) refreshBtn.style.display = 'flex';
        }
    }

    // ── Modal ──────────────────────────────────────────────
    async function openModal(payment: IPaymentRecord | null): Promise<void> {
        editingId = payment ? payment._id : null;
        refundedPaymentId = null;
        submitPartyTypeOverride = payment?.party_type || null;
        $formPaymentId.value = editingId || '';
        $partyIdHidden.value = '';
        if (validator) validator.clearAllErrors();
        renderPartyProfileCard();

        const searchContainer = document.getElementById('party-search-container');
        if (searchContainer) {
            if (payment && (payment.reference_type === 'Invoice' || payment.reference_type === 'Purchase')) {
                searchContainer.style.display = 'none';
            } else {
                searchContainer.style.display = 'block';
            }
        }

        const refundContainer = document.getElementById('refund-checkbox-container');
        if (refundContainer) {
            if (allPayments.length === 0) {
                refundContainer.style.display = 'none';
            } else {
                refundContainer.style.display = 'flex';
            }
        }

        if (payment) {
            $modalTitle.textContent = 'Edit Payment';
            $modalSubtitle.textContent = 'Update payment details';
            $submitBtnText.textContent = 'Update Payment';

            // Populate form
            const dirRadio = document.querySelector(
                `input[name="direction"][value="${payment.direction}"]`
            ) as HTMLInputElement | null;
            if (dirRadio) dirRadio.checked = true;

            (document.getElementById('form-amount') as HTMLInputElement).value = String(payment.amount || '');
            (document.getElementById('form-date') as HTMLInputElement).value =
                payment.payment_date ? payment.payment_date.substring(0, 10) : todayISO();
            (document.getElementById('form-mode') as HTMLSelectElement).value = payment.mode || 'Cash';
            updateTransactionDetailsFields(payment.mode || 'Cash');
            (document.getElementById('form-status') as HTMLSelectElement).value = payment.status || 'Completed';
            
            // NOTE: We don't have the party name here, only ID. 
            // We should fetch details by ID to show the name.
            $partyNameInput.value = ''; 
            $partyIdHidden.value = payment.party_id || '';

            (document.getElementById('form-reference-type') as HTMLSelectElement).value = payment.reference_type || '';
            (document.getElementById('form-reference-id') as HTMLInputElement).value = payment.reference_id || '';
            (document.getElementById('form-transaction-details') as HTMLInputElement).value = payment.transaction_details || '';
            (document.getElementById('form-advance') as HTMLInputElement).checked = payment.is_advance || false;
            (document.getElementById('form-refund') as HTMLInputElement).checked = payment.is_refund || false;
            (document.getElementById('form-remarks') as HTMLTextAreaElement).value = payment.remarks || '';

            // Fetch details if party ID exists
            if (payment.party_id) {
                const partyType = paymentPartyType(payment);
                // Need a way to fetch details by ID... 
                // For now let's use a temporary fetch to get the name
                fetchPartyDetailsById(partyType, payment.party_id);
            }
        } else {
            $modalTitle.textContent = 'New Payment';
            $modalSubtitle.textContent = 'Record a new payment transaction';
            $submitBtnText.textContent = 'Save Payment';
            $form.reset();
            (document.getElementById('form-date') as HTMLInputElement).value = todayISO();
            (document.getElementById('form-status') as HTMLSelectElement).value = 'Completed';
            updateTransactionDetailsFields('Cash');
            const inRadio = document.querySelector(
                'input[name="direction"][value="IN"]'
            ) as HTMLInputElement | null;
            if (inRadio) inRadio.checked = true;
        }

        (window as any).totalSteps = 3;
        (window as any).currentStep = 1;
        if (typeof (window as any).changeStep === 'function') {
            (window as any).changeStep(1);
        }

        toggleSection(true);
        // Suggestions are fetched live on input — no pre-load needed
    }

    async function fetchPartyDetailsById(type: string, id: string): Promise<void> {
        try {
            // Need to add this endpoint to backend
            const res = await fetch(`/payment/get-party-details-by-id/${type}/${id}`);
            const data = await res.json();
            if (data.success && data.party) {
                const party = data.party;
                const name = type === 'Customer' ? (party.customer?.name || party.customer?.first_name || '') : (party.supplier_name || '');
                $partyNameInput.value = name;
                fetchPartyDetails(type as 'Customer' | 'Supplier', name);
            }
        } catch (e) {
            console.error('Failed to fetch party by ID', e);
        }
    }

    function paymentPartyType(payment: IPaymentRecord): 'Customer' | 'Supplier' {
        return payment.party_type || (payment.direction === 'IN' ? 'Customer' : 'Supplier');
    }

    function referenceLabel(payment: IPaymentRecord): string {
        const refType = valOrDash(payment.reference_type);
        const refId = valOrDash(payment.reference_id);
        return refId === '-' ? refType : `${refType}: ${refId}`;
    }

    function openDetailsModalById(id: string): void {
        const payment = allPayments.find((p: IPaymentRecord) => p._id === id);
        if (!payment) return;

        selectedDetailsPayment = payment;
        const isIn = payment.direction === 'IN';

        $detailsIcon.className = `w-10 h-10 rounded-xl ${isIn ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} flex items-center justify-center`;
        $detailsIcon.innerHTML = `<i class="fas ${isIn ? 'fa-arrow-down' : 'fa-arrow-up'} text-lg"></i>`;
        $detailsSubtitle.textContent = payment.is_advance ? 'Advance transaction' : 'Transaction summary';
        $detailsAmount.textContent = formatCurrency(payment.amount);
        $detailsAmount.className = `text-3xl font-extrabold mt-1 ${isIn ? 'text-green-700' : 'text-red-700'}`;
        $detailsDirection.textContent = isIn ? 'Money In' : 'Money Out';
        $detailsDirection.className = `px-3 py-1.5 rounded-full text-xs font-bold uppercase ${isIn ? 'badge-in' : 'badge-out'}`;
        $detailsDate.textContent = formatDate(payment.payment_date);
        $detailsMode.textContent = payment.mode || '-';
        $detailsParty.textContent = `${paymentPartyType(payment)}${payment.party_display_id || payment.party_id ? `: ${payment.party_display_id || payment.party_id}` : ''}`;
        $detailsReference.innerHTML = getReferenceLinkHtml(payment);
        $detailsTransaction.textContent = valOrDash(payment.transaction_details);
        $detailsRemarks.textContent = valOrDash(payment.remarks);

        const $detailsPartyExpanded = document.getElementById('details-party-expanded') as HTMLDivElement | null;
        const $detailsRefExpanded = document.getElementById('details-ref-expanded') as HTMLDivElement | null;
        if ($detailsPartyExpanded) $detailsPartyExpanded.classList.add('hidden');
        if ($detailsRefExpanded) $detailsRefExpanded.classList.add('hidden');

        if (payment.party_id) {
            const partyType = paymentPartyType(payment);
            fetchDetailsModalParty(partyType, payment.party_id);
        }

        if (payment.reference_id && payment.reference_type && payment.reference_type !== 'Adjustment') {
            fetchDetailsModalReference(payment.reference_type as any, payment.reference_id);
        }

        $detailsModal.classList.remove('hidden');
    }

    async function fetchDetailsModalParty(type: 'Customer' | 'Supplier', id: string): Promise<void> {
        try {
            const res = await fetch(`/payment/get-party-details-by-id/${type}/${id}`);
            const data = await res.json();
            if (data.success && data.party) {
                const party = data.party;
                
                let phone = '-';
                let email = '-';
                let gstin = party.gstin || '-';
                let address = null;

                if (type === 'Customer') {
                    const contact = party.customer;
                    phone = contact?.phone || '-';
                    email = contact?.email || '-';
                    address = party.billing_address;
                } else if (type === 'Supplier') {
                    phone = party.phone || '-';
                    email = party.email || '-';
                    address = party.billing_address || party.address;
                }

                let addrStr = '-';
                if (address) {
                    addrStr = [address.line1, address.line2, address.city, address.state, address.pincode]
                        .filter(Boolean).join(', ');
                }

                const $phoneEl = document.getElementById('details-party-phone');
                const $gstinEl = document.getElementById('details-party-gstin');
                const $emailEl = document.getElementById('details-party-email');
                const $addressEl = document.getElementById('details-party-address');

                if ($phoneEl) $phoneEl.textContent = phone;
                if ($gstinEl) $gstinEl.textContent = gstin;
                if ($emailEl) $emailEl.textContent = email;
                if ($addressEl) $addressEl.textContent = addrStr;

                const $detailsPartyExpanded = document.getElementById('details-party-expanded');
                if ($detailsPartyExpanded) $detailsPartyExpanded.classList.remove('hidden');
            }
        } catch (e) {
            console.error('Failed to fetch details modal party info:', e);
        }
    }

    async function fetchDetailsModalReference(type: 'Invoice' | 'Purchase' | 'Service', refId: string): Promise<void> {
        try {
            const res = await fetch(`/payment/get-reference-details/${type}/${refId}`);
            const data = await res.json();
            if (data.success && data.details) {
                const details = data.details;

                let idStr = '-';
                let dateStr = '-';
                let amountStr = '-';
                let statusStr = '-';

                if (type === 'Invoice') {
                    idStr = details.invoice_no || details.invoice_id || '-';
                    dateStr = details.invoice_date ? formatDate(details.invoice_date) : '-';
                    amountStr = details.totals?.grand_total !== undefined ? formatCurrency(details.totals.grand_total) : '-';
                    statusStr = details.status || '-';
                } else if (type === 'Purchase') {
                    idStr = details.purchase_invoice_no || details.purchase_order_no || '-';
                    dateStr = details.purchase_date ? formatDate(details.purchase_date) : '-';
                    amountStr = details.totals?.grand_total !== undefined ? formatCurrency(details.totals.grand_total) : '-';
                    statusStr = details.status || '-';
                } else if (type === 'Service') {
                    idStr = details.service_no || '-';
                    dateStr = details.service_date ? formatDate(details.service_date) : '-';
                    amountStr = details.totals?.grand_total !== undefined ? formatCurrency(details.totals.grand_total) : '-';
                    statusStr = details.status || '-';
                }

                const $refIdEl = document.getElementById('details-ref-id');
                const $refDateEl = document.getElementById('details-ref-date');
                const $refAmountEl = document.getElementById('details-ref-amount');
                const $refStatusEl = document.getElementById('details-ref-status');

                if ($refIdEl) $refIdEl.textContent = idStr;
                if ($refDateEl) $refDateEl.textContent = dateStr;
                if ($refAmountEl) $refAmountEl.textContent = amountStr;
                if ($refStatusEl) {
                    $refStatusEl.textContent = statusStr;
                    $refStatusEl.className = 'font-bold';
                    if (statusStr.toLowerCase() === 'paid') {
                        $refStatusEl.classList.add('text-green-600');
                    } else if (statusStr.toLowerCase() === 'unpaid' || statusStr.toLowerCase() === 'overdue') {
                        $refStatusEl.classList.add('text-red-600');
                    } else if (statusStr.toLowerCase() === 'partially paid' || statusStr.toLowerCase() === 'partial') {
                        $refStatusEl.classList.add('text-amber-600');
                    } else {
                        $refStatusEl.classList.add('text-gray-600');
                    }
                }

                const $detailsRefExpanded = document.getElementById('details-ref-expanded');
                if ($detailsRefExpanded) $detailsRefExpanded.classList.remove('hidden');
            }
        } catch (e) {
            console.error('Failed to fetch details modal reference info:', e);
        }
    }

    function closeDetailsModal(): void {
        $detailsModal.classList.add('hidden');
        selectedDetailsPayment = null;
    }

    function openRefundModal(payment: IPaymentRecord): void {
        closeDetailsModal();
        editingId = null;
        refundedPaymentId = payment._id;
        submitPartyTypeOverride = paymentPartyType(payment);
        $formPaymentId.value = '';
        $form.reset();
        $modalTitle.textContent = 'Refund Payment';
        $modalSubtitle.textContent = 'Create a reverse adjustment for this transaction';
        $submitBtnText.textContent = 'Save Refund';

        const refundDirection = payment.direction === 'IN' ? 'OUT' : 'IN';
        const dirRadio = document.querySelector(
            `input[name="direction"][value="${refundDirection}"]`
        ) as HTMLInputElement | null;
        if (dirRadio) dirRadio.checked = true;

        (document.getElementById('form-amount') as HTMLInputElement).value = String(payment.amount || '');
        (document.getElementById('form-date') as HTMLInputElement).value = todayISO();
        (document.getElementById('form-mode') as HTMLSelectElement).value = payment.mode || 'Cash';
        updateTransactionDetailsFields(payment.mode || 'Cash');
        (document.getElementById('form-status') as HTMLSelectElement).value = 'Completed';
        const refIdVal = payment.reference_id || '';
        (document.getElementById('form-reference-type') as HTMLSelectElement).value = payment.reference_type || '';
        (document.getElementById('form-reference-id') as HTMLInputElement).value = refIdVal;
        (document.getElementById('form-transaction-details') as HTMLInputElement).value = payment.transaction_details || '';
        (document.getElementById('form-advance') as HTMLInputElement).checked = false;
        (document.getElementById('form-refund') as HTMLInputElement).checked = true;
        (document.getElementById('form-remarks') as HTMLTextAreaElement).value = `Refund for payment ${refIdVal || payment._id.substring(payment._id.length - 6).toUpperCase()}`;

        $partyNameInput.value = '';
        $partyIdHidden.value = payment.party_id || '';
        $partyDetailsContainer.classList.add('hidden');
        if (payment.party_id) {
            fetchPartyDetailsById(paymentPartyType(payment), payment.party_id);
        }

        (window as any).totalSteps = 3;
        (window as any).currentStep = 1;
        if (typeof (window as any).changeStep === 'function') {
            (window as any).changeStep(1);
        }

        toggleSection(true);
        // Suggestions are fetched live on input — no pre-load needed
    }

    function toggleFilterPopover(): void {
        if (!$filterPopover || !$filterBtn) return;
        const isHidden = $filterPopover.classList.contains('hidden');
        if (isHidden) {
            const rect = $filterBtn.getBoundingClientRect();
            $filterPopover.classList.remove('hidden');
            $filterPopover.style.top = `${rect.bottom + 8}px`;
            const popoverWidth = 280;
            let leftPos = rect.right - popoverWidth;
            if (leftPos < 16) {
                leftPos = 16;
            }
            $filterPopover.style.left = `${leftPos}px`;
        } else {
            $filterPopover.classList.add('hidden');
        }
    }

    function renderFilterChips(): void {
        if (!$chipsList || !$filterChipsContainer) return;
        $chipsList.innerHTML = '';
        let hasActive = false;

        const addChip = (label: string, key: keyof typeof advancedFilters) => {
            hasActive = true;
            const chip = document.createElement('span');
            chip.className = 'inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-semibold border border-blue-150';
            chip.innerHTML = `${label} <button class="hover:text-blue-900 ml-1 focus:outline-none" style="cursor: pointer;"><i class="fas fa-times"></i></button>`;
            chip.querySelector('button')?.addEventListener('click', () => {
                if (key === 'amountMin' || key === 'amountMax') {
                    advancedFilters[key] = null;
                    const el = document.getElementById(key === 'amountMin' ? 'amount-min-filter' : 'amount-max-filter') as HTMLInputElement;
                    if (el) el.value = '';
                } else {
                    (advancedFilters as any)[key] = '';
                    const el = document.getElementById(
                        key === 'txType' ? 'tx-type-filter' : 
                        key === 'status' ? 'status-filter' : 
                        key === 'party' ? 'party-filter' : 
                        key === 'mode' ? 'mode-filter' : 
                        'reference-filter'
                    ) as HTMLInputElement;
                    if (el) el.value = '';

                    // Reset dropdown highlights
                    if (key === 'txType') {
                        const dropdown = document.getElementById('txTypeFilterDropdown');
                        dropdown?.querySelectorAll('a').forEach((a, i) => {
                            a.classList.remove('bg-gray-100', 'font-semibold');
                            if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                        });
                    } else if (key === 'status') {
                        const dropdown = document.getElementById('statusFilterDropdown');
                        dropdown?.querySelectorAll('a').forEach((a, i) => {
                            a.classList.remove('bg-gray-100', 'font-semibold');
                            if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                        });
                    } else if (key === 'mode') {
                        const dropdown = document.getElementById('modeFilterDropdown');
                        dropdown?.querySelectorAll('a').forEach((a, i) => {
                            a.classList.remove('bg-gray-100', 'font-semibold');
                            if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                        });
                    } else if (key === 'referenceType') {
                        document.querySelectorAll('#reference-type-filters .filter-tab').forEach(btn => {
                            const r = (btn as HTMLElement).dataset.ref || '';
                            setRefBtnActive(btn as HTMLElement, r === '');
                        });
                    }
                }
                applyFilter();
            });
            $chipsList.appendChild(chip);
        };

        if (advancedFilters.txType) addChip(`Type: ${advancedFilters.txType}`, 'txType');
        if (advancedFilters.status) addChip(`Status: ${advancedFilters.status}`, 'status');
        if (advancedFilters.party) addChip(`Party: ${advancedFilters.party}`, 'party');
        if (advancedFilters.mode) addChip(`Method: ${advancedFilters.mode}`, 'mode');
        if (advancedFilters.referenceType) addChip(`Ref: ${advancedFilters.referenceType}`, 'referenceType');
        if (advancedFilters.amountMin !== null) addChip(`Min: ₹${advancedFilters.amountMin}`, 'amountMin');
        if (advancedFilters.amountMax !== null) addChip(`Max: ₹${advancedFilters.amountMax}`, 'amountMax');
        
        // Also add date range if not All
        if (advancedFilters.dateRange !== 'all') {
            let label = 'Period: ';
            switch (advancedFilters.dateRange) {
                case 'today': label += 'Today'; break;
                case 'week': label += 'This Week'; break;
                case 'month': label += 'This Month'; break;
                case 'quarter': label += 'This Quarter'; break;
                case 'year': label += 'This Year'; break;
                case 'custom': label += `${advancedFilters.startDate} to ${advancedFilters.endDate}`; break;
            }
            hasActive = true;
            const chip = document.createElement('span');
            chip.className = 'inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-semibold border border-blue-150';
            chip.innerHTML = `${label} <button class="hover:text-blue-900 ml-1 focus:outline-none" style="cursor: pointer;"><i class="fas fa-times"></i></button>`;
            chip.querySelector('button')?.addEventListener('click', () => {
                advancedFilters.dateRange = 'all';
                const dateFilter = document.getElementById('date-filter') as HTMLInputElement | null;
                if (dateFilter) dateFilter.value = 'all';

                const dateDropdown = document.getElementById('dateFilterDropdown');
                if (dateDropdown) {
                    dateDropdown.querySelectorAll('a').forEach((a, i) => {
                        a.classList.remove('bg-gray-100', 'font-semibold');
                        if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                    });
                }
                applyFilter();
            });
            $chipsList.appendChild(chip);
        }

        $filterChipsContainer.classList.toggle('hidden', !hasActive);
    }

    function applyAdvancedFilters(): void {
        advancedFilters.txType = (document.getElementById('tx-type-filter') as HTMLInputElement)?.value || '';
        advancedFilters.status = (document.getElementById('status-filter') as HTMLInputElement)?.value || '';
        advancedFilters.party = (document.getElementById('party-filter') as HTMLInputElement)?.value || '';
        advancedFilters.mode = (document.getElementById('mode-filter') as HTMLInputElement)?.value || '';
        advancedFilters.referenceType = (document.getElementById('reference-filter') as HTMLInputElement)?.value || '';
        
        const minVal = (document.getElementById('amount-min-filter') as HTMLInputElement)?.value;
        const maxVal = (document.getElementById('amount-max-filter') as HTMLInputElement)?.value;
        advancedFilters.amountMin = minVal ? Number(minVal) : null;
        advancedFilters.amountMax = maxVal ? Number(maxVal) : null;

        $filterPopover?.classList.add('hidden');
        applyFilter();
    }

    function setRefBtnActive(btn: HTMLElement, isActive: boolean): void {
        if (isActive) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    function resetAdvancedFilters(): void {
        advancedFilters.txType = '';
        advancedFilters.status = '';
        advancedFilters.party = '';
        advancedFilters.mode = '';
        advancedFilters.referenceType = '';
        advancedFilters.amountMin = null;
        advancedFilters.amountMax = null;
        advancedFilters.dateRange = 'all';
        advancedFilters.startDate = '';
        advancedFilters.endDate = '';

        const setVal = (id: string, val: string) => {
            const el = document.getElementById(id) as HTMLInputElement;
            if (el) el.value = val;
        };
        setVal('tx-type-filter', '');
        setVal('status-filter', '');
        setVal('party-filter', '');
        setVal('mode-filter', '');
        setVal('reference-filter', '');
        setVal('date-filter', 'all');
        setVal('amount-min-filter', '');
        setVal('amount-max-filter', '');
        setVal('custom-start-date', '');
        setVal('custom-end-date', '');

        // Reset dropdown highlights
        const resetDropdown = (id: string, defaultVal: string) => {
            const dropdown = document.getElementById(id);
            if (dropdown) {
                dropdown.querySelectorAll('a').forEach(a => {
                    a.classList.remove('bg-gray-100', 'font-semibold');
                    const valAttr = a.getAttribute('data-date-filter') || 
                                   a.getAttribute('data-tx-type-filter') ||
                                   a.getAttribute('data-status-filter') ||
                                   a.getAttribute('data-mode-filter') || '';
                    if (valAttr === defaultVal) {
                        a.classList.add('bg-gray-100', 'font-semibold');
                    }
                });
            }
        };

        resetDropdown('dateFilterDropdown', 'all');
        resetDropdown('txTypeFilterDropdown', '');
        resetDropdown('statusFilterDropdown', '');
        resetDropdown('modeFilterDropdown', '');

        // Reset reference type buttons
        document.querySelectorAll('#reference-type-filters .filter-tab').forEach(btn => {
            const r = (btn as HTMLElement).dataset.ref || '';
            setRefBtnActive(btn as HTMLElement, r === '');
        });

        applyFilter();
    }

    function injectShortcutsStyles(): void {
        if (document.getElementById('shortcuts-custom-styles')) return;
        const style = document.createElement('style');
        style.id = 'shortcuts-custom-styles';
        style.textContent = `
            #shortcuts-modal.hidden { opacity: 0; pointer-events: none; display: none !important; }
            .shortcuts-panel { width: 100%; animation: fadeIn 0.25s ease-out forwards; }
            .shortcut-row { display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.5rem; border-bottom: 1px solid #f1f5f9; border-radius: 6px; }
            .shortcut-row:hover { background-color: #f8fafc; }
            .shortcut-keys { display: flex; align-items: center; gap: 0.25rem; color: #94a3b8; font-size: 0.85rem; }
            .shortcut-keys kbd { background-color: #ffffff; border: 1px solid #e2e8f0; border-bottom-width: 2px; border-radius: 0.375rem; padding: 0.2rem 0.5rem; font-family: 'Inter', system-ui, sans-serif; font-size: 0.8rem; font-weight: 600; color: #334155; }
        `;
        document.head.appendChild(style);
    }

    function renderShortcutKeys(keys: string[]): string {
        const isMac = navigator.userAgent.toLowerCase().includes('mac');
        return `<div class="shortcut-keys">${keys.map((key, index) => {
            const displayKey = key === 'Ctrl' && isMac ? 'Cmd' : key;
            const separator = index > 0 ? '<span class="text-slate-300 font-medium">+</span>' : '';
            return `${separator}<kbd>${displayKey}</kbd>`;
        }).join('')}</div>`;
    }

    function injectShortcutsModalHTML(): void {
        if (document.getElementById('shortcuts-modal')) return;
        const modalDiv = document.createElement('div');
        modalDiv.id = 'shortcuts-modal';
        modalDiv.className = 'fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[999] flex items-center justify-center hidden opacity-0 transition-opacity duration-200';
        modalDiv.setAttribute('role', 'dialog');
        modalDiv.setAttribute('aria-modal', 'true');
        modalDiv.setAttribute('aria-label', 'Keyboard Shortcuts');
        const rows = [
            ['Focus Search', ['Ctrl', 'F']],
            ['Open Filters', ['Ctrl', 'Shift', 'F']],
            ['New Payment', ['Ctrl', 'N']],
            ['Save Payment', ['Ctrl', 'S']],
            ['Refresh Payments', ['Ctrl', 'R']],
            ['Close / Clear', ['Esc']],
            ['Keyboard Shortcuts', ['?']]
        ].map(([label, keys]) => `
            <div class="shortcut-row">
                <span class="text-xs font-semibold text-slate-600">${label as string}</span>
                ${renderShortcutKeys(keys as string[])}
            </div>
        `).join('');
        modalDiv.innerHTML = `
            <div class="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-xl w-full mx-4 max-h-[85vh] overflow-y-auto shortcuts-panel">
                <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <i class="fas fa-keyboard text-lg"></i>
                        </div>
                        <h2 class="text-base font-extrabold text-slate-800 tracking-tight">Keyboard Shortcuts</h2>
                    </div>
                    <button id="close-shortcuts" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200" aria-label="Close shortcuts help modal">
                        <i class="fas fa-times text-sm"></i>
                    </button>
                </div>
                <div class="p-6">
                    <h3 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <i class="fas fa-bolt text-yellow-600"></i>
                        Payment Actions
                    </h3>
                    <div class="space-y-1">${rows}</div>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
    }

    function showShortcutsModal(): void {
        if (!shortcutsModalRef) return;
        shortcutsModalRef.classList.remove('hidden');
        shortcutsModalRef.offsetHeight;
        shortcutsModalRef.classList.remove('opacity-0');
        document.getElementById('close-shortcuts')?.focus();
    }

    function hideShortcutsModal(): void {
        if (!shortcutsModalRef) return;
        shortcutsModalRef.classList.add('opacity-0');
        setTimeout(() => shortcutsModalRef?.classList.add('hidden'), 200);
    }

    function initShortcutsModal(): void {
        injectShortcutsStyles();
        injectShortcutsModalHTML();
        shortcutsModalRef = document.getElementById('shortcuts-modal');
        document.getElementById('shortcuts-btn')?.addEventListener('click', showShortcutsModal);
        document.getElementById('close-shortcuts')?.addEventListener('click', hideShortcutsModal);
        shortcutsModalRef?.addEventListener('click', (event) => {
            if (event.target === shortcutsModalRef) hideShortcutsModal();
        });
    }

    function isTypingContext(): boolean {
        const active = document.activeElement;
        if (!active) return false;
        const tagName = active.tagName;
        return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || (active as HTMLElement).isContentEditable;
    }

    function closeModal(): void {
        toggleSection(false);
        editingId = null;
        refundedPaymentId = null;
        submitPartyTypeOverride = null;
        $form.reset();
        $partyIdHidden.value = '';
        clearFormErrors();
        if (validator) validator.clearAllErrors();
        renderPartyProfileCard();
        
        (window as any).currentStep = 1;
        (window as any).totalSteps = 1;
    }

    let suggestionSelectedIndex = -1;
    let currentSuggestions: {id: string, name: string, phone: string, email: string, gstin: string}[] = [];
    let partyDebounceTimer: ReturnType<typeof setTimeout>;

    function getSelectedPartyType(): 'Customer' | 'Supplier' {
        const directionRadio = document.querySelector(
            'input[name="direction"]:checked'
        ) as HTMLInputElement | null;
        return directionRadio && directionRadio.value === 'OUT' ? 'Supplier' : 'Customer';
    }

    async function searchParties(query: string): Promise<{id: string, name: string, phone: string, email: string, gstin: string}[]> {
        const type = getSelectedPartyType();
        try {
            let url: string;
            if (type === 'Customer') {
                url = `/api/customers?search=${encodeURIComponent(query)}`;
                const res = await fetch(url);
                if (!res.ok) return [];
                const customers = await res.json();
                return (Array.isArray(customers) ? customers : []).map((c: any) => {
                    const contact = c.customer || {};
                    const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
                    return {
                        id: c._id,
                        name: contact.name || fullName || 'Unnamed Customer',
                        phone: contact.phone || '',
                        email: contact.email || '',
                        gstin: c.gstin || ''
                    };
                });
            } else {
                url = `/api/suppliers?search=${encodeURIComponent(query)}`;
                const res = await fetch(url);
                if (!res.ok) return [];
                const suppliers = await res.json();
                return (Array.isArray(suppliers) ? suppliers : []).map((s: any) => ({
                    id: s._id,
                    name: s.supplier_name || 'Unnamed Supplier',
                    phone: s.phone || '',
                    email: s.email || '',
                    gstin: s.gstin || ''
                }));
            }
        } catch (e) {
            console.error('Failed to search parties', e);
            return [];
        }
    }

    function renderSuggestionItem(party: {id: string, name: string, phone: string, email: string, gstin: string}): HTMLLIElement {
        const li = document.createElement('li');
        li.className = 'px-4 py-2.5 hover:bg-blue-50/70 cursor-pointer border-b border-gray-100 last:border-0 transition-colors duration-150';

        let metaParts: string[] = [];
        if (party.phone) metaParts.push(`<span class="inline-flex items-center"><i class="fas fa-phone text-gray-400 mr-1 text-[10px]"></i>${party.phone}</span>`);
        if (party.email) metaParts.push(`<span class="inline-flex items-center"><i class="fas fa-envelope text-gray-400 mr-1 text-[10px]"></i>${party.email}</span>`);
        if (party.gstin) metaParts.push(`<span class="inline-flex items-center bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-blue-100">GSTIN: ${party.gstin}</span>`);

        li.innerHTML = `
            <div class="font-medium text-gray-800 text-sm">${party.name}</div>
            ${metaParts.length > 0 ? `<div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs text-gray-500">${metaParts.join('<span class="text-gray-300">•</span>')}</div>` : ''}
        `;

        li.onclick = () => {
            const type = getSelectedPartyType();
            $partyNameInput.value = party.name;
            $partyIdHidden.value = party.id;
            $partySuggestions.style.display = 'none';
            $partySuggestions.innerHTML = '';
            suggestionSelectedIndex = -1;
            // Populate hidden spans and render the profile card directly using party data
            if ($previewPartyName) $previewPartyName.textContent = party.name;
            if ($previewPartyPhone) $previewPartyPhone.textContent = party.phone;
            if ($previewPartyGstin) $previewPartyGstin.textContent = party.gstin;
            if ($previewPartyEmail) $previewPartyEmail.textContent = party.email;
            renderPartyProfileCard();
            // Fetch full address details in background (updates card again)
            fetchPartyDetails(type, party.name);
        };

        return li;
    }

    function initPartySuggestions(): void {
        $partyNameInput.addEventListener('input', () => {
            const query = $partyNameInput.value.trim();
            clearTimeout(partyDebounceTimer);

            // Clear hidden ID when user types manually
            $partyIdHidden.value = '';
            if ($previewPartyName) $previewPartyName.textContent = '';
            if ($previewPartyPhone) $previewPartyPhone.textContent = '';
            if ($previewPartyGstin) $previewPartyGstin.textContent = '';
            if ($previewPartyEmail) $previewPartyEmail.textContent = '';
            if ($previewPartyAddress) $previewPartyAddress.textContent = '';
            renderPartyProfileCard();

            $partySuggestions.innerHTML = '';
            suggestionSelectedIndex = -1;

            if (!query || query.length < 1) {
                $partySuggestions.style.display = 'none';
                return;
            }

            partyDebounceTimer = setTimeout(async () => {
                currentSuggestions = await searchParties(query);
                $partySuggestions.innerHTML = '';
                suggestionSelectedIndex = -1;

                if (currentSuggestions.length === 0) {
                    $partySuggestions.style.display = 'none';
                    return;
                }

                $partySuggestions.style.display = 'block';
                currentSuggestions.forEach(party => {
                    $partySuggestions.appendChild(renderSuggestionItem(party));
                });
            }, 250);
        });

        $partyNameInput.addEventListener('keydown', (e: KeyboardEvent) => {
            const items = $partySuggestions.querySelectorAll('li');
            if (items.length === 0 || $partySuggestions.style.display === 'none') return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                suggestionSelectedIndex = (suggestionSelectedIndex + 1) % items.length;
                updateSuggestionSelection(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                suggestionSelectedIndex = (suggestionSelectedIndex - 1 + items.length) % items.length;
                updateSuggestionSelection(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestionSelectedIndex > -1) {
                    (items[suggestionSelectedIndex] as HTMLElement).click();
                } else if (currentSuggestions.length > 0) {
                    // Select first on Enter with no highlight
                    (items[0] as HTMLElement).click();
                }
            } else if (e.key === 'Escape') {
                $partySuggestions.style.display = 'none';
            }
        });

        function updateSuggestionSelection(items: NodeListOf<HTMLLIElement>) {
            items.forEach((item, idx) => {
                if (idx === suggestionSelectedIndex) {
                    item.classList.add('bg-blue-50', 'text-blue-700', 'font-medium');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('bg-blue-50', 'text-blue-700', 'font-medium');
                }
            });
        }

        // Hide suggestions on outside click
        document.addEventListener('click', (e) => {
            if (e.target !== $partyNameInput && !$partySuggestions.contains(e.target as Node)) {
                $partySuggestions.style.display = 'none';
            }
        });
    }

    // ── Events ─────────────────────────────────────────────
    // New payment button
    (document.getElementById('new-payment-btn') as HTMLButtonElement)
        .addEventListener('click', () => openModal(null));

    if ($refreshBtn) {
        $refreshBtn.addEventListener('click', () => {
            const icon = $refreshBtn.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            fetchPayments().finally(() => {
                setTimeout(() => {
                    if (icon) icon.classList.remove('fa-spin');
                }, 500);
            });
        });
    }
    $filterBtn?.addEventListener('click', toggleFilterPopover);
    document.getElementById('close-filter')
        ?.addEventListener('click', () => $filterPopover?.classList.add('hidden'));
    document.getElementById('apply-filters-btn')
        ?.addEventListener('click', applyAdvancedFilters);
    document.getElementById('reset-filters')
        ?.addEventListener('click', resetAdvancedFilters);

    // Close filter popover when clicking outside of it
    document.addEventListener('mousedown', (e: MouseEvent) => {
        if (!$filterPopover || $filterPopover.classList.contains('hidden')) return;
        const target = e.target as Node;
        const isCustomDateModal = target instanceof Element && target.closest('#custom-date-modal');
        if (!$filterPopover.contains(target) && !$filterBtn?.contains(target) && !isCustomDateModal) {
            $filterPopover.classList.add('hidden');
        }
    });

    // Close/Cancel Form actions
    const $homeBtnEl = document.getElementById('home-btn');
    if ($homeBtnEl) $homeBtnEl.addEventListener('click', () => {
        window.location.href = '/payment';
    });
    const $cancelBtn = document.getElementById('cancel-btn');
    if ($cancelBtn) $cancelBtn.addEventListener('click', () => {
        window.location.href = '/payment';
    });

    (document.getElementById('close-details-modal-btn') as HTMLButtonElement)
        .addEventListener('click', closeDetailsModal);
    (document.getElementById('details-modal-overlay') as HTMLDivElement)
        .addEventListener('click', closeDetailsModal);
    (document.getElementById('details-edit-btn') as HTMLButtonElement)
        .addEventListener('click', () => {
            if (!selectedDetailsPayment) return;
            const payment = selectedDetailsPayment;
            closeDetailsModal();
            openModal(payment);
        });
    (document.getElementById('details-refund-btn') as HTMLButtonElement)
        .addEventListener('click', () => {
            if (selectedDetailsPayment) openRefundModal(selectedDetailsPayment);
        });


    // Direction changes: clear party field and reset profile card
    document.querySelectorAll('input[name="direction"]').forEach(radio => {
        radio.addEventListener('change', () => {
            submitPartyTypeOverride = null;
            $partyNameInput.value = '';
            $partyIdHidden.value = '';
            $partySuggestions.innerHTML = '';
            $partySuggestions.style.display = 'none';
            if ($previewPartyName) $previewPartyName.textContent = '';
            if ($previewPartyPhone) $previewPartyPhone.textContent = '';
            if ($previewPartyGstin) $previewPartyGstin.textContent = '';
            if ($previewPartyEmail) $previewPartyEmail.textContent = '';
            if ($previewPartyAddress) $previewPartyAddress.textContent = '';
            renderPartyProfileCard();
        });
    });

    // Clickable KPI Cards
    const $cardMoneyIn = document.getElementById('card-money-in');
    const $cardMoneyOut = document.getElementById('card-money-out');
    const $cardNetCash = document.getElementById('card-net-cash');
    const $cardTransactions = document.getElementById('card-transactions');

    function highlightActiveCard(activeId: string): void {
        const cards = ['card-money-in', 'card-money-out', 'card-net-cash', 'card-transactions'];
        cards.forEach(id => {
            const card = document.getElementById(id);
            if (!card) return;
            if (id === activeId) {
                card.classList.add('ring-2', 'ring-blue-500', 'ring-offset-1');
            } else {
                card.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-1');
            }
        });
    }

    $cardMoneyIn?.addEventListener('click', () => {
        currentFilter = 'IN';
        highlightActiveCard('card-money-in');
        applyFilter();
    });
    $cardMoneyOut?.addEventListener('click', () => {
        currentFilter = 'OUT';
        highlightActiveCard('card-money-out');
        applyFilter();
    });
    $cardNetCash?.addEventListener('click', () => {
        currentFilter = 'all';
        highlightActiveCard('card-net-cash');
        applyFilter();
    });
    $cardTransactions?.addEventListener('click', () => {
        currentFilter = 'all';
        highlightActiveCard('card-transactions');
        applyFilter();
    });

    // Reference Type Filters Toolbar (outside)
    const refButtons = document.querySelectorAll('#reference-type-filters .filter-tab');
    refButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const isAlreadyActive = btn.classList.contains('active');
            
            refButtons.forEach(b => {
                setRefBtnActive(b as HTMLElement, false);
            });
            
            if (isAlreadyActive) {
                advancedFilters.referenceType = '';
                const refFilterInput = document.getElementById('reference-filter') as HTMLInputElement | null;
                if (refFilterInput) refFilterInput.value = '';
                applyFilter();
            } else {
                const refVal = (btn as HTMLElement).dataset.ref || '';
                setRefBtnActive(btn as HTMLElement, true);
                advancedFilters.referenceType = refVal;
                const refFilterInput = document.getElementById('reference-filter') as HTMLInputElement | null;
                if (refFilterInput) refFilterInput.value = refVal;
                applyFilter();
            }
        });
    });

    // Redesigned Popover dropdown listeners
    const dateDropdown = document.getElementById('dateFilterDropdown');
    const dateFilter = document.getElementById('date-filter') as HTMLInputElement | null;
    if (dateDropdown && dateFilter) {
        dateDropdown.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');
            if (!link) return;

            e.preventDefault();

            const range = link.getAttribute('data-date-filter') || 'all';

            if (range === 'custom') {
                (window as any).showCustomDateModal((startDate: string, endDate: string) => {
                    dateDropdown.querySelectorAll('a').forEach(a => {
                        a.classList.remove('bg-gray-100', 'font-semibold');
                    });
                    link.classList.add('bg-gray-100', 'font-semibold');

                    advancedFilters.dateRange = 'custom';
                    advancedFilters.startDate = startDate;
                    advancedFilters.endDate = endDate;
                    dateFilter.value = 'custom';
                    $filterPopover?.classList.add('hidden');
                    applyFilter();
                });
            } else {
                dateDropdown.querySelectorAll('a').forEach(a => {
                    a.classList.remove('bg-gray-100', 'font-semibold');
                });
                link.classList.add('bg-gray-100', 'font-semibold');

                advancedFilters.dateRange = range;
                dateFilter.value = range;
                applyFilter();
            }
        });
    }

    const txTypeDropdown = document.getElementById('txTypeFilterDropdown');
    const txTypeFilter = document.getElementById('tx-type-filter') as HTMLInputElement | null;
    if (txTypeDropdown && txTypeFilter) {
        txTypeDropdown.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');
            if (!link) return;

            e.preventDefault();

            txTypeDropdown.querySelectorAll('a').forEach(a => a.classList.remove('bg-gray-100', 'font-semibold'));
            link.classList.add('bg-gray-100', 'font-semibold');

            const val = link.getAttribute('data-tx-type-filter') || '';
            advancedFilters.txType = val;
            txTypeFilter.value = val;
            applyFilter();
        });
    }

    const statusDropdown = document.getElementById('statusFilterDropdown');
    const statusFilter = document.getElementById('status-filter') as HTMLInputElement | null;
    if (statusDropdown && statusFilter) {
        statusDropdown.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');
            if (!link) return;

            e.preventDefault();

            statusDropdown.querySelectorAll('a').forEach(a => a.classList.remove('bg-gray-100', 'font-semibold'));
            link.classList.add('bg-gray-100', 'font-semibold');

            const val = link.getAttribute('data-status-filter') || '';
            advancedFilters.status = val;
            statusFilter.value = val;
            applyFilter();
        });
    }

    const modeDropdown = document.getElementById('modeFilterDropdown');
    const modeFilter = document.getElementById('mode-filter') as HTMLInputElement | null;
    if (modeDropdown && modeFilter) {
        modeDropdown.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');
            if (!link) return;

            e.preventDefault();

            modeDropdown.querySelectorAll('a').forEach(a => a.classList.remove('bg-gray-100', 'font-semibold'));
            link.classList.add('bg-gray-100', 'font-semibold');

            const val = link.getAttribute('data-mode-filter') || '';
            advancedFilters.mode = val;
            modeFilter.value = val;
            applyFilter();
        });
    }

    const amountMin = document.getElementById('amount-min-filter') as HTMLInputElement | null;
    const amountMax = document.getElementById('amount-max-filter') as HTMLInputElement | null;
    const handleAmountInput = () => {
        const minVal = amountMin?.value;
        const maxVal = amountMax?.value;
        advancedFilters.amountMin = minVal ? Number(minVal) : null;
        advancedFilters.amountMax = maxVal ? Number(maxVal) : null;
        applyFilter();
    };
    amountMin?.addEventListener('input', handleAmountInput);
    amountMax?.addEventListener('input', handleAmountInput);

    $clearAllChips?.addEventListener('click', () => {
        resetAdvancedFilters();
    });



    document.addEventListener('click', (e) => {
        if (e.target !== $searchInput && !$searchSuggestions.contains(e.target as Node)) {
            $searchSuggestions.classList.add('hidden');
        }
    });

    // Search
    let searchTimer: ReturnType<typeof setTimeout>;
    $searchInput.addEventListener('input', () => {
        const query = $searchInput.value.trim();
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            applyFilter();
            showSearchSuggestions(query);
        }, 250);
    });

    // Form submit
    $form.addEventListener('submit', async (e: SubmitEvent) => {
        e.preventDefault();

        const directionRadio = document.querySelector(
            'input[name="direction"]:checked'
        ) as HTMLInputElement | null;
        const direction: string = directionRadio ? directionRadio.value : 'IN';
        const amount: string = (document.getElementById('form-amount') as HTMLInputElement).value;
        const date: string = (document.getElementById('form-date') as HTMLInputElement).value;
        const mode: string = (document.getElementById('form-mode') as HTMLSelectElement).value;
        const status: string = (document.getElementById('form-status') as HTMLSelectElement).value;

        const refTypeSelect = document.getElementById('form-reference-type') as HTMLSelectElement;
        const refIdInput = document.getElementById('form-reference-id') as HTMLInputElement;
        const refType = refTypeSelect ? refTypeSelect.value : '';
        const refId = refIdInput ? refIdInput.value.trim() : '';

        let isValid = true;
        if (validator) {
            isValid = validator.validateAll();
        } else {
            clearFormErrors();

            const amountInput = document.getElementById('form-amount') as HTMLInputElement;
            const amountVal = Number(amountInput.value);
            if (!amountInput.value || isNaN(amountVal) || amountVal <= 0) {
                showInlineError(amountInput, 'Please enter a valid amount greater than 0.');
                isValid = false;
            }

            const modeSelect = document.getElementById('form-mode') as HTMLSelectElement;
            if (!modeSelect.value) {
                showInlineError(modeSelect, 'Please select a payment mode.');
                isValid = false;
            }

            if (refType && refType !== 'Adjustment' && !refId) {
                if (refIdInput) showInlineError(refIdInput, 'Please enter a Reference ID for the selected Reference Type.');
                isValid = false;
            }
            if (!refType && refId) {
                if (refTypeSelect) showInlineError(refTypeSelect, 'Please select a Reference Type for the entered Reference ID.');
                isValid = false;
            }

            const partyNameInput = document.getElementById('form-party-name') as HTMLInputElement;
            if (!partyNameInput.value.trim()) {
                showInlineError(partyNameInput, 'Please search and select a Party.');
                isValid = false;
            } else if (!$partyIdHidden.value.trim()) {
                showInlineError(partyNameInput, 'Please select a valid, existing party profile from the suggestions list.');
                isValid = false;
            }
        }

        if (!isValid) {
            const firstInvalid = $form.querySelector('[aria-invalid="true"]') as HTMLElement | null;
            if (firstInvalid) {
                firstInvalid.focus();
            }
            return;
        }

        const payload: IPaymentPayload = {
            direction: direction as 'IN' | 'OUT',
            amount: Number(amount),
            payment_date: date || todayISO(),
            mode,
            party_type: submitPartyTypeOverride || (direction === 'IN' ? 'Customer' : 'Supplier'),
            party_id: $partyIdHidden.value || $partyNameInput.value || undefined,
            reference_type: refType || "",
            reference_id: refId || "",
            transaction_details: (document.getElementById('form-transaction-details') as HTMLInputElement).value || "",
            is_advance: (document.getElementById('form-advance') as HTMLInputElement).checked,
            is_refund: (document.getElementById('form-refund') as HTMLInputElement).checked,
            refunded_payment_ref: refundedPaymentId || undefined,
            remarks: (document.getElementById('form-remarks') as HTMLTextAreaElement).value || "",
            status: status || 'Completed'
        };

        try {
            const result: IApiResponse = await savePayment(payload);
            if (result.success) {
                showToast(editingId ? 'Payment updated!' : 'Payment saved!');
                closeModal();
                const newId = result.payment?._id || editingId;
                if (newId) {
                    window.location.href = `/payment/details?id=${newId}`;
                } else {
                    fetchPayments();
                }
            } else {
                showToast(result.message || 'Failed to save payment', true);
            }
        } catch (err) {
            console.error('Save error:', err);
            showToast('Error saving payment', true);
        }
    });

    // Keyboard: Escape to close modal, Ctrl+N for new
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        const keyLower = e.key.toLowerCase();
        const isCtrlPressed = e.ctrlKey || e.metaKey;
        const isShiftPressed = e.shiftKey;

        if (e.key === '?' && !isTypingContext()) {
            e.preventDefault();
            if (shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
                hideShortcutsModal();
            } else {
                showShortcutsModal();
            }
            return;
        }
        if (isCtrlPressed && e.key === '/') {
            e.preventDefault();
            if (shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
                hideShortcutsModal();
            } else {
                showShortcutsModal();
            }
            return;
        }
        if (e.key === 'Escape' && !$detailsModal.classList.contains('hidden')) {
            closeDetailsModal();
            return;
        }
        if (e.key === 'Escape' && shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
            hideShortcutsModal();
            return;
        }
        if (e.key === 'Escape' && $filterPopover && !$filterPopover.classList.contains('hidden')) {
            $filterPopover.classList.add('hidden');
            return;
        }
        if (e.key === 'Escape' && !$newSec.classList.contains('hidden')) {
            closeModal();
            return;
        }
        if (isCtrlPressed && keyLower === 's' && !$newSec.classList.contains('hidden')) {
            e.preventDefault();
            $form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            return;
        }
        if (isCtrlPressed && keyLower === 'n') {
            e.preventDefault();
            openModal(null);
            return;
        }
        if (isCtrlPressed && isShiftPressed && keyLower === 'f') {
            e.preventDefault();
            toggleFilterPopover();
            return;
        }
        if (isCtrlPressed && keyLower === 'r' && !isShiftPressed) {
            e.preventDefault();
            $refreshBtn?.click();
            return;
        }
        if (isCtrlPressed && keyLower === 'f') {
            e.preventDefault();
            $searchInput.focus();
            $searchInput.select();
        }
    });

    window.validateCurrentStep = async () => {
        const step = (window as any).currentStep;

        if (validator) {
            if (step === 1) {
                const amountValid = validator.validateField('amount');
                const modeValid = validator.validateField('mode');
                if (!amountValid) {
                    const amountInput = document.getElementById('form-amount') as HTMLInputElement;
                    if (amountInput) amountInput.focus();
                    return false;
                }
                if (!modeValid) {
                    const modeSelect = document.getElementById('form-mode') as HTMLSelectElement;
                    if (modeSelect) modeSelect.focus();
                    return false;
                }
                return true;
            }
            if (step === 2) {
                const partyValid = validator.validateField('party_name');
                if (!partyValid) {
                    const partyNameInput = document.getElementById('form-party-name') as HTMLInputElement;
                    if (partyNameInput) partyNameInput.focus();
                    return false;
                }
                return true;
            }
            if (step === 3) {
                const refTypeValid = validator.validateField('reference_type');
                const refIdValid = validator.validateField('reference_id');
                if (!refTypeValid) {
                    const refTypeSelect = document.getElementById('form-reference-type') as HTMLSelectElement;
                    if (refTypeSelect) refTypeSelect.focus();
                    return false;
                }
                if (!refIdValid) {
                    const refIdInput = document.getElementById('form-reference-id') as HTMLInputElement;
                    if (refIdInput) refIdInput.focus();
                    return false;
                }
                return refTypeValid && refIdValid;
            }
            return true;
        }

        clearFormErrors();

        if (step === 1) {
            const amountInput = document.getElementById('form-amount') as HTMLInputElement;
            const amountVal = Number(amountInput.value);
            if (!amountInput.value || isNaN(amountVal) || amountVal <= 0) {
                showInlineError(amountInput, 'Please enter a valid amount greater than 0.');
                amountInput.focus();
                return false;
            }

            const modeSelect = document.getElementById('form-mode') as HTMLSelectElement;
            if (!modeSelect.value) {
                showInlineError(modeSelect, 'Please select a payment mode.');
                modeSelect.focus();
                return false;
            }
            return true;
        }

        if (step === 2) {
            const partyNameInput = document.getElementById('form-party-name') as HTMLInputElement;
            const partyIdHidden = document.getElementById('form-party-id-hidden') as HTMLInputElement;
            if (!partyNameInput.value.trim()) {
                showInlineError(partyNameInput, 'Please search and select a Party.');
                partyNameInput.focus();
                return false;
            } else if (!partyIdHidden.value.trim()) {
                showInlineError(partyNameInput, 'Please select a valid, existing party profile from the suggestions list.');
                partyNameInput.focus();
                return false;
            }
            return true;
        }

        if (step === 3) {
            const refTypeSelect = document.getElementById('form-reference-type') as HTMLSelectElement;
            const refIdInput = document.getElementById('form-reference-id') as HTMLInputElement;
            const refType = refTypeSelect.value;
            const refId = refIdInput.value.trim();

            let isValid = true;
            if (refType && refType !== 'Adjustment' && !refId) {
                showInlineError(refIdInput, 'Please enter a Reference ID for the selected Reference Type.');
                refIdInput.focus();
                isValid = false;
            }
            if (!refType && refId) {
                showInlineError(refTypeSelect, 'Please select a Reference Type for the entered Reference ID.');
                refTypeSelect.focus();
                isValid = false;
            }
            return isValid;
        }

        return true;
    };

    // ── Exposed for inline onclick handlers ────────────────
    window._paymentUI = {
        viewPayment: function (id: string): void {
            window.location.href = `/payment/details?id=${id}`;
        },
        editPayment: function (id: string): void {
            const payment = allPayments.find((p: IPaymentRecord) => p._id === id);
            if (payment) openModal(payment);
        },

        refundPayment: function (id: string): void {
            const payment = allPayments.find((p: IPaymentRecord) => p._id === id);
            if (payment) openRefundModal(payment);
        },
        printPayment: function (id: string): void {
            const payment = allPayments.find((p: IPaymentRecord) => p._id === id);
            if (payment) printPaymentReceipt(payment);
        }
    };

    function initValidation() {
        if ((window as any).FormValidator && (window as any).Validators && $form) {
            const V = (window as any).Validators;
            validator = new (window as any).FormValidator($form);

            validator.registerField('amount', [
                {
                    validate: (val: string) => {
                        const num = Number(val);
                        if (!val || isNaN(num) || num <= 0) {
                            return 'Please enter a valid amount greater than 0.';
                        }
                        return true;
                    }
                }
            ]);

            validator.registerField('mode', [
                V.required('Please select a payment mode.')
            ]);

            validator.registerField('party_name', [
                V.required('Please search and select a Party.'),
                {
                    validate: (val: string) => {
                        const hiddenId = ($partyIdHidden.value || '').trim();
                        if (!hiddenId) {
                            return 'Please select a valid, existing party profile from the suggestions list.';
                        }
                        return true;
                    }
                }
            ]);

            validator.registerField('reference_type', [
                {
                    validate: (val: string) => {
                        const refIdInput = document.getElementById('form-reference-id') as HTMLInputElement;
                        const refId = refIdInput ? refIdInput.value.trim() : '';
                        if (!val && refId) {
                            return 'Please select a Reference Type for the entered Reference ID.';
                        }
                        return true;
                    }
                }
            ]);

            validator.registerField('reference_id', [
                {
                    validate: (val: string) => {
                        const refTypeSelect = document.getElementById('form-reference-type') as HTMLSelectElement;
                        const refType = refTypeSelect ? refTypeSelect.value : '';
                        if (refType && refType !== 'Adjustment' && !val.trim()) {
                            return 'Please enter a Reference ID for the selected Reference Type.';
                        }
                        return true;
                    }
                }
            ]);

            const refTypeSelect = document.getElementById('form-reference-type') as HTMLSelectElement;
            const refIdInput = document.getElementById('form-reference-id') as HTMLInputElement;
            if (refTypeSelect && refIdInput) {
                refTypeSelect.addEventListener('change', () => {
                    if (validator) validator.validateField('reference_id');
                });
                refIdInput.addEventListener('input', () => {
                    if (validator) validator.validateField('reference_type');
                });
            }

            const modeSelect = document.getElementById('form-mode') as HTMLSelectElement;
            if (modeSelect) {
                modeSelect.addEventListener('change', () => {
                    updateTransactionDetailsFields(modeSelect.value);
                });
            }
        }
    }

    // ── Init ───────────────────────────────────────────────
    initPartySuggestions();
    initShortcutsModal();
    initValidation();
    fetchPayments().then(() => {
        highlightActiveCard('card-net-cash');
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('id');
        const isEdit = urlParams.get('edit') === 'true';
        const isRefund = urlParams.get('refund') === 'true';

        if (editId) {
            fetch(`/payment/${editId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.payment) {
                        if (isEdit) {
                            if (data.payment.voucher_no) {
                                window.location.href = `/voucher?voucherNumber=${encodeURIComponent(data.payment.voucher_no)}`;
                            } else {
                                openModal(data.payment);
                            }
                        } else if (isRefund) {
                            openRefundModal(data.payment);
                        }
                    }
                })
                .catch(err => console.error('Error auto-loading payment from params:', err));
        } else if (urlParams.get('voucher')) {
            const vNo = urlParams.get('voucher');
            if (vNo) {
                window.location.href = `/voucher?voucherNumber=${encodeURIComponent(vNo)}`;
            }
        } else if (urlParams.get('new') === 'true') {
            openModal(null);
            setTimeout(() => {
                const amount = urlParams.get('amount');
                const direction = urlParams.get('direction') || 'IN'; // Invoice usually means IN
                const refType = urlParams.get('ref_type');
                const refId = urlParams.get('ref_id');
                const partyType = urlParams.get('party_type');
                const partyId = urlParams.get('party_id');
                const partyName = urlParams.get('party_name');

                const dirRadio = document.querySelector(`input[name="direction"][value="${direction}"]`) as HTMLInputElement | null;
                if (dirRadio) dirRadio.checked = true;

                if (amount) (document.getElementById('form-amount') as HTMLInputElement).value = amount;
                if (refType) (document.getElementById('form-reference-type') as HTMLSelectElement).value = refType;
                if (refId) (document.getElementById('form-reference-id') as HTMLInputElement).value = refId;
                if (partyName) (document.getElementById('form-party-name') as HTMLInputElement).value = partyName;
                if (partyId) (document.getElementById('form-party-id-hidden') as HTMLInputElement).value = partyId;

                if (partyType && partyName) {
                    fetchPartyDetails(partyType as any, partyName);
                } else if (partyType && partyId) {
                    fetchPartyDetailsById(partyType, partyId);
                }

            }, 100);
        }
    });



})();
