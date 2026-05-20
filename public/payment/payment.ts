/**
 * payment.ts
 *
 * Frontend logic for the Payments tab.
 * Handles CRUD, filtering, search, and summary display.
 *
 * Compile:  npx tsc -p tsconfig.public.json
 * Output:   public/payment/payment.js
 */

// ── Interfaces ─────────────────────────────────────────
interface IPaymentRecord {
    _id: string;
    schema_version: number;
    payment_date: string;
    amount: number;
    direction: 'IN' | 'OUT';
    party_type?: 'Customer' | 'Supplier';
    party_id?: string;
    reference_type?: 'Invoice' | 'Purchase' | 'Service' | 'Adjustment';
    reference_id?: string;
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
    };
}

(function (): void {
    'use strict';

    // ── State ──────────────────────────────────────────────
    let allPayments: IPaymentRecord[] = [];
    let filteredPayments: IPaymentRecord[] = [];
    let currentFilter: string = 'all';
    let editingId: string | null = null;

    // ── DOM Refs ──────────────────────────────────────────
    const $tbody = document.getElementById('payment-tbody') as HTMLTableSectionElement;
    const $totalIn = document.getElementById('total-in') as HTMLElement;
    const $totalOut = document.getElementById('total-out') as HTMLElement;
    const $netBalance = document.getElementById('net-balance') as HTMLElement;
    const $totalCount = document.getElementById('total-count') as HTMLElement;
    const $filterCount = document.getElementById('filter-count') as HTMLElement;
    const $searchInput = document.getElementById('search-input') as HTMLInputElement;
    const $modal = document.getElementById('payment-modal') as HTMLDivElement;
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
    const $previewPartyName = document.getElementById('preview-party-name') as HTMLElement;
    const $previewPartyPhone = document.getElementById('preview-party-phone') as HTMLElement;
    const $previewPartyGstin = document.getElementById('preview-party-gstin') as HTMLElement;
    const $previewPartyEmail = document.getElementById('preview-party-email') as HTMLElement;
    const $previewPartyAddress = document.getElementById('preview-party-address') as HTMLElement;

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
            $tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-8 text-center text-red-500">Failed to load payments</td></tr>`;
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
            $partyDetailsContainer.classList.add('hidden');
            return;
        }

        try {
            const res = await fetch(`/payment/get-party-details/${type}/${encodeURIComponent(partyName)}`);
            const data = await res.json();
            if (data.success && data.party) {
                const party = data.party;
                const contact = type === 'Customer' ? party.customer : party.supplier;
                const address = type === 'Customer' ? party.billing_address : party.address;

                $previewPartyName.textContent = contact?.name || partyName;
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
                
                // Update hidden ID if name matches
                $partyIdHidden.value = party._id;
            } else {
                $partyDetailsContainer.classList.add('hidden');
            }
        } catch (e) {
            console.error('Failed to fetch party details', e);
            $partyDetailsContainer.classList.add('hidden');
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
                    <td colspan="8" class="px-6 py-12 text-center text-gray-400">
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
            <tr class="payment-row border-b border-gray-100">
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
                        ${p.mode}
                    </span>
                </td>
                <td class="px-6 py-4 text-gray-600 text-sm">${p.party_id || '-'}</td>
                <td class="px-6 py-4 text-gray-600 text-sm">${p.reference_type || '-'}</td>
                <td class="px-6 py-4 text-gray-500 text-sm max-w-[200px] truncate" title="${p.transaction_details || p.remarks || ''}">${p.transaction_details || p.remarks || '-'}</td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-1">
                        <button onclick="window._paymentUI.editPayment('${p._id}')"
                            class="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Edit">
                            <i class="fas fa-edit text-sm"></i>
                        </button>
                        <button onclick="window._paymentUI.confirmDelete('${p._id}')"
                            class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <i class="fas fa-trash text-sm"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    // ── Modal ──────────────────────────────────────────────
    async function openModal(payment: IPaymentRecord | null): Promise<void> {
        editingId = payment ? payment._id : null;
        $formPaymentId.value = editingId || '';
        $partyDetailsContainer.classList.add('hidden');
        $partyIdHidden.value = '';

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
                const partyType = payment.direction === 'IN' ? 'Customer' : 'Supplier';
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

        $modal.classList.remove('hidden');
        refreshSuggestions();
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

    function closeModal(): void {
        $modal.classList.add('hidden');
        editingId = null;
        $form.reset();
        $partyDetailsContainer.classList.add('hidden');
        $partyIdHidden.value = '';
    }

    let suggestionSelectedIndex = -1;
    let currentParties: {id: string, name: string}[] = [];

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
                    fetchPartyDetails(type, party.name);
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

        // Hide suggestions on click outside
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

    // Close modal
    (document.getElementById('close-modal-btn') as HTMLButtonElement)
        .addEventListener('click', closeModal);
    (document.getElementById('cancel-btn') as HTMLButtonElement)
        .addEventListener('click', closeModal);
    (document.getElementById('modal-overlay') as HTMLDivElement)
        .addEventListener('click', closeModal);

    // Direction changes refresh suggestions
    document.querySelectorAll('input[name="direction"]').forEach(radio => {
        radio.addEventListener('change', () => {
            $partyNameInput.value = '';
            $partyIdHidden.value = '';
            $partyDetailsContainer.classList.add('hidden');
            refreshSuggestions();
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

        if (!amount || Number(amount) <= 0) {
            showToast('Please enter a valid amount', true);
            return;
        }

        const payload: IPaymentPayload = {
            direction: direction as 'IN' | 'OUT',
            amount: Number(amount),
            payment_date: date || todayISO(),
            mode,
            party_type: direction === 'IN' ? 'Customer' : 'Supplier',
            party_id: $partyIdHidden.value || undefined,
            reference_type: (document.getElementById('form-reference-type') as HTMLSelectElement).value || "",
            reference_id: (document.getElementById('form-reference-id') as HTMLInputElement).value || "",
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
        if (e.key === 'Escape' && !$modal.classList.contains('hidden')) {
            closeModal();
        }
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            openModal(null);
        }
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            $searchInput.focus();
        }
    });

    // ── Exposed for inline onclick handlers ────────────────
    window._paymentUI = {
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

    // ── Init ───────────────────────────────────────────────
    initPartySuggestions();
    fetchPayments();

})();
