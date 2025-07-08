// Generate the purchase order preview (for view block)
function generatePurchaseOrderViewPreview(purchaseOrder) {
    let itemsHTML = "";
    let totalTaxableValue = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTax = 0;
    let totalPrice = 0;

    // Detect if any item has tax
    let hasTax = (purchaseOrder.items || []).some(item => Number(item.rate) > 0);

    (purchaseOrder.items || []).forEach(item => {
        const description = item.description || "-";
        const hsnSac = item.HSN_SAC || item.hsn_sac || "-";
        const qty = parseFloat(item.quantity || "0");
        const unitPrice = parseFloat(item.unit_price || "0");
        const rate = parseFloat(item.rate || "0");

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
            totalTax = totalCGST + totalSGST;
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
    });

    let totalsHTML = `
        ${hasTax ? `
        <p><strong>Total Taxable Value:</strong> ₹${totalTaxableValue.toFixed(2)}</p>
        <p><strong>Total Tax:</strong> ₹${totalTax.toFixed(2)}</p>` : ""}
        <p><strong>Grand Total:</strong> ₹${totalPrice.toFixed(2)}</p>
    `;

    document.getElementById("view-preview-content").innerHTML = `
    <div class="preview-container">
        <div class="header">
            <div class="logo">
                <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/logo.png"
                    alt="Shresht Logo">
            </div>
            <div class="company-details">
                <h1>SHRESHT SYSTEMS</h1>
                <p>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>

        <div class="title">Purchase Order #${purchaseOrder.purchase_order_id || purchaseOrder.Id || ""}</div>
        <div class="first-section">
            <div class="buyer-details">
                <p><strong>To:</strong></p>
                <p>${purchaseOrder.supplier_name || ""}</p>
                <p>${purchaseOrder.supplier_address || ""}</p>
                <p>Ph: ${purchaseOrder.supplier_phone || ""}</p>
                <p>GSTIN: ${purchaseOrder.supplier_GSTIN || ""}</p>
            </div>
            <div class="info-section">
                <p><strong>Date:</strong> ${formatDate(purchaseOrder.purchase_date) || new Date().toLocaleDateString()}</p>
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
        <div class="totals-section" style="text-align: right;">
            ${totalsHTML}
        </div>
        </div>
        <div class="signature">
            <p>For SHRESHT SYSTEMS</p>
            <div class="signature-space"></div>
            <p><strong>Authorized Signatory</strong></p>
        </div>
        <footer>
            <p>This is a computer-generated purchase order</p>
        </footer>
    </div>`;
}

// Print and Save as PDF handlers (match HTML IDs)
document.getElementById("print-project").addEventListener("click", () => {
    const previewContent = document.getElementById("view-preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        window.electronAPI.handlePrintEvent(previewContent, "print");
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

document.getElementById("save-project-pdf").addEventListener("click", () => {
    const previewContent = document.getElementById("view-preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        let name = 'PurchaseOrder';
        window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// View purchase order and fill details
async function viewPurchaseOrder(purchaseOrderId) {
    try {
        const response = await fetch(`/purchaseOrder/${purchaseOrderId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch purchase order");
        }

        const data = await response.json();
        const purchaseOrder = data.purchaseOrder;

        // Hide other sections, show view section
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'none';
        document.getElementById('view').style.display = 'flex';

        // Fill Supplier Details
        document.getElementById('view-purchase-invoice-iD').textContent = purchaseOrder.purchase_invoice_id || '';
        document.getElementById('view-purchase-date').textContent = formatDate(purchaseOrder.purchase_date) || '';
        document.getElementById('view-supplier-name').textContent = purchaseOrder.supplier_name || '';
        document.getElementById('view-supplier-address').textContent = purchaseOrder.supplier_address || '';
        document.getElementById('view-supplier-phone').textContent = purchaseOrder.supplier_phone || '';
        document.getElementById('view-supplier-email').textContent = purchaseOrder.supplier_email || '';
        document.getElementById('view-buyerGSTIN').textContent = purchaseOrder.supplier_GSTIN || '';

        // Fill Item List
        const viewItemsTableBody = document.querySelector("#view-items-table tbody");
        viewItemsTableBody.innerHTML = "";

        (purchaseOrder.items || []).forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.description || ''}</td>
                <td>${item.HSN_SAC || item.hsn_sac || ''}</td>
                <td>${item.quantity || ''}</td>
                <td>${item.unit_price || ''}</td>
                <td>${item.rate || ''}</td>
            `;
            viewItemsTableBody.appendChild(row);
        });

        // Generate the preview for print/PDF
        generatePurchaseOrderViewPreview(purchaseOrder);

    } catch (error) {
        console.error("Error fetching purchase order:", error);
        window.electronAPI?.showAlert1("Failed to fetch purchase order. Please try again later.");
    }
}

// Utility: format date as yyyy-mm-dd for input fields
function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}