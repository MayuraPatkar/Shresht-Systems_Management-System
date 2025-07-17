function calculateInvoice(itemsTable) {
    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;
    let itemsHTML = "";

    // Check if rate column is populated
    let hasTax = Array.from(itemsTable.rows).some(row => {
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

function generateInvoicePreview(invoice = {}, userRole, type,) {
    let itemsHTML = "";
    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;
    let totalTax = 0;
    let hasTax = false;
    let items = []

    if (type == 'original') {
        items = invoice.items_original;
    } else {
        items = invoice.items_duplicate;
    }

    if (items.length > 0) {
        hasTax = items.some(item => parseFloat(item.rate || 0) > 0);
        items.forEach(item => {
            const description = item.description || "-";
            const hsnSac = item.HSN_SAC || "-";
            const qty = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
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
            document.getElementById("detail-preview-content").innerHTML = "<p>No items to preview.</p>";
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

    let totalsHTML = ` 
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
        </div>`;

    document.getElementById("view-preview-content").innerHTML = `
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
            <p>INVOICE-${invoice.invoice_id}</p>
        </div>

        <div class="third-section">
            <div class="buyer-details">
                <p><strong>Bill To:</strong></p>
                <p>${invoice.customer_name}</p>
                <p>${invoice.customer_address}</p>
                <p>Ph. ${invoice.customer_phone}</p>
            </div>
            <div class="info-section">
                <p><strong>Project:</strong> ${invoice.project_name}</p>
                <p><strong>P.O No:</strong> ${invoice.po_Number}</p>
                <p><strong>D.C No:</strong> ${invoice.po_Number}</p>
                <p><strong>E-Way Bill:</strong> ${invoice.waybill_number}</p>
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
                    <div class="bank-details">
                        <div class="QR-code bank-details-sub1">
                            <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/shresht%20systems%20payment%20QR-code.jpg"
                                alt="qr-code" />
                        </div>
                        <div class="bank-details-sub2">
                            <h4>Payment Details</h4>
                            <p><strong>Bank Name: </strong>Canara Bank</p>
                            <p><strong>Branch Name: </strong>ShanthiNagar Manipal</p>
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

async function viewInvoice(invoiceId, userRole) {
    try {
        const type = sessionStorage.getItem('view-invoice');
        const response = await fetch(`/invoice/${invoiceId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch invoice");
        }

        const data = await response.json();
        const invoice = data.invoice;

        // Hide other sections, show view section
        document.getElementById('view-preview').style.display = 'none';
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'none';
        document.getElementById('view').style.display = 'flex';

        // Fill Project Details
        document.getElementById('view-project-name').textContent = invoice.project_name || '-';
        document.getElementById('view-project-id').textContent = invoice.invoice_id || '-';
        document.getElementById('view-purchase-order-number').textContent = invoice.po_number || '-';
        document.getElementById('view-delivery-challan-number').textContent = invoice.dc_number || '-';
        document.getElementById('view-delivery-challan-date').textContent = invoice.dc_date ? formatDate(invoice.dc_date) : '-';
        document.getElementById('view-waybill-number').textContent = invoice.Waybill_id || '-';
        document.getElementById('view-service-months').textContent = invoice.service_month || '-';

        document.getElementById('view-payment-status').textContent = invoice.payment_status || '-';
        document.getElementById('view-balance-due').textContent = invoice.balance_due || '-';
        // document.getElementById('view-advance-pay').textContent = Array.isArray(invoice?.paid_amount) ? invoice.paid_amount.join(', ') : (invoice.advancedPay || '-');
        // document.getElementById('view-paid-amount').textContent = invoice.paid_amount || '-';
        document.getElementById('view-payment-mode').textContent = invoice.payment_mode || '-';
        document.getElementById('view-payment-date').textContent = invoice.payment_date ? formatDate(invoice.payment_date) : '-';

        // Buyer & Consignee
        document.getElementById('view-buyer-name').textContent = invoice.customer_name || '-';
        document.getElementById('view-buyer-address').textContent = invoice.customer_address || '-';
        document.getElementById('view-buyer-phone').textContent = invoice.customer_phone || '-';
        document.getElementById('view-buyer-email').textContent = invoice.customer_email || '-';
        document.getElementById('view-consignee-name').textContent = invoice.consignee_name || '-';
        document.getElementById('view-consignee-address').textContent = invoice.consignee_address || '-';
        // document.getElementById('view-total-amount').textContent = `₹ ${formatIndian(invoice.total_amount_tax, 2)}` || '-';
        // document.getElementById('view-total-tax').textContent = `₹ ${formatIndian(invoice.total_amount_tax, 2)}` || '-';
        // document.getElementById('view-total-with-tax').textContent = `₹ ${formatIndian(invoice.total_amount_tax, 2)}` || '-';
        // document.getElementById('view-total-without-tax').textContent = `₹ ${formatIndian(invoice.total_amount_tax, 2)}` || '-';

        // Item List
        const detailItemsTableBody = document.querySelector("#view-items-table tbody");
        detailItemsTableBody.innerHTML = "";
        if (type === 'original') {
            (invoice.items_original || []).forEach(item => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${item.description || ''}</td>
                    <td>${item.HSN_SAC || ''}</td>
                    <td>${item.quantity || ''}</td>
                    <td>${formatIndian(item.unit_price, 2) || ''}</td>
                    <td>${item.rate ? item.rate + '%' : ''}</td>
                `;
                detailItemsTableBody.appendChild(row);
            });
        }
        else {
            (invoice.items_duplicate || []).forEach(item => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${item.description || ''}</td>
                    <td>${item.HSN_SAC || ''}</td>
                    <td>${item.quantity || ''}</td>
                    <td>${formatIndian(item.unit_price, 2) || ''}</td>
                    <td>${item.rate ? item.rate + '%' : ''}</td>
                `;
                detailItemsTableBody.appendChild(row);
            });
        }


        generateInvoicePreview(invoice, userRole, type);

        // Print and Save as PDF handlers
        document.getElementById('printProject').onclick = () => {
            const previewContent = document.getElementById("view-preview-content").innerHTML;
            if (window.electronAPI && window.electronAPI.handlePrintEvent) {
                window.electronAPI.handlePrintEvent(previewContent, "print");
            } else {
                window.electronAPI.showAlert1("Print functionality is not available.");
            }
        };
        document.getElementById('saveProjectPDF').onclick = () => {
            const previewContent = document.getElementById("view-preview-content").innerHTML;
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

// // Expose viewInvoice globally for use in other scripts
window.viewInvoice = viewInvoice;