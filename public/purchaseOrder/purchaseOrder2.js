const totalSteps = 4;
let purchase_order_id = '';

document.getElementById("viewPreview").addEventListener("click", () => {
    changeStep(totalSteps);
    generatePreview();
});

// fuction to get the quotation id
async function getId() {
    try {
        const response = await fetch("/purchaseOrder/generate-id");
        if (!response.ok) {
            throw new Error("Failed to fetch quotation id");
        }

        const data = await response.json();
        document.getElementById('Id').value = data.purchase_order_id;
        purchase_order_id = data.purchase_order_id;
        if (purchase_order_id) generatePreview();
    } catch (error) {
        console.error("Error fetching quotation id:", error);
        window.electronAPI.showAlert1("Failed to fetch quotation id. Please try again later.");
    }
}

// Function to generate the preview
function generatePreview() {
    if (!purchase_order_id) purchase_order_id = document.getElementById('Id').value;
    const handledBy = document.getElementById("handledBy").value || "";
    const supplierName = document.getElementById("supplierName").value || "";
    const supplierAddress = document.getElementById("supplierAddress").value || "";
    const supplierPhone = document.getElementById("supplierPhone").value || "";
    const GSTIN = document.getElementById("supplierGSTIN").value || "";
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];
    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTax = 0;
    let totalTaxableValue = 0;
    let grandTotal = 0;
    let roundOff = 0;

    let itemsHTML = "";
    let totalsHTML = "";

    // Check if rate column is populated
    let hasTax = Array.from(itemsTable.rows).some(row => row.cells[4].querySelector("input").value > 0);

    for (const row of itemsTable.rows) {
        const description = row.cells[0].querySelector("input").value || "-";
        const hsnSac = row.cells[1].querySelector("input").value || "-";
        const qty = parseFloat(row.cells[2].querySelector("input").value || "0");
        const unitPrice = parseFloat(row.cells[3].querySelector("input").value || "0");
        const rate = parseFloat(row.cells[4].querySelector("input").value || "0");

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
    }

    grandTotal = totalTaxableValue + totalCGST + totalSGST;
    roundOff = Math.round(grandTotal) - grandTotal;

    totalsHTML = `
        ${hasTax ? `
        <p><strong>Total Taxable Value:</strong> ₹${totalTaxableValue.toFixed(2)}</p>
        <p><strong>Total Tax:</strong> ₹${totalTax.toFixed(2)}</p>` : ""}
        <p><strong>Grand Total:</strong> ₹${(totalPrice + roundOff).toFixed(2)}</p>
    `;
    document.getElementById("preview-content").innerHTML = `
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

        <div class="title">Purchase Order #${purchase_order_id}</div>
        <div class="first-section">
            <div class="buyer-details">
                <p><strong>To:</strong></p>
                <p>${supplierName}</p>
                <p>${supplierAddress}</p>
                <p>Ph: ${supplierPhone}</p>
                <p>GSTIN: ${GSTIN}</p>
            </div>
            <div class="info-section">
                <p><strong>Project Name:</strong> ${document.getElementById("projectName").value}</p>
                <p><strong>Handled By:</strong> ${handledBy}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
        </div>
        <div class="second-section">
        <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Rate (₹)</th>
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
        <div class="bank-details"></div>
        <div class="totals-section" style="text-align: right;">
            ${totalsHTML}
        </div>
        </div>
        <p><strong>Total Amount in Words:</strong> <span id="totalInWords">${numberToWords(totalPrice)} Only</span></p>
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

// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    try {
        const response = await fetch("/purchaseOrder/save-purchase-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();

        if (!response.ok) {
            window.electronAPI.showAlert1(`Error: ${responseData.message || "Unknown error occurred."}`);
        } else {
            return true;
        }
    } catch (error) {
        console.error("Error:", error);
        window.electronAPI.showAlert1("Failed to connect to server.");
    }
}

// Event listener for the "Save" button
document.getElementById("save").addEventListener("click", () => {
    const purchaseOrderData = collectFormData();
    if (sendToServer(purchaseOrderData, false)) window.electronAPI.showAlert1("Purchase Oder saved successfully!");
});

// Event listener for the "Print" button
document.getElementById("print").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const purchaseOrderData = collectFormData();
        if (sendToServer(purchaseOrderData, true)) window.electronAPI.handlePrintEvent(previewContent, "print");
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Event listener for the "savePDF" button
document.getElementById("savePDF").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const purchaseOrderData = collectFormData();
        if (sendToServer(purchaseOrderData, true)) {
            let name = `PurchaseOrder-${purchase_order_id}`;
            window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
        }
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Function to collect form data
function collectFormData() {
    return {
        purchase_order_id: document.getElementById("Id").value,
        projectName: document.getElementById("projectName").value,
        handledBy: document.getElementById("handledBy").value,
        supplier_name: document.getElementById("supplierName").value,
        supplier_address: document.getElementById("supplierAddress").value,
        supplier_phone: document.getElementById("supplierPhone").value,
        supplier_email: document.getElementById("supplierEmail").value,
        supplier_GSTIN: document.getElementById("supplierGSTIN").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(1) input").value,
            HSN_SAC: row.querySelector("td:nth-child(2) input").value,
            quantity: row.querySelector("td:nth-child(3) input").value,
            unitPrice: row.querySelector("td:nth-child(4) input").value,
            rate: row.querySelector("td:nth-child(5) input").value,
        })),
    };
}