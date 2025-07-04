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
    const userRole = sessionStorage.getItem('userRole');
    const invoiceDiv = document.createElement("div");
    invoiceDiv.className = "record-item";
    invoiceDiv.innerHTML = `
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
        <select class="actions" onchange="handleAction(this, '${invoice.invoice_id}')">
        <option value="" disabled selected>Actions</option>
        <option class="open-invoice" data-id="${invoice.invoice_id}" value="view">View</option>
        ${userRole === 'admin' ? `<option class="open-invoice" data-id="${invoice.invoice_id}" value="view-original">View Original</option>` : ""}
        <option class="delete-invoice" data-id="${invoice.invoice_id}" value="update">Update</option>
        <option class="delete-invoice" data-id="${invoice.invoice_id}" value="delete">Delete</option>
        </select>
    `;

    return invoiceDiv;
}

function handleAction(select, id) {
    const userRole = sessionStorage.getItem('userRole');
    const action = select.value;
    if (action === "view") {
        viewInvoice(id, userRole, original = false);
    } else if (action === "update") {
        openInvoice(id);
    } else if (action === "view-original") {
        viewInvoice(id, userRole, original = true);
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
        document.getElementById('invoiceDate').value = formatDate(invoice.invoice_date);
        document.getElementById('projectName').value = invoice.project_name;
        document.getElementById('buyerName').value = invoice.buyer_name;
        document.getElementById('buyerAddress').value = invoice.buyer_address;
        document.getElementById('buyerPhone').value = invoice.buyer_phone;
        document.getElementById('buyerEmail').value = invoice.buyer_email;
        document.getElementById('consigneeName').value = invoice.consignee_name;
        document.getElementById('consigneeAddress').value = invoice.consignee_address;
        document.getElementById('poNumber').value = invoice.po_number;
        document.getElementById('dcNumber').value = invoice.dc_number;
        document.getElementById('dcDate').value = formatDate(invoice.dc_date);
        document.getElementById('service_month').value = invoice.service_month;
        document.getElementById('margin').value = invoice.margin || '';
        document.getElementById('wayBillNumber').value = invoice.Way_Bill_number;
        document.querySelector(`input[name="question"][value="${invoice.paymentStatus}"]`).checked = true;
        document.getElementById('paymentMode').value = invoice.paymentMode;
        document.getElementById('paymentDate').value = formatDate(invoice.paymentDate);
        document.getElementById('advancedPaymentDate').value = formatDate(invoice.paymentDate);


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
    } catch (error) {
        console.error("Error fetching invoice:", error);
        window.electronAPI.showAlert1("Failed to fetch invoice. Please try again later.");
    }
}

function calculateInvoice(itemsTable) {
    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;
    let itemsHTML = "";

    // Check if rate column is populated
    let hasTax = Array.from(itemsTable.rows).some(row => {
        // Fix: Check if input exists before accessing value
        const input = row.cells[4]?.querySelector("input");
        return input && parseFloat(input.value) > 0;
    });

    for (const row of itemsTable.rows) {
        const description = row.cells[0].querySelector("input")?.value || "-";
        const hsnSac = row.cells[1].querySelector("input")?.value || "-";
        const qty = parseFloat(row.cells[2].querySelector("input")?.value || "0");
        const unitPrice = parseFloat(row.cells[3].querySelector("input")?.value || "0");
        const rate = parseFloat(row.cells[4].querySelector("input")?.value || "0");

        const taxableValue = qty * unitPrice;
        totalTaxableValue += taxableValue;

        if (hasTax) {
            const cgstPercent = rate / 2;
            const sgstPercent = rate / 2;
            const cgstValue = (taxableValue * cgstPercent) / 100;
            const sgstValue = (taxableValue * sgstPercent) / 100;
            const rowTotal = taxableValue + cgstValue + sgstValue;

            totalCGST += cgstValue;
            totalSGST += sgstValue;
            totalPrice += rowTotal;

            itemsHTML += `
                <tr>
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${unitPrice.toFixed(2)}</td>
                    <td>${taxableValue.toFixed(2)}</td>
                    <td>${rate.toFixed(2)}</td>
                    <td>${rowTotal.toFixed(2)}</td>
                </tr>
            `;
        } else {
            const rowTotal = taxableValue;
            totalPrice += rowTotal;

            itemsHTML += `
                <tr>
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${unitPrice.toFixed(2)}</td>
                    <td>${rowTotal.toFixed(2)}</td>
                </tr>
            `;
        }
    }

    const grandTotal = totalTaxableValue + totalCGST + totalSGST;
    const roundOff = Math.round(grandTotal) - grandTotal;
    const finalTotal = totalPrice + roundOff;

    const totalsHTML = `
        ${hasTax ? `
        <p><strong>Total Taxable Value:</strong> ₹${totalTaxableValue.toFixed(2)}</p>
        <p><strong>Total CGST:</strong> ₹${totalCGST.toFixed(2)}</p>
        <p><strong>Total SGST:</strong> ₹${totalSGST.toFixed(2)}</p>` : ""}
        <p><strong>Grand Total:</strong> ₹${finalTotal.toFixed(2)}</p>
    `;

    return {
        totalPrice,
        totalCGST,
        totalSGST,
        totalTaxableValue,
        roundOff,
        grandTotal,
        finalTotal,
        itemsHTML,
        totalsHTML,
        hasTax
    };
}


