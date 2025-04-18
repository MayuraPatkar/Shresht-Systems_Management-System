const totalSteps = 7;

document.getElementById("viewPreview").addEventListener("click", () => {
    changeStep(totalSteps);
    generatePreview();
});

// Event listener for the "Next" button
document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentStep === 2 && !document.getElementById("Id").value) {
        const quotation_id = document.getElementById("quotationId").value;
        if (quotation_id) {
            fetch(`/quotation/${quotation_id}`)
                .then(response => response.json())
                .then(data => {
                    const quotation = data.quotation;
                    document.getElementById("projectName").value = quotation.project_name;
                    document.getElementById("buyerName").value = quotation.buyer_name;
                    document.getElementById("buyerAddress").value = quotation.buyer_address;
                    document.getElementById("buyerPhone").value = quotation.buyer_phone;
                    const itemsTableBody = document.querySelector("#items-table tbody");
                    itemsTableBody.innerHTML = "";

                    quotation.items.forEach(item => {
                        const row = document.createElement("tr");

                        row.innerHTML = `
                                <td><input type="text" value="${item.description}" required></td>
                                <td><input type="text" value="${item.HSN_SAC}" required></td>
                                <td><input type="number" value="${item.quantity}" min="1" required></td>
                                <td><input type="number" value="${item.unitPrice}" required></td>
                                <td><input type="number" value="${item.rate}" required></td>
                                <td><button type="button" class="remove-item-btn">Remove</button></td>
                            `;

                        itemsTableBody.appendChild(row);
                    })
                })
                .catch(error => {
                    console.error("Error:", error);
                    window.electronAPI.showAlert1("Failed to fetch quotation.");
                });
        }
    }
});

let invoiceId = '';

// fuction to get the invoice id
async function getId() {
    try {
        const response = await fetch("/invoice/generate-id");
        if (!response.ok) {
            throw new Error("Failed to fetch invoice id");
        }

        const data = await response.json();
        document.getElementById('Id').value = data.invoice_id;
        invoiceId = data.invoice_id;
        if (invoiceId) generatePreview();
    } catch (error) {
        console.error("Error fetching invoice id:", error);
        window.electronAPI.showAlert1("Failed to fetch invoice id. Please try again later.");
    }
}

function calculateInvoice(itemsTable) {
    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;
    let itemsHTML = "";

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


// Function to generate the invoice preview
function generatePreview() {
    if (!invoiceId) invoiceId = document.getElementById('Id').value;
    const projectName = document.getElementById("projectName").value;
    const poNumber = document.getElementById("poNumber").value;
    const wayBillNumber = document.getElementById("wayBillNumber").value;
    const buyerName = document.getElementById("buyerName").value;
    const buyerAddress = document.getElementById("buyerAddress").value;
    const buyerPhone = document.getElementById("buyerPhone").value;
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];

    const {
        itemsHTML,
        totalsHTML,
        finalTotal,
        hasTax
    } = calculateInvoice(itemsTable);

    // Generate preview content
    document.getElementById("preview-content").innerHTML = `
    <div class="container">
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

        <div class="title">INVOICE #${invoiceId}</div>

        <div class="first-section">
            <div class="buyer-details">
                <p><strong>Bill To: </strong></p>
                <p>${buyerName}</p>
                <p>${buyerAddress}</p>
                <p>${buyerPhone}</p>
            </div>
            <div class="info-section">
                <p><strong>Project:</strong> ${projectName}</p>
                <p><strong>P.O No:</strong> ${poNumber}</p>
                <p><strong>E-Way Bill:</strong> ${wayBillNumber}</p>
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
        <p><strong>Total Amount in Words:</strong> <span id="totalInWords">${numberToWords(finalTotal)} Only</span></p>
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

// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    try {
        const response = await fetch("/invoice/save-invoice", {
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
    const invoiceData = collectFormData();
    if (sendToServer(invoiceData, false)) window.electronAPI.showAlert1("Invoice saved successfully!");
});

// Event listener for the "Print" button
document.getElementById("print").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const invoiceData = collectFormData();
        if (sendToServer(invoiceData, true)) window.electronAPI.handlePrintEvent(previewContent, "print");
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Event listener for the "savePDF" button
document.getElementById("savePDF").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const invoiceData = collectFormData();
        if (sendToServer(invoiceData, true)) {
            let name = `Invoice-${invoiceId}`;
            window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
        }
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Function to collect form data
function collectFormData() {
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];
    const { finalTotal } = calculateInvoice(itemsTable);
    const tolerance = 0.001;
    let paymentStatus = document.querySelector('input[name="question"]:checked')?.value || null;
    if (Math.abs(parseFloat(finalTotal) - document.getElementById("paidAmount").value) < tolerance) {
        paymentStatus = 'Paid';
    }
    return {
        projectName: document.getElementById("projectName").value,
        invoiceId: document.getElementById("Id").value,
        poNumber: document.getElementById("poNumber").value,
        dcNumber: document.getElementById("dcNumber").value,
        dcDate: document.getElementById("dcDate").value,
        service_month: document.getElementById("service_month").value,
        wayBillNumber: document.getElementById("wayBillNumber").value,
        buyerName: document.getElementById("buyerName").value,
        buyerAddress: document.getElementById("buyerAddress").value,
        buyerPhone: document.getElementById("buyerPhone").value,
        consigneeName: document.getElementById("consigneeName").value,
        consigneeAddress: document.getElementById("consigneeAddress").value,
        paymentStatus: paymentStatus,
        paidAmount: document.getElementById("paidAmount").value,
        paymentDate: document.getElementById("paymentDate").value,
        paymentMode: document.getElementById("paymentMode").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(1) input").value,
            HSN_SAC: row.querySelector("td:nth-child(2) input").value,
            quantity: row.querySelector("td:nth-child(3) input").value,
            UnitPrice: row.querySelector("td:nth-child(4) input").value,
            rate: row.querySelector("td:nth-child(5) input").value,
        })),
        totalAmount: finalTotal,
    };
}
