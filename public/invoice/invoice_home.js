const invoicesListDiv = document.querySelector(".records");

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
    document.getElementById('search-input').addEventListener('click', handleSearch);
    document.getElementById("search-input").addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSearch();
        }
    });
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
        renderInvoices(data.invoices);
    } catch (error) {
        console.error("Error loading invoices:", error);
        invoicesListDiv.innerHTML = "<p>Failed to load invoices. Please try again later.</p>";
    }
}

// Render invoices in the list
function renderInvoices(invoices) {
    invoicesListDiv.innerHTML = "";
    if (!invoices || invoices.length === 0) {
        invoicesListDiv.innerHTML = "<h1>No Invoices Found</h1>";
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
    invoiceCard.className = "bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 p-6 border border-gray-200 fade-in";
    
    const isPaid = invoice.payment_status === 'Paid';
    const dueAmount = invoice.total_amount_duplicate - invoice.total_paid_amount;
    
    invoiceCard.innerHTML = `
        <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full ${isPaid ? 'bg-green-100' : 'bg-orange-100'} flex items-center justify-center">
                    <i class="fas fa-${isPaid ? 'check-circle' : 'clock'} text-2xl ${isPaid ? 'text-green-600' : 'text-orange-600'}"></i>
                </div>
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-1">${invoice.project_name}</h3>
                    <p class="text-sm text-gray-500 cursor-pointer hover:text-blue-600 copy-text transition-colors" title="Click to copy">
                        <i class="fas fa-copy mr-1"></i>${invoice.invoice_id}
                    </p>
                </div>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-semibold ${isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">
                ${isPaid ? 'Paid' : 'Pending'}
            </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="space-y-2">
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Customer</p>
                    <p class="text-sm font-medium text-gray-900">${invoice.customer_name}</p>
                    <p class="text-xs text-gray-600">${invoice.customer_address}</p>
                </div>
            </div>
            
            ${userRole === 'admin' ? `
            <div class="space-y-2">
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Amount</p>
                    <p class="text-lg font-bold text-blue-600">₹ ${formatIndian(invoice.total_amount_duplicate, 2)}</p>
                </div>
                ${dueAmount > 0 ? `
                <div>
                    <p class="text-xs text-red-500 uppercase tracking-wide mb-1">Due Amount</p>
                    <p class="text-lg font-bold text-red-600">₹ ${formatIndian(dueAmount, 2)}</p>
                </div>
                ` : ''}
            </div>
            ` : ''}
        </div>

        <div class="pt-4 border-t border-gray-200">
            <select class="invoice-actions-select w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-blue-400 transition-colors" data-invoice-id="${invoice.invoice_id}">
                <option value="" disabled selected><i class="fas fa-ellipsis-v"></i> Actions</option>
                ${userRole === 'admin' ? `
                    <option data-id="${invoice.invoice_id}" value="view">👁️ View</option>
                    <option class="edit-invoice" data-id="${invoice.invoice_id}" value="update">✏️ Update</option>
                    <option data-id="${invoice.invoice_id}" value="view-original">📄 View Original</option>
                    <option data-id="${invoice.invoice_id}" value="update-original">📝 Update Original</option>
                    <option data-id="${invoice.invoice_id}" value="payment">💳 Payment</option>
                    <option class="delete-invoice" data-id="${invoice.invoice_id}" value="delete">🗑️ Delete</option>
                ` : ""}
                ${userRole === 'manager' ? `
                    <option data-id="${invoice.invoice_id}" value="view">👁️ View</option>
                    <option class="edit-invoice" data-id="${invoice.invoice_id}" value="update">✏️ Update</option>
                    <option data-id="${invoice.invoice_id}" value="payment">💳 Payment</option>
                    <option class="delete-invoice" data-id="${invoice.invoice_id}" value="delete">🗑️ Delete</option>
                ` : ""}
            </select>
        </div>
    `;
    
    const copyElement = invoiceCard.querySelector('.copy-text');

    copyElement.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(invoice.invoice_id);
            showToast('Copied!');
        } catch (err) {
            console.error('Copy failed', err);
        }
    });

    // Add event listener for actions dropdown
    const selectElement = invoiceCard.querySelector('.invoice-actions-select');
    selectElement.addEventListener('change', function() {
        handleInvoiceAction(this, this.dataset.invoiceId);
    });

    return invoiceCard;
}

// Handle actions from the actions dropdown
function handleInvoiceAction(select, invoiceId) {
    const userRole = sessionStorage.getItem('userRole');
    const action = select.value;
    if (action === "view") {
        sessionStorage.setItem('view-invoice', 'duplicate');
        viewInvoice(invoiceId, userRole);
    } else if (action === "update") {
        sessionStorage.setItem('update-invoice', 'duplicate');
        openInvoice(invoiceId);
    } else if (action === "view-original") {
        sessionStorage.setItem('view-invoice', 'original');
        viewInvoice(invoiceId, userRole);
    } else if (action === "update-original") {
        sessionStorage.setItem('update-invoice', 'original');
        openInvoice(invoiceId);
    } else if (action === 'payment') {
        payment(invoiceId);
    }
    else if (action === "delete") {
        window.electronAPI.showAlert2("Are you sure you want to delete this invoice?");
        if (window.electronAPI) {
            window.electronAPI.receiveAlertResponse((response) => {
                if (response === "Yes") {
                    deleteInvoice(invoiceId);
                }
            });
        }
    }
    select.selectedIndex = 0; // Reset to default
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
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('search-input').value;
    await searchDocuments('invoice', query, invoicesListDiv, createInvoiceCard, 'No invoice found');
}

// Payment functionality
function payment(id) {
    const invoiceId = id;
    document.getElementById('view-preview').style.display = 'none';
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'none';
    document.getElementById('view').style.display = 'none';
    document.getElementById('payment-container').style.display = 'flex';
    
    // Store invoiceId for payment form submission
    window.currentPaymentInvoiceId = invoiceId;
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
    const paymentStatus = document.querySelector('input[name="payment-question"]:checked')?.value;
    const paidAmount = parseInt(document.getElementById("paid-amount").value);
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
        paymentStatus: paymentStatus,
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

// Expose the action handler globally for the select element
window.handleInvoiceAction = handleInvoiceAction;