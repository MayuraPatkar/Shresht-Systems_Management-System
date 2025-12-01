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
            invoicesListDiv.innerHTML = "<h1>No Invoices Found.</h1>";
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
            <div class="bg-white rounded-lg shadow-md p-12 text-center border-2 border-dashed border-gray-300">
                <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                    <i class="fas fa-file-invoice-dollar text-4xl text-blue-500"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">No Invoices Found</h2>
                <p class="text-gray-600 mb-6">Start creating invoices for your clients</p>
                <button onclick="document.getElementById('new-invoice').click()" class="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg font-semibold">
                    <i class="fas fa-plus mr-2"></i>Create First Invoice
                </button>
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
    
    const isPaid = invoice.payment_status === 'Paid';
    const dueAmount = invoice.total_amount_duplicate - invoice.total_paid_amount;
    
    invoiceCard.innerHTML = `
        <!-- Left Border Accent -->
        <div class="flex">
            <div class="w-1.5 bg-gradient-to-b ${isPaid ? 'from-green-500 to-emerald-600' : 'from-orange-500 to-amber-600'}"></div>
            
            <div class="flex-1 p-6">
                <!-- Main Content Row -->
                <div class="flex items-center justify-between gap-6">
                    
                    <!-- Left Section: Icon + Project Info -->
                    <div class="flex items-center gap-4 flex-1 min-w-0">
                        <div class="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md flex-shrink-0">
                            <i class="fas fa-file-invoice-dollar text-2xl text-white"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <h3 class="text-lg font-bold text-gray-900 truncate">${invoice.project_name}</h3>
                                <span class="px-2 py-0.5 rounded-md text-xs font-semibold ${isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">
                                    ${isPaid ? 'PAID' : 'PENDING'}
                                </span>
                            </div>
                            <p class="text-sm text-gray-600 cursor-pointer hover:text-blue-600 copy-text transition-colors inline-flex items-center gap-1" title="Click to copy ID">
                                <i class="fas fa-hashtag text-xs"></i>
                                <span>${invoice.invoice_id}</span>
                                <i class="fas fa-copy text-xs ml-1"></i>
                            </p>
                        </div>
                    </div>

                    <!-- Middle Section: Customer Info -->
                    <div class="flex items-center gap-3 flex-1 min-w-0 px-6 border-l border-r border-gray-200">
                        <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-user text-blue-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Customer</p>
                            <p class="text-sm font-semibold text-gray-900 truncate">${invoice.customer_name}</p>
                            <p class="text-xs text-gray-600 truncate">${invoice.customer_address}</p>
                        </div>
                    </div>

                    <!-- Amount Section -->
                    ${userRole === 'admin' ? `
                    <div class="flex items-center gap-3 px-6 border-r border-gray-200">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-lg ${isPaid ? 'bg-green-50' : 'bg-blue-50'} flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-rupee-sign ${isPaid ? 'text-green-600' : 'text-blue-600'}"></i>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Total</p>
                                <p class="text-lg font-bold ${isPaid ? 'text-green-600' : 'text-blue-600'}">₹ ${formatIndian(invoice.total_amount_duplicate, 2)}</p>
                            </div>
                        </div>
                        ${dueAmount > 0 ? `
                        <div class="flex items-center gap-3 pl-4 border-l border-gray-300">
                            <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-exclamation-circle text-red-600"></i>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Due</p>
                                <p class="text-lg font-bold text-red-600">₹ ${formatIndian(dueAmount, 2)}</p>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    ` : `
                    <div class="px-6 border-r border-gray-200"></div>
                    `}

                    <!-- Actions Section -->
                    <div class="flex items-center gap-2 flex-shrink-0">
                        ${userRole === 'admin' ? `
                            <button class="action-btn view-btn px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit-btn px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all border border-purple-200 hover:border-purple-400" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn view-original-btn px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all border border-indigo-200 hover:border-indigo-400" title="View Original">
                                <i class="fas fa-file-alt"></i>
                            </button>
                            <button class="action-btn edit-original-btn px-4 py-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-all border border-teal-200 hover:border-teal-400" title="Edit Original">
                                <i class="fas fa-file-signature"></i>
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
            </div>
        </div>
    `;
    
    const copyElement = invoiceCard.querySelector('.copy-text');
    const viewBtn = invoiceCard.querySelector('.view-btn');
    const editBtn = invoiceCard.querySelector('.edit-btn');
    const viewOriginalBtn = invoiceCard.querySelector('.view-original-btn');
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

    if (viewOriginalBtn) {
        viewOriginalBtn.addEventListener('click', () => {
            sessionStorage.setItem('view-invoice', 'original');
            viewInvoice(invoice.invoice_id, userRole);
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
        `<div class="flex flex-col items-center justify-center py-16 fade-in">
            <div class="bg-yellow-100 rounded-full p-8 mb-4">
                <i class="fas fa-search text-yellow-500 text-6xl"></i>
            </div>
            <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Results Found</h2>
            <p class="text-gray-500 mb-2">No invoices match your search</p>
            <button onclick="document.getElementById('search-input').value=''; loadRecentInvoices();" 
                class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium mt-4">
                <i class="fas fa-list"></i>
                Show All Invoices
            </button>
        </div>`);
}

// Payment functionality
async function payment(id) {
    const invoiceId = id;
    document.getElementById('view-preview').style.display = 'none';
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'none';
    document.getElementById('view').style.display = 'none';
    document.getElementById('payment-container').style.display = 'flex';
    
    // Store invoiceId for payment form submission
    window.currentPaymentInvoiceId = invoiceId;
    
    // Fetch invoice to get due amount
    try {
        const invoice = await fetchDocumentById('invoice', invoiceId);
        if (invoice && invoice.invoice) {
            const dueAmount = invoice.invoice.balance_due || 0;
            const dueAmountElement = document.getElementById('payment-due-amount');
            if (dueAmountElement) {
                dueAmountElement.textContent = `₹ ${formatIndian(dueAmount, 2)}`;
            }
        }
    } catch (error) {
        console.error('Error fetching invoice for payment:', error);
    }
}

// Close payment modal handler
document.getElementById('close-payment-modal')?.addEventListener('click', () => {
    document.getElementById('payment-container').style.display = 'none';
    document.getElementById('home').style.display = 'block';
    loadRecentInvoices();
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
    const paidAmount = parseFloat(document.getElementById("paid-amount").value) || 0;
    const paymentDate = document.getElementById("payment-date").value;
    const paymentMode = document.getElementById("payment-mode").value;

    // Get extra field value
    let extraInfo = '';
    if (paymentMode === 'Cash') {
        extraInfo = document.getElementById('cash-location')?.value || '';
    } else if (paymentMode === 'UPI') {
        extraInfo = document.getElementById('upi-transaction-id')?.value || '';
    } else if (paymentMode === 'Cheque') {
        extraInfo = document.getElementById('cheque-number')?.value || '';
    } else if (paymentMode === 'Bank Transfer') {
        extraInfo = document.getElementById('bank-details')?.value || '';
    }

    const data = {
        invoiceId: window.currentPaymentInvoiceId,
        paidAmount: paidAmount,
        paymentDate: paymentDate,
        paymentMode: paymentMode,
        paymentExtra: extraInfo,
    };

    try {
        const response = await fetch("/invoice/save-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();

        if (!response.ok) {
            window.electronAPI.showAlert1(`Error: ${responseData.message || "Unknown error occurred."}`);
        } else {
            window.electronAPI.showAlert1("Payment Saved!");
            document.getElementById("paid-amount").value = '';
            document.getElementById("payment-date").value = '';
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
            // Close payment modal and return to home
            document.getElementById('payment-container').style.display = 'none';
            document.getElementById('home').style.display = 'block';
            // Reload invoices to reflect updated payment status
            loadRecentInvoices();
        }
    } catch (error) {
        console.error("Error:", error);
        window.electronAPI.showAlert1("Failed to connect to server.");
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