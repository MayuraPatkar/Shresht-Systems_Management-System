/**
 * details.ts
 *
 * Frontend controller for payment details page.
 */

(function (): void {
    'use strict';

    // ── State ──────────────────────────────────────────────
    let currentPayment: IPaymentRecord | null = null;
    let editingId: string | null = null;
    let submitPartyTypeOverride: 'Customer' | 'Supplier' | null = null;
    let shortcutsModalRef: HTMLElement | null = null;
    
    // Autocomplete/Suggestions state
    let suggestionSelectedIndex = -1;
    let currentParties: {id: string, name: string}[] = [];

    // URL Param check
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get('id');

    if (!paymentId) {
        window.location.href = '/payment';
        return;
    }

    // ── DOM Refs ──────────────────────────────────────────
    const $headerTitle = document.getElementById('header-title') as HTMLElement;
    const $homeBtn = document.getElementById('home-btn') as HTMLButtonElement;
    
    // Details Display DOM Refs
    const $detailsIcon = document.getElementById('details-icon') as HTMLElement;
    const $detailsAmount = document.getElementById('details-amount') as HTMLElement;
    const $detailsDirection = document.getElementById('details-direction') as HTMLElement;
    const $detailsAdvanceBadge = document.getElementById('details-advance-badge') as HTMLElement;
    const $detailsDate = document.getElementById('details-date') as HTMLElement;
    const $detailsMode = document.getElementById('details-mode') as HTMLElement;
    
    const $detailsTransaction = document.getElementById('details-transaction') as HTMLElement;
    const $detailsParty = document.getElementById('details-party') as HTMLElement;
    const $detailsReference = document.getElementById('details-reference') as HTMLElement;
    const $detailsCreated = document.getElementById('details-created') as HTMLElement;
    const $detailsRemarks = document.getElementById('details-remarks') as HTMLElement;

    // Party Card DOM Refs
    const $detailsPartyExpanded = document.getElementById('details-party-expanded') as HTMLDivElement;
    const $detailsPartyName = document.getElementById('details-party-name') as HTMLElement;
    const $detailsPartyPhone = document.getElementById('details-party-phone') as HTMLElement;
    const $detailsPartyEmail = document.getElementById('details-party-email') as HTMLElement;
    const $detailsPartyGstin = document.getElementById('details-party-gstin') as HTMLElement;
    const $detailsPartyAddress = document.getElementById('details-party-address') as HTMLElement;

    // Reference Card DOM Refs
    const $detailsRefExpanded = document.getElementById('details-ref-expanded') as HTMLDivElement;
    const $detailsRefId = document.getElementById('details-ref-id') as HTMLElement;
    const $detailsRefStatus = document.getElementById('details-ref-status') as HTMLElement;
    const $detailsRefAmount = document.getElementById('details-ref-amount') as HTMLElement;
    const $detailsRefDate = document.getElementById('details-ref-date') as HTMLElement;

    // Action Buttons
    const $detailsEditBtn = document.getElementById('details-edit-btn') as HTMLButtonElement;
    const $detailsRefundBtn = document.getElementById('details-refund-btn') as HTMLButtonElement;
    const $detailsDeleteBtn = document.getElementById('details-delete-btn') as HTMLButtonElement;

    // Form Modal DOM Refs
    const $modal = document.getElementById('payment-modal') as HTMLDivElement;
    const $form = document.getElementById('payment-form') as HTMLFormElement;
    const $formPaymentId = document.getElementById('form-payment-id') as HTMLInputElement;
    const $modalTitle = document.getElementById('modal-title') as HTMLElement;
    const $modalSubtitle = document.getElementById('modal-subtitle') as HTMLElement;
    const $submitBtnText = document.getElementById('submit-btn-text') as HTMLElement;

    // Party Input Suggestions inside Modal
    const $partyNameInput = document.getElementById('form-party-name') as HTMLInputElement;
    const $partyIdHidden = document.getElementById('form-party-id-hidden') as HTMLInputElement;
    const $partySuggestions = document.getElementById('party-suggestions') as HTMLUListElement;
    const $partyDetailsContainer = document.getElementById('party-details-container') as HTMLElement;
    const $previewPartyName = document.getElementById('preview-party-name') as HTMLElement;
    const $previewPartyPhone = document.getElementById('preview-party-phone') as HTMLElement;
    const $previewPartyGstin = document.getElementById('preview-party-gstin') as HTMLElement;
    const $previewPartyEmail = document.getElementById('preview-party-email') as HTMLElement;
    const $previewPartyAddress = document.getElementById('preview-party-address') as HTMLElement;

    // ── Helper functions ───────────────────────────────────
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

    function showInlineError(input: HTMLElement, message: string) {
        if (!input.id) {
            input.id = 'input-val-' + Math.random().toString(36).substring(2, 11);
        }
        clearInlineError(input);

        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

        input.setAttribute('aria-invalid', 'true');
        const errorId = `${input.id}-error`;
        input.setAttribute('aria-describedby', errorId);

        const errorMsg = document.createElement('div');
        errorMsg.id = errorId;
        errorMsg.className = 'error-message-inline';
        errorMsg.style.cssText = 'font-size: 11px; font-weight: 600; color: #dc2626; margin-top: 4px; transition: all 0.2s ease-in-out;';
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

    function clearInlineError(input: HTMLElement) {
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
            (input as HTMLElement).style.borderColor = '';
            (input as HTMLElement).style.boxShadow = '';
            input.removeAttribute('aria-invalid');
            input.removeAttribute('aria-describedby');
        });
    }

    function paymentPartyType(payment: IPaymentRecord): 'Customer' | 'Supplier' {
        return payment.party_type || (payment.direction === 'IN' ? 'Customer' : 'Supplier');
    }

    function referenceLabel(payment: IPaymentRecord): string {
        const refType = valOrDash(payment.reference_type);
        const refId = valOrDash(payment.reference_id);
        return refId === '-' ? refType : `${refType}: ${refId}`;
    }

    // ── API Calls ──────────────────────────────────────────
    async function fetchFullDetails() {
        try {
            const res = await fetch(`/payment/${paymentId}`);
            const data: IApiResponse = await res.json();
            if (data.success && data.payment) {
                currentPayment = data.payment;
                populateDetails(data.payment);
            } else {
                showToast(data.message || 'Failed to load details', true);
            }
        } catch (e) {
            console.error('Failed to load details', e);
            showToast('Failed to load payment profile', true);
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

    async function deletePayment(): Promise<IApiResponse> {
        const res = await fetch(`/payment/${paymentId}`, { method: 'DELETE' });
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

    async function fetchPartyDetails(type: 'Customer' | 'Supplier', partyName: string): Promise<any> {
        if (!partyName) return null;
        try {
            const res = await fetch(`/payment/get-party-details/${type}/${encodeURIComponent(partyName)}`);
            return await res.json();
        } catch (e) {
            console.error('Failed to fetch party details', e);
            throw e;
        }
    }

    async function fetchPartyDetailsById(type: string, id: string): Promise<void> {
        try {
            const res = await fetch(`/payment/get-party-details-by-id/${type}/${id}`);
            const data = await res.json();
            if (data.success && data.party) {
                const party = data.party;
                const contact = type === 'Customer' ? party.customer : party.supplier;
                $partyNameInput.value = contact?.name || '';
                
                // Display in modal preview container
                const address = type === 'Customer' ? party.billing_address : party.address;
                $previewPartyName.textContent = contact?.name || '';
                $previewPartyPhone.textContent = contact?.phone || '-';
                $previewPartyGstin.textContent = party.gstin || '-';
                $previewPartyEmail.textContent = contact?.email || '-';

                let addrStr = '-';
                if (address) {
                    addrStr = [address.line1, address.line2, address.city, address.state, address.pincode]
                        .filter(Boolean).join(', ');
                }
                $previewPartyAddress.textContent = addrStr;
                $partyDetailsContainer.classList.remove('hidden');
                
                $partyIdHidden.value = party._id;
            }
        } catch (e) {
            console.error('Failed to fetch party by ID', e);
        }
    }

    async function fetchDetailsParty(type: 'Customer' | 'Supplier', id: string): Promise<void> {
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

                $detailsPartyName.textContent = contact?.name || '-';
                $detailsPartyPhone.textContent = phone;
                $detailsPartyGstin.textContent = gstin;
                $detailsPartyEmail.textContent = email;
                $detailsPartyAddress.textContent = addrStr;

                $detailsPartyExpanded.classList.remove('hidden');
            } else {
                $detailsPartyExpanded.classList.add('hidden');
            }
        } catch (e) {
            console.error('Failed to fetch expanded party details:', e);
            $detailsPartyExpanded.classList.add('hidden');
        }
    }

    async function fetchDetailsReference(type: 'Invoice' | 'Purchase' | 'Service', refId: string): Promise<void> {
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

                $detailsRefId.textContent = idStr;
                $detailsRefDate.textContent = dateStr;
                $detailsRefAmount.textContent = amountStr;
                
                $detailsRefStatus.textContent = statusStr;
                $detailsRefStatus.className = 'font-bold';
                const lowerStatus = statusStr.toLowerCase();
                if (lowerStatus === 'paid') {
                    $detailsRefStatus.classList.add('text-green-600');
                } else if (lowerStatus === 'unpaid' || lowerStatus === 'overdue') {
                    $detailsRefStatus.classList.add('text-red-600');
                } else if (lowerStatus === 'partially paid' || lowerStatus === 'partial') {
                    $detailsRefStatus.classList.add('text-amber-600');
                } else {
                    $detailsRefStatus.classList.add('text-gray-600');
                }

                $detailsRefExpanded.classList.remove('hidden');
            } else {
                $detailsRefExpanded.classList.add('hidden');
            }
        } catch (e) {
            console.error('Failed to fetch expanded reference details:', e);
            $detailsRefExpanded.classList.add('hidden');
        }
    }

    // ── Render Page ─────────────────────────────────────────
    function populateDetails(payment: IPaymentRecord) {
        const isIn = payment.direction === 'IN';

        // Document title and header
        document.title = `Payment Detail | ${payment.party_name || payment.party_display_id || 'Ref'}`;
        $headerTitle.textContent = `Payment ID: ${payment._id.substring(payment._id.length - 6).toUpperCase()}`;

        // Banner details
        $detailsIcon.className = `w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-sm ${
            isIn ? 'bg-green-50 text-green-600 border border-green-100/50' : 'bg-red-50 text-red-600 border border-red-100/50'
        }`;
        $detailsIcon.innerHTML = `<i class="fas ${isIn ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>`;
        
        $detailsAmount.textContent = formatCurrency(payment.amount);
        $detailsAmount.className = `text-3xl font-extrabold tracking-tight ${isIn ? 'text-green-700' : 'text-red-700'}`;
        
        $detailsDirection.textContent = isIn ? 'Money In' : 'Money Out';
        $detailsDirection.className = `px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isIn ? 'badge-in' : 'badge-out'
        }`;

        if (payment.is_advance) {
            $detailsAdvanceBadge.classList.remove('hidden');
        } else {
            $detailsAdvanceBadge.classList.add('hidden');
        }

        $detailsDate.textContent = formatDate(payment.payment_date);
        $detailsMode.textContent = payment.mode || '-';

        // Transaction main details
        $detailsTransaction.textContent = valOrDash(payment.transaction_details);
        $detailsParty.textContent = `${paymentPartyType(payment)}${payment.party_display_id || payment.party_id ? `: ${payment.party_display_id || payment.party_id}` : ''}`;
        $detailsReference.textContent = referenceLabel(payment);
        $detailsCreated.textContent = formatDate(payment.createdAt);
        $detailsRemarks.textContent = valOrDash(payment.remarks);

        // Fetch expanded cards
        $detailsPartyExpanded.classList.add('hidden');
        $detailsRefExpanded.classList.add('hidden');

        if (payment.party_id) {
            fetchDetailsParty(paymentPartyType(payment), payment.party_id);
        }

        if (payment.reference_ref && payment.reference_type && payment.reference_type !== 'Adjustment') {
            fetchDetailsReference(payment.reference_type as any, payment.reference_ref);
        }
    }

    // ── Form Modals ────────────────────────────────────────
    function openModal(payment: IPaymentRecord | null): void {
        editingId = payment ? payment._id : null;
        submitPartyTypeOverride = payment?.party_type || null;
        $formPaymentId.value = editingId || '';
        $partyDetailsContainer.classList.add('hidden');
        $partyIdHidden.value = '';
        clearFormErrors();

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
            
            $partyNameInput.value = ''; 
            $partyIdHidden.value = payment.party_id || '';

            (document.getElementById('form-reference-type') as HTMLSelectElement).value = payment.reference_type || '';
            (document.getElementById('form-reference-id') as HTMLInputElement).value = payment.reference_id || '';
            (document.getElementById('form-transaction-details') as HTMLInputElement).value = payment.transaction_details || '';
            (document.getElementById('form-advance') as HTMLInputElement).checked = payment.is_advance || false;
            (document.getElementById('form-remarks') as HTMLTextAreaElement).value = payment.remarks || '';

            // Fetch details if party ID exists
            if (payment.party_id) {
                fetchPartyDetailsById(paymentPartyType(payment), payment.party_id);
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

        $modal.classList.remove('hidden');
        refreshSuggestions();
    }

    function openRefundModal(payment: IPaymentRecord): void {
        editingId = null;
        submitPartyTypeOverride = paymentPartyType(payment);
        $formPaymentId.value = '';
        $form.reset();
        clearFormErrors();
        
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

        $modal.classList.remove('hidden');
        refreshSuggestions();
    }

    function closeModal(): void {
        $modal.classList.add('hidden');
        editingId = null;
        submitPartyTypeOverride = null;
        $form.reset();
        $partyDetailsContainer.classList.add('hidden');
        $partyIdHidden.value = '';
        clearFormErrors();
    }

    async function refreshSuggestions(): Promise<void> {
        const directionRadio = document.querySelector(
            'input[name="direction"]:checked'
        ) as HTMLInputElement | null;
        const type = directionRadio && directionRadio.value === 'OUT' ? 'Supplier' : 'Customer';
        
        currentParties = await fetchParties(type);
    }

    function initPartySuggestions(): void {
        $partyNameInput.addEventListener('input', () => {
            const query = $partyNameInput.value.toLowerCase().trim();
            $partySuggestions.innerHTML = '';
            suggestionSelectedIndex = -1;

            if (!query) {
                $partySuggestions.classList.add('hidden');
                $partyIdHidden.value = '';
                $partyDetailsContainer.classList.add('hidden');
                return;
            }

            const filtered = currentParties.filter(p => p.name.toLowerCase().includes(query));
            if (filtered.length === 0) {
                $partySuggestions.classList.add('hidden');
                return;
            }

            $partySuggestions.classList.remove('hidden');
            filtered.forEach((party, idx) => {
                const li = document.createElement('li');
                li.textContent = party.name;
                li.className = 'px-4 py-2 cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0';
                li.onclick = () => {
                    const directionRadio = document.querySelector(
                        'input[name="direction"]:checked'
                    ) as HTMLInputElement | null;
                    const type = directionRadio && directionRadio.value === 'OUT' ? 'Supplier' : 'Customer';
                    $partyNameInput.value = party.name;
                    $partyIdHidden.value = party.id;
                    $partySuggestions.classList.add('hidden');
                    
                    fetchPartyDetails(type, party.name).then(data => {
                        if (data.success && data.party) {
                            const pData = data.party;
                            const contact = type === 'Customer' ? pData.customer : pData.supplier;
                            const address = type === 'Customer' ? pData.billing_address : pData.address;

                            $previewPartyName.textContent = contact?.name || party.name;
                            $previewPartyPhone.textContent = contact?.phone || '-';
                            $previewPartyGstin.textContent = pData.gstin || '-';
                            $previewPartyEmail.textContent = contact?.email || '-';

                            let addrStr = '-';
                            if (address) {
                                addrStr = [address.line1, address.line2, address.city, address.state, address.pincode]
                                    .filter(Boolean).join(', ');
                            }
                            $previewPartyAddress.textContent = addrStr;
                            $partyDetailsContainer.classList.remove('hidden');
                        }
                    });
                };
                $partySuggestions.appendChild(li);
            });
        });

        $partyNameInput.addEventListener('keydown', (e: KeyboardEvent) => {
            const items = $partySuggestions.querySelectorAll('li');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                suggestionSelectedIndex = (suggestionSelectedIndex + 1) % items.length;
                updateSelection(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                suggestionSelectedIndex = (suggestionSelectedIndex - 1 + items.length) % items.length;
                updateSelection(items);
            } else if (e.key === 'Enter' && suggestionSelectedIndex > -1) {
                e.preventDefault();
                (items[suggestionSelectedIndex] as HTMLElement).click();
            } else if (e.key === 'Escape') {
                $partySuggestions.classList.add('hidden');
            }
        });

        function updateSelection(items: NodeListOf<HTMLLIElement>) {
            items.forEach((item, idx) => {
                if (idx === suggestionSelectedIndex) {
                    item.classList.add('bg-blue-50', 'text-blue-700', 'font-medium');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('bg-blue-50', 'text-blue-700', 'font-medium');
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target !== $partyNameInput && !$partySuggestions.contains(e.target as Node)) {
                $partySuggestions.classList.add('hidden');
            }
        });
    }

    // ── Keyboard Shortcuts ─────────────────────────────────
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
            ['Edit Payment', ['Ctrl', 'E']],
            ['Refund Transaction', ['Ctrl', 'U']],
            ['Delete Payment', ['Ctrl', 'Delete']],
            ['Close Modal / Escape', ['Esc']],
            ['Back to Payments', ['Ctrl', 'H']],
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
                        Payment Details Actions
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

    // ── Event Handlers ─────────────────────────────────────
    $homeBtn.addEventListener('click', () => {
        window.location.href = '/payment';
    });

    $detailsEditBtn.addEventListener('click', () => {
        if (currentPayment) openModal(currentPayment);
    });

    $detailsRefundBtn.addEventListener('click', () => {
        if (currentPayment) openRefundModal(currentPayment);
    });

    $detailsDeleteBtn.addEventListener('click', () => {
        if (!currentPayment) return;
        const confirmedMsg = 'Are you sure you want to delete this payment transaction?';
        const showConfirm = (window as any).showConfirm;
        
        if (showConfirm) {
            showConfirm(confirmedMsg, async (response: string) => {
                if (response === 'Yes') {
                    try {
                        const result = await deletePayment();
                        if (result.success) {
                            showToast('Payment deleted successfully');
                            setTimeout(() => {
                                window.location.href = '/payment';
                            }, 1000);
                        } else {
                            showToast(result.message || 'Failed to delete payment', true);
                        }
                    } catch (err) {
                        console.error('Delete error:', err);
                        showToast('Failed to delete payment', true);
                    }
                }
            });
        } else {
            if (confirm(confirmedMsg)) {
                deletePayment().then(result => {
                    if (result.success) {
                        showToast('Payment deleted successfully');
                        setTimeout(() => {
                            window.location.href = '/payment';
                        }, 1000);
                    } else {
                        showToast(result.message || 'Failed to delete payment', true);
                    }
                }).catch(err => {
                    console.error(err);
                    showToast('Failed to delete payment', true);
                });
            }
        }
    });

    // Close Modal buttons
    (document.getElementById('close-modal-btn') as HTMLButtonElement).addEventListener('click', closeModal);
    (document.getElementById('cancel-btn') as HTMLButtonElement).addEventListener('click', closeModal);
    (document.getElementById('modal-overlay') as HTMLDivElement).addEventListener('click', closeModal);

    // Direction changes refresh suggestions
    document.querySelectorAll('input[name="direction"]').forEach(radio => {
        radio.addEventListener('change', () => {
            submitPartyTypeOverride = null;
            $partyNameInput.value = '';
            $partyIdHidden.value = '';
            $partyDetailsContainer.classList.add('hidden');
            refreshSuggestions();
        });
    });

    // Form submit
    $form.addEventListener('submit', async (e: Event) => {
        e.preventDefault();

        const directionRadio = document.querySelector(
            'input[name="direction"]:checked'
        ) as HTMLInputElement | null;
        const direction: string = directionRadio ? directionRadio.value : 'IN';
        const amount: string = (document.getElementById('form-amount') as HTMLInputElement).value;
        const date: string = (document.getElementById('form-date') as HTMLInputElement).value;
        const mode: string = (document.getElementById('form-mode') as HTMLSelectElement).value;

        let isValid = true;
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

        const refTypeSelect = document.getElementById('form-reference-type') as HTMLSelectElement;
        const refIdInput = document.getElementById('form-reference-id') as HTMLInputElement;
        const refType = refTypeSelect.value;
        const refId = refIdInput.value.trim();

        if (refType && refType !== 'Adjustment' && !refId) {
            showInlineError(refIdInput, 'Please enter a Reference ID for the selected Reference Type.');
            isValid = false;
        }
        if (!refType && refId) {
            showInlineError(refTypeSelect, 'Please select a Reference Type for the entered Reference ID.');
            isValid = false;
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
                showToast(editingId ? 'Payment updated successfully!' : 'Payment saved successfully!');
                closeModal();
                if (editingId) {
                    fetchFullDetails();
                } else {
                    // Recorded refund/new payment, redirect back to payment lists
                    setTimeout(() => {
                        window.location.href = '/payment';
                    }, 1000);
                }
            } else {
                showToast(result.message || 'Failed to save payment', true);
            }
        } catch (err) {
            console.error('Save error:', err);
            showToast('Error saving payment', true);
        }
    });

    // Keyboard Shortcuts listener
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        const keyLower = e.key.toLowerCase();
        const isCtrlPressed = e.ctrlKey || e.metaKey;

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
        if (e.key === 'Escape' && shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
            hideShortcutsModal();
            return;
        }
        if (e.key === 'Escape' && !$modal.classList.contains('hidden')) {
            closeModal();
            return;
        }
        if (isCtrlPressed && keyLower === 's' && !$modal.classList.contains('hidden')) {
            e.preventDefault();
            $form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            return;
        }
        if (isCtrlPressed && keyLower === 'e' && !isTypingContext()) {
            e.preventDefault();
            $detailsEditBtn.click();
            return;
        }
        if (isCtrlPressed && keyLower === 'u' && !isTypingContext()) {
            e.preventDefault();
            $detailsRefundBtn.click();
            return;
        }
        if (isCtrlPressed && e.key === 'Delete' && !isTypingContext()) {
            e.preventDefault();
            $detailsDeleteBtn.click();
            return;
        }
        if (isCtrlPressed && keyLower === 'h' && !isTypingContext()) {
            e.preventDefault();
            $homeBtn.click();
            return;
        }
    });

    // ── Init ───────────────────────────────────────────────
    initPartySuggestions();
    initShortcutsModal();
    fetchFullDetails();

})();