function generatePreview2(invoice = {}, userRole, original = false) {
    let itemsHTML = "";
    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;
    let totalTax = 0;
    let hasTax = false;

    // Use invoice items from argument or from DOM table
    const items = invoice.items || [];
    if (items.length > 0) {
        // Calculate items and totals from invoice object (for view mode)
        hasTax = items.some(item => parseFloat(item.rate || 0) > 0);
        items.forEach(item => {
            const description = item.description || "-";
            const hsnSac = item.HSN_SAC || "-";
            const qty = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.UnitPrice || item.unitPrice || 0);
            const rate = parseFloat(item.rate || 0);

            const taxableValue = qty * unitPrice;
            totalTaxableValue += taxableValue;

            if (hasTax) {
                const cgstPercent = rate / 2;
                const sgstPercent = rate / 2;
                const cgstValue = (taxableValue * cgstPercent) / 100;
                const sgstValue = (taxableValue * sgstPercent) / 100;
                const rowTotal = taxableValue + cgstValue + sgstValue;

                totalCGST += cgstValue;
                totalSGST += sgstValue;
                totalPrice += rowTotal;
                totalTax += cgstValue + sgstValue;

                itemsHTML += `
                    <tr>
                        <td>${description}</td>
                        <td>${hsnSac}</td>
                        <td>${qty}</td>
                        <td>${unitPrice.toFixed(2)}</td>
                        <td>${taxableValue.toFixed(2)}</td>
                        <td>${rate.toFixed(2)}</td>
                        <td>${rowTotal.toFixed(2)}</td>
                    </tr>
                `;
            } else {
                const rowTotal = taxableValue;
                totalPrice += rowTotal;

                itemsHTML += `
                    <tr>
                        <td>${description}</td>
                        <td>${hsnSac}</td>
                        <td>${qty}</td>
                        <td>${unitPrice.toFixed(2)}</td>
                        <td>${rowTotal.toFixed(2)}</td>
                    </tr>
                `;
            }
        });
    } else {
        // Fallback to DOM table (edit mode)
        const itemsTable = document.getElementById("detail-items-table")?.getElementsByTagName("tbody")[0];
        if (!itemsTable) {
            document.getElementById("preview-content").innerHTML = "<p>No items to preview.</p>";
            return;
        }
        const calc = calculateInvoice(itemsTable);
        itemsHTML = calc.itemsHTML;
        totalPrice = calc.totalPrice;
        totalCGST = calc.totalCGST;
        totalSGST = calc.totalSGST;
        totalTaxableValue = calc.totalTaxableValue;
        hasTax = calc.hasTax;
    }

    const grandTotal = totalTaxableValue + totalCGST + totalSGST;
    const roundOff = Math.round(grandTotal) - grandTotal;
    const finalTotal = totalPrice + roundOff;

    let totalsHTML = hasTax
        ? `<p><strong>Total Taxable Value:</strong> ₹${totalTaxableValue.toFixed(2)}</p>
           <p><strong>Total CGST:</strong> ₹${totalCGST.toFixed(2)}</p>
           <p><strong>Total SGST:</strong> ₹${totalSGST.toFixed(2)}</p>
           <p><strong>Grand Total:</strong> ₹${finalTotal.toFixed(2)}</p>`
        : `<p><strong>Grand Total:</strong> ₹${finalTotal.toFixed(2)}</p>`;

    document.getElementById("detail-preview-content").innerHTML = `
    <div class="preview-container">
        <div class="header">
            <div class="logo">
                <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/logo.png"
                    alt="Shresht Logo">
            </div>
            <div class="company-details">
                <h1>SHRESHT SYSTEMS</h1>
                <p>3-125-13, Harshitha, Udupi Ontibettu, Hiradka - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>

        <div class="title">INVOICE #${invoice.invoice_id || ""}</div>

        <div class="first-section">
            <div class="buyer-details">
                <p><strong>Bill To: </strong></p>
                <p>${invoice.buyer_name || ""}</p>
                <p>${invoice.buyer_address || ""}</p>
                <p>${invoice.buyer_phone || ""}</p>
            </div>
            <div class="info-section">
                <p><strong>Project:</strong> ${invoice.project_name || ""}</p>
                <p><strong>P.O No:</strong> ${invoice.po_number || ""}</p>
                <p><strong>E-Way Bill:</strong> ${invoice.Way_Bill_number || ""}</p>
            </div>
        </div>
        <div class="second-section">
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th>HSN/SAC</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    ${hasTax ? `
                        <th>Taxable Value (₹)</th>
                        <th>Tax Rate (%)</th>` : ""}
                    <th>Total Price (₹)</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>
        </div>
        <div class="third-section">
            <div class="bank-details">
                <h4>Payment Details</h4>
                <p><strong>Bank Name:</strong> Canara Bank</p>
                <p><strong>Branch Name:</strong> ShanthiNagar Manipal</p>
                <p><strong>Account No:</strong> 120002152652</p>
                <p><strong>IFSC Code:</strong> CNRB0010261</p>
            </div>

            <div class="totals-section" style="text-align: right;">
            ${totalsHTML}
            </div>
        </div>
        <div class="forth-section">
        <p><strong>Total Amount in Words:</strong> <span id="totalInWords">${typeof numberToWords === "function" ? numberToWords(finalTotal) : finalTotal} Only</span></p>
        <div class="declaration">
            <p>We declare that this invoice shows the actual price of the goods described and that all particulars are
                true
                and correct.</p>
        </div>
        </div>
        <div class="fifth-section">
        <div class="terms-section">
                <p><strong>Terms & Conditions:</strong></p>
                <p>1. Payment should be made within 15 days from the date of invoice.</p>
                <p>2. Interest @ 18% per annum will be charged for the delayed payment.</p>
                <p>3. Goods once sold will not be taken back.</p>
            </div>
        <div class="signature">
            <p>For SHRESHT SYSTEMS</p>
            <div class="signature-space"></div>
            <p><strong>Authorized Signatory</strong></p>
        </div>
        </div>
        <footer>
            <p>This is a computer-generated invoice.</p>
        </footer>
    </div>
    `;
}

