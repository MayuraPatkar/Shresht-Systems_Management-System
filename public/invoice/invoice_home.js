const invoicesListDiv = document.querySelector(".records");

// Filter state
let allInvoices = [];
let currentFilters = {
    paymentStatus: 'all',
    dateFilter: 'all',
    sortBy: 'date-desc',
    customStartDate: null,
    customEndDate: null
};

const INVOICE_SHORTCUT_GROUPS = [
    {
        title: 'Navigation',
        icon: 'fas fa-arrows-alt text-blue-600',
        items: [
            { label: 'Next Step', keys: ['Enter'] },
            { label: 'Previous Step', keys: ['Backspace'] },
            { label: 'Exit/Cancel', keys: ['Esc'] }
        ]
    },
    {
        title: 'Actions',
        icon: 'fas fa-bolt text-yellow-600',
        items: [
            { label: 'New Invoice', keys: ['Ctrl', 'N'] },
            { label: 'Save Invoice', keys: ['Ctrl', 'S'] },
            { label: 'View Preview', keys: ['Ctrl', 'P'] },
            { label: 'Print', keys: ['Ctrl', 'Shift', 'P'] },
            { label: 'Add Item', keys: ['Ctrl', 'I'] },
            { label: 'Delete Item', keys: ['Ctrl', 'Delete'] },
            { label: 'Go Home', keys: ['Ctrl', 'H'] },
            { label: 'Focus Search', keys: ['Ctrl', 'F'] }
        ]
    }
];

let shortcutsModalRef = null;

const isMac = navigator.userAgent.toLowerCase().includes('mac');

// Global toast notification function
function showToast(message) {
    let toast = document.getElementById('global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-toast';
        toast.style.cssText = 'display:none;position:fixed;bottom:20px;right:20px;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:9999;';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 2000);
}

document.addEventListener("DOMContentLoaded", () => {
    loadRecentInvoices();

    document.getElementById('new-invoice').addEventListener('click', showNewInvoiceForm);
    document.getElementById('home-btn')?.addEventListener('click', () => {
        // Get all section elements
        const homeSection = document.getElementById('home');
        const newSection = document.getElementById('new');
        const viewSection = document.getElementById('view');
        const paymentContainer = document.getElementById('payment-container');

        // Show home, hide others
        if (homeSection) {
            homeSection.style.display = 'block';
            homeSection.style.visibility = 'visible';
        }
        if (newSection) {
            newSection.style.display = 'none';
        }
        if (viewSection) {
            viewSection.style.display = 'none';
        }
        if (paymentContainer) {
            paymentContainer.style.display = 'none';
        }

        // Show/hide buttons
        const newInvoiceBtn = document.getElementById('new-invoice');
        const viewPreviewBtn = document.getElementById('view-preview');
        if (newInvoiceBtn) newInvoiceBtn.style.display = 'block';
        if (viewPreviewBtn) viewPreviewBtn.style.display = 'none';

        // Reset form if needed
        const form = document.getElementById('invoice-form');
        if (form) form.reset();

        // Reset to step 1 if currentStep is defined
        if (typeof window.currentStep !== 'undefined') {
            window.currentStep = 1;
        }

        // Reload invoices
        loadRecentInvoices();
    });
    const invSearchInput = document.getElementById('search-input');
    if (invSearchInput) {
        // Click previously triggered search; keep Enter and add real-time input
        invSearchInput.addEventListener('keydown', function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                handleSearch();
            }
        });
        invSearchInput.addEventListener('input', debounce(() => {
            handleSearch();
        }, 300));
    }

    initShortcutsModal();
    initInvoiceFilters();
    document.addEventListener('keydown', handleQuotationKeyboardShortcuts, true);
});

// Load recent invoices from the server
async function loadRecentInvoices() {
    try {
        const response = await fetch(`/invoice/recent-invoices`);
        if (!response.ok) {
            invoicesListDiv.innerHTML = "<div class='text-center py-12 fade-in'><h2 class='text-2xl font-bold text-gray-800 mb-2'>No Invoices Found</h2><p class='text-gray-600'>Start creating invoices for your clients</p></div>";
            return;
        }

        const data = await response.json();
        allInvoices = data.invoices || [];
        applyInvoiceFilters();
    } catch (error) {
        console.error("Error loading invoices:", error);
        invoicesListDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 fade-in">
                <div class="bg-red-100 rounded-full p-8 mb-4">
                    <i class="fas fa-exclamation-triangle text-red-500 text-6xl"></i>
                </div>
                <h2 class="text-2xl font-semibold text-gray-700 mb-2">Failed to Load Invoices</h2>
                <p class="text-gray-500 mb-6">Please try again later</p>
                <button onclick="loadRecentInvoices()" 
                    class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium">
                    <i class="fas fa-redo"></i>
                    Retry
                </button>
            </div>
        `;
    }
}

// Apply filters to invoices
function applyInvoiceFilters() {
    const filtered = applyFilters(allInvoices, {
        paymentStatus: currentFilters.paymentStatus,
        dateFilter: currentFilters.dateFilter,
        sortBy: currentFilters.sortBy,
        dateField: 'invoice_date',
        amountField: 'total_amount_duplicate',
        nameField: 'project_name',
        customStartDate: currentFilters.customStartDate,
        customEndDate: currentFilters.customEndDate
    });
    renderInvoices(filtered);
}

// Initialize filter event listeners
function initInvoiceFilters() {
    const paymentFilter = document.getElementById('payment-status-filter');
    const dateFilter = document.getElementById('date-filter');
    const sortFilter = document.getElementById('sort-filter');
    const clearFiltersBtn = document.getElementById('clear-filters');

    if (paymentFilter) {
        paymentFilter.addEventListener('change', (e) => {
            currentFilters.paymentStatus = e.target.value;
            applyInvoiceFilters();
        });
    }

    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === 'custom') {
                showCustomDateModal((startDate, endDate) => {
                    currentFilters.dateFilter = 'custom';
                    currentFilters.customStartDate = startDate;
                    currentFilters.customEndDate = endDate;
                    applyInvoiceFilters();
                });
            } else {
                currentFilters.dateFilter = value;
                currentFilters.customStartDate = null;
                currentFilters.customEndDate = null;
                applyInvoiceFilters();
            }
        });
    }

    if (sortFilter) {
        sortFilter.addEventListener('change', (e) => {
            currentFilters.sortBy = e.target.value;
            applyInvoiceFilters();
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            currentFilters = {
                paymentStatus: 'all',
                dateFilter: 'all',
                sortBy: 'date-desc',
                customStartDate: null,
                customEndDate: null
            };
            if (paymentFilter) paymentFilter.value = 'all';
            if (dateFilter) dateFilter.value = 'all';
            if (sortFilter) sortFilter.value = 'date-desc';
            applyInvoiceFilters();
        });
    }
}

// Render invoices in the list
function renderInvoices(invoices) {
    invoicesListDiv.innerHTML = "";
    if (!invoices || invoices.length === 0) {
        invoicesListDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                <div class="text-blue-500 text-5xl mb-4">
                    <i class="fas fa-file-invoice-dollar"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">No Invoices Found</h2>
                <p class="text-gray-600">Start creating invoices for your clients</p>
            </div>
        `;
        return;
    }
    invoices.forEach(invoice => {
        const invoiceDiv = createInvoiceCard(invoice);
        invoicesListDiv.appendChild(invoiceDiv);
    });
}

