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
    remarks?: string;
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
    remarks?: string;
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
        confirmDelete: (id: string) => Promise<void>;
        viewPayment: (id: string) => void;
    };
    validateCurrentStep?: () => Promise<boolean>;
}
(function (): void {
    'use strict';

    // ── State ───────────────────────────────
    let allPayments: IPaymentRecord[] = [];
    let filteredPayments: IPaymentRecord[] = [];
    let currentFilter: string = 'all';
    let editingId: string | null = null;
    let selectedDetailsPayment: IPaymentRecord | null = null;
    let submitPartyTypeOverride: 'Customer' | 'Supplier' | null = null;
    let shortcutsModalRef: HTMLElement | null = null;
    let validator: any = null;
    const advancedFilters = {
        direction: '',
        mode: '',
        referenceType: '',
        advance: ''
    };

    // ── DOM Refs ──────────────────────────────────────────
    const $tbody = document.getElementById('payment-tbody') as HTMLTableSectionElement;
    const $totalIn = document.getElementById('total-in') as HTMLElement;
    const $totalOut = document.getElementById('total-out') as HTMLElement;
    const $netBalance = document.getElementById('net-balance') as HTMLElement;
    const $totalCount = document.getElementById('total-count') as HTMLElement;
    const $filterCount = document.getElementById('filter-count') as HTMLElement;
    const $searchInput = document.getElementById('search-input') as HTMLInputElement;
    const $filterPopover = document.getElementById('filter-popover') as HTMLDivElement;
    const $filterBtn = document.getElementById('filter-btn') as HTMLButtonElement;
    const $refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
    const $directionFilter = document.getElementById('direction-filter') as HTMLSelectElement;
    const $modeFilter = document.getElementById('mode-filter') as HTMLSelectElement;
    const $referenceFilter = document.getElementById('reference-filter') as HTMLSelectElement;
    const $advanceFilter = document.getElementById('advance-filter') as HTMLSelectElement;
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

    async function deletePaymentById(id: string): Promise<IApiResponse> {
        const res = await fetch(`/payment/${id}`, { method: 'DELETE' });
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
                const contact = type === 'Customer' ? party.customer : party.supplier;
                const address = type === 'Customer' ? party.billing_address : party.address;

                if ($previewPartyName) $previewPartyName.textContent = contact?.name || partyName;
                if ($previewPartyPhone) $previewPartyPhone.textContent = contact?.phone || '';
                if ($previewPartyGstin) $previewPartyGstin.textContent = party.gstin || '';
                if ($previewPartyEmail) $previewPartyEmail.textContent = contact?.email || '';

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
    function updateSummary(): void {
        const totalIn: number = allPayments
            .filter((p: IPaymentRecord) => p.direction === 'IN')
            .reduce((s: number, p: IPaymentRecord) => s + (p.amount || 0), 0);
        const totalOut: number = allPayments
            .filter((p: IPaymentRecord) => p.direction === 'OUT')
            .reduce((s: number, p: IPaymentRecord) => s + (p.amount || 0), 0);
        $totalIn.textContent = formatCurrency(totalIn);
        $totalOut.textContent = formatCurrency(totalOut);
        $netBalance.textContent = formatCurrency(totalIn - totalOut);
        $totalCount.textContent = String(allPayments.length);
    }

    function applyFilter(): void {
        const query: string = ($searchInput.value || '').toLowerCase().trim();

        filteredPayments = allPayments.filter((p: IPaymentRecord) => {
            // Direction filter
            if (currentFilter === 'IN' && p.direction !== 'IN') return false;
            if (currentFilter === 'OUT' && p.direction !== 'OUT') return false;
            if (currentFilter === 'advance' && !p.is_advance) return false;
            if (advancedFilters.direction && p.direction !== advancedFilters.direction) return false;
            if (advancedFilters.mode && p.mode !== advancedFilters.mode) return false;
            if (advancedFilters.referenceType && p.reference_type !== advancedFilters.referenceType) return false;
            if (advancedFilters.advance === 'yes' && !p.is_advance) return false;
            if (advancedFilters.advance === 'no' && p.is_advance) return false;

            // Search filter
            if (query) {
                const searchable: string = [
                    p.remarks, p.transaction_details, p.party_type,
                    p.reference_type, p.mode, p.direction,
                    String(p.amount)
                ].filter(Boolean).join(' ').toLowerCase();
                if (!searchable.includes(query)) return false;
            }

            return true;
        });

        $filterCount.textContent = String(filteredPayments.length);
        renderTable();
    }

    function renderTable(): void {
        if (filteredPayments.length === 0) {
            $tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-400">
                        <i class="fas fa-inbox text-4xl mb-3"></i>
                        <p class="text-lg font-medium">No payments found</p>
                        <p class="text-sm">Click "New Payment" to record one.</p>
                    </td>
                </tr>`;
            return;
        }

        $tbody.innerHTML = filteredPayments.map((p: IPaymentRecord) => {
            const dirClass: string = p.direction === 'IN' ? 'badge-in' : 'badge-out';
            const dirIcon: string = p.direction === 'IN' ? 'fa-arrow-down' : 'fa-arrow-up';
            const dirLabel: string = p.direction === 'IN' ? 'IN' : 'OUT';
            const modeClass: string = modeBadgeClass(p.mode);
            const advanceBadge: string = p.is_advance
                ? '<span class="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">ADV</span>'
                : '';

            return `
            <tr class="payment-row border-b border-gray-100" data-payment-id="${escapeHtml(p._id)}" tabindex="0" title="View payment details">
                <td class="px-6 py-4 text-gray-800 font-medium whitespace-nowrap">${formatDate(p.payment_date)}</td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${dirClass}">
                        <i class="fas ${dirIcon} text-[10px]"></i>${dirLabel}
                    </span>
                    ${advanceBadge}
                </td>
                <td class="px-6 py-4 text-right font-bold ${p.direction === 'IN' ? 'text-green-700' : 'text-red-700'}">
                    ${formatCurrency(p.amount)}
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${modeClass}">
                        ${escapeHtml(p.mode)}
                    </span>
                </td>
                <td class="px-6 py-4 text-gray-600 text-sm">${escapeHtml(p.party_display_id || p.party_id || '-')}</td>
                <td class="px-6 py-4 text-gray-600 text-sm">${escapeHtml(p.reference_type || '-')}</td>
                <td class="px-6 py-4 text-gray-500 text-sm max-w-[260px] truncate" title="${escapeHtml(p.transaction_details || p.remarks || '')}">${escapeHtml(p.transaction_details || p.remarks || '-')}</td>
            </tr>`;
        }).join('');

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
        submitPartyTypeOverride = payment?.party_type || null;
        $formPaymentId.value = editingId || '';
        $partyIdHidden.value = '';
        if (validator) validator.clearAllErrors();
        renderPartyProfileCard();

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
            
            // NOTE: We don't have the party name here, only ID. 
            // We should fetch details by ID to show the name.
            $partyNameInput.value = ''; 
            $partyIdHidden.value = payment.party_id || '';

            (document.getElementById('form-reference-type') as HTMLSelectElement).value = payment.reference_type || '';
            (document.getElementById('form-reference-id') as HTMLInputElement).value = payment.reference_id || '';
            (document.getElementById('form-transaction-details') as HTMLInputElement).value = payment.transaction_details || '';
            (document.getElementById('form-advance') as HTMLInputElement).checked = payment.is_advance || false;
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
                const contact = type === 'Customer' ? party.customer : party.supplier;
                $partyNameInput.value = contact?.name || '';
                fetchPartyDetails(type as 'Customer' | 'Supplier', contact?.name);
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
        $detailsReference.textContent = referenceLabel(payment);
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

        if (payment.reference_ref && payment.reference_type && payment.reference_type !== 'Adjustment') {
            fetchDetailsModalReference(payment.reference_type as any, payment.reference_ref);
        }

        $detailsModal.classList.remove('hidden');
    }

    async function fetchDetailsModalParty(type: 'Customer' | 'Supplier', id: string): Promise<void> {
        try {
            const res = await fetch(`/payment/get-party-details-by-id/${type}/${id}`);
            const data = await res.json();
            if (data.success && data.party) {
                const party = data.party;
                const contact = type === 'Customer' ? party.customer : party.supplier;
                const address = type === 'Customer' ? party.billing_address : party.address;

                const phone = contact?.phone || '-';
                const gstin = party.gstin || '-';
                const email = contact?.email || '-';

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
        (document.getElementById('form-reference-type') as HTMLSelectElement).value = 'Adjustment';
        (document.getElementById('form-reference-id') as HTMLInputElement).value = '';
        (document.getElementById('form-transaction-details') as HTMLInputElement).value = payment.transaction_details || '';
        (document.getElementById('form-advance') as HTMLInputElement).checked = false;
        (document.getElementById('form-remarks') as HTMLTextAreaElement).value = `Refund for payment ${payment._id}`;

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
            $filterPopover.style.top = `${rect.bottom + 8}px`;
            $filterPopover.style.left = `${Math.max(16, rect.right - $filterPopover.offsetWidth)}px`;
            $filterPopover.classList.remove('hidden');
        } else {
            $filterPopover.classList.add('hidden');
        }
    }

    function applyAdvancedFilters(): void {
        advancedFilters.direction = $directionFilter?.value || '';
        advancedFilters.mode = $modeFilter?.value || '';
        advancedFilters.referenceType = $referenceFilter?.value || '';
        advancedFilters.advance = $advanceFilter?.value || '';
        $filterPopover?.classList.add('hidden');
        applyFilter();
    }

    function resetAdvancedFilters(): void {
        advancedFilters.direction = '';
        advancedFilters.mode = '';
        advancedFilters.referenceType = '';
        advancedFilters.advance = '';
        if ($directionFilter) $directionFilter.value = '';
        if ($modeFilter) $modeFilter.value = '';
        if ($referenceFilter) $referenceFilter.value = '';
        if ($advanceFilter) $advanceFilter.value = '';
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
            $partySuggestions.classList.add('hidden');
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
                $partySuggestions.classList.add('hidden');
                return;
            }

            partyDebounceTimer = setTimeout(async () => {
                currentSuggestions = await searchParties(query);
                $partySuggestions.innerHTML = '';
                suggestionSelectedIndex = -1;

                if (currentSuggestions.length === 0) {
                    $partySuggestions.classList.add('hidden');
                    return;
                }

                $partySuggestions.classList.remove('hidden');
                currentSuggestions.forEach(party => {
                    $partySuggestions.appendChild(renderSuggestionItem(party));
                });
            }, 250);
        });

        $partyNameInput.addEventListener('keydown', (e: KeyboardEvent) => {
            const items = $partySuggestions.querySelectorAll('li');
            if (items.length === 0 || $partySuggestions.classList.contains('hidden')) return;

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
                $partySuggestions.classList.add('hidden');
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
                $partySuggestions.classList.add('hidden');
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
    (document.getElementById('close-filter') as HTMLButtonElement)
        .addEventListener('click', () => $filterPopover?.classList.add('hidden'));
    (document.getElementById('apply-filters-btn') as HTMLButtonElement)
        .addEventListener('click', applyAdvancedFilters);
    (document.getElementById('reset-filters') as HTMLButtonElement)
        .addEventListener('click', resetAdvancedFilters);

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
    (document.getElementById('details-delete-btn') as HTMLButtonElement)
        .addEventListener('click', async () => {
            if (!selectedDetailsPayment) return;
            const paymentId = selectedDetailsPayment._id;
            const confirmed: boolean = confirm('Are you sure you want to delete this payment?');
            if (!confirmed) return;
            try {
                const result: IApiResponse = await deletePaymentById(paymentId);
                if (result.success) {
                    closeDetailsModal();
                    showToast('Payment deleted');
                    fetchPayments();
                } else {
                    showToast(result.message || 'Delete failed', true);
                }
            } catch (err) {
                console.error('Delete error:', err);
                showToast('Error deleting payment', true);
            }
        });

    // Direction changes: clear party field and reset profile card
    document.querySelectorAll('input[name="direction"]').forEach(radio => {
        radio.addEventListener('change', () => {
            submitPartyTypeOverride = null;
            $partyNameInput.value = '';
            $partyIdHidden.value = '';
            $partySuggestions.innerHTML = '';
            $partySuggestions.classList.add('hidden');
            if ($previewPartyName) $previewPartyName.textContent = '';
            if ($previewPartyPhone) $previewPartyPhone.textContent = '';
            if ($previewPartyGstin) $previewPartyGstin.textContent = '';
            if ($previewPartyEmail) $previewPartyEmail.textContent = '';
            if ($previewPartyAddress) $previewPartyAddress.textContent = '';
            renderPartyProfileCard();
        });
    });

    // Filter tabs
    document.querySelectorAll<HTMLElement>('.filter-tab').forEach((tab: HTMLElement) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter || 'all';
            applyFilter();
        });
    });

    // Search
    let searchTimer: ReturnType<typeof setTimeout>;
    $searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(applyFilter, 250);
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
            remarks: (document.getElementById('form-remarks') as HTMLTextAreaElement).value || ""
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
        confirmDelete: async function (id: string): Promise<void> {
            const confirmed: boolean = confirm('Are you sure you want to delete this payment?');
            if (!confirmed) return;
            try {
                const result: IApiResponse = await deletePaymentById(id);
                if (result.success) {
                    showToast('Payment deleted');
                    fetchPayments();
                } else {
                    showToast(result.message || 'Delete failed', true);
                }
            } catch (err) {
                console.error('Delete error:', err);
                showToast('Error deleting payment', true);
            }
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
        }
    });

})();
