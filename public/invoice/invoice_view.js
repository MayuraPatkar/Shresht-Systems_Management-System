// NOTE: calculateInvoice function has been moved to public/js/shared/calculations.js
// It is now available globally via window.calculateInvoice

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
        let sno = 1;
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
                        <td>${sno++}</td>
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
                        <td>${sno++}</td>
                        <td>${description}</td>
                        <td>${hsnSac}</td>
                        <td>${qty}</td>
                        <td>${formatIndian(unitPrice, 2)}</td>
                        <td>${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            }
        });

        // Process non_items based on type
        let non_items = [];
        if (type == 'original') {
            non_items = invoice.non_items_original || [];
        } else {
            non_items = invoice.non_items_duplicate || [];
        }

        non_items.forEach(item => {
            const description = item.description || "-";
            const price = parseFloat(item.price || 0);
            const rate = parseFloat(item.rate || 0);

            totalTaxableValue += price;

            if (hasTax) {
                const cgstPercent = rate / 2;
                const sgstPercent = rate / 2;
                const cgstValue = (price * cgstPercent) / 100;
                const sgstValue = (price * sgstPercent) / 100;
                const rowTotal = price + cgstValue + sgstValue;

                totalCGST += cgstValue;
                totalSGST += sgstValue;
                totalPrice += rowTotal;
                totalTax += cgstValue + sgstValue;

                itemsHTML += `
                    <tr>
                        <td>${sno++}</td>
                        <td>${description}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>${formatIndian(price, 2)}</td>
                        <td>${formatIndian(price, 2)}</td>
                        <td>${rate.toFixed(2)}</td>
                        <td>${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            } else {
                const rowTotal = price;
                totalPrice += rowTotal;

                itemsHTML += `
                    <tr>
                        <td>${sno++}</td>
                        <td>${description}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>${formatIndian(price, 2)}</td>
                        <td>${formatIndian(rowTotal, 2)}</td>
                    </tr>
                `;
            }
        });
    } else {
        // Fallback to DOM table (edit mode)
        const itemsTable = document.getElementById("detail-items-table")?.getElementsByTagName("tbody")[0];
        if (!itemsTable) {
            document.getElementById("view-preview-content").innerHTML = "<p>No items to preview.</p>";
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
                <p>₹ ${formatIndian(finalTotal, 2)}</p>
            </div>
        </div>`;

    // Split items into rows for pagination
    const itemRows = itemsHTML.split('</tr>').filter(row => row.trim().length > 0).map(row => row + '</tr>');
    
    const ITEMS_PER_PAGE = 15;
    const SUMMARY_SECTION_ROW_COUNT = 8;
    
    const itemPages = [];
    let currentPageItemsHTML = '';
    let currentPageRowCount = 0;

    itemRows.forEach((row, index) => {
        const isLastItem = index === itemRows.length - 1;
        const itemSpace = 1; // Each row takes 1 line
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
        <div class="preview-container doc-standard doc-invoice doc-quotation">
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
                <p>INVOICE-${invoice.invoice_id}</p>
            </div>
            ${index === 0 ? `
            <div class="third-section">
                <div class="buyer-details">
                    <p><strong>Bill To:</strong></p>
                    <p>${invoice.customer_name}</p>
                    <p>${invoice.customer_address}</p>
                    <p>Ph. ${invoice.customer_phone}</p>
                </div>
                <div class="order-info">
                    <p><strong>Project:</strong> ${invoice.project_name}</p>
                    <p><strong>P.O No:</strong> ${invoice.po_number}</p>
                    <p><strong>D.C No:</strong> ${invoice.dc_number}</p>
                    <p><strong>E-Way Bill:</strong> ${invoice.Waybill_id}</p>
                </div>
            </div>
            ` : ''}

            <div class="fourth-section">
                <table>
                    <thead>
                        <tr>
                            <th>Sr. No.</th>
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
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(finalTotal)} Only.</span></p>
                        </div>
                        <h3>Payment Details:</h3>
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
                <div class="declaration" contenteditable="true">
                    <p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
                </div>
            </div>

            <div class="seventh-section">
                <div class="terms-section" contenteditable="true">
                    <h3>Terms & Conditions:</h3>
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
            ` : ''}

            <div class="ninth-section">
                <p>This is a computer-generated invoice.</p>
            </div>
        </div>
        `;
    }).join('');

    document.getElementById("view-preview-content").innerHTML = pagesHTML;
}

async function viewInvoice(invoiceId, userRole) {
    try {
        // Ensure userRole is set, default to 'user' if not provided
        if (!userRole) {
            userRole = sessionStorage.getItem('userRole') || 'user';
        }
        
        const type = sessionStorage.getItem('view-invoice') || 'duplicate';
        const response = await fetch(`/invoice/${invoiceId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch invoice");
        }

        const data = await response.json();
        const invoice = data.invoice;
        let sno = 0;


        // Hide other sections, show view section
        document.getElementById('view-preview').style.display = 'none';
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'none';
        document.getElementById('view').style.display = 'flex';

        // Fill Project Details
        document.getElementById('view-project-name').textContent = invoice.project_name || '-';
        document.getElementById('view-project-id').textContent = invoice.invoice_id || '-';
        document.getElementById('view-quotation-id').textContent = invoice.quotation_id || '-';
        document.getElementById('view-invoice-date').textContent = invoice.invoice_date ? await formatDate(invoice.invoice_date) : '-';
        document.getElementById('view-purchase-order-number').textContent = (invoice.po_number && invoice.po_number !== 'undefined') ? invoice.po_number : '-';
        document.getElementById('view-purchase-order-date').textContent = invoice.po_date ? await formatDate(invoice.po_date) : '-';
        document.getElementById('view-delivery-challan-number').textContent = (invoice.dc_number && invoice.dc_number !== 'undefined') ? invoice.dc_number : '-';
        document.getElementById('view-delivery-challan-date').textContent = invoice.dc_date ? await formatDate(invoice.dc_date) : '-';
        document.getElementById('view-waybill-number').textContent = invoice.Waybill_id || '-';
        document.getElementById('view-service-months').textContent = (invoice.service_month !== undefined && invoice.service_month !== null) ? invoice.service_month : '-';
        document.getElementById('view-service-stage').textContent = (invoice.service_stage !== undefined && invoice.service_stage !== null) ? invoice.service_stage : '-';
        document.getElementById('view-margin').textContent = (invoice.margin !== undefined && invoice.margin !== null && invoice.margin !== 0) ? `${invoice.margin}%` : '-';

        document.getElementById('view-payment-status').textContent = invoice.payment_status || '-';
        const viewPreview = document.getElementById('view-preview');
        const home = document.getElementById('home');
        const newSection = document.getElementById('new');
        const view = document.getElementById('view');
        
        if (viewPreview) viewPreview.style.display = 'none';
        if (home) home.style.display = 'none';
        if (newSection) newSection.style.display = 'none';
        if (view) view.style.display = 'flex';

        // Fill Project Details with null checks
        const setTextContent = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value || '-';
        };

        setTextContent('view-project-name', invoice.project_name);
        setTextContent('view-project-id', invoice.invoice_id);
        setTextContent('view-purchase-order-number', invoice.po_number);
        setTextContent('view-delivery-challan-number', invoice.dc_number);
        setTextContent('view-delivery-challan-date', invoice.dc_date ? await formatDate(invoice.dc_date) : null);
        setTextContent('view-waybill-number', invoice.Waybill_id);
        setTextContent('view-service-months', invoice.service_month);
        setTextContent('view-payment-status', invoice.payment_status);
        
        // Show/hide service history button based on service_month
        const serviceHistoryBtn = document.getElementById('view-invoice-service-history-btn');
        if (serviceHistoryBtn) {
            if (invoice.service_month && invoice.service_month > 0) {
                serviceHistoryBtn.style.display = 'flex';
                serviceHistoryBtn.onclick = () => {
                    navigateTo(`/service?history=${invoice.invoice_id}`);
                };
            } else {
                serviceHistoryBtn.style.display = 'none';
            }
        }
        
        const balanceDue = (invoice.total_amount_duplicate || 0) - (invoice.total_paid_amount || 0);
        setTextContent('view-balance-due', `₹ ${formatIndian(balanceDue, 2)}`);

        // Buyer & Consignee
        setTextContent('view-buyer-name', invoice.customer_name);
        setTextContent('view-buyer-address', invoice.customer_address);
        setTextContent('view-buyer-phone', invoice.customer_phone);
        setTextContent('view-buyer-email', invoice.customer_email);
        setTextContent('view-consignee-name', invoice.consignee_name);
        setTextContent('view-consignee-address', invoice.consignee_address);
        
        // Set the totals for the view section (professional 3-box layout)
        if (userRole == 'admin' && type == 'original') {
            const subtotal = invoice.total_amount_original - invoice.total_tax_original;
            const tax = invoice.total_tax_original;
            const grandTotal = invoice.total_amount_original;
            
            setTextContent('view-subtotal', `₹ ${formatIndian(subtotal, 2)}`);
            setTextContent('view-tax', tax > 0 ? `₹ ${formatIndian(tax, 2)}` : 'No Tax');
            setTextContent('view-grand-total', `₹ ${formatIndian(grandTotal, 2)}`);
        } else {
            const subtotal = invoice.total_amount_duplicate - invoice.total_tax_duplicate;
            const tax = invoice.total_tax_duplicate;
            const grandTotal = invoice.total_amount_duplicate;
            
            setTextContent('view-subtotal', `₹ ${formatIndian(subtotal, 2)}`);
            setTextContent('view-tax', tax > 0 ? `₹ ${formatIndian(tax, 2)}` : 'No Tax');
            setTextContent('view-grand-total', `₹ ${formatIndian(grandTotal, 2)}`);
        }

        // Payment History
        const detailPaymentsTableBody = document.querySelector("#view-payment-table tbody");
        detailPaymentsTableBody.innerHTML = "";
        for (const item of (invoice.payments || [])) {
            const row = document.createElement("tr");
            row.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
            row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-900">${await formatDate(item.payment_date) || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.payment_mode || '-'}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-blue-600">₹ ${formatIndian(item.paid_amount, 2) || '-'}</td>
                `;
            detailPaymentsTableBody.appendChild(row);
        }


        // Item List
        const detailItemsTableBody = document.querySelector("#view-items-table tbody");
        if (detailItemsTableBody) {
            detailItemsTableBody.innerHTML = "";
            if (type === 'original') {
                (invoice.items_original || []).forEach(item => {
                    const row = document.createElement("tr");
                    row.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
                    row.innerHTML = `
                        <td class="px-4 py-3 text-sm text-gray-700">${++sno}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.description || ''}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.HSN_SAC || ''}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.quantity || ''}</td>
                        <td class="px-4 py-3 text-sm font-semibold text-blue-600">₹ ${formatIndian(item.unit_price, 2) || ''}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.rate ? item.rate + '%' : ''}</td>
                    `;
                    detailItemsTableBody.appendChild(row);
                });
            }
            else {
                (invoice.items_duplicate || []).forEach(item => {
                    const row = document.createElement("tr");
                    row.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
                    row.innerHTML = `
                        <td class="px-4 py-3 text-sm text-gray-700">${++sno}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.description || ''}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.HSN_SAC || ''}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.quantity || ''}</td>
                        <td class="px-4 py-3 text-sm font-semibold text-blue-600">₹ ${formatIndian(item.unit_price, 2) || ''}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.rate ? item.rate + '%' : ''}</td>
                    `;
                    detailItemsTableBody.appendChild(row);
                });
            }
        }

        // Item List
        const detailNonItemsTableBody = document.querySelector("#view-non-items-table tbody");
        if (detailNonItemsTableBody) {
            detailNonItemsTableBody.innerHTML = "";
            if (type === 'original') {
                (invoice.non_items_original || []).forEach(item => {
                    const row = document.createElement("tr");
                    row.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
                    row.innerHTML = `
                        <td class="px-4 py-3 text-sm text-gray-700">${++sno}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.description || ''}</td>
                        <td class="px-4 py-3 text-sm font-semibold text-blue-600">₹ ${formatIndian(item.price, 2) || ''}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.rate ? item.rate + '%' : ''}</td>
                    `;
                    detailNonItemsTableBody.appendChild(row);
                });
            }
            else {
                (invoice.non_items_duplicate || []).forEach(item => {
                    const row = document.createElement("tr");
                    row.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
                    row.innerHTML = `
                        <td class="px-4 py-3 text-sm text-gray-700">${++sno}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.description || ''}</td>
                        <td class="px-4 py-3 text-sm font-semibold text-blue-600">₹ ${formatIndian(item.price, 2) || ''}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.rate ? item.rate + '%' : ''}</td>
                    `;
                    detailNonItemsTableBody.appendChild(row);
                });
            }
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