async function viewInvoice(invoiceId, userRoll, original) {
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
            if (original) {
                row.innerHTML = `
                    <td>${item.description || ''}</td>
                    <td>${item.HSN_SAC || ''}</td>
                    <td>${item.quantity || ''}</td>
                    <td>${item.UnitPrice || item.unitPrice || ''}</td>
                    <td>${item.rate ? item.rate + '%' : ''}</td>
                `;
            } else {
                row.innerHTML = `
                    <td>${item.description || ''}</td>
                    <td>${item.HSN_SAC || ''}</td>
                    <td>${item.quantity || ''}</td>
                    <td>${item.UnitPrice || item.unitPrice || ''}</td>
                `;
            }
            detailItemsTableBody.appendChild(row);
        });

        generatePreview2(invoice, userRoll, original)

        // Print and Save as PDF handlers
        document.getElementById('printProject').onclick = () => {
            const previewContent = document.getElementById("detail-preview-content").innerHTML;
            if (window.electronAPI && window.electronAPI.handlePrintEvent) {
                window.electronAPI.handlePrintEvent(previewContent, "print");
            } else {
                window.electronAPI.showAlert1("Print functionality is not available.");
            }
        };
        document.getElementById('saveProjectPDF').onclick = () => {
            const previewContent = document.getElementById("detail-preview-content").innerHTML;
            if (window.electronAPI && window.electronAPI.handlePrintEvent) {
                let name = `Invoice-${invoiceId}`;
                window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);

            } else {
                window.electronAPI.showAlert1("Print functionality is not available.");
            }
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