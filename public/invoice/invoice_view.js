// NOTE: calculateInvoice function has been moved to public/js/shared/calculations.js
// It is now available globally via window.calculateInvoice

// ====== View Type Switching State ======
let cachedInvoice = null;
let cachedUserRole = null;
let currentInvoiceViewType = 'duplicate'; // Default: Duplicate (without tax)

/**
 * Parse view type into docType and showTax
 * @param {string} viewType - 'duplicate', 'duplicate-tax', 'original', 'original-tax'
 * @returns {{ docType: string, showTax: boolean }}
 */
function parseViewType(viewType) {
    const showTax = viewType.endsWith('-tax');
    const docType = showTax ? viewType.replace('-tax', '') : viewType;
    return { docType, showTax };
}

/**
 * Update active tab styling - segmented control style
 */
function updateInvoiceViewTypeTabs(activeViewType) {
    const tabs = document.querySelectorAll('#view-type-tabs .view-type-tab');
    tabs.forEach(tab => {
        const viewType = tab.dataset.viewType;
        if (viewType === activeViewType) {
            // Active state - primary blue with shadow
            tab.classList.add('active', 'bg-blue-600', 'text-white', 'shadow-sm');
            tab.classList.remove('text-gray-500');
        } else {
            // Inactive state - transparent with gray text
            tab.classList.remove('active', 'bg-blue-600', 'text-white', 'shadow-sm');
            tab.classList.add('text-gray-500');
        }
    });
    currentInvoiceViewType = activeViewType;
    // Store both parts in session for compatibility
    const { docType } = parseViewType(activeViewType);
    sessionStorage.setItem('view-invoice', docType);
    sessionStorage.setItem('view-invoice-full', activeViewType);
}

/**
 * Initialize view type tab click handlers
 */
function initInvoiceViewTypeTabs() {
    const tabs = document.querySelectorAll('#view-type-tabs .view-type-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            const viewType = tab.dataset.viewType;
            if (viewType === currentInvoiceViewType) return; // Already active

            updateInvoiceViewTypeTabs(viewType);

            // Re-render with cached invoice data
            if (cachedInvoice && cachedUserRole) {
                await renderInvoiceView(cachedInvoice, cachedUserRole, viewType);
            }
        });
    });
}

// Initialize tabs when DOM is ready
document.addEventListener('DOMContentLoaded', initInvoiceViewTypeTabs);

