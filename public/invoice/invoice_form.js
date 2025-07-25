const totalSteps = 6;
let invoiceId = '';
let totalAmountOriginal = 0;
let totalAmountDuplicate = 0;
let totalTaxOriginal = 0;
let totalTaxDuplicate = 0;

document.getElementById("view-preview").addEventListener("click", () => {
    changeStep(totalSteps);
    generatePreview();
});

// Event listener for the "Next" button
document.getElementById("next-btn").addEventListener("click", () => {
    if (currentStep === 2 && !document.getElementById("id").value) {
        const quotationId = document.getElementById("quotation-id").value;
        if (quotationId) {
            fetch(`/quotation/${quotationId}`)
                .then(response => response.json())
                .then(data => {
                    const quotation = data.quotation;
                    document.getElementById("project-name").value = quotation.project_name;
                    document.getElementById("buyer-name").value = quotation.customer_name;
                    document.getElementById("buyer-address").value = quotation.customer_address;
                    document.getElementById("buyer-phone").value = quotation.customer_phone;
                    document.getElementById("buyer-email").value = quotation.customer_email;
                    const itemsTableBody = document.querySelector("#items-table tbody");
                    itemsTableBody.innerHTML = "";

                    quotation.items.forEach(item => {
                        const row = document.createElement("tr");
                        row.innerHTML = `
                            <td><input type="text" value="${item.description}" required></td>
                            <td><input type="text" value="${item.HSN_SAC}" required></td>
                            <td><input type="number" value="${item.quantity}" min="1" required></td>
                            <td><input type="number" value="${item.unit_price}" required></td>
                            <td><input type="number" value="${item.rate}" required></td>
                            <td><button type="button" class="remove-item-btn">Remove</button></td>
                        `;
                        itemsTableBody.appendChild(row);
                    });
                })
                .catch(error => {
                    console.error("Error:", error);
                    window.electronAPI.showAlert1("Failed to fetch quotation.");
                });
        }
    }
});

