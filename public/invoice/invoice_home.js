const invoicesListDiv = document.querySelector(".records");

document.addEventListener("DOMContentLoaded", () => {
    loadRecentInvoices();

    document.getElementById('new-invoice').addEventListener('click', showNewInvoiceForm);
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
    invoiceCard.className = "record-item";
    invoiceCard.innerHTML = `
        <div class="paid-icon">
            <img src="../assets/${invoice.payment_status === 'Paid' ? 'paid.png' : 'unpaid.png'}" alt="Paid Icon">
        </div>
        <div class="record-item-details">
            <div class="record-item-info-1">
                <h1>${invoice.project_name}</h1>
                <h4 class="copy-text">${invoice.invoice_id}</h4>
                <div id="toast" style="display:none;position:absolute;bottom:20px;left:275px;background:#333;color:#fff;padding:10px 20px;border-radius:5px;">Copied!</div>
            </div>
        </div>
        <div class="record-item-details">
            <div class="record-item-info-2">
                <h2>Customer</h2>
                <p>${invoice.customer_name}</p>
                <p>${invoice.customer_address}</p>
            </div>
        </div>
        <div class="record-item-details">
            <div class="record-item-info-2">
            <h2>Amount</h2>
                <p>${userRole === 'admin' ? `₹ ${formatIndian(invoice.total_amount_duplicate, 2)}` : ""}</p>
            </div>
        </div>
        <div class="record-item-details">
            <div class="record-item-info-2">
            <h2 class="danger">Due Amount</h2>
                <p class="danger">${userRole === 'admin' ? `₹ ${formatIndian(invoice.total_amount_duplicate - invoice.total_paid_amount, 2)}` : ""}</p>
            </div>
        </div>
        </div>
        <select class="actions" onchange="handleInvoiceAction(this, '${invoice.invoice_id}')">
            <option value="" disabled selected>Actions</option>
            ${userRole === 'admin' ? `<option data-id="${invoice.invoice_id}" value="view">View</option>` : ""}
            ${userRole === 'admin' ? `<option class="edit-invoice" data-id="${invoice.invoice_id}" value="update">Update</option>` : ""}
            ${userRole === 'admin' ? `<option data-id="${invoice.invoice_id}" value="view-original">View original</option>` : ""}
            ${userRole === 'admin' ? `<option data-id="${invoice.invoice_id}" value="update-original">Update original</option>` : ""}
            ${userRole === 'admin' ? `<option data-id="${invoice.invoice_id}" value="payment">Payment</option>` : ""}
            ${userRole === 'admin' ? `<option class="delete-invoice" data-id="${invoice.invoice_id}" value="delete">Delete</option>` : ""}
            ${userRole === 'manager' ? `<option data-id="${invoice.invoice_id}" value="view">View</option>` : ""}
            ${userRole === 'manager' ? `<option class="edit-invoice" data-id="${invoice.invoice_id}" value="update">Update</option>` : ""}
            ${userRole === 'manager' ? `<option data-id="${invoice.invoice_id}" value="payment">Payment</option>` : ""}
            ${userRole === 'manager' ? `<option class="delete-invoice" data-id="${invoice.invoice_id}" value="delete">Delete</option>` : ""}
        </select>
    `;
    const copyElement = invoiceCard.querySelector('.copy-text');

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 500);
    }

    copyElement.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(copyElement.textContent.trim());
            showToast('Copied!');
        } catch (err) {
            console.error('Copy failed', err);
        }
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
    document.getElementById('payment-container').style.display = 'block';
    
    // Store invoiceId for payment form submission
    window.currentPaymentInvoiceId = invoiceId;
}

// Payment mode change handler
document.getElementById('payment-mode')?.addEventListener('change', function () {
    const mode = this.value;
    let extraField = document.getElementById('payment-extra-field');
    if (!extraField) {
        extraField = document.createElement('div');
        extraField.id = 'payment-extra-field';
        extraField.className = 'form-group';
        this.parentNode.parentNode.appendChild(extraField);
    }
    extraField.innerHTML = ''; // Clear previous

    if (mode === 'Cash') {
        extraField.innerHTML = `
            <label for="cash-location">Cash Location</label>
            <input type="text" id="cash-location" placeholder="Enter cash location">
        `;
    } else if (mode === 'UPI') {
        extraField.innerHTML = `
            <label for="upi-transaction-id">UPI Transaction ID</label>
            <input type="text" id="upi-transaction-id" placeholder="Enter UPI transaction ID">
        `;
    } else if (mode === 'Cheque') {
        extraField.innerHTML = `
            <label for="cheque-number">Cheque Number</label>
            <input type="text" id="cheque-number" placeholder="Enter cheque number">
        `;
    } else if (mode === 'Bank Transfer') {
        extraField.innerHTML = `
            <label for="bank-details">Bank Details</label>
            <input type="text" id="bank-details" placeholder="Enter bank details">
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
            if (document.getElementById('payment-extra-field')) {
                document.getElementById('payment-extra-field').innerHTML = '';
            }
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