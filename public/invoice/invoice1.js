const invoicesListDiv = document.querySelector(".records");

document.addEventListener("DOMContentLoaded", () => {
    loadRecentInvoices();

    document.getElementById('newInvoice').addEventListener('click', showNewInvoiceForm);
    document.getElementById('searchInput').addEventListener('click', handleSearch);
});

// Load recent invoices from the server
async function loadRecentInvoices() {
    try {
        const response = await fetch(`/invoice/recent-invoices`);
        if (!response.ok) {
            invoicesListDiv.innerHTML = "<h1>No Invoices found.</h1>";
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
    if (invoices.length === 0) {
        invoicesListDiv.innerHTML = "<h1>No Invoices found</h1>";
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
    invoiceDiv.innerHTML = `
    <div class="paid-icon">
        <img src="./assets/${invoice.paymentStatus === 'Paid' ? 'paid.png' : 'unpaid.png'}" alt="Paid Icon">
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
        <select class="actions" onchange="handleAction(this, '${invoice.invoice_id}')">
        <option value="" disabled selected>Actions</option>
        <option class="open-invoice" data-id="${invoice.invoice_id}" value="view">View</option>
        <option class="delete-invoice" data-id="${invoice.invoice_id}" value="view-original">View Original</option>
        <option class="delete-invoice" data-id="${invoice.invoice_id}" value="update">Update</option>
        <option class="delete-invoice" data-id="${invoice.invoice_id}" value="delete">Delete</option>
        </select>
    `;

    return invoiceDiv;
}

function handleAction(select, id) {
    const action = select.value;
    if (action === "view") {
        viewInvoice(id);
    } else if (action === "update") {
        openInvoice(id);
    } else if (action === "view-original") {
        // openQuotation(id);
    } else if (action === "delete") {
        window.electronAPI.showAlert2("Are you sure you want to delete this invoice?");
        if (window.electronAPI) {
            window.electronAPI.receiveAlertResponse((response) => {
                if (response === "Yes") {
                    deleteInvoice(id);

                }
            });
        }
    }
    select.selectedIndex = 0; // Reset to default
}

// Function to format date to YYYY-MM-DD
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
        document.getElementById('newInvoice').style.display = 'none';
        document.getElementById('viewPreview').style.display = 'block';

        if (currentStep === 1) {
            changeStep(2)
        }

        document.getElementById('Id').value = invoice.invoice_id;
        document.getElementById('projectName').value = invoice.project_name;
        document.getElementById('buyerName').value = invoice.buyer_name;
        document.getElementById('buyerAddress').value = invoice.buyer_address;
        document.getElementById('buyerPhone').value = invoice.buyer_phone;
        document.getElementById('consigneeName').value = invoice.consignee_name;
        document.getElementById('consigneeAddress').value = invoice.consignee_address;
        document.getElementById('poNumber').value = invoice.po_number;
        document.getElementById('dcNumber').value = invoice.dc_number;
        document.getElementById('dcDate').value = formatDate(invoice.dc_date);
        document.getElementById('service_month').value = invoice.service_month;
        document.getElementById('wayBillNumber').value = invoice.Way_Bill_number;
        document.getElementById('advancedPay').value = Array.isArray(invoice?.paidAmount) ? invoice.paidAmount.join(', ') : '';
        document.querySelector(`input[name="question"][value="${invoice.paymentStatus}"]`).checked = true;
        document.getElementById('paymentMode').value = invoice.paymentMode;
        document.getElementById('paymentDate').value = formatDate(invoice.paymentDate);

        const itemsTableBody = document.querySelector("#items-table tbody");
        itemsTableBody.innerHTML = "";

        invoice.items.forEach(item => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td><input type="text" value="${item.description}" required></td>
                <td><input type="text" value="${item.HSN_SAC}" required></td>
                <td><input type="number" value="${item.quantity}" min="1" required></td>
                <td><input type="number" value="${item.UnitPrice}" required></td>
                <td><input type="number" value="${item.rate}" required></td>
                <td><button type="button" class="remove-item-btn">Remove</button></td>
            `;

            itemsTableBody.appendChild(row);
        });
                generatePreview()


    } catch (error) {
        console.error("Error fetching invoice:", error);
        window.electronAPI.showAlert1("Failed to fetch invoice. Please try again later.");
    }
}

async function viewInvoice(invoiceId) {
    try {
        const response = await fetch(`/invoice/${invoiceId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch invoice");
        }

        const data = await response.json();
        const invoice = data.invoice;

        // Hide other sections, show view section
        document.getElementById('viewPreview').style.display = 'none';
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'none';
        document.getElementById('view').style.display = 'flex';

        // Fill Project Details
        document.getElementById('detail-projectName').textContent = invoice.project_name || '';
        document.getElementById('detail-projectId').textContent = invoice.invoice_id || '';
        document.getElementById('detail-poNumber').textContent = invoice.po_number || '';
        document.getElementById('detail-dcNumber').textContent = invoice.dc_number || '';
        document.getElementById('detail-dcDate').textContent = invoice.dc_date ? formatDate(invoice.dc_date) : '';
        document.getElementById('detail-wayBillNumber').textContent = invoice.Way_Bill_number || '';
        document.getElementById('detail-serviceMonth').textContent = invoice.service_month || '';

        document.getElementById('detail-paymentStatus').textContent = invoice.paymentStatus || '';
        document.getElementById('detail-balanceDue').textContent = invoice.balanceDue || '';
        document.getElementById('detail-advancedPay').textContent = Array.isArray(invoice?.paidAmount) ? invoice.paidAmount.join(', ') : (invoice.advancedPay || '');
        document.getElementById('detail-paidAmount').textContent = invoice.paidAmount || '';
        document.getElementById('detail-paymentMode').textContent = invoice.paymentMode || '';
        document.getElementById('detail-paymentDate').textContent = invoice.paymentDate ? formatDate(invoice.paymentDate) : '';

        // Buyer & Consignee
        document.getElementById('detail-buyerName').textContent = invoice.buyer_name || '';
        document.getElementById('detail-buyerAddress').textContent = invoice.buyer_address || '';
        document.getElementById('detail-buyerPhone').textContent = invoice.buyer_phone || '';
        document.getElementById('detail-buyerEmail').textContent = invoice.buyer_email || '';
        document.getElementById('detail-consigneeName').textContent = invoice.consignee_name || '';
        document.getElementById('detail-consigneeAddress').textContent = invoice.consignee_address || '';

        // Item List
        const detailItemsTableBody = document.querySelector("#detail-items-table tbody");
        detailItemsTableBody.innerHTML = "";
        (invoice.items || []).forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.description || ''}</td>
                <td>${item.HSN_SAC || ''}</td>
                <td>${item.quantity || ''}</td>
                <td>${item.UnitPrice || ''}</td>
                <td>${item.rate || ''}</td>
            `;
            detailItemsTableBody.appendChild(row);
        });

        // Preview Content (you can customize this as needed)
        document.getElementById('detail-preview-content').innerHTML = `
            <strong>Invoice Preview:</strong><br>
            Project: ${invoice.project_name || ''} <br>
            Buyer: ${invoice.buyer_name || ''} <br>
            Total Items: ${(invoice.items || []).length}
        `;

        // Print and Save as PDF handlers
        document.getElementById('printProject').onclick = () => {
            window.print();
        };
        document.getElementById('saveProjectPDF').onclick = () => {
            // For best results, use a library like html2pdf.js or print to PDF from browser
            window.print();
        };

    } catch (error) {
        console.error("Error fetching invoice:", error);
        window.electronAPI?.showAlert1("Failed to fetch invoice. Please try again later.");
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
    document.getElementById('newInvoice').style.display = 'none';
    document.getElementById('view').style.display = 'none';
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('searchInput').value;
    if (!query) {
        window.electronAPI.showAlert1("Please enter a search query");
        return;
    }

    try {
        const response = await fetch(`/invoice/search/${query}`);
        if (!response.ok) {
            invoicesListDiv.innerHTML = `<h1>No Invoice Found</h1>`;
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
        window.electronAPI.showAlert1("Failed to fetch invoices. Please try again later.");
    }
}

document.getElementById("searchInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        handleSearch();
    }
})