// Open an invoice for editing
async function openInvoice(id) {
    try {
        const type = sessionStorage.getItem('update-invoice');
        const response = await fetch(`/invoice/${id}`);
        if (!response.ok) throw new Error("Failed to fetch invoice");

        const data = await response.json();
        const invoice = data.invoice;

        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'block';
        document.getElementById('new-invoice').style.display = 'none';
        document.getElementById('view-preview').style.display = 'block';

        if (currentStep === 1) changeStep(2);

        document.getElementById('id').value = invoice.invoice_id;
        document.getElementById('invoice-date').value = formatDate(invoice.invoice_date);
        document.getElementById('project-name').value = invoice.project_name;
        document.getElementById('buyer-name').value = invoice.customer_name;
        document.getElementById('buyer-address').value = invoice.customer_address;
        document.getElementById('buyer-phone').value = invoice.customer_phone;
        document.getElementById('buyer-email').value = invoice.customer_email;
        document.getElementById('consignee-name').value = invoice.consignee_name;
        document.getElementById('consignee-address').value = invoice.consignee_address;
        document.getElementById('purchase-order-number').value = invoice.po_number;
        document.getElementById('delivery-challan-number').value = invoice.dc_number;
        document.getElementById('delivery-challan-date').value = formatDate(invoice.dc_date);
        document.getElementById('service-months').value = invoice.service_month;
        document.getElementById('waybill-number').value = invoice.Waybill_id;       

        const itemsTableBody = document.querySelector("#items-table tbody");
        itemsTableBody.innerHTML = "";

        if (type == 'original') {

            invoice.items_original.forEach(item => {
                const row = document.createElement("tr");
                row.innerHTML = `
                <td><input type="text" value="${item.description}" required></td>
                <td><input type="text" value="${item.HSN_SAC}" required></td>
                <td><input type="number" value="${item.quantity}" min="1" required></td>
                <td><input type="number" value="${item.unit_price}" required></td>
                <td><input type="number" value="${item.rate}" required></td>
                <td><button type="button" class="remove-item-btn">Remove</button></td>
            `;
                itemsTableBody.appendChild(row);
            });
        } else {
            invoice.items_duplicate.forEach(item => {
                const row = document.createElement("tr");
                row.innerHTML = `
                <td><input type="text" value="${item.description}" required></td>
                <td><input type="text" value="${item.HSN_SAC}" required></td>
                <td><input type="number" value="${item.quantity}" min="1" required></td>
                <td><input type="number" value="${item.unit_price}" required></td>
                <td><input type="number" value="${item.rate}" required></td>
                <td><button type="button" class="remove-item-btn">Remove</button></td>
            `;
                itemsTableBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error("Error fetching invoice:", error);
        window.electronAPI.showAlert1("Failed to fetch invoice. Please try again later.");
    }
}

// Function to get the invoice id
async function getId() {
    try {
        const response = await fetch("/invoice/generate-id");
        if (!response.ok) throw new Error("Failed to fetch invoice id");

        const data = await response.json();
        document.getElementById('id').value = data.invoice_id;
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
    let hasTax = Array.from(itemsTable.rows).some(row => parseFloat(row.cells[4].querySelector("input").value) > 0);

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
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${formatIndian(taxableValue, 2)}</td>
                    <td>${rate.toFixed(2)}</td>
                    <td>${formatIndian(rowTotal, 2)}</td>
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

    let type = sessionStorage.getItem('update-invoice');
    if (type === 'original') {
        totalAmountOriginal = Number(finalTotal.toFixed(2));
        totalTaxOriginal = totalCGST + totalSGST;
    } else if (type === 'duplicate') {
        totalAmountDuplicate = finalTotal.toFixed(2);
        totalTaxDuplicate = totalCGST + totalSGST;
    }

    const totalsHTML = `
        <div class="totals-section-sub1">
            ${hasTax ? `
            <p><strong>Taxable Value: </strong></p>
            <p><strong>Total CGST: </strong></p>
            <p><strong>Total SGST: </strong></p>` : ""}
            <p><strong>Grand Total: </strong></p>
        </div>
        <div class="totals-section-sub2">
            ${hasTax ? `
            <p>₹ ${formatIndian(totalTaxableValue, 2)}</p>
            <p>₹ ${formatIndian(totalCGST, 2)}</p>
            <p>₹ ${formatIndian(totalSGST, 2)}</p>` : ""}
            <p>₹ ${formatIndian(finalTotal, 2)}</p>
        </div>
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
    if (!invoiceId) invoiceId = document.getElementById('id').value;
    const projectName = document.getElementById("project-name").value;
    const poNumber = document.getElementById("purchase-order-number").value;
    const wayBillNumber = document.getElementById("waybill-number").value;
    const buyerName = document.getElementById("buyer-name").value;
    const buyerAddress = document.getElementById("buyer-address").value;
    const buyerPhone = document.getElementById("buyer-phone").value;
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];

    const {
        itemsHTML,
        totalsHTML,
        finalTotal,
        hasTax
    } = calculateInvoice(itemsTable);

    // Generate preview content
    document.getElementById("preview-content").innerHTML = `
    <div class="preview-container">
        <div class="first-section">
            <div class="logo">
                <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/logo.png" alt="Shresht Logo" />
            </div>
            <div class="company-details">
                <h1>SHRESHT SYSTEMS</h1>
                <p>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>

        <div class="second-section">
            <p>INVOICE-${invoiceId}</p>
        </div>

        <div class="third-section">
            <div class="buyer-details">
                <p><strong>Bill To:</strong></p>
                <p>${buyerName}</p>
                <p>${buyerAddress}</p>
                <p>Ph. ${buyerPhone}</p>
            </div>
            <div class="info-section">
                <p><strong>Project:</strong> ${projectName}</p>
                <p><strong>P.O No:</strong> ${poNumber}</p>
                <p><strong>D.C No:</strong> ${poNumber}</p>
                <p><strong>E-Way Bill:</strong> ${wayBillNumber}</p>
            </div>
        </div>

        <div class="fourth-section">
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>HSN/SAC</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        ${hasTax ? `
                        <th>Taxable Value (₹)</th>
                        <th>Tax Rate (%)</th> ` : ""}
                        <th>Total Price (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>
        </div>

        <div class="fifth-section">
            <div class="fifth-section-sub1">
                <div class="fifth-section-sub2">
                    <div>
                        <p><strong>Total Amount in Words: </strong><span id="totalInWords">${numberToWords(finalTotal)} Only</span></p>
                    </div>
                    <h3>Payment Details</h3>
                    <div class="bank-details">
                        <div class="QR-code bank-details-sub1">
                            <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/shresht%20systems%20payment%20QR-code.jpg"
                                alt="qr-code" />
                        </div>
                        <div class="bank-details-sub2">
                            <p><strong>Account Holder Name: </strong>Shresht Systems</p>
                            <p><strong>Bank Name: </strong>Canara Bank</p>
                            <p><strong>Branch Name: </strong>Shanthi Nagar Manipal</p>
                            <p><strong>Account No: </strong>120002152652</p>
                            <p><strong>IFSC Code: </strong>CNRB0010261</p>
                        </div>
                    </div>
                </div>
                <div class="totals-section">
                    ${totalsHTML}
                </div>
            </div>
        </div>

        <div class="sixth-section">
            <div class="declaration" contenteditable="true">
                <p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
            </div>
        </div>

        <div class="seventh-section">
            <div class="terms-section" contenteditable="true">
                <p><strong>Terms & Conditions:</strong></p>
                <p>1. Payment should be made within 15 days from the date of invoice.</p>
                <p>2. Interest @ 18% per annum will be charged for the delayed payment.</p>
                <p>3. Goods once sold will not be taken back.</p>
            </div>
        </div>

        <div class="eighth-section">
            <p>For SHRESHT SYSTEMS</p>
            <div class="eighth-section-space"></div>
            <p><strong>Authorized Signatory</strong></p>
        </div>

        <div class="ninth-section">
            <p>This is a computer-generated invoice.</p>
        </div>
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
document.getElementById("save-btn").addEventListener("click", async () => {
    const invoiceData = collectFormData();
    const ok = await sendToServer(invoiceData, false);
    if (ok) window.electronAPI.showAlert1("Invoice saved successfully!");
});

// Event listener for the "Print" button
document.getElementById("print-btn").addEventListener("click", async () => {
    generatePreview(); // Ensure preview is up to date
    setTimeout(async () => {
        const previewContent = document.getElementById("preview-content").innerHTML;
        if (window.electronAPI && window.electronAPI.handlePrintEvent) {
            const invoiceData = collectFormData();
            const ok = await sendToServer(invoiceData, true);
            if (ok) {
                window.electronAPI.handlePrintEvent(previewContent, "print");
            }
        } else {
            window.electronAPI.showAlert1("Print functionality is not available.");
        }
    }, 0);
});

// Event listener for the "Save as PDF" button
document.getElementById("save-pdf-btn").addEventListener("click", async () => {
    generatePreview();
    setTimeout(async () => {
        const previewContent = document.getElementById("preview-content").innerHTML;
        if (window.electronAPI && window.electronAPI.handlePrintEvent) {
            const invoiceData = collectFormData();
            const ok = await sendToServer(invoiceData, true);
            if (ok) {
                let name = `Invoice-${invoiceId}`;
                window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
            }
        } else {
            window.electronAPI.showAlert1("Print functionality is not available.");
        }
    }, 0);
});

// Function to collect form data
function collectFormData() {
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];
    const { finalTotal } = calculateInvoice(itemsTable);

    return {
        type: sessionStorage.getItem('update-invoice'),
        projectName: document.getElementById("project-name").value,
        invoiceId: document.getElementById("id").value,
        invoiceDate: document.getElementById("invoice-date").value,
        poNumber: document.getElementById("purchase-order-number").value,
        dcNumber: document.getElementById("delivery-challan-number").value,
        dcDate: document.getElementById("delivery-challan-date").value,
        serviceMonth: document.getElementById("service-months").value,
        wayBillNumber: document.getElementById("waybill-number").value,
        buyerName: document.getElementById("buyer-name").value,
        buyerAddress: document.getElementById("buyer-address").value,
        buyerPhone: document.getElementById("buyer-phone").value,
        buyerEmail: document.getElementById("buyer-email").value,
        consigneeName: document.getElementById("consignee-name").value,
        consigneeAddress: document.getElementById("consignee-address").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(1) input").value,
            HSN_SAC: row.querySelector("td:nth-child(2) input").value,
            quantity: row.querySelector("td:nth-child(3) input").value,
            unit_price: row.querySelector("td:nth-child(4) input").value,
            rate: row.querySelector("td:nth-child(5) input").value,
        })),
        totalAmountOriginal: totalAmountOriginal,
        totalAmountDuplicate: totalAmountDuplicate,
        totalTaxOriginal: totalTaxOriginal,
        totalTaxDuplicate: totalTaxDuplicate
    };
}


function payment(id) {
    invoiceId = id
    document.getElementById('view-preview').style.display = 'none';
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'none';
    document.getElementById('view').style.display = 'none';
    document.getElementById('payment-container').style.display = 'block';
}

document.getElementById('payment-btn').addEventListener('click', async () => {
    const paymentStatus = document.querySelector('input[name="payment-question"]:checked')?.value;
    const paidAmount = parseInt(document.getElementById("paid-amount").value);
    const paymentDate = document.getElementById("payment-date").value;
    const paymentMode = document.getElementById("payment-mode").value;

    const data = {
        invoiceId: invoiceId,
        paymentStatus: paymentStatus,
        paidAmount: paidAmount,
        paymentDate: paymentDate,
        paymentMode: paymentMode,
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
        }
    } catch (error) {
        console.error("Error:", error);
        window.electronAPI.showAlert1("Failed to connect to server.");
    }
});