// Create an invoice card element
function createInvoiceCard(invoice) {
    const userRole = sessionStorage.getItem('userRole');
    const invoiceCard = document.createElement("div");
    invoiceCard.className = "group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-400 overflow-hidden fade-in";

    const status = (invoice.payment_status || 'Unpaid');
    // Normalize stored status for comparisons
    const _statusNorm = String(status).toLowerCase().trim();

    // Derive payment flags from both stored status and actual amounts to avoid inconsistencies
    const paidSoFar = Number(invoice.total_paid_amount || 0);
    const effectiveTotal = (() => {
        const dup = Number(invoice.total_amount_duplicate || 0);
        if (dup > 0) return dup;
        // Fallback will be computed below via computeEffectiveTotal when needed
        return null;
    })();

    // We'll compute `total` below; for now set placeholders — real values will overwrite if computedTotal exists
    let isPaid = _statusNorm === 'paid';
    let isPartial = _statusNorm === 'partial';

    // Compute effective total: prefer total_amount_duplicate, fallback to computed from items/non-items
    const computeEffectiveTotal = (inv) => {
        const dup = Number(inv.total_amount_duplicate || 0);
        if (dup > 0) return dup;
        const items = inv.items_duplicate && inv.items_duplicate.length > 0 ? inv.items_duplicate : (inv.items_original || []);
        const nonItems = inv.non_items_duplicate && inv.non_items_duplicate.length > 0 ? inv.non_items_duplicate : (inv.non_items_original || []);
        let subtotal = 0;
        let tax = 0;
        for (const it of items) {
            const qty = Number(it.quantity || 0);
            const unit = Number(it.unit_price || 0);
            const rate = Number(it.rate || 0);
            const taxable = qty * unit;
            subtotal += taxable;
            tax += taxable * (rate / 100);
        }
        for (const nit of nonItems) {
            const price = Number(nit.price || 0);
            const rate = Number(nit.rate || 0);
            subtotal += price;
            tax += price * (rate / 100);
        }
        return Number((subtotal + tax).toFixed(2));
    };

    const total = effectiveTotal !== null ? effectiveTotal : computeEffectiveTotal(invoice);
    // Ensure paidSoFar is defined (in case it was overwritten above)
    const paidSoFarFinal = paidSoFar;
    const dueAmount = Number((total - paidSoFar).toFixed(2));
    let percentPaid = total > 0 ? Math.round((paidSoFarFinal / total) * 100) : (paidSoFarFinal > 0 ? 100 : 0);
    percentPaid = Math.max(0, Math.min(percentPaid, 100));

    // Re-evaluate payment flags, but prefer the stored `payment_status` when it's explicitly Partial or Paid.
    const EPS = 0.01;
    // default
    isPaid = false;
    isPartial = false;

    if (_statusNorm === 'partial') {
        isPartial = true;
    } else if (_statusNorm === 'paid') {
        isPaid = true;
    } else {
        // derive from numeric values when stored status is not explicit
        if (total > 0) {
            if (paidSoFarFinal + EPS >= total) {
                isPaid = true;
            } else if (paidSoFarFinal > 0) {
                isPartial = true;
            }
        } else {
            if (paidSoFarFinal > 0) {
                isPartial = true;
            }
        }
    }

    // Format the date for display
    const dateToFormat = invoice.invoice_date || invoice.createdAt;
    let formattedDate = '-';
    if (dateToFormat) {
        try {
            const dateObj = new Date(dateToFormat);
            if (!isNaN(dateObj.getTime())) {
                const day = String(dateObj.getDate()).padStart(2, '0');
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const year = dateObj.getFullYear();
                formattedDate = `${day}/${month}/${year}`;
            }
        } catch (e) {
            formattedDate = '-';
        }
    }

    invoiceCard.innerHTML = `
        <!-- Left Border Accent -->
        <div class="flex">
            <div class="card-left-border w-1.5 bg-gradient-to-b ${isPaid ? 'from-green-500 to-emerald-600' : isPartial ? 'from-yellow-500 to-amber-500' : 'from-orange-500 to-red-500'} rounded-l-lg"></div>
            <div class="relative p-5 flex-1">
            <!-- Top Row: Header with Title & Actions -->
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-200">
                        <i class="fas fa-file-invoice-dollar text-lg text-white"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 class="text-lg font-bold text-gray-900 truncate" title="${invoice.project_name}">${invoice.project_name}</h3>
                            <span class="px-2 py-0.5 rounded-md text-xs font-semibold card-status-badge flex-shrink-0 ${isPaid ? 'bg-green-100 text-green-700' : isPartial ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}">
                                ${status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="flex items-center gap-2">
                    ${userRole === 'admin' ? `
                        <button class="action-btn view-btn px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit-original-btn px-4 py-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-all border border-teal-200 hover:border-teal-400" title="Edit Original">
                            <i class="fas fa-file-signature"></i>
                        </button>
                        <button class="action-btn edit-btn px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all border border-purple-200 hover:border-purple-400" title="Edit Duplicate">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn payment-btn px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all border border-green-200 hover:border-green-400" title="Payment">
                            <i class="fas fa-credit-card"></i>
                        </button>
                        <button class="action-btn delete-btn px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-200 hover:border-red-400" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : userRole === 'manager' ? `
                        <button class="action-btn view-btn px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit-btn px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all border border-purple-200 hover:border-purple-400" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn payment-btn px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all border border-green-200 hover:border-green-400" title="Payment">
                            <i class="fas fa-credit-card"></i>
                        </button>
                        <button class="action-btn delete-btn px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-200 hover:border-red-400" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <!-- ID & Date Row -->
            <div class="flex items-center gap-2 mb-3">
                <span class="text-sm font-bold text-gray-800 cursor-pointer hover:text-blue-600 copy-text transition-colors" title="Click to copy ID">
                    ${invoice.invoice_id}
                    <i class="fas fa-copy text-xs ml-1 opacity-50"></i>
                </span>
                <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                <span class="text-xs text-gray-500">
                    <i class="fas fa-calendar-alt mr-1"></i>${formattedDate}
                </span>
            </div>
            
            <!-- Bottom Row: Customer & Amount -->
            <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-user text-blue-600 text-xs"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-gray-800 truncate" title="${invoice.customer_name}">${invoice.customer_name}</p>
                        <p class="text-xs text-gray-500 truncate" title="${invoice.customer_address}">${invoice.customer_address}</p>
                    </div>
                </div>
                
                ${userRole === 'admin' ? `
                <div class="flex-shrink-0 ml-4">
                    <div class="card-amount-box rounded-lg p-3 min-w-[300px]" style="background: ${isPaid ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : isPartial ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)'}; border: 1px solid ${isPaid ? '#a7f3d0' : isPartial ? '#fcd34d' : '#fecaca'};">
                        <!-- Total Row -->
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-medium text-gray-600 uppercase tracking-wide">Total</span>
                            <span class="text-base font-bold card-total-amount" style="color: ${isPaid ? '#059669' : '#dc2626'};">₹${formatIndian(total, 2)}</span>
                        </div>
                        <!-- Progress Bar -->
                        <div class="w-full h-1.5 rounded-full mb-2 card-progress-outer" style="background-color: ${dueAmount > 0 ? '#fecaca' : '#bbf7d0'};">
                            <div class="h-1.5 rounded-full card-progress-fill" style="width: ${percentPaid}%; background: linear-gradient(90deg, #22c55e, #16a34a);"></div>
                        </div>
                        <!-- Due/Paid Row -->
                        <div class="flex items-center justify-between">
                            ${isPaid ? `
                            <span class="text-xs font-medium card-payment-label" style="color: #059669;"><i class="fas fa-check-circle mr-1"></i>Fully Paid</span>
                            <span class="text-base font-bold card-due-amount" style="color: #059669;">₹${formatIndian(paidSoFar, 2)}</span>
                            ` : `
                            <span class="text-xs font-medium uppercase tracking-wide card-payment-label" style="color: #dc2626;">Balance Due</span>
                            <span class="text-base font-bold card-due-amount" style="color: #dc2626;">₹${formatIndian(Math.max(0, dueAmount), 2)}</span>
                            `}
                        </div>
                    </div>
                </div>
                ` : `
                <div class="flex-shrink-0 ml-4 text-right">
                    <p class="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Total</p>
                    <p class="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">₹${formatIndian(total, 2)}</p>
                </div>
                `}
            </div>
        </div>
        </div>
    `;

    const copyElement = invoiceCard.querySelector('.copy-text');
    const viewBtn = invoiceCard.querySelector('.view-btn');
    const editBtn = invoiceCard.querySelector('.edit-btn');
    const editOriginalBtn = invoiceCard.querySelector('.edit-original-btn');
    const paymentBtn = invoiceCard.querySelector('.payment-btn');
    const deleteBtn = invoiceCard.querySelector('.delete-btn');

    // Copy ID functionality
    if (copyElement) {
        copyElement.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(invoice.invoice_id);
                showToast('ID Copied to Clipboard!');
            } catch (err) {
                console.error('Copy failed', err);
            }
        });
    }

    // Action button handlers
    if (viewBtn) {
        viewBtn.addEventListener('click', () => {
            sessionStorage.setItem('view-invoice', 'duplicate');
            viewInvoice(invoice.invoice_id, userRole);
        });
    }

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            sessionStorage.setItem('update-invoice', 'duplicate');
            openInvoice(invoice.invoice_id);
        });
    }

    if (editOriginalBtn) {
        editOriginalBtn.addEventListener('click', () => {
            sessionStorage.setItem('update-invoice', 'original');
            openInvoice(invoice.invoice_id);
        });
    }

    if (paymentBtn) {
        paymentBtn.addEventListener('click', () => {
            payment(invoice.invoice_id);
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            window.electronAPI.showAlert2('Are you sure you want to delete this invoice?');
            if (window.electronAPI) {
                window.electronAPI.receiveAlertResponse((response) => {
                    if (response === "Yes") {
                        deleteInvoice(invoice.invoice_id);
                    }
                });
            }
        });
    }

    // If the provided list document lacks items and the computed total is zero, fetch full invoice details to compute accurate totals
    (async () => {
        try {
            if (total === 0 && !(invoice.items_duplicate && invoice.items_duplicate.length) && !(invoice.items_original && invoice.items_original.length)) {
                const resp = await fetch(`/invoice/${invoice.invoice_id}`);
                if (!resp.ok) return;
                const data = await resp.json();
                const full = data.invoice;

                // Compute effective total from full document
                const computeEffectiveTotalFull = (inv) => {
                    const dup = Number(inv.total_amount_duplicate || 0);
                    if (dup > 0) return dup;
                    const items = inv.items_duplicate && inv.items_duplicate.length > 0 ? inv.items_duplicate : (inv.items_original || []);
                    const nonItems = inv.non_items_duplicate && inv.non_items_duplicate.length > 0 ? inv.non_items_duplicate : (inv.non_items_original || []);
                    let subtotal = 0;
                    let tax = 0;
                    for (const it of items) {
                        const qty = Number(it.quantity || 0);
                        const unit = Number(it.unit_price || 0);
                        const rate = Number(it.rate || 0);
                        const taxable = qty * unit;
                        subtotal += taxable;
                        tax += taxable * (rate / 100);
                    }
                    for (const nit of nonItems) {
                        const price = Number(nit.price || 0);
                        const rate = Number(nit.rate || 0);
                        subtotal += price;
                        tax += price * (rate / 100);
                    }
                    return Number((subtotal + tax).toFixed(2));
                };

                const effective = computeEffectiveTotalFull(full);
                const paid = Number(full.total_paid_amount || 0);
                const due = Number((effective - paid).toFixed(2));
                const percent = effective > 0 ? Math.round((paid / effective) * 100) : (paid > 0 ? 100 : 0);

                // Update card DOM
                const totalEl = invoiceCard.querySelector('.card-total-amount');
                const fillEl = invoiceCard.querySelector('.card-progress-fill');
                const outerEl = invoiceCard.querySelector('.card-progress-outer');
                const dueEl = invoiceCard.querySelector('.card-due-amount');
                const badge = invoiceCard.querySelector('.card-status-badge');

                if (totalEl) totalEl.textContent = `₹${formatIndian(effective, 2)}`;
                const percentClamped = Math.max(0, Math.min(percent, 100));
                if (fillEl) fillEl.style.width = `${percentClamped}%`;
                if (outerEl) outerEl.style.backgroundColor = due > 0 ? '#fecaca' : '#bbf7d0';
                if (dueEl) {
                    dueEl.textContent = due > 0 ? `₹${formatIndian(due, 2)}` : `₹${formatIndian(paid, 2)}`;
                    dueEl.style.color = due > 0 ? '#dc2626' : '#059669';
                }

                // Update payment label (Fully Paid vs Balance Due)
                const labelEl = invoiceCard.querySelector('.card-payment-label');
                if (labelEl) {
                    if (due <= 0) {
                        labelEl.innerHTML = '<i class="fas fa-check-circle mr-1"></i>Fully Paid';
                        labelEl.style.color = '#059669';
                        labelEl.classList.remove('uppercase', 'tracking-wide');
                    } else {
                        labelEl.textContent = 'Balance Due';
                        labelEl.style.color = '#dc2626';
                        labelEl.classList.add('uppercase', 'tracking-wide');
                    }
                }

                if (badge) {
                    const newStatus = (effective > 0 && paid >= effective) ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID');
                    badge.textContent = newStatus;
                    badge.classList.remove('bg-green-100', 'text-green-700', 'bg-yellow-100', 'text-yellow-700', 'bg-orange-100', 'text-orange-700');
                    if (newStatus === 'PAID') badge.classList.add('bg-green-100', 'text-green-700');
                    else if (newStatus === 'PARTIAL') badge.classList.add('bg-yellow-100', 'text-yellow-700');
                    else badge.classList.add('bg-orange-100', 'text-orange-700');

                    // Update Left Border Gradient
                    const borderEl = invoiceCard.querySelector('.card-left-border');
                    if (borderEl) {
                        borderEl.classList.remove('from-green-500', 'to-emerald-600', 'from-yellow-500', 'to-amber-500', 'from-orange-500', 'to-red-500', 'from-orange-500', 'to-amber-600');
                        if (newStatus === 'PAID') {
                            borderEl.classList.add('from-green-500', 'to-emerald-600');
                        } else if (newStatus === 'PARTIAL') {
                            borderEl.classList.add('from-yellow-500', 'to-amber-500');
                        } else {
                            borderEl.classList.add('from-orange-500', 'to-red-500');
                        }
                    }

                    // Update Amount Box Styles
                    const amountBox = invoiceCard.querySelector('.card-amount-box');
                    if (amountBox) {
                        if (newStatus === 'PAID') {
                            amountBox.style.background = 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)';
                            amountBox.style.border = '1px solid #a7f3d0';
                        } else if (newStatus === 'PARTIAL') {
                            amountBox.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
                            amountBox.style.border = '1px solid #fcd34d';
                        } else {
                            amountBox.style.background = 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)';
                            amountBox.style.border = '1px solid #fecaca';
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error enriching invoice card:', err);
        }
    })();

    return invoiceCard;
}

// Delete an invoice
async function deleteInvoice(invoiceId) {
    await deleteDocument('invoice', invoiceId, 'Invoice', loadRecentInvoices);
}

// Show the new invoice form
function showNewInvoiceForm() {
    showNewDocumentForm({
        homeId: 'home',
        formId: 'new',
        newButtonId: 'new-invoice',
        viewId: 'view',
        stepIndicatorId: 'step-indicator',
        currentStep: typeof currentStep !== 'undefined' ? currentStep : undefined,
        totalSteps: typeof totalSteps !== 'undefined' ? totalSteps : undefined,
        additionalSetup: () => {
            sessionStorage.setItem('update-invoice', 'original');
        }
    });

    // Reset to step 1
    if (typeof changeStep === 'function') {
        changeStep(1);
    }

    // Clear any existing items from previous form sessions
    const itemsContainer = document.getElementById("items-container");
    const nonItemsContainer = document.getElementById("non-items-container");
    const itemsTableBody = document.querySelector("#items-table tbody");
    const nonItemsTableBody = document.querySelector("#non-items-table tbody");

    if (itemsContainer) itemsContainer.innerHTML = "";
    if (nonItemsContainer) nonItemsContainer.innerHTML = "";
    if (itemsTableBody) itemsTableBody.innerHTML = "";
    if (nonItemsTableBody) nonItemsTableBody.innerHTML = "";

    // Clear form inputs including ID field
    const form = document.getElementById('invoice-form');
    if (form) form.reset();

    const idInput = document.getElementById('id');
    if (idInput) {
        idInput.value = '';
        idInput.readOnly = false;
        idInput.style.backgroundColor = '';
    }

    // Set default invoice date to today
    const invoiceDateInput = document.getElementById('invoice-date');
    if (invoiceDateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        invoiceDateInput.value = `${yyyy}-${mm}-${dd}`;
    }
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) {
        await loadRecentInvoices();
        return;
    }

    await searchDocuments('invoice', query, invoicesListDiv, createInvoiceCard,
        `<div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
            <div class="text-yellow-500 text-5xl mb-4"><i class="fas fa-search"></i></div>
            <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Results Found</h2>
            <p class="text-gray-500">No invoices match your search</p>
        </div>`);
}

