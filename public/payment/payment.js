/**
 * payment.js
 *
 * Frontend logic for the Payments tab.
 * Handles CRUD, filtering, search, and summary display.
 */

(function () {
    'use strict';

    // ── State ──────────────────────────────────────────────
    let allPayments = [];
    let filteredPayments = [];
    let currentFilter = 'all';
    let editingId = null;

    // ── DOM Refs ──────────────────────────────────────────
    const $tbody = document.getElementById('payment-tbody');
    const $totalIn = document.getElementById('total-in');
    const $totalOut = document.getElementById('total-out');
    const $netBalance = document.getElementById('net-balance');
    const $totalCount = document.getElementById('total-count');
    const $filterCount = document.getElementById('filter-count');
    const $searchInput = document.getElementById('search-input');
    const $modal = document.getElementById('payment-modal');
    const $form = document.getElementById('payment-form');
    const $formPaymentId = document.getElementById('form-payment-id');
    const $modalTitle = document.getElementById('modal-title');
    const $modalSubtitle = document.getElementById('modal-subtitle');
    const $submitBtnText = document.getElementById('submit-btn-text');

    // ── Helpers ───────────────────────────────────────────
    function formatCurrency(n) {
        return '₹ ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(d) {
        if (!d) return '-';
        const dt = new Date(d);
        return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function todayISO() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function showToast(msg, isError) {
        const $toast = document.getElementById('toast');
        const $msg = document.getElementById('toast-message');
        $msg.textContent = msg;
        $toast.className = $toast.className.replace('bg-green-600', '').replace('bg-red-600', '');
        $toast.classList.add(isError ? 'bg-red-600' : 'bg-green-600');
        $toast.classList.remove('hidden');
        setTimeout(() => $toast.classList.add('hidden'), 3000);
    }

    function modeBadgeClass(mode) {
        switch (mode) {
            case 'Cash': return 'badge-cash';
            case 'UPI': return 'badge-upi';
            case 'Bank Transfer': return 'badge-bank';
            case 'Cheque': return 'badge-cheque';
            default: return 'badge-cash';
        }
    }

    // ── API ────────────────────────────────────────────────
    async function fetchPayments() {
        try {
            const res = await fetch('/payment/all');
            const data = await res.json();
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

    async function savePayment(payload) {
        const url = editingId ? `/payment/${editingId}` : '/payment/create';
        const method = editingId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return res.json();
    }

    async function deletePayment(id) {
        const res = await fetch(`/payment/${id}`, { method: 'DELETE' });
        return res.json();
    }

    // ── Render ─────────────────────────────────────────────
    function updateSummary() {
        const totalIn = allPayments.filter(p => p.direction === 'IN').reduce((s, p) => s + (p.amount || 0), 0);
        const totalOut = allPayments.filter(p => p.direction === 'OUT').reduce((s, p) => s + (p.amount || 0), 0);
        $totalIn.textContent = formatCurrency(totalIn);
        $totalOut.textContent = formatCurrency(totalOut);
        $netBalance.textContent = formatCurrency(totalIn - totalOut);
        $totalCount.textContent = allPayments.length;
    }

    function applyFilter() {
        const query = ($searchInput.value || '').toLowerCase().trim();

        filteredPayments = allPayments.filter(p => {
            // Direction filter
            if (currentFilter === 'IN' && p.direction !== 'IN') return false;
            if (currentFilter === 'OUT' && p.direction !== 'OUT') return false;
            if (currentFilter === 'advance' && !p.is_advance) return false;

            // Search filter
            if (query) {
                const searchable = [
                    p.remarks, p.transaction_details, p.party_type,
                    p.reference_type, p.mode, p.direction,
                    String(p.amount)
                ].filter(Boolean).join(' ').toLowerCase();
                if (!searchable.includes(query)) return false;
            }

            return true;
        });

        $filterCount.textContent = filteredPayments.length;
        renderTable();
    }

    function renderTable() {
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

        $tbody.innerHTML = filteredPayments.map(p => {
            const dirClass = p.direction === 'IN' ? 'badge-in' : 'badge-out';
            const dirIcon = p.direction === 'IN' ? 'fa-arrow-down' : 'fa-arrow-up';
            const dirLabel = p.direction === 'IN' ? 'IN' : 'OUT';
            const modeClass = modeBadgeClass(p.mode);
            const advanceBadge = p.is_advance
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
                <td class="px-6 py-4 text-gray-600 text-sm">${p.party_type || '-'}</td>
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
    function openModal(payment) {
        editingId = payment ? payment._id : null;
        $formPaymentId.value = editingId || '';

        if (payment) {
            $modalTitle.textContent = 'Edit Payment';
            $modalSubtitle.textContent = 'Update payment details';
            $submitBtnText.textContent = 'Update Payment';

            // Populate form
            document.querySelector(`input[name="direction"][value="${payment.direction}"]`).checked = true;
            document.getElementById('form-amount').value = payment.amount || '';
            document.getElementById('form-date').value = payment.payment_date ? payment.payment_date.substring(0, 10) : todayISO();
            document.getElementById('form-mode').value = payment.mode || 'Cash';
            document.getElementById('form-party-type').value = payment.party_type || '';
            document.getElementById('form-reference-type').value = payment.reference_type || '';
            document.getElementById('form-transaction-details').value = payment.transaction_details || '';
            document.getElementById('form-advance').checked = payment.is_advance || false;
            document.getElementById('form-remarks').value = payment.remarks || '';
        } else {
            $modalTitle.textContent = 'New Payment';
            $modalSubtitle.textContent = 'Record a new payment transaction';
            $submitBtnText.textContent = 'Save Payment';
            $form.reset();
            document.getElementById('form-date').value = todayISO();
            document.querySelector('input[name="direction"][value="IN"]').checked = true;
        }

        $modal.classList.remove('hidden');
    }

    function closeModal() {
        $modal.classList.add('hidden');
        editingId = null;
        $form.reset();
    }

    // ── Events ─────────────────────────────────────────────
    // New payment button
    document.getElementById('new-payment-btn').addEventListener('click', () => openModal(null));

    // Close modal
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', closeModal);

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            applyFilter();
        });
    });

    // Search
    let searchTimer;
    $searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(applyFilter, 250);
    });

    // Form submit
    $form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const direction = document.querySelector('input[name="direction"]:checked').value;
        const amount = document.getElementById('form-amount').value;
        const date = document.getElementById('form-date').value;
        const mode = document.getElementById('form-mode').value;

        if (!amount || Number(amount) <= 0) {
            showToast('Please enter a valid amount', true);
            return;
        }

        const payload = {
            direction,
            amount: Number(amount),
            payment_date: date || todayISO(),
            mode,
            party_type: document.getElementById('form-party-type').value || undefined,
            reference_type: document.getElementById('form-reference-type').value || undefined,
            transaction_details: document.getElementById('form-transaction-details').value || undefined,
            is_advance: document.getElementById('form-advance').checked,
            remarks: document.getElementById('form-remarks').value || undefined
        };

        try {
            const result = await savePayment(payload);
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
    document.addEventListener('keydown', (e) => {
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
        editPayment: function (id) {
            const payment = allPayments.find(p => p._id === id);
            if (payment) openModal(payment);
        },
        confirmDelete: async function (id) {
            const confirmed = confirm('Are you sure you want to delete this payment?');
            if (!confirmed) return;
            try {
                const result = await deletePayment(id);
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
    fetchPayments();

})();
