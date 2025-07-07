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
            <img src="../assets/${invoice.paymentStatus === 'Paid' ? 'paid.png' : 'unpaid.png'}" alt="Paid Icon">
        </div>
        <div class="details">
            <div class="info1">
                <h1>${invoice.project_name}</h1>
                <h4>#${invoice.invoice_id}</h4>
            </div>
            <div class="info2">
                <h4>${invoice.buyer_name}</h4>
                <p>${invoice.buyer_address}</p>
            </div>
        </div>
        <select class="actions" onchange="handleInvoiceAction(this, '${invoice.invoice_id}')">
            <option value="" disabled selected>Actions</option>
            ${userRole === 'admin' ? `<option data-id="${invoice.invoice_id}" value="view">View</option>` : ""}
            ${userRole === 'admin' ? `<option class="edit-invoice" data-id="${invoice.invoice_id}" value="update">Update</option>` : ""}
            ${userRole === 'admin' ? `<option data-id="${invoice.invoice_id}" value="view-original">View original</option>` : ""}
            ${userRole === 'admin' ? `<option data-id="${invoice.invoice_id}" value="update-original">Update original</option>` : ""}
            ${userRole === 'admin' ? `<option class="delete-invoice" data-id="${invoice.invoice_id}" value="delete">Delete</option>` : ""}
            ${userRole === 'manager' ? `<option data-id="${invoice.invoice_id}" value="view">View</option>` : ""}
            ${userRole === 'manager' ? `<option class="edit-invoice" data-id="${invoice.invoice_id}" value="update">Update</option>` : ""}
            ${userRole === 'manager' ? `<option class="delete-invoice" data-id="${invoice.invoice_id}" value="delete">Delete</option>` : ""}
        </select>
    `;
    return invoiceCard;
}

// Handle actions from the actions dropdown
function handleInvoiceAction(select, invoiceId) {
    const userRole = sessionStorage.getItem('userRole');
    const action = select.value;
    if (action === "view") {
        sessionStorage.setItem('view-invoice', 'duplicate');
        viewInvoice(invoiceId, userRole, false);
    } else if (action === "update") {
        sessionStorage.setItem('update-invoice', 'duplicate');
        openInvoice(invoiceId);
    } else if (action === "view-original") {
        sessionStorage.setItem('view-invoice', 'original');
        viewInvoice(invoiceId, userRole, true);
    } else if (action === "update-original") {
        sessionStorage.setItem('update-invoice', 'original');
        openInvoice(invoiceId);
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
    try {
        const response = await fetch(`/invoice/${invoiceId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error("Failed to delete invoice");
        }

        window.electronAPI.showAlert1("Invoice deleted successfully");
        loadRecentInvoices();
    } catch (error) {
        console.error("Error deleting invoice:", error);
        window.electronAPI.showAlert1("Failed to delete invoice. Please try again later.");
    }
}

// Show the new invoice form
function showNewInvoiceForm() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
    document.getElementById('new-invoice').style.display = 'none';
    document.getElementById('view').style.display = 'none';
    sessionStorage.setItem('update-invoice', 'original');
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('search-input').value;
    if (!query) {
        window.electronAPI.showAlert1("Please enter a search query");
        return;
    }

    try {
        const response = await fetch(`/invoice/search/${query}`);
        if (!response.ok) {
            invoicesListDiv.innerHTML = `<h1>No invoice found</h1>`;
            return;
        }

        const data = await response.json();
        const invoices = data.invoices;
        invoicesListDiv.innerHTML = "";
        invoices.forEach(invoice => {
            const invoiceDiv = createInvoiceCard(invoice);
            invoicesListDiv.appendChild(invoiceDiv);
        });
    } catch (error) {
        console.error("Error fetching invoices:", error);
        window.electronAPI.showAlert1("Failed to fetch invoices. Please try again later.");
    }
}

// Expose the action handler globally for the select element
window.handleInvoiceAction = handleInvoiceAction;