// Payment functionality - supports both add and edit mode
async function payment(id, editIndex = null, editData = null) {
    const invoiceId = id;

    // Store edit mode info
    window.paymentEditMode = editIndex !== null;
    window.paymentEditIndex = editIndex;
    window.paymentEditOriginalAmount = editData ? editData.paid_amount : 0;

    // Determine return view before hiding everything
    if (document.getElementById('view') && window.getComputedStyle(document.getElementById('view')).display !== 'none') {
        window.paymentReturnView = 'view';
    } else {
        window.paymentReturnView = 'home';
    }

    // Fetch invoice first to determine due amount
    try {
        const response = await fetchDocumentById('invoice', invoiceId);
        if (!response || !response.invoice) {
            window.electronAPI.showAlert1('Invoice not found.');
            return;
        }

        const invoice = response.invoice;
        const totalAmount = invoice.total_amount_duplicate || invoice.total_amount_original || 0;
        const paidAmount = invoice.total_paid_amount || 0;
        // In edit mode, add back the original payment amount to due
        const dueAmount = window.paymentEditMode 
            ? (totalAmount - paidAmount + window.paymentEditOriginalAmount)
            : (totalAmount - paidAmount);

        // If there's no due amount (and not in edit mode), alert the user
        if (!window.paymentEditMode && (!dueAmount || dueAmount <= 0)) {
            window.electronAPI.showAlert1('There is no outstanding due on this invoice.');
            return;
        }

        // Show payment UI only when due exists
        document.getElementById('view-preview').style.display = 'none';
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'none';
        document.getElementById('view').style.display = 'none';
        document.getElementById('payment-container').style.display = 'flex';

        // Store invoiceId for payment form submission
        window.currentPaymentInvoiceId = invoiceId;

        // Update modal title and button text based on mode
        const modalTitle = document.querySelector('#payment-container h2');
        const paymentBtn = document.getElementById('payment-btn');
        if (window.paymentEditMode) {
            if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-edit text-blue-600 mr-2"></i>Edit Payment';
            if (paymentBtn) paymentBtn.innerHTML = '<i class="fas fa-save"></i> Update Payment';
        } else {
            if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-money-bill-wave text-green-600 mr-2"></i>Add Payment';
            if (paymentBtn) paymentBtn.innerHTML = '<i class="fas fa-save"></i> Save Payment';
        }

        // Set form fields - either from editData or reset
        const paidAmountInput = document.getElementById('paid-amount');
        if (paidAmountInput) {
            paidAmountInput.value = editData ? editData.paid_amount : '';
        }

        const paymentModeSelect = document.getElementById('payment-mode');
        if (paymentModeSelect) {
            paymentModeSelect.value = editData ? editData.payment_mode : 'Cash';
            paymentModeSelect.dispatchEvent(new Event('change'));
        }

        // Set payment date
        const paymentDateInput = document.getElementById('payment-date');
        if (paymentDateInput) {
            if (editData && editData.payment_date) {
                const editDate = new Date(editData.payment_date);
                paymentDateInput.value = editDate.toISOString().split('T')[0];
            } else {
                const today = new Date().toISOString().split('T')[0];
                paymentDateInput.value = today;
            }
        }

        // Set extra details after mode change triggers the field creation
        setTimeout(() => {
            if (editData && editData.extra_details) {
                const extraFieldInput = document.querySelector('#extra-payment-details input');
                if (extraFieldInput) {
                    extraFieldInput.value = editData.extra_details;
                }
            }
        }, 50);

        const dueAmountElement = document.getElementById('payment-due-amount');
        if (dueAmountElement) {
            dueAmountElement.textContent = `₹ ${formatIndian(dueAmount, 2)}`;
        }

        // Setup autofill button to fill full due amount
        const autofillBtn = document.getElementById('autofill-full-amount');
        if (autofillBtn) {
            // Remove existing listener to avoid duplicates
            const newAutofillBtn = autofillBtn.cloneNode(true);
            autofillBtn.parentNode.replaceChild(newAutofillBtn, autofillBtn);
            
            newAutofillBtn.addEventListener('click', () => {
                const paidAmountInput = document.getElementById('paid-amount');
                if (paidAmountInput && dueAmount > 0) {
                    paidAmountInput.value = dueAmount.toFixed(2);
                    // Visual feedback
                    paidAmountInput.classList.add('ring-2', 'ring-green-500');
                    setTimeout(() => {
                        paidAmountInput.classList.remove('ring-2', 'ring-green-500');
                    }, 500);
                }
            });
        }

        // Focus on the first input field
        setTimeout(() => {
            const firstInput = document.getElementById('paid-amount');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    } catch (error) {
        console.error('Error fetching invoice for payment:', error);
        window.electronAPI.showAlert1('Failed to fetch invoice details.');
    }
}

// Edit existing payment
async function editPayment(invoiceId, paymentIndex) {
    try {
        const response = await fetchDocumentById('invoice', invoiceId);
        if (!response || !response.invoice) {
            window.electronAPI.showAlert1('Invoice not found.');
            return;
        }

        const invoice = response.invoice;
        if (!invoice.payments || paymentIndex >= invoice.payments.length) {
            window.electronAPI.showAlert1('Payment not found.');
            return;
        }

        const paymentData = invoice.payments[paymentIndex];
        payment(invoiceId, paymentIndex, paymentData);
    } catch (error) {
        console.error('Error fetching payment for edit:', error);
        window.electronAPI.showAlert1('Failed to fetch payment details.');
    }
}

// Delete payment with confirmation
async function deletePayment(invoiceId, paymentIndex) {
    // Show confirmation dialog
    window.electronAPI.showAlert2(
        'Are you sure you want to delete this payment? This action cannot be undone.',
        'Delete Payment'
    );

    // Wait for response
    window.electronAPI.receiveAlertResponse(async (response) => {
        if (response === 1) { // User confirmed
            try {
                const res = await fetch(`/invoice/delete-payment/${invoiceId}/${paymentIndex}`, {
                    method: 'DELETE'
                });

                const data = await res.json();

                if (!res.ok) {
                    window.electronAPI.showAlert1(`Error: ${data.message || 'Failed to delete payment.'}`);
                    return;
                }

                window.electronAPI.showAlert1('Payment deleted successfully.');

                // Refresh the view
                const userRole = sessionStorage.getItem('userRole');
                if (typeof viewInvoice === 'function') {
                    viewInvoice(invoiceId, userRole);
                }
            } catch (error) {
                console.error('Error deleting payment:', error);
                window.electronAPI.showAlert1('Failed to delete payment.');
            }
        }
    });
}

// Close payment modal handler
document.getElementById('close-payment-modal')?.addEventListener('click', () => {
    document.getElementById('payment-container').style.display = 'none';
    
    if (window.paymentReturnView === 'view') {
        document.getElementById('view').style.display = 'block';
        // Refresh view to show any changes (if they paid and didn't close via success path, though unlikely)
        // Or just return to view state
        const userRole = sessionStorage.getItem('userRole');
        if (typeof viewInvoice === 'function' && window.currentPaymentInvoiceId) {
             viewInvoice(window.currentPaymentInvoiceId, userRole);
        }
    } else {
        document.getElementById('home').style.display = 'block';
        loadRecentInvoices();
    }
});

// Payment mode change handler
document.getElementById('payment-mode')?.addEventListener('change', function () {
    const mode = this.value;
    let extraField = document.getElementById('extra-payment-details');

    if (!extraField) return;

    extraField.innerHTML = ''; // Clear previous

    if (mode === 'Cash') {
        extraField.innerHTML = `
            <label for="cash-location" class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-map-marker-alt text-gray-500 mr-1"></i>Cash Location
            </label>
            <input type="text" id="cash-location" placeholder="Enter cash location"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        `;
    } else if (mode === 'UPI') {
        extraField.innerHTML = `
            <label for="upi-transaction-id" class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-mobile-alt text-gray-500 mr-1"></i>UPI Transaction ID
            </label>
            <input type="text" id="upi-transaction-id" placeholder="Enter UPI transaction ID"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        `;
    } else if (mode === 'Cheque') {
        extraField.innerHTML = `
            <label for="cheque-number" class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-money-check text-gray-500 mr-1"></i>Cheque Number
            </label>
            <input type="text" id="cheque-number" placeholder="Enter cheque number"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        `;
    } else if (mode === 'Bank Transfer') {
        extraField.innerHTML = `
            <label for="bank-details" class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-university text-gray-500 mr-1"></i>Bank Details
            </label>
            <input type="text" id="bank-details" placeholder="Enter bank details"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        `;
    }
});

// Payment form submission handler
document.getElementById('payment-btn')?.addEventListener('click', async () => {
    const paymentBtn = document.getElementById('payment-btn');

    // Prevent double submission
    if (paymentBtn.disabled) return;

    const paidAmountInput = document.getElementById("paid-amount");
    const paidAmount = parseFloat(paidAmountInput?.value) || 0;
    const paymentDate = document.getElementById("payment-date").value;
    const paymentMode = document.getElementById("payment-mode").value;

    // Re-fetch invoice to get the latest due amount
    let dueAmount = null;
    try {
        const invResp = await fetchDocumentById('invoice', window.currentPaymentInvoiceId);
        if (invResp && invResp.invoice) {
            const invoice = invResp.invoice;
            const totalAmount = invoice.total_amount_duplicate || invoice.total_amount_original || 0;
            const paidSoFar = invoice.total_paid_amount || 0;
            // In edit mode, add back the original payment amount to due
            const adjustedDue = window.paymentEditMode 
                ? (totalAmount - paidSoFar + window.paymentEditOriginalAmount)
                : (totalAmount - paidSoFar);
            dueAmount = Number(adjustedDue.toFixed(2));
        }
    } catch (err) {
        console.error('Error fetching invoice for validation:', err);
    }

    // Basic validations
    if (!window.currentPaymentInvoiceId) {
        window.electronAPI.showAlert1('Invoice not selected for payment.');
        return;
    }

    if (!paymentDate) {
        window.electronAPI.showAlert1('Please select a payment date.');
        return;
    }

    const today = new Date();
    const enteredDate = new Date(paymentDate + 'T00:00:00');
    if (isNaN(enteredDate.getTime())) {
        window.electronAPI.showAlert1('Invalid payment date.');
        return;
    }
    if (enteredDate > today) {
        window.electronAPI.showAlert1('Payment date cannot be in the future.');
        return;
    }

    if (!paymentMode) {
        window.electronAPI.showAlert1('Please select a payment method.');
        return;
    }

    if (paidAmount <= 0 || isNaN(paidAmount)) {
        window.electronAPI.showAlert1('Please enter a valid paid amount greater than 0.');
        paidAmountInput?.focus();
        return;
    }

    if (dueAmount !== null && paidAmount > dueAmount) {
        window.electronAPI.showAlert1(`Paid amount cannot exceed due amount (₹ ${formatIndian(dueAmount, 2)}).`);
        paidAmountInput?.focus();
        return;
    }

    // Extra info validations based on payment method
    let extraInfo = '';
    if (paymentMode === 'Cash') {
        extraInfo = document.getElementById('cash-location')?.value || '';
        if (!extraInfo.trim()) {
            window.electronAPI.showAlert1('Please enter cash location.');
            return;
        }
    } else if (paymentMode === 'UPI') {
        extraInfo = document.getElementById('upi-transaction-id')?.value || '';
        if (!extraInfo.trim()) {
            window.electronAPI.showAlert1('Please enter UPI transaction ID.');
            return;
        }
    } else if (paymentMode === 'Cheque') {
        extraInfo = document.getElementById('cheque-number')?.value || '';
        if (!extraInfo.trim()) {
            window.electronAPI.showAlert1('Please enter cheque number.');
            return;
        }
    } else if (paymentMode === 'Bank Transfer') {
        extraInfo = document.getElementById('bank-details')?.value || '';
        if (!extraInfo.trim()) {
            window.electronAPI.showAlert1('Please enter bank details.');
            return;
        }
    }

    const data = {
        invoiceId: window.currentPaymentInvoiceId,
        paidAmount: paidAmount,
        paymentDate: paymentDate,
        paymentMode: paymentMode,
        paymentExtra: extraInfo,
    };

    // Add payment index if in edit mode
    if (window.paymentEditMode) {
        data.paymentIndex = window.paymentEditIndex;
    }

    // Disable button while processing
    paymentBtn.disabled = true;
    const originalBtnText = paymentBtn.innerHTML;
    paymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        // Use different endpoint based on edit mode
        const endpoint = window.paymentEditMode ? "/invoice/update-payment" : "/invoice/save-payment";
        const method = window.paymentEditMode ? "PUT" : "POST";
        
        const response = await fetch(endpoint, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();

        if (!response.ok) {
            window.electronAPI.showAlert1(`Error: ${responseData.message || "Unknown error occurred."}`);
            paymentBtn.disabled = false;
            paymentBtn.innerHTML = originalBtnText;
        } else {
            window.electronAPI.showAlert1(window.paymentEditMode ? "Payment Updated!" : "Payment Saved!");
            
            // Reset edit mode
            window.paymentEditMode = false;
            window.paymentEditIndex = null;
            window.paymentEditOriginalAmount = 0;
            
            document.getElementById("paid-amount").value = '';
            // Reset payment date to today
            const paymentDateEl = document.getElementById('payment-date');
            if (paymentDateEl) paymentDateEl.value = new Date().toISOString().split('T')[0];
            document.getElementById("payment-mode").value = '';
            const extraField = document.getElementById('extra-payment-details');
            if (extraField) {
                extraField.innerHTML = `
                    <label for="cash-location" class="block text-sm font-medium text-gray-700 mb-2">
                        <i class="fas fa-map-marker-alt text-gray-500 mr-1"></i>Cash Location
                    </label>
                    <input type="text" id="cash-location" placeholder="Enter cash location"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                `;
            }

            // Re-enable payment button for next payment
            paymentBtn.disabled = false;
            paymentBtn.innerHTML = originalBtnText;

            // Close payment modal and return to appropriate view
            document.getElementById('payment-container').style.display = 'none';
            
            if (window.paymentReturnView === 'view') {
                document.getElementById('view').style.display = 'block';
                const userRole = sessionStorage.getItem('userRole');
                if (typeof viewInvoice === 'function' && window.currentPaymentInvoiceId) {
                     viewInvoice(window.currentPaymentInvoiceId, userRole);
                }
            } else {
                document.getElementById('home').style.display = 'block';
                // Reload invoices to reflect updated payment status
                loadRecentInvoices();
            }
        }
    } catch (error) {
        console.error("Error:", error);
        window.electronAPI.showAlert1("Failed to connect to server.");
        paymentBtn.disabled = false;
        paymentBtn.innerHTML = originalBtnText;
    }
});

function initShortcutsModal() {
    shortcutsModalRef = document.getElementById('shortcuts-modal');
    const shortcutsBtn = document.getElementById('shortcuts-btn');
    const closeBtn = document.getElementById('close-shortcuts');
    const contentContainer = document.getElementById('shortcuts-content');

    if (!shortcutsModalRef || !shortcutsBtn || !closeBtn || !contentContainer) {
        return;
    }

    contentContainer.innerHTML = INVOICE_SHORTCUT_GROUPS.map(renderShortcutSection).join('');

    shortcutsBtn.addEventListener('click', () => {
        showShortcutsModal();
    });

    closeBtn.addEventListener('click', () => {
        hideShortcutsModal();
    });

    shortcutsModalRef.addEventListener('click', (event) => {
        if (event.target === shortcutsModalRef) {
            hideShortcutsModal();
        }
    });
}

function renderShortcutSection(section) {
    const sectionHeader = `
        <div class="shortcuts-section">
            <h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <i class="${section.icon}"></i>
                ${section.title}
            </h3>
            <div class="space-y-2">
                ${section.items.map(renderShortcutRow).join('')}
            </div>
        </div>
    `;
    return sectionHeader;
}

function renderShortcutRow(item) {
    return `
        <div class="shortcut-row">
            <span class="text-gray-700">${item.label}</span>
            ${renderShortcutKeys(item.keys)}
        </div>
    `;
}

function renderShortcutKeys(keys) {
    const keyCaps = keys.map((key, index) => {
        const displayKey = key === 'Ctrl' && isMac ? 'Cmd' : key;
        const separator = index > 0 ? '<span>+</span>' : '';
        return `${separator}<kbd>${displayKey}</kbd>`;
    }).join('');
    return `<div class="shortcut-keys">${keyCaps}</div>`;
}

function showShortcutsModal() {
    if (!shortcutsModalRef) return;
    shortcutsModalRef.classList.remove('hidden');
}

function hideShortcutsModal() {
    if (!shortcutsModalRef) return;
    shortcutsModalRef.classList.add('hidden');
}

function isSectionVisible(sectionId) {
    const el = document.getElementById(sectionId);
    if (!el) return false;
    return window.getComputedStyle(el).display !== 'none';
}

function isFormActive() {
    return isSectionVisible('new');
}

function isPreviewStepActive() {
    if (typeof currentStep === 'undefined' || typeof totalSteps === 'undefined') {
        return false;
    }
    return currentStep === totalSteps;
}

function runOnPreviewStep(callback) {
    if (typeof callback !== 'function') {
        return;
    }

    if (!isFormActive()) {
        return;
    }

    const switchToPreview = () => {
        if (typeof changeStep === 'function' && typeof totalSteps !== 'undefined') {
            changeStep(totalSteps);
        }
        if (typeof generatePreview === 'function') {
            generatePreview();
        }
    };

    if (!isPreviewStepActive()) {
        switchToPreview();
    } else if (typeof generatePreview === 'function') {
        generatePreview();
    }

    setTimeout(() => {
        callback();
    }, 0);
}

function isItemsStepActive() {
    if (typeof currentStep === 'undefined') {
        return false;
    }
    return currentStep === 5;
}

function isHomeScreenActive() {
    const homeSectionVisible = isSectionVisible('home');
    return homeSectionVisible && !isFormActive() && !isSectionVisible('view');
}

function triggerAddEntry() {
    if (!isFormActive()) {
        return false;
    }

    const itemsBtn = document.getElementById('add-item-btn');
    if (itemsBtn && isItemsStepActive()) {
        itemsBtn.click();
        return true;
    }

    const nonItemBtn = document.getElementById('add-non-item-btn');
    if (nonItemBtn && typeof currentStep !== 'undefined' && currentStep === 6) {
        nonItemBtn.click();
        return true;
    }

    return false;
}

function triggerPrintAction() {
    const formPrintBtn = document.getElementById('print-btn');
    if (formPrintBtn && isFormActive()) {
        runOnPreviewStep(() => formPrintBtn.click());
        return true;
    }

    const viewPrintBtn = document.getElementById('printProject');
    if (viewPrintBtn && isSectionVisible('view')) {
        viewPrintBtn.click();
        return true;
    }

    return false;
}

function isTypingContext() {
    const active = document.activeElement;
    if (!active) return false;
    const tagName = active.tagName;
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || active.isContentEditable || tagName === 'SELECT';
}

function handleQuotationKeyboardShortcuts(event) {
    const keyLower = event.key.toLowerCase();
    const isModifierPressed = event.ctrlKey || event.metaKey;
    const homeButton = document.getElementById('home-btn');

    // Payment Modal Handling
    const paymentContainer = document.getElementById('payment-container');
    const isPaymentOpen = paymentContainer && paymentContainer.style.display !== 'none';

    if (isPaymentOpen) {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            document.getElementById('close-payment-modal')?.click();
            return;
        }

        if (event.key === 'Enter') {
            // Allow default behavior for buttons (like close button)
            if (document.activeElement.tagName === 'BUTTON') {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            document.getElementById('payment-btn')?.click();
            return;
        }

        if (event.key === 'Tab') {
            const focusableElements = paymentContainer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusableElements.length > 0) {
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (event.shiftKey) {
                    if (document.activeElement === firstElement) {
                        event.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        event.preventDefault();
                        firstElement.focus();
                    }
                }
            }
            return;
        }

        // Block application shortcuts (Ctrl/Cmd/Alt) while modal is open
        if (isModifierPressed || event.altKey) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        return; // Allow other keys (typing)
    }

    if (!shortcutsModalRef) {
        shortcutsModalRef = document.getElementById('shortcuts-modal');
    }

    if (!event.altKey && isModifierPressed) {
        switch (keyLower) {
            case 'n': {
                const newBtn = document.getElementById('new-invoice');
                if (newBtn && window.getComputedStyle(newBtn).display !== 'none') {
                    event.preventDefault();
                    event.stopPropagation();
                    newBtn.click();
                }
                break;
            }
            case 's': {
                const saveBtn = document.getElementById('save-btn');
                if (saveBtn && isFormActive()) {
                    event.preventDefault();
                    event.stopPropagation();
                    runOnPreviewStep(() => saveBtn.click());
                }
                break;
            }
            case 'p': {
                const isShift = event.shiftKey;
                if (isShift) {
                    if (triggerPrintAction()) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                } else {
                    const previewBtn = document.getElementById('view-preview');
                    if (previewBtn && window.getComputedStyle(previewBtn).display !== 'none') {
                        event.preventDefault();
                        event.stopPropagation();
                        previewBtn.click();
                    }
                }
                break;
            }
            case 'i': {
                if (triggerAddEntry()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                break;
            }
            case 'h': {
                if (homeButton) {
                    event.preventDefault();
                    event.stopPropagation();
                    homeButton.click();
                    setTimeout(() => {
                        window.location.reload();
                    }, 150);
                }
                break;
            }
            case 'f': {
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    event.preventDefault();
                    event.stopPropagation();
                    searchInput.focus();
                    searchInput.select();
                }
                break;
            }
            default:
                break;
        }
        return;
    }

    if (event.altKey) {
        return;
    }

    if (event.key === 'Escape') {
        if (shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
            event.preventDefault();
            event.stopPropagation();
            hideShortcutsModal();
            return;
        }

        if (isHomeScreenActive()) {
            event.preventDefault();
            event.stopPropagation();
            window.location = '/dashboard';
            return;
        }

        event.stopPropagation();
        return;
    }

    if (event.key === '?' && !isTypingContext()) {
        event.preventDefault();
        event.stopPropagation();
        showShortcutsModal();
        return;
    }

    if (isTypingContext()) {
        return;
    }

    if (event.key === 'Enter' && isFormActive()) {
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn && !nextBtn.disabled) {
            event.preventDefault();
            event.stopPropagation();
            nextBtn.click();
        }
        return;
    }

    if (event.key === 'Backspace' && isFormActive()) {
        const prevBtn = document.getElementById('prev-btn');
        if (prevBtn && !prevBtn.disabled) {
            event.preventDefault();
            event.stopPropagation();
            prevBtn.click();
        }
    }
}