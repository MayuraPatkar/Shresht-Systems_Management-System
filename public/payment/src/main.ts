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

    function modeBadgeClass(mode: string): string {
        switch (mode) {
            case 'Cash': return 'badge-cash';
            case 'UPI': return 'badge-upi';
            case 'Bank Transfer': return 'badge-bank';
            case 'Cheque': return 'badge-cheque';
            default: return 'badge-cash';
        }
    }

    function printPaymentReceipt(payment: IPaymentRecord): void {
        const type = getTransactionTypeLabel(payment);
        const party = (payment as any).party_name || payment.party_display_id || payment.party_id || '-';
        const amountStr = formatCurrency(payment.amount);
        const dateStr = formatDate(payment.payment_date);
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('Popup blocked. Please allow popups for printing receipts.', true);
            return;
        }
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Payment Receipt - ${payment._id}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                    .logo { font-size: 24px; font-weight: bold; color: #1e3a8a; margin-bottom: 5px; }
                    .subtitle { font-size: 14px; color: #666; }
                    .receipt-title { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-top: 20px; margin-bottom: 20px; letter-spacing: 1px; }
                    .details-table { w-full border-collapse: collapse; margin-top: 20px; width: 100%; }
                    .details-table td { padding: 12px 8px; border-bottom: 1px solid #eee; font-size: 14px; }
                    .details-table td.label { font-weight: bold; color: #555; width: 35%; }
                    .amount-box { margin-top: 30px; padding: 15px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: right; }
                    .amount-val { font-size: 20px; font-weight: bold; color: #1e3a8a; }
                    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">SHRESHT SYSTEMS</div>
                    <div class="subtitle">Management System - Payment Receipt</div>
                </div>
                <div style="text-align: center;">
                    <div class="receipt-title">${type} Acknowledgement</div>
                </div>
                <table class="details-table">
                    <tr>
                        <td class="label">Payment ID</td>
                        <td>${payment._id}</td>
                    </tr>
                    <tr>
                        <td class="label">Date</td>
                        <td>${dateStr}</td>
                    </tr>
                    <tr>
                        <td class="label">Party Name</td>
                        <td>${party}</td>
                    </tr>
                    <tr>
                        <td class="label">Transaction Type</td>
                        <td>${type}</td>
                    </tr>
                    <tr>
                        <td class="label">Payment Mode</td>
                        <td>${payment.mode}</td>
                    </tr>
                    <tr>
                        <td class="label">Reference Document</td>
                        <td>${payment.reference_type ? `${payment.reference_type} (${payment.reference_id || '-'})` : '-'}</td>
                    </tr>
                    <tr>
                        <td class="label">Transaction Details</td>
                        <td>${payment.transaction_details || '-'}</td>
                    </tr>
                    <tr>
                        <td class="label">Remarks / Description</td>
                        <td>${payment.remarks || '-'}</td>
                    </tr>
                    <tr>
                        <td class="label">Status</td>
                        <td>${payment.status || 'Completed'}</td>
                    </tr>
                </table>
                <div class="amount-box">
                    <span style="font-size: 14px; font-weight: bold; color: #666; margin-right: 10px;">Total Amount:</span>
                    <span class="amount-val">${amountStr}</span>
                </div>
                <div class="footer">
                    This is a system-generated transaction acknowledgement receipt.
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
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
            const emptyStateHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-16 text-center text-slate-455 bg-white align-middle h-full">
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
                $paymentCardsMobile.innerHTML = `
                    <div class="text-center py-10 bg-white rounded-xl border border-slate-200 p-6">
                        <i class="fas fa-inbox text-3xl text-slate-300 mb-2"></i>
                        <p class="text-sm font-bold text-slate-700">No Payments Found</p>
                        <p class="text-xs text-slate-500 mt-1">Create a payment transaction to begin.</p>
                    </div>`;
            }

            document.getElementById('empty-new-payment-btn')?.addEventListener('click', () => openModal(null));
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
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer hover:bg-blue-100" onclick="event.stopPropagation(); (window as any).viewVoucherByNo('${escapeHtml((p as any).voucher_no)}')">
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
                document.getElementById('custom-date-inputs')?.classList.add('hidden');
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

        document.getElementById('custom-date-inputs')?.classList.add('hidden');
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
    const customDateInputs = document.getElementById('custom-date-inputs');

    if (dateDropdown && dateFilter) {
        dateDropdown.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');
            if (!link) return;

            e.preventDefault();

            const range = link.getAttribute('data-date-filter') || 'all';
            
            dateDropdown.querySelectorAll('a').forEach(a => {
                a.classList.remove('bg-gray-100', 'font-semibold');
            });
            link.classList.add('bg-gray-100', 'font-semibold');

            if (range === 'custom') {
                customDateInputs?.classList.remove('hidden');
            } else {
                customDateInputs?.classList.add('hidden');
                advancedFilters.dateRange = range;
                dateFilter.value = range;
                applyFilter();
            }
        });
    }

    const applyCustomDateBtn = document.getElementById('apply-custom-date');
    applyCustomDateBtn?.addEventListener('click', () => {
        const startVal = (document.getElementById('custom-start-date') as HTMLInputElement)?.value || '';
        const endVal = (document.getElementById('custom-end-date') as HTMLInputElement)?.value || '';
        
        advancedFilters.dateRange = 'custom';
        advancedFilters.startDate = startVal;
        advancedFilters.endDate = endVal;
        
        if (dateFilter) dateFilter.value = 'custom';
        applyFilter();
    });

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
                fetchPayments();
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
                            openModal(data.payment);
                        } else if (isRefund) {
                            openRefundModal(data.payment);
                        }
                    }
                })
                .catch(err => console.error('Error auto-loading payment from params:', err));
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

    // ── Voucher Management Logic ─────────────────────────
    const $voucherBtn = document.getElementById('voucher-btn');
    const $voucherModal = document.getElementById('voucher-modal');
    const $closeVoucherModalBtn = document.getElementById('close-voucher-modal-btn');
    const $voucherModalOverlay = document.getElementById('voucher-modal-overlay');

    const $vTabHistory = document.getElementById('voucher-tab-history');
    const $vTabCreate = document.getElementById('voucher-tab-create');
    const $vContentHistory = document.getElementById('voucher-content-history');
    const $vContentCreate = document.getElementById('voucher-content-create');

    // Filters
    const $fVNumber = document.getElementById('filter-v-number') as HTMLInputElement;
    const $fVName = document.getElementById('filter-v-name') as HTMLInputElement;
    const $fVType = document.getElementById('filter-v-type') as HTMLSelectElement;
    const $fVMethod = document.getElementById('filter-v-method') as HTMLSelectElement;
    const $fVStartDate = document.getElementById('filter-v-start-date') as HTMLInputElement;
    const $fVEndDate = document.getElementById('filter-v-end-date') as HTMLInputElement;
    const $fVMinAmount = document.getElementById('filter-v-min-amount') as HTMLInputElement;
    const $fVMaxAmount = document.getElementById('filter-v-max-amount') as HTMLInputElement;
    const $vBtnResetFilters = document.getElementById('v-btn-reset-filters');
    const $vListCount = document.getElementById('voucher-list-count');
    const $vListTbody = document.getElementById('voucher-list-tbody');

    // Form
    const $vForm = document.getElementById('voucher-create-form') as HTMLFormElement;
    const $vFormNumber = document.getElementById('v-form-number') as HTMLInputElement;
    const $vFormDate = document.getElementById('v-form-date') as HTMLInputElement;
    const $vFormPartyType = document.getElementById('v-form-party-type') as HTMLSelectElement;
    const $vFormPartyName = document.getElementById('v-form-party-name') as HTMLInputElement;
    const $vFormPartySuggestions = document.getElementById('v-form-party-suggestions') as HTMLUListElement;
    const $vFormAmount = document.getElementById('v-form-amount') as HTMLInputElement;
    const $vFormAmountWords = document.getElementById('v-form-amount-words') as HTMLTextAreaElement;
    const $vFormMethod = document.getElementById('v-form-method') as HTMLSelectElement;
    const $vFormPurpose = document.getElementById('v-form-purpose') as HTMLTextAreaElement;
    const $vFormBtnReset = document.getElementById('v-form-btn-reset') as HTMLButtonElement;

    // Form conditional fields
    const $vFormChequeFields = document.getElementById('v-form-cheque-fields');
    const $vFormChequeNo = document.getElementById('v-form-cheque-no') as HTMLInputElement;
    const $vFormChequeDate = document.getElementById('v-form-cheque-date') as HTMLInputElement;
    const $vFormChequeBank = document.getElementById('v-form-cheque-bank') as HTMLInputElement;
    const $vFormBankFields = document.getElementById('v-form-bank-fields');
    const $vFormBankName = document.getElementById('v-form-bank-name') as HTMLInputElement;
    const $vFormBankRef = document.getElementById('v-form-bank-ref') as HTMLInputElement;
    const $vFormUpiFields = document.getElementById('v-form-upi-fields');
    const $vFormUpiRef = document.getElementById('v-form-upi-ref') as HTMLInputElement;

    // Preview
    const $vPreviewCompanyName = document.getElementById('preview-v-company-name');
    const $vPreviewCompanyAddress = document.getElementById('preview-v-company-address');
    const $vPreviewCompanyContact = document.getElementById('preview-v-company-contact');
    const $vPreviewNo = document.getElementById('preview-v-no');
    const $vPreviewDate = document.getElementById('preview-v-date');
    const $vPreviewPayee = document.getElementById('preview-v-payee');
    const $vPreviewMethod = document.getElementById('preview-v-method');
    const $vPreviewTowards = document.getElementById('preview-v-towards');
    const $vPreviewWords = document.getElementById('preview-v-words');
    const $vPreviewAmount = document.getElementById('preview-v-amount');
    const $vPreviewActions = document.getElementById('voucher-preview-actions');
    const $vPreviewBtnPrint = document.getElementById('preview-btn-print');
    const $vPreviewBtnPdf = document.getElementById('preview-btn-pdf');

    let currentVoucherCompany: any = null;
    let selectedVoucher: any = null;
    let voucherSuggestionsList: any[] = [];
    let voucherSuggestionsIndex = -1;
    let voucherPartyDebounce: any = null;

    // Open/Close Modal
    $voucherBtn?.addEventListener('click', () => {
        $voucherModal?.classList.remove('hidden');
        switchVoucherTab('history');
        loadVouchersList();
        loadCompanyInfoForForm();
    });

    const closeVoucherModal = () => {
        $voucherModal?.classList.add('hidden');
    };
    $closeVoucherModalBtn?.addEventListener('click', closeVoucherModal);
    $voucherModalOverlay?.addEventListener('click', closeVoucherModal);

    // Tab switcher
    const switchVoucherTab = (tab: 'history' | 'create') => {
        if (tab === 'history') {
            $vTabHistory?.classList.add('bg-white', 'text-slate-700', 'shadow-sm');
            $vTabHistory?.classList.remove('text-slate-600', 'hover:text-slate-800');
            $vTabCreate?.classList.remove('bg-white', 'text-slate-700', 'shadow-sm');
            $vTabCreate?.classList.add('text-slate-600', 'hover:text-slate-800');
            $vContentHistory?.classList.remove('hidden');
            $vContentCreate?.classList.add('hidden');
            loadVouchersList();
        } else {
            $vTabCreate?.classList.add('bg-white', 'text-slate-700', 'shadow-sm');
            $vTabCreate?.classList.remove('text-slate-600', 'hover:text-slate-800');
            $vTabHistory?.classList.remove('bg-white', 'text-slate-700', 'shadow-sm');
            $vTabHistory?.classList.add('text-slate-600', 'hover:text-slate-800');
            $vContentCreate?.classList.remove('hidden');
            $vContentHistory?.classList.add('hidden');
            resetVoucherForm();
            loadNextVoucherNumber();
        }
    };

    $vTabHistory?.addEventListener('click', () => switchVoucherTab('history'));
    $vTabCreate?.addEventListener('click', () => switchVoucherTab('create'));

    // Dynamic fields display
    $vFormMethod?.addEventListener('change', () => {
        const val = $vFormMethod.value;
        $vFormChequeFields?.classList.add('hidden');
        $vFormBankFields?.classList.add('hidden');
        $vFormUpiFields?.classList.add('hidden');

        $vFormChequeNo.removeAttribute('required');
        $vFormChequeDate.removeAttribute('required');
        $vFormChequeBank.removeAttribute('required');
        $vFormBankName.removeAttribute('required');
        $vFormBankRef.removeAttribute('required');
        $vFormUpiRef.removeAttribute('required');

        if (val === 'Cheque') {
            $vFormChequeFields?.classList.remove('hidden');
            $vFormChequeNo.setAttribute('required', 'true');
            $vFormChequeDate.setAttribute('required', 'true');
            $vFormChequeBank.setAttribute('required', 'true');
        } else if (val === 'Bank Transfer') {
            $vFormBankFields?.classList.remove('hidden');
            $vFormBankName.setAttribute('required', 'true');
            $vFormBankRef.setAttribute('required', 'true');
        } else if (val === 'UPI') {
            $vFormUpiFields?.classList.remove('hidden');
            $vFormUpiRef.setAttribute('required', 'true');
        }
        updateVoucherLivePreview();
    });

    // Realtime preview triggers
    const liveInputs = [$vFormDate, $vFormPartyType, $vFormPartyName, $vFormAmount, $vFormPurpose, $vFormChequeNo, $vFormChequeDate, $vFormChequeBank, $vFormBankName, $vFormBankRef, $vFormUpiRef];
    liveInputs.forEach(input => {
        input?.addEventListener('input', updateVoucherLivePreview);
        input?.addEventListener('change', updateVoucherLivePreview);
    });

    // Payee suggestions autocomplete
    async function searchVoucherParties(type: 'Customer' | 'Supplier', query: string): Promise<any[]> {
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
            console.error('Failed to search voucher parties', e);
            return [];
        }
    }

    $vFormPartyName?.addEventListener('input', () => {
        const query = $vFormPartyName.value.trim();
        const type = $vFormPartyType.value as 'Customer' | 'Supplier' | 'Other';
        clearTimeout(voucherPartyDebounce);
        $vFormPartySuggestions.innerHTML = '';
        $vFormPartySuggestions.classList.add('hidden');
        voucherSuggestionsIndex = -1;

        if (type === 'Other' || query.length < 1) {
            return;
        }

        voucherPartyDebounce = setTimeout(async () => {
            voucherSuggestionsList = await searchVoucherParties(type, query);
            if (voucherSuggestionsList.length === 0) {
                return;
            }
            $vFormPartySuggestions.classList.remove('hidden');
            voucherSuggestionsList.forEach((party, idx) => {
                const li = document.createElement('li');
                li.className = 'px-3 py-2 hover:bg-slate-100 cursor-pointer transition-colors';
                li.textContent = party.name;
                li.onclick = () => {
                    $vFormPartyName.value = party.name;
                    $vFormPartySuggestions.classList.add('hidden');
                    updateVoucherLivePreview();
                };
                $vFormPartySuggestions.appendChild(li);
            });
        }, 250);
    });

    $vFormPartyName?.addEventListener('keydown', (e: KeyboardEvent) => {
        const items = $vFormPartySuggestions.querySelectorAll('li');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            voucherSuggestionsIndex = (voucherSuggestionsIndex + 1) % items.length;
            updateSuggestionsHighlight(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            voucherSuggestionsIndex = (voucherSuggestionsIndex - 1 + items.length) % items.length;
            updateSuggestionsHighlight(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (voucherSuggestionsIndex > -1) {
                (items[voucherSuggestionsIndex] as HTMLElement).click();
            } else {
                (items[0] as HTMLElement).click();
            }
        } else if (e.key === 'Escape') {
            $vFormPartySuggestions.classList.add('hidden');
        }
    });

    function updateSuggestionsHighlight(items: NodeListOf<HTMLLIElement>) {
        items.forEach((item, idx) => {
            if (idx === voucherSuggestionsIndex) {
                item.classList.add('bg-blue-50', 'text-blue-700', 'font-semibold');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('bg-blue-50', 'text-blue-700', 'font-semibold');
            }
        });
    }

    // Amount in Words generator
    $vFormAmount?.addEventListener('input', () => {
        const amt = parseFloat($vFormAmount.value) || 0;
        if (amt > 0 && (window as any).numberToWords) {
            const words = (window as any).numberToWords(amt);
            $vFormAmountWords.value = `Rupees ${words} Only`;
        } else {
            $vFormAmountWords.value = '';
        }
        updateVoucherLivePreview();
    });

    // Next Voucher Number
    async function loadNextVoucherNumber() {
        try {
            const res = await fetch('/payment/voucher/next-number');
            const data = await res.json();
            if (data.success) {
                $vFormNumber.value = data.voucherNumber;
                if ($vPreviewNo) $vPreviewNo.textContent = data.voucherNumber;
            }
        } catch (e) {
            console.error('Failed to load next voucher number', e);
        }
    }

    // Company info for preview
    async function loadCompanyInfoForForm() {
        if (currentVoucherCompany) return;
        try {
            // Fetch one voucher if exists, or use default details
            if ($vPreviewCompanyName) $vPreviewCompanyName.textContent = "SHRESHT SYSTEMS";
            if ($vPreviewCompanyAddress) $vPreviewCompanyAddress.textContent = "CCTV & Energy Solutions";
            if ($vPreviewCompanyContact) $vPreviewCompanyContact.textContent = "Phone: +91 | Email: support@shresht.com";
        } catch (e) {
            console.error(e);
        }
    }

    // Live preview updater
    function updateVoucherLivePreview() {
        if ($vPreviewNo) $vPreviewNo.textContent = $vFormNumber.value || 'PV-2026-XXXX';
        
        const dateVal = $vFormDate.value;
        if ($vPreviewDate) {
            $vPreviewDate.textContent = dateVal ? new Date(dateVal).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
        }

        if ($vPreviewPayee) {
            $vPreviewPayee.textContent = $vFormPartyName.value ? `${$vFormPartyName.value} (${$vFormPartyType.value})` : '-';
        }

        const method = $vFormMethod.value;
        let methodDetails = method;
        if (method === 'Cheque') {
            methodDetails += ` (Cheque No: ${$vFormChequeNo.value || '-'}, Bank: ${$vFormChequeBank.value || '-'}, Date: ${$vFormChequeDate.value ? new Date($vFormChequeDate.value).toLocaleDateString('en-IN') : '-'})`;
        } else if (method === 'Bank Transfer') {
            methodDetails += ` (Bank: ${$vFormBankName.value || '-'}, Ref: ${$vFormBankRef.value || '-'})`;
        } else if (method === 'UPI') {
            methodDetails += ` (UPI Ref: ${$vFormUpiRef.value || '-'})`;
        }
        if ($vPreviewMethod) $vPreviewMethod.textContent = methodDetails;

        if ($vPreviewTowards) $vPreviewTowards.textContent = $vFormPurpose.value || '-';
        if ($vPreviewWords) $vPreviewWords.textContent = $vFormAmountWords.value || '-';
        
        const amt = parseFloat($vFormAmount.value) || 0;
        if ($vPreviewAmount) {
            $vPreviewAmount.textContent = '₹ ' + amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    }

    // Reset Form
    function resetVoucherForm() {
        $vForm.reset();
        $vFormChequeFields?.classList.add('hidden');
        $vFormBankFields?.classList.add('hidden');
        $vFormUpiFields?.classList.add('hidden');
        $vPreviewActions?.classList.add('hidden');
        $vForm.querySelector('button[type="submit"]')?.classList.remove('hidden');
        $vFormBtnReset?.classList.remove('hidden');
        
        // Re-enable form fields
        Array.from($vForm.elements).forEach(el => {
            (el as any).removeAttribute('disabled');
        });
        
        $vFormDate.value = new Date().toISOString().split('T')[0];
        $vFormMethod.value = 'Cash';
        $vFormPartyType.value = 'Customer';
        
        selectedVoucher = null;
        updateVoucherLivePreview();
    }

    $vFormBtnReset?.addEventListener('click', resetVoucherForm);

    // Form submit
    $vForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            date: $vFormDate.value,
            partyName: $vFormPartyName.value,
            partyType: $vFormPartyType.value,
            amount: parseFloat($vFormAmount.value),
            amountInWords: $vFormAmountWords.value,
            paymentMethod: $vFormMethod.value,
            chequeNumber: $vFormChequeNo.value || undefined,
            bankName: ($vFormMethod.value === 'Cheque' || $vFormMethod.value === 'Bank Transfer') ? ($vFormChequeBank.value || $vFormBankName.value) : undefined,
            chequeDate: $vFormChequeDate.value || undefined,
            referenceNumber: ($vFormMethod.value === 'Bank Transfer' || $vFormMethod.value === 'UPI') ? ($vFormBankRef.value || $vFormUpiRef.value) : undefined,
            paidTowards: $vFormPurpose.value,
            createdBy: 'Admin'
        };

        try {
            const res = await fetch('/payment/voucher/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                (window as any).showAlert('Payment Voucher created successfully!');
                selectedVoucher = data.voucher;
                
                // Refresh main Payments Ledger
                fetchPayments();

                // Display preview with actions
                $vPreviewActions?.classList.remove('hidden');
                $vForm.querySelector('button[type="submit"]')?.classList.add('hidden');
                $vFormBtnReset?.classList.add('hidden');
                
                // Disable all form fields
                Array.from($vForm.elements).forEach(el => {
                    (el as any).setAttribute('disabled', 'disabled');
                });
            } else {
                (window as any).showAlert(data.message || 'Failed to create voucher');
            }
        } catch (err: unknown) {
            console.error('Error creating voucher', err);
            (window as any).showAlert('Failed to create payment voucher');
        }
    });

    // History list filters
    const historyFilters = [$fVNumber, $fVName, $fVType, $fVMethod, $fVStartDate, $fVEndDate, $fVMinAmount, $fVMaxAmount];
    historyFilters.forEach(filter => {
        filter?.addEventListener('input', () => loadVouchersList());
        filter?.addEventListener('change', () => loadVouchersList());
    });

    $vBtnResetFilters?.addEventListener('click', () => {
        $fVNumber.value = '';
        $fVName.value = '';
        $fVType.value = '';
        $fVMethod.value = '';
        $fVStartDate.value = '';
        $fVEndDate.value = '';
        $fVMinAmount.value = '';
        $fVMaxAmount.value = '';
        loadVouchersList();
    });

    // Load vouchers list
    async function loadVouchersList() {
        if (!$vListTbody) return;
        $vListTbody.innerHTML = `<tr><td colspan="7" class="px-6 py-10 text-center text-slate-400">Loading vouchers...</td></tr>`;

        const params = new URLSearchParams();
        if ($fVNumber.value) params.append('voucherNumber', $fVNumber.value.trim());
        if ($fVName.value) params.append('partyName', $fVName.value.trim());
        if ($fVType.value) params.append('partyType', $fVType.value);
        if ($fVMethod.value) params.append('paymentMethod', $fVMethod.value);
        if ($fVStartDate.value) params.append('startDate', $fVStartDate.value);
        if ($fVEndDate.value) params.append('endDate', $fVEndDate.value);
        if ($fVMinAmount.value) params.append('amountMin', $fVMinAmount.value);
        if ($fVMaxAmount.value) params.append('amountMax', $fVMaxAmount.value);

        try {
            const res = await fetch(`/payment/voucher/list?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                const vouchers = data.vouchers || [];
                if ($vListCount) $vListCount.textContent = `Showing ${vouchers.length} vouchers`;
                
                if (vouchers.length === 0) {
                    $vListTbody.innerHTML = `<tr><td colspan="7" class="px-6 py-10 text-center text-slate-450">No vouchers found</td></tr>`;
                    return;
                }

                $vListTbody.innerHTML = vouchers.map((v: any) => {
                    return `
                    <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                        <td class="px-4 py-3 font-medium text-slate-600">${new Date(v.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td class="px-4 py-3 font-bold text-blue-600 cursor-pointer hover:underline" onclick="(window as any).viewVoucherByNo('${escapeHtml(v.voucherNumber)}')">${escapeHtml(v.voucherNumber)}</td>
                        <td class="px-4 py-3 font-semibold text-slate-800">${escapeHtml(v.partyName)} <span class="text-[10px] text-slate-400 font-bold uppercase">(${v.partyType})</span></td>
                        <td class="px-4 py-3">${escapeHtml(v.paymentMethod)}</td>
                        <td class="px-4 py-3 text-right font-extrabold text-slate-900">₹ ${v.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td class="px-4 py-3 truncate max-w-[150px]" title="${escapeHtml(v.paidTowards)}">${escapeHtml(v.paidTowards)}</td>
                        <td class="px-4 py-3 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="event.stopPropagation(); (window as any).printVoucher('${v._id}')" class="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors" title="Print"><i class="fas fa-print text-xs"></i></button>
                                <button onclick="event.stopPropagation(); (window as any).downloadVoucherPDF('${v._id}')" class="p-1.5 bg-slate-100 text-slate-700 border border-slate-350 rounded hover:bg-slate-200 transition-colors" title="Download PDF"><i class="fas fa-file-pdf text-xs"></i></button>
                            </div>
                        </td>
                    </tr>`;
                }).join('');
            } else {
                $vListTbody.innerHTML = `<tr><td colspan="7" class="px-6 py-10 text-center text-red-500">Failed to load vouchers</td></tr>`;
            }
        } catch (e) {
            console.error('Failed to load vouchers list', e);
            $vListTbody.innerHTML = `<tr><td colspan="7" class="px-6 py-10 text-center text-red-500">Failed to load vouchers</td></tr>`;
        }
    }

    // View voucher by number (called from tables)
    (window as any).viewVoucherByNo = async function(voucherNo: string) {
        try {
            const res = await fetch(`/payment/voucher/by-no/${encodeURIComponent(voucherNo)}`);
            const data = await res.json();
            if (data.success) {
                selectedVoucher = data.voucher;
                currentVoucherCompany = data.company;
                
                $voucherModal?.classList.remove('hidden');
                switchVoucherTab('create');
                
                // Populate Form (Disabled)
                $vFormDate.value = new Date(selectedVoucher.date).toISOString().split('T')[0];
                $vFormPartyType.value = selectedVoucher.partyType;
                $vFormPartyName.value = selectedVoucher.partyName;
                $vFormAmount.value = selectedVoucher.amount;
                $vFormAmountWords.value = selectedVoucher.amountInWords;
                $vFormMethod.value = selectedVoucher.paymentMethod;
                $vFormPurpose.value = selectedVoucher.paidTowards;
                
                // Disables all
                Array.from($vForm.elements).forEach(el => {
                    (el as any).setAttribute('disabled', 'disabled');
                });
                $vForm.querySelector('button[type="submit"]')?.classList.add('hidden');
                $vFormBtnReset?.classList.add('hidden');

                // Conditional fields
                $vFormChequeFields?.classList.add('hidden');
                $vFormBankFields?.classList.add('hidden');
                $vFormUpiFields?.classList.add('hidden');
                if (selectedVoucher.paymentMethod === 'Cheque') {
                    $vFormChequeFields?.classList.remove('hidden');
                    $vFormChequeNo.value = selectedVoucher.chequeNumber || '';
                    $vFormChequeDate.value = selectedVoucher.chequeDate ? new Date(selectedVoucher.chequeDate).toISOString().split('T')[0] : '';
                    $vFormChequeBank.value = selectedVoucher.bankName || '';
                } else if (selectedVoucher.paymentMethod === 'Bank Transfer') {
                    $vFormBankFields?.classList.remove('hidden');
                    $vFormBankName.value = selectedVoucher.bankName || '';
                    $vFormBankRef.value = selectedVoucher.referenceNumber || '';
                } else if (selectedVoucher.paymentMethod === 'UPI') {
                    $vFormUpiFields?.classList.remove('hidden');
                    $vFormUpiRef.value = selectedVoucher.referenceNumber || '';
                }

                // Populate Preview
                if ($vPreviewCompanyName) $vPreviewCompanyName.textContent = currentVoucherCompany.name;
                if ($vPreviewCompanyAddress) $vPreviewCompanyAddress.textContent = currentVoucherCompany.address || '-';
                if ($vPreviewCompanyContact) {
                    $vPreviewCompanyContact.textContent = `Phone: ${currentVoucherCompany.phone || '-'} | Email: ${currentVoucherCompany.email || '-'}`;
                }
                
                updateVoucherLivePreview();
                $vFormNumber.value = selectedVoucher.voucherNumber;
                if ($vPreviewNo) $vPreviewNo.textContent = selectedVoucher.voucherNumber;

                // Show action bar
                $vPreviewActions?.classList.remove('hidden');
            } else {
                (window as any).showAlert('Voucher not found');
            }
        } catch (e) {
            console.error('Failed to view voucher', e);
            (window as any).showAlert('Failed to load voucher details');
        }
    };

    // Print & PDF helper generators
    function generateVoucherPrintHTML(v: any, c: any): string {
        const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
        const formatIndian = (n: any) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        let methodDetails = v.paymentMethod;
        if (v.paymentMethod === 'Cheque') {
            methodDetails += ` (Cheque No: ${v.chequeNumber || '-'}, Bank: ${v.bankName || '-'}, Date: ${formatDate(v.chequeDate)})`;
        } else if (v.paymentMethod === 'Bank Transfer') {
            methodDetails += ` (Bank: ${v.bankName || '-'}, Ref: ${v.referenceNumber || '-'})`;
        } else if (v.paymentMethod === 'UPI') {
            methodDetails += ` (UPI Ref: ${v.referenceNumber || '-'})`;
        }

        return `
        <html>
        <head>
            <title>Payment Voucher - ${v.voucherNumber}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; color: #333; background-color: #fff; margin: 0; }
                .voucher-container { border: 2px solid #333; padding: 24px; max-width: 800px; margin: 0 auto; background: #fff; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px double #333; padding-bottom: 15px; margin-bottom: 20px; }
                .company-info h1 { font-size: 20px; font-weight: bold; margin: 0; color: #000; text-transform: uppercase; }
                .company-info p { font-size: 11px; margin: 3px 0 0 0; color: #555; }
                .voucher-title-box { text-align: center; margin: 15px 0; }
                .voucher-title { font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border: 2px solid #000; padding: 6px 16px; display: inline-block; }
                .content-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .content-table td { padding: 12px 8px; font-size: 13px; vertical-align: top; }
                .content-table tr { border-bottom: 1px solid #eee; }
                .label { font-weight: bold; width: 25%; color: #000; }
                .value { border-bottom: 1px dashed #333; }
                .amount-row { display: flex; justify-content: space-between; align-items: center; margin-top: 30px; margin-bottom: 40px; }
                .amount-box { border: 2px solid #000; padding: 10px 20px; font-size: 18px; font-weight: bold; background-color: #f8fafc; display: inline-block; }
                .amount-words-box { font-size: 12px; font-style: italic; width: 65%; border-bottom: 1px dashed #333; padding-bottom: 5px; }
                .signature-row { display: flex; justify-content: space-between; margin-top: 50px; font-size: 12px; font-weight: bold; }
                .sig-col { width: 40%; text-align: center; }
                .sig-line { border-bottom: 1px solid #000; margin-bottom: 8px; height: 30px; }
                @media print { body { padding: 0; } .voucher-container { border: 2px solid #000; } }
            </style>
        </head>
        <body>
            <div class="voucher-container">
                <div class="header">
                    <div class="company-info">
                        <h1>${c.name}</h1>
                        <p>${c.address || ''}</p>
                        <p>Phone: ${c.phone || ''} | Email: ${c.email || ''}</p>
                    </div>
                    <div style="text-align: right; font-family: monospace;">
                        <div style="font-weight: bold; font-size: 14px;">Voucher No: <span style="color: #c2410c;">${v.voucherNumber}</span></div>
                        <div style="margin-top: 5px; font-size: 12px;">Date: ${formatDate(v.date)}</div>
                    </div>
                </div>
                
                <div class="voucher-title-box">
                    <div class="voucher-title">Payment Voucher</div>
                </div>

                <table class="content-table">
                    <tr>
                        <td class="label">Paid To (Payee)</td>
                        <td class="value">${v.partyName} (${v.partyType})</td>
                    </tr>
                    <tr>
                        <td class="label">Payment Method</td>
                        <td class="value">${methodDetails}</td>
                    </tr>
                    <tr style="border-bottom: none;">
                        <td class="label">Paid Towards</td>
                        <td class="value" style="white-space: pre-wrap;">${v.paidTowards}</td>
                    </tr>
                </table>

                <div class="amount-row">
                    <div class="amount-words-box">
                        <strong>Amount in Words:</strong><br>
                        ${v.amountInWords}
                    </div>
                    <div class="amount-box">
                        ₹ ${formatIndian(v.amount)}
                    </div>
                </div>

                <div class="signature-row">
                    <div class="sig-col">
                        <div class="sig-line"></div>
                        Paid By
                    </div>
                    <div class="sig-col">
                        <div class="sig-line"></div>
                        Receiver Signature
                    </div>
                </div>
            </div>
        </body>
        </html>`;
    }

    (window as any).printVoucher = async function(id: string) {
        try {
            const res = await fetch(`/payment/voucher/${id}`);
            const data = await res.json();
            if (data.success) {
                const html = generateVoucherPrintHTML(data.voucher, data.company);
                if (window.electronAPI && typeof window.electronAPI.handlePrintEvent === 'function') {
                    window.electronAPI.handlePrintEvent(html, 'print', `Voucher-${data.voucher.voucherNumber}`);
                } else if ((window as any).handlePrint) {
                    (window as any).handlePrint(html, 'print');
                }
            }
        } catch (e) {
            console.error('Print voucher failed', e);
            (window as any).showAlert('Failed to print voucher');
        }
    };

    (window as any).downloadVoucherPDF = async function(id: string) {
        try {
            const res = await fetch(`/payment/voucher/${id}`);
            const data = await res.json();
            if (data.success) {
                const html = generateVoucherPrintHTML(data.voucher, data.company);
                if (window.electronAPI && typeof window.electronAPI.handlePrintEvent === 'function') {
                    window.electronAPI.handlePrintEvent(html, 'savePDF', `Voucher-${data.voucher.voucherNumber}`);
                } else if ((window as any).handlePrint) {
                    (window as any).handlePrint(html, 'savePDF', `Voucher-${data.voucher.voucherNumber}`);
                }
            }
        } catch (e) {
            console.error('PDF export failed', e);
            (window as any).showAlert('Failed to download voucher PDF');
        }
    };

    $vPreviewBtnPrint?.addEventListener('click', () => {
        if (selectedVoucher) (window as any).printVoucher(selectedVoucher._id);
    });

    $vPreviewBtnPdf?.addEventListener('click', () => {
        if (selectedVoucher) (window as any).downloadVoucherPDF(selectedVoucher._id);
    });

})();
