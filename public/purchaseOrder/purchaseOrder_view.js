// Generate the purchase order preview (for view block)
async function generatePurchaseOrderViewPreview(purchaseOrder) {
    let itemsHTML = "";
    let totalTaxableValue = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTax = 0;
    let totalPrice = 0;
    let sno = 0;

    // Format the date before using it in template
    const formattedDate = await formatDate(purchaseOrder.purchase_date);

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
                    <td>${++sno}</td>
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
                    <td>${++sno}</td>
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${formatIndian(rowTotal, 2)}</td>
                </tr>
            `;
        }
    });

    let totalsHTML = `
        <div style="display: flex; width: 100%;">
            <div class="totals-section-sub1" style="width: 50%;">
                ${hasTax ? `
                <p>Taxable Value:</p>
                <p>Total CGST:</p>
                <p>Total SGST:</p>` : ""}
                <p>Grand Total:</p>
            </div>
            <div class="totals-section-sub2" style="width: 50%;">
                ${hasTax ? `
                <p>₹ ${formatIndian(totalTaxableValue, 2)}</p>
                <p>₹ ${formatIndian(totalCGST, 2)}</p>
                <p>₹ ${formatIndian(totalSGST, 2)}</p>` : ""}
                <p>₹ ${formatIndian(totalPrice, 2)}</p>
            </div>
        </div>
    `;

    // Split items into rows for pagination
    const itemRows = itemsHTML.split('</tr>').filter(row => row.trim().length > 0).map(row => row + '</tr>');
    
    const ITEMS_PER_PAGE = 15;
    const SUMMARY_SECTION_ROW_COUNT = 8;
    
    const itemPages = [];
    let currentPageItemsHTML = '';
    let currentPageRowCount = 0;

    itemRows.forEach((row, index) => {
        const isLastItem = index === itemRows.length - 1;
        const itemSpace = 1;
        const requiredSpaceForLastItem = itemSpace + SUMMARY_SECTION_ROW_COUNT;

        if (currentPageRowCount > 0 &&
            ((!isLastItem && currentPageRowCount + itemSpace > ITEMS_PER_PAGE) ||
                (isLastItem && currentPageRowCount + requiredSpaceForLastItem > ITEMS_PER_PAGE))) {
            itemPages.push(currentPageItemsHTML);
            currentPageItemsHTML = '';
            currentPageRowCount = 0;
        }

        currentPageItemsHTML += row;
        currentPageRowCount += itemSpace;
    });

    if (currentPageItemsHTML !== '') {
        itemPages.push(currentPageItemsHTML);
    }

    // Generate pages
    const pagesHTML = itemPages.map((pageHTML, index) => {
        const isLastPage = index === itemPages.length - 1;
        return `
    <div class="preview-container doc-standard doc-purchase-order doc-quotation">
        <div class="header">
        <div class="quotation-brand">
            <div class="logo">
                <img src="../assets/icon.png" alt="Shresht Logo">
            </div>
            <div class="quotation-brand-text">
                <h1>SHRESHT SYSTEMS</h1>
                <p class="quotation-tagline">CCTV & Security Solutions</p>
            </div>
        </div>
        <div class="company-details">
            <p>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</p>
            <p>Ph: 7204657707 / 9901730305</p>
            <p>GSTIN: 29AGCPN4093N1ZS</p>
            <p>Email: shreshtsystems@gmail.com</p>
            <p>Website: www.shreshtsystems.com</p>
        </div>
    </div>

        <div class="second-section">
            <p>Purchase Order-${purchaseOrder.purchase_order_id || purchaseOrder.Id || ""}</p>
        </div>

        ${index === 0 ? `
        <div class="third-section">
            <div class="buyer-details">
                <p><strong>Purchase From:</strong></p>
                <p>${purchaseOrder.supplier_name || ""}</p>
                <p>${purchaseOrder.supplier_address || ""}</p>
                <p>Ph: ${purchaseOrder.supplier_phone || ""}</p>
                <p>GSTIN: ${purchaseOrder.supplier_GSTIN || ""}</p>
            </div>
            <div class="info-section">
                <p><strong>Purchase Invoice ID:</strong> ${purchaseOrder.purchase_invoice_id || ""}</p>
                <p><strong>Date:</strong> ${formattedDate || new Date().toLocaleDateString()}</p>
            </div>
        </div>
        ` : ''}

        <div class="fourth-section">
        <table>
        <thead>
            <tr>
                <th>S.No</th>
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
            ${pageHTML}
        </tbody>
        </table>
        </div>

        ${!isLastPage ? `<div class="continuation-text" style="text-align: center; margin: 20px 0; font-style: italic; color: #666;">Continued on next page...</div>` : ''}

        ${isLastPage ? `
        <div class="fifth-section">
            <div class="fifth-section-sub1">
                <div class="fifth-section-sub2">
                    <div class="fifth-section-sub3">
                        <p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p>
                        <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(purchaseOrder.total_amount || totalPrice)} Only</span></p>
                    </div>
                    <h3>Payment Details</h3>
                    <div class="bank-details">
                        <div class="QR-code bank-details-sub1">
                            <img src="../assets/shresht-systems-payment-QR-code.jpg"
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
            <div class="declaration">
                <p>We declare that this purchase order shows the actual price of the goods described and that all particulars are true and correct.</p>
            </div>
        </div>

        <div class="seventh-section">
            <div class="terms-section">
                <h4>Terms & Conditions:</h4>
                <p>1. Goods should be delivered within the stipulated time period.</p>
                <p>2. Quality of goods should match the specifications mentioned.</p>
                <p>3. Payment terms as per mutual agreement.</p>
            </div>
        </div>

        <div class="eighth-section">
            <p>For SHRESHT SYSTEMS</p>
            <div class="eighth-section-space"></div>
            <p><strong>Authorized Signatory</strong></p>
        </div>
        ` : ''}

        <div class="ninth-section">
            <p>This is a computer-generated purchase order.</p>
        </div>
    </div>
    `;
    }).join('');

    document.getElementById("view-preview-content").innerHTML = pagesHTML;
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
        document.getElementById('view').style.display = 'block';

        // Fill Supplier Details
        document.getElementById('view-purchase-invoice-iD').textContent = purchaseOrder.purchase_invoice_id || '-';
        document.getElementById('view-purchase-date').textContent = await formatDate(purchaseOrder.purchase_date) || '-';
        document.getElementById('view-supplier-name').textContent = purchaseOrder.supplier_name || '-';
        document.getElementById('view-supplier-address').textContent = purchaseOrder.supplier_address || '-';
        document.getElementById('view-supplier-phone').textContent = purchaseOrder.supplier_phone || '-';
        document.getElementById('view-supplier-email').textContent = purchaseOrder.supplier_email || '-';
        document.getElementById('view-buyerGSTIN').textContent = purchaseOrder.supplier_GSTIN || '-';

        // Fill Item List
        const viewItemsTableBody = document.querySelector("#view-items-table tbody");
        viewItemsTableBody.innerHTML = "";
        let sno = 0;

        (purchaseOrder.items || []).forEach(item => {
            const row = document.createElement("tr");
            row.className = "border-b border-gray-200 hover:bg-gray-50";
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-700">${++sno}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${item.description || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${item.specification || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${item.HSN_SAC || item.hsn_sac || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${item.quantity || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">₹ ${formatIndian(item.unit_price, 2) || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${item.rate || '-'}%</td>
            `;
            viewItemsTableBody.appendChild(row);
        });

        // Calculate and set totals (professional 3-box layout)
        let subtotal = 0;
        let totalTax = 0;
        
        (purchaseOrder.items || []).forEach(item => {
            const qty = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
            const rate = parseFloat(item.rate || 0);
            const taxableValue = qty * unitPrice;
            const cgst = (taxableValue * rate / 2) / 100;
            const sgst = (taxableValue * rate / 2) / 100;
            
            subtotal += taxableValue;
            totalTax += (cgst + sgst);
        });
        
        const grandTotal = subtotal + totalTax;
        
        document.getElementById('view-subtotal').textContent = `₹ ${formatIndian(subtotal, 2)}`;
        document.getElementById('view-tax').textContent = totalTax > 0 ? `₹ ${formatIndian(totalTax, 2)}` : 'No Tax';
        document.getElementById('view-grand-total').textContent = `₹ ${formatIndian(grandTotal, 2)}`;

        // Generate the preview for print/PDF
        await generatePurchaseOrderViewPreview(purchaseOrder);

    } catch (error) {
        console.error("Error fetching purchase order:", error);
        window.electronAPI?.showAlert1("Failed to fetch purchase order. Please try again later.");
    }
}

// NOTE: formatDate has been moved to public/js/shared/utils.js
// It is now available globally via window.formatDate
