// Redirect to dashboard when logo is clicked
document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

const invoicesListDiv = document.querySelector(".records .record_list");

document.addEventListener("DOMContentLoaded", () => {
    loadRecentInvoices();

    invoicesListDiv.addEventListener("click", handleInvoiceListClick);
    document.getElementById('newInvoice').addEventListener('click', showNewInvoiceForm);
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
});

// Load recent invoices from the server
async function loadRecentInvoices() {
    try {
        const response = await fetch(`/invoice/recent-invoices`);
        if (!response.ok) {
            invoicesListDiv.innerHTML = "<p>No invoices found.</p>";
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
    if (invoices.length === 0) {
        invoicesListDiv.innerHTML = "<h3>No invoices found</h3>";
        return;
    }
    invoices.forEach(invoice => {
        const invoiceDiv = createInvoiceDiv(invoice);
        invoicesListDiv.appendChild(invoiceDiv);
    });
}

// Create an invoice div element
function createInvoiceDiv(invoice) {
    const invoiceDiv = document.createElement("div");
    invoiceDiv.className = "record-item";
    invoiceDiv.style.padding = "1rem";
    invoiceDiv.style.marginBottom = "1rem";
    invoiceDiv.style.border = "1px solid #ddd";
    invoiceDiv.style.borderRadius = "10px";
    invoiceDiv.style.cursor = "pointer";
    invoiceDiv.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)";
    invoiceDiv.style.transition = "background-color 0.3s";

    invoiceDiv.addEventListener("mouseenter", () => {
        invoiceDiv.style.backgroundColor = "#f0f8ff";
    });
    invoiceDiv.addEventListener("mouseleave", () => {
        invoiceDiv.style.backgroundColor = "#fff";
    });

    invoiceDiv.innerHTML = `
        <h4>${invoice.project_name}</h4>
        <p>ID #: ${invoice.invoice_id}</p>
        <button class="btn btn-primary open-invoice" data-id="${invoice.invoice_id}">Open</button>
        <button class="btn btn-danger delete-invoice" data-id="${invoice.invoice_id}">Delete</button>
    `;

    return invoiceDiv;
}

// Handle click events on the invoice list
async function handleInvoiceListClick(event) {
    const target = event.target;
    const invoiceId = target.getAttribute("data-id");

    if (target.classList.contains("open-invoice")) {
        await openInvoice(invoiceId);
    } else if (target.classList.contains("delete-invoice")) {
        showConfirmBox('Are you sure you want to delete this invoice?', async () => {
            await deleteInvoice(invoiceId);
            loadRecentInvoices();
        });
    }
}

// Open an invoice for editing
async function openInvoice(invoiceId) {
    try {
        const response = await fetch(`/invoice/${invoiceId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch invoice");
        }

        const data = await response.json();
        const invoice = data.invoice;

        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'block';

        document.getElementById('invoiceId').value = invoice.invoice_id;
        document.getElementById('projectName').value = invoice.project_name;
        document.getElementById('buyerName').value = invoice.buyer_name;
        document.getElementById('buyerAddress').value = invoice.buyer_address;
        document.getElementById('buyerPhone').value = invoice.buyer_phone;
        document.getElementById('transportMode').value = invoice.transport_mode;
        document.getElementById('vehicleNumber').value = invoice.vehicle_number;
        document.getElementById('placeSupply').value = invoice.place_supply;
        document.getElementById('poNumber').value = invoice.po_number;
        document.getElementById('poDate').value = invoice.po_date;
        document.getElementById('dcNumber').value = invoice.dc_number;
        document.getElementById('dcDate').value = invoice.dc_date;
        document.getElementById('ewayBillNumber').value = invoice.eway_bill_number;

        const itemsTableBody = document.querySelector("#items-table tbody");
        itemsTableBody.innerHTML = "";

        invoice.items.forEach(item => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td><input type="text" value="${item.description}" required></td>
                <td><input type="text" value="${item.HSN_SAC}" required></td>
                <td><input type="number" value="${item.quantity}" min="1" required></td>
                <td><input type="text" value="${item.unitPrice}" required></td>
                <td><button type="button" class="remove-item-btn">Remove</button></td>
            `;

            itemsTableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error fetching invoice:", error);
        window.electronAPI.showAlert("Failed to fetch invoice. Please try again later.");
    }
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

        window.electronAPI.showAlert("Invoice deleted successfully");
        loadRecentInvoices();
    } catch (error) {
        console.error("Error deleting invoice:", error);
        window.electronAPI.showAlert("Failed to delete invoice. Please try again later.");
    }
}

// Show a confirmation box
function showConfirmBox(message, onConfirm, onCancel) {
    const confirmBox = document.getElementById('confirm_box');
    const messageElement = document.getElementById('message');
    const yesButton = document.getElementById('yes');
    const noButton = document.getElementById('no');

    messageElement.textContent = message;
    confirmBox.style.display = 'block';

    yesButton.onclick = () => {
        confirmBox.style.display = 'none';
        if (onConfirm) onConfirm();
    };

    noButton.onclick = () => {
        confirmBox.style.display = 'none';
        if (onCancel) onCancel();
    };
}

// Show the new invoice form
function showNewInvoiceForm() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('searchInput').value;
    if (!query) {
        window.electronAPI.showAlert("Please enter a search query");
        return;
    }

    try {
        const response = await fetch(`/invoice/search/${query}`);
        if (!response.ok) {
            const errorText = await response.text();
            invoicesListDiv.innerHTML = `<p>${errorText}</p>`;
            return;
        }

        const data = await response.json();
        const invoices = data.invoices;
        invoicesListDiv.innerHTML = "";
        invoices.forEach(invoice => {
            const invoiceDiv = createInvoiceDiv(invoice);
            invoicesListDiv.appendChild(invoiceDiv);
        });
    } catch (error) {
        console.error("Error fetching invoices:", error);
        window.electronAPI.showAlert("Failed to fetch invoices. Please try again later.");
    }
}