async function generateInvoicePreview(invoice = {}, userRole, type, showTax = false) {
    // Fetch company info for dynamic header/footer/bank details
    const company = window.companyConfig ? await window.companyConfig.getCompanyInfo() : null;
    const companyName = company?.company?.toUpperCase() || 'COMPANY NAME';
    const companyAddress = company?.address || 'Company Address';
    const companyPhone = company?.phone ? `${company.phone.ph1}${company.phone.ph2 ? ' / ' + company.phone.ph2 : ''}` : '';
    const companyGSTIN = company?.GSTIN || '';
    const companyEmail = company?.email || '';
    const companyWebsite = company?.website || '';
    const bankDetails = company?.bank_details || {};

    let itemsHTML = "";
    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    // Non-items totals for preview
    let nonItemsTaxableValue = 0;
    let nonItemsCGST = 0;
    let nonItemsSGST = 0;
    let nonItemsTotalPrice = 0;
    let totalTaxableValue = 0;
    let totalTax = 0;
    // Use showTax parameter instead of deriving from data
    let hasTax = showTax;
    let items = []

    if (type == 'original') {
        items = invoice.items_original;
    } else {
        items = invoice.items_duplicate;
    }

    if (items.length > 0) {
        let sno = 1;
        // hasTax is now controlled by showTax parameter
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
            nonItemsTaxableValue += price;

            if (hasTax) {
                const cgstPercent = rate / 2;
                const sgstPercent = rate / 2;
                const cgstValue = (price * cgstPercent) / 100;
                const sgstValue = (price * sgstPercent) / 100;
                const rowTotal = price + cgstValue + sgstValue;

                totalCGST += cgstValue;
                totalSGST += sgstValue;
                nonItemsCGST += cgstValue;
                nonItemsSGST += sgstValue;
                totalPrice += rowTotal;
                nonItemsTotalPrice += rowTotal;
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
                nonItemsTotalPrice += rowTotal;

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
        const itemsTableElement = document.getElementById("detail-items-table") || document.getElementById("items-table") || document.getElementById("view-items-table");
        const itemsTable = itemsTableElement?.getElementsByTagName("tbody")[0];
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
    const roundedGrandTotal = Math.round(grandTotal);
    const roundOff = roundedGrandTotal - grandTotal;
    const finalTotal = roundedGrandTotal;

    const hasTaxSection = hasTax ? `
                <p>Taxable Value:</p>
                <p>Total CGST:</p>
                <p>Total SGST:</p>
    ` : ``;
    const hasTaxValues = hasTax ? `
                <p>₹ ${formatIndian(totalTaxableValue, 2)}</p>
                <p>₹ ${formatIndian(totalCGST, 2)}</p>
                <p>₹ ${formatIndian(totalSGST, 2)}</p>
    ` : ``;
    // We do not write non-items totals in the preview totals section.
    const nonItemsSection = '';
    const nonItemsValues = '';

    let totalsHTML = `
        <div style="display: flex; width: 100%;">
            <div class="totals-section-sub1" style="width: 50%;">
                ${hasTaxSection}
                ${nonItemsSection}
                <p>Grand Total:</p>
            </div>
            <div class="totals-section-sub2" style="width: 50%;">
                ${hasTaxValues}
                ${nonItemsValues}
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
                        <img src="../assets/icon.png" alt="${companyName} Logo">
                    </div>
                    <div class="quotation-brand-text">
                        <h1>${companyName}</h1>
                        <p class="quotation-tagline">CCTV & Energy Solutions</p>
                    </div>
                </div>
                <div class="company-details">
                    <p>${companyAddress}</p>
                    <p>Ph: ${companyPhone}</p>
                    <p>GSTIN: ${companyGSTIN}</p>
                    <p>Email: ${companyEmail}</p>
                    <p>Website: ${companyWebsite}</p>
                </div>
            </div>

            <div class="second-section">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <p>INVOICE-${invoice.invoice_id}</p>
                    <p><strong>Date: </strong>${window.formatDate ? window.formatDate(invoice.invoice_date) : (invoice.invoice_date || '-')}</p>
                </div>
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
                                <p><strong>Account Holder Name: </strong>${bankDetails.name || companyName}</p>
                                <p><strong>Bank Name: </strong>${bankDetails.bank_name || ''}</p>
                                <p><strong>Branch Name: </strong>${bankDetails.branch || ''}</p>
                                <p><strong>Account No: </strong>${bankDetails.accountNo || ''}</p>
                                <p><strong>IFSC Code: </strong>${bankDetails.IFSC_code || ''}</p>
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
                    ${invoice.declaration ? invoice.declaration : `<p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>`}
                </div>
            </div>

            <div class="seventh-section">
                <div class="terms-section">
                    ${invoice.termsAndConditions ? invoice.termsAndConditions : `
                    <h3>Terms & Conditions:</h3>
                    <p>1. Payment should be made within 15 days from the date of invoice.</p>
                    <p>2. Interest @ 18% per annum will be charged for the delayed payment.</p>
                    <p>3. Goods once sold will not be taken back.</p>`}
                </div>
            </div>

            <div class="eighth-section">
                <p>For ${companyName}</p>
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

/**
 * Render the invoice view with the given data and view type
 * Separated from fetching to allow tab switching without re-fetching
 * @param {object} invoice - Invoice data
 * @param {string} userRole - User role
 * @param {string} viewType - 'duplicate', 'duplicate-tax', 'original', 'original-tax'
 */
async function renderInvoiceView(invoice, userRole, viewType) {
    // Parse viewType to get docType and showTax
    const { docType, showTax } = parseViewType(viewType);

    const invoiceIdLocal = invoice?.invoice_id;
    let sno = 0;
    // Prepare items and non-items based on docType (original or duplicate)
    const itemsForType = (docType === 'original') ? (invoice.items_original || []) : (invoice.items_duplicate || []);
    const nonItemsForType = (docType === 'original') ? (invoice.non_items_original || []) : (invoice.non_items_duplicate || []);
    let view_totalTaxable = 0;
    let view_totalCGST = 0;
    let view_totalSGST = 0;
    let view_grandTotal = 0;
    // Non-items breakdown
    let view_nonItemsTaxable = 0;
    let view_nonItemsCGST = 0;
    let view_nonItemsSGST = 0;
    let view_nonItemsGrandTotal = 0;

    // Fill Project Details with null checks
    const setTextContent = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || '-';
    };

    setTextContent('view-project-name', invoice.project_name);
    setTextContent('view-project-id', invoice.invoice_id);
    setTextContent('view-quotation-id', invoice.quotation_id);
    setTextContent('view-invoice-date', invoice.invoice_date ? formatDateIndian(invoice.invoice_date) : null);
    setTextContent('view-purchase-order-number', (invoice.po_number && invoice.po_number !== 'undefined') ? invoice.po_number : null);
    setTextContent('view-purchase-order-date', invoice.po_date ? formatDateIndian(invoice.po_date) : null);
    setTextContent('view-delivery-challan-number', (invoice.dc_number && invoice.dc_number !== 'undefined') ? invoice.dc_number : null);
    setTextContent('view-delivery-challan-date', invoice.dc_date ? formatDateIndian(invoice.dc_date) : null);
    setTextContent('view-waybill-number', invoice.Waybill_id);
    setTextContent('view-service-months', (invoice.service_month) ? invoice.service_month :'0');
    setTextContent('view-service-stage', (invoice.service_stage) ? invoice.service_stage : 'No Service');
    setTextContent('view-margin', (invoice.margin !== undefined && invoice.margin !== null && invoice.margin !== 0) ? `${invoice.margin}%` : null);
    setTextContent('view-payment-status', invoice.payment_status);



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
    // We'll prefer explicit totals from the invoice if present (and > 0), otherwise compute from items/non-items
    let viewSubtotal = 0;
    let viewTax = 0;
    let viewGrandTotal = 0;

    // Helper to compute totals from items and non-items
    const computeTotalsFromItems = (itemsList, nonItemsList) => {
        let subtotal = 0;
        let tax = 0;
        for (const it of itemsList || []) {
            const qty = Number(it.quantity || 0);
            const unit = Number(it.unit_price || 0);
            const rate = Number(it.rate || 0);
            const taxable = qty * unit;
            const taxVal = taxable * (rate / 100);
            subtotal += taxable;
            tax += taxVal;
        }
        for (const nit of nonItemsList || []) {
            const price = Number(nit.price || 0);
            const rate = Number(nit.rate || 0);
            const taxVal = price * (rate / 100);
            subtotal += price;
            tax += taxVal;
        }
        const grand = subtotal + tax;
        return { subtotal, tax, grand };
    };

    if (docType === 'original') {
        const givenTotal = Number(invoice.total_amount_original || 0);
        const givenTax = Number(invoice.total_tax_original || 0);
        if (givenTotal > 0) {
            viewGrandTotal = givenTotal;
            viewTax = givenTax;
            viewSubtotal = Math.max(0, viewGrandTotal - viewTax);
        } else {
            const totals = computeTotalsFromItems(itemsForType, nonItemsForType);
            viewSubtotal = totals.subtotal;
            viewTax = totals.tax;
            viewGrandTotal = totals.grand;
        }
    } else {
        const givenTotal = Number(invoice.total_amount_duplicate || 0);
        const givenTax = Number(invoice.total_tax_duplicate || 0);
        if (givenTotal > 0) {
            viewGrandTotal = givenTotal;
            viewTax = givenTax;
            viewSubtotal = Math.max(0, viewGrandTotal - viewTax);
        } else {
            const totals = computeTotalsFromItems(itemsForType, nonItemsForType);
            viewSubtotal = totals.subtotal;
            viewTax = totals.tax;
            viewGrandTotal = totals.grand;
        }
    }

    setTextContent('view-subtotal', `₹ ${formatIndian(viewSubtotal, 2)}`);
    setTextContent('view-tax', showTax && viewTax > 0 ? `₹ ${formatIndian(viewTax, 2)}` : 'No Tax');
    setTextContent('view-grand-total', `₹ ${formatIndian(viewGrandTotal, 2)}`);

    // Update balance due based on computed grand total (fallback if stored total is absent)
    const effectiveTotal = viewGrandTotal;
    const balanceDueComputed = Number(effectiveTotal || 0) - Number(invoice.total_paid_amount || 0);
    setTextContent('view-balance-due', `₹ ${formatIndian(balanceDueComputed, 2)}`);

    // Payment History
    const detailPaymentsTableBody = document.querySelector("#view-payment-table tbody");
    if (detailPaymentsTableBody) {
        detailPaymentsTableBody.innerHTML = "";
        if (!invoice.payments || invoice.payments.length === 0) {
            detailPaymentsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                        <div class="flex flex-col items-center justify-center gap-2">
                            <i class="fas fa-receipt text-gray-300 text-3xl"></i>
                            <p>No payment records found</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            invoice.payments.forEach((item, index) => {
                const row = document.createElement("tr");
                row.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
                row.innerHTML = `
                        <td class="px-4 py-3 text-sm text-gray-900">${formatDateIndian(item.payment_date) || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.payment_mode || '-'}</td>
                        <td class="px-4 py-3 text-sm font-semibold text-blue-600">₹ ${formatIndian(item.paid_amount, 2) || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.extra_details ? item.extra_details : '-'}</td>
                        <td class="px-4 py-3 text-sm">
                            <div class="flex items-center gap-2">
                                <button type="button" class="edit-payment-btn text-blue-600 hover:text-blue-800 p-1" data-invoice-id="${invoice.invoice_id}" data-payment-index="${index}" title="Edit Payment">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button type="button" class="delete-payment-btn text-red-600 hover:text-red-800 p-1" data-invoice-id="${invoice.invoice_id}" data-payment-index="${index}" title="Delete Payment">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    `;
                detailPaymentsTableBody.appendChild(row);
            });

            // Add event listeners for edit/delete buttons
            detailPaymentsTableBody.querySelectorAll('.edit-payment-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const invoiceId = btn.dataset.invoiceId;
                    const paymentIndex = parseInt(btn.dataset.paymentIndex, 10);
                    if (typeof editPayment === 'function') {
                        editPayment(invoiceId, paymentIndex);
                    }
                });
            });

            detailPaymentsTableBody.querySelectorAll('.delete-payment-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const invoiceId = btn.dataset.invoiceId;
                    const paymentIndex = parseInt(btn.dataset.paymentIndex, 10);
                    if (typeof deletePayment === 'function') {
                        deletePayment(invoiceId, paymentIndex);
                    }
                });
            });
        }
    }

    // Add Payment Button Handler
    const addPaymentBtn = document.getElementById('view-add-payment-btn');
    if (addPaymentBtn) {
        const newBtn = addPaymentBtn.cloneNode(true);
        addPaymentBtn.parentNode.replaceChild(newBtn, addPaymentBtn);

        newBtn.addEventListener('click', () => {
            if (typeof payment === 'function') {
                payment(invoice.invoice_id);
            } else {
                console.error('payment function not found');
                if (window.electronAPI && window.electronAPI.showAlert1) {
                    window.electronAPI.showAlert1('Payment function not available');
                }
            }
        });
    }

    // Item List
    const detailItemsTableBody = document.querySelector("#view-items-table tbody");
    const detailItemsTableHead = document.querySelector("#view-items-table thead tr");
    if (detailItemsTableHead) {
        if (showTax) {
            detailItemsTableHead.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">S.No</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Description</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">HSN/SAC</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Qty</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Unit Price</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Taxable Value</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Tax %</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Total</th>
            `;
        } else {
            detailItemsTableHead.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">S.No</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Description</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">HSN/SAC</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Qty</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Unit Price</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Total</th>
            `;
        }
    }
    if (detailItemsTableBody) {
        detailItemsTableBody.innerHTML = "";
        sno = 0;
        itemsForType.forEach(item => {
            sno++;
            const qty = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
            const rate = parseFloat(item.rate || 0);
            const taxableValue = qty * unitPrice;
            const cgstPercent = rate / 2;
            const sgstPercent = rate / 2;
            const cgstValue = (taxableValue * cgstPercent) / 100;
            const sgstValue = (taxableValue * sgstPercent) / 100;
            const rowTotal = showTax ? (taxableValue + cgstValue + sgstValue) : taxableValue;
            view_totalTaxable += taxableValue;
            if (showTax) {
                view_totalCGST += cgstValue;
                view_totalSGST += sgstValue;
            }
            view_grandTotal += rowTotal;
            const row = document.createElement("tr");
            row.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
            if (showTax) {
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-900">${sno}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${item.HSN_SAC || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.quantity || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">₹ ${formatIndian(item.unit_price, 2) || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">₹ ${formatIndian(taxableValue, 2) || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${item.rate ? item.rate + '%' : '-'}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-blue-600">₹ ${formatIndian(rowTotal, 2) || '-'}</td>
                `;
            } else {
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-900">${sno}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${item.HSN_SAC || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.quantity || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">₹ ${formatIndian(item.unit_price, 2) || '-'}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-blue-600">₹ ${formatIndian(taxableValue, 2) || '-'}</td>
                `;
            }
            detailItemsTableBody.appendChild(row);
        });

        // Populate Items totals card
        try {
            setTextContent('view-items-total-amount', `₹ ${formatIndian(view_totalTaxable, 2)}`);
            const itemsTax = view_totalCGST + view_totalSGST;
            setTextContent('view-items-total-tax', showTax && itemsTax > 0 ? `₹ ${formatIndian(itemsTax, 2)}` : 'No Tax');
            setTextContent('items-overall', `₹ ${formatIndian(view_grandTotal, 2)}`);
        } catch (e) {
            console.warn('Items totals DOM elements not found', e);
        }
    }

    // Non-Items List
    const detailNonItemsTableBody = document.querySelector("#view-non-items-table tbody");
    const detailNonItemsTableHead = document.querySelector("#view-non-items-table thead tr");
    if (detailNonItemsTableHead) {
        if (showTax) {
            detailNonItemsTableHead.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">S.No</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Description</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Total</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Tax %</th>
            `;
        } else {
            detailNonItemsTableHead.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">S.No</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Description</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Total</th>
            `;
        }
    }
    if (detailNonItemsTableBody) {
        detailNonItemsTableBody.innerHTML = "";
        let nonItemSno = 0;
        nonItemsForType.forEach(item => {
            nonItemSno++;
            const price = parseFloat(item.price || 0);
            const rate = parseFloat(item.rate || 0);
            const cgstPercent = rate / 2;
            const sgstPercent = rate / 2;
            const cgstValue = (price * cgstPercent) / 100;
            const sgstValue = (price * sgstPercent) / 100;
            const rowTotal = showTax ? (price + cgstValue + sgstValue) : price;
            view_nonItemsTaxable += price;
            if (showTax) {
                view_nonItemsCGST += cgstValue;
                view_nonItemsSGST += sgstValue;
            }
            view_nonItemsGrandTotal += rowTotal;
            const row = document.createElement("tr");
            row.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
            if (showTax) {
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-900">${nonItemSno}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-blue-600">₹ ${formatIndian(price, 2) || ''}</td>
                    <td class="px-4 py-3 text-sm text-gray-700">${item.rate ? item.rate + '%' : ''}</td>
                `;
            } else {
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-900">${nonItemSno}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-blue-600">₹ ${formatIndian(price, 2) || ''}</td>
                `;
            }
            detailNonItemsTableBody.appendChild(row);
        });
    }

    // Non-items totals in Non-Items card
    try {
        setTextContent('view-non-items-total-amount', `₹ ${formatIndian(view_nonItemsTaxable, 2)}`);
        const nonItemsTax = view_nonItemsCGST + view_nonItemsSGST;
        setTextContent('view-non-items-total-tax', showTax && nonItemsTax > 0 ? `₹ ${formatIndian(nonItemsTax, 2)}` : 'No Tax');
        setTextContent('non-items-overall', `₹ ${formatIndian(view_nonItemsGrandTotal, 2)}`);
    } catch (e) {
        // If elements not present, ignore silently
        console.warn('Non-items totals DOM elements not found', e);
    }

    // Pass docType and showTax to generateInvoicePreview
    generateInvoicePreview(invoice, userRole, docType, showTax);

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
            let name = `Invoice-${invoiceIdLocal}`;
            window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
        } else {
            window.electronAPI.showAlert1("Print functionality is not available.");
        }
    };
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

        // Cache invoice for tab switching
        cachedInvoice = invoice;
        cachedUserRole = userRole;
        currentInvoiceViewType = type;

        // Update tab styling to match the requested view type
        updateInvoiceViewTypeTabs(type);

        // Hide other sections, show view section
        const viewPreview = document.getElementById('view-preview');
        const home = document.getElementById('home');
        const newSection = document.getElementById('new');
        const view = document.getElementById('view');

        if (viewPreview) viewPreview.style.display = 'none';
        if (home) home.style.display = 'none';
        if (newSection) newSection.style.display = 'none';
        if (view) view.style.display = 'flex';

        // Render the view with fetched data
        await renderInvoiceView(invoice, userRole, type);

    } catch (error) {
        console.error("Error fetching invoice:", error);
        window.electronAPI?.showAlert1("Failed to fetch invoice. Please try again later.");
    }
}

// // Expose viewInvoice globally for use in other scripts
window.viewInvoice = viewInvoice;