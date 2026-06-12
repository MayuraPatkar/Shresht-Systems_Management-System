(function () {
    const formatIndian = (window as any).formatIndian;
    const formatDateIndian = (window as any).formatDateIndian;
    const numberToWords = (window as any).numberToWords;
    const editPayment = (window as any).editPayment;
    const deletePayment = (window as any).deletePayment;
    const payment = (window as any).payment;

    let cachedInvoice: Invoice | null = null;
    let cachedUserRole: string | null = null;
    let currentInvoiceViewType = 'duplicate';

    function getFormattedAddress(addr: any, fallbackStr?: string): string {
        if (!addr) return fallbackStr || '';
        if (typeof addr === 'string') return addr;
        return [
            addr.line1,
            addr.line2,
            addr.city,
            addr.state ? addr.state + (addr.pincode ? ' - ' + addr.pincode : '') : ''
        ].filter(val => val && String(val).trim() !== "").join(', ');
    }

function parseViewType(viewType: string) {
    const showTax = viewType.endsWith('-tax');
    const docType = showTax ? viewType.replace('-tax', '') : viewType;
    return { docType, showTax };
}

function updateInvoiceViewTypeTabs(activeViewType: string) {
    currentInvoiceViewType = activeViewType;
    const { docType } = parseViewType(activeViewType);
    sessionStorage.setItem('view-invoice', docType);
    sessionStorage.setItem('view-invoice-full', activeViewType);
}

function initPreviewTaxToggle() {
    const taxToggle = document.getElementById('preview-tax-toggle') as HTMLInputElement | null;
    if (taxToggle) {
        taxToggle.addEventListener('change', async () => {
            const showTaxVal = taxToggle.checked;
            sessionStorage.setItem('view-invoice-showTax', showTaxVal ? 'true' : 'false');

            const textWith = document.querySelector('.slide-toggle-text-with');
            const textWithout = document.querySelector('.slide-toggle-text-without');
            if (showTaxVal) {
                textWith?.classList.add('slide-toggle-active');
                textWithout?.classList.remove('slide-toggle-active');
            } else {
                textWith?.classList.remove('slide-toggle-active');
                textWithout?.classList.add('slide-toggle-active');
            }

            if (cachedInvoice && cachedUserRole) {
                const { docType } = parseViewType(currentInvoiceViewType);
                await generateInvoicePreview(cachedInvoice, cachedUserRole, docType, showTaxVal);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', initPreviewTaxToggle);

async function generateInvoicePreview(invoice: Partial<Invoice> = {}, userRole: string, type: string, showTax: boolean = false) {
    const companyInfo = (window as any).companyConfig ? await (window as any).companyConfig.getCompanyInfo() : null;
    const companyName = companyInfo?.company_name?.toUpperCase() || 'COMPANY NAME';
    const companyAddress = typeof companyInfo?.address === 'string'
        ? companyInfo.address
        : [
            companyInfo?.address?.line1,
            companyInfo?.address?.line2,
            companyInfo?.address?.city,
            companyInfo?.address?.state ? companyInfo.address.state + (companyInfo.address.pincode ? ' - ' + companyInfo.address.pincode : '') : ''
          ].filter(Boolean).join(', ') || 'Company Address';
    const companyPhone = companyInfo?.phone ? `${companyInfo.phone.ph1}${companyInfo.phone.ph2 ? ' / ' + companyInfo.phone.ph2 : ''}` : '';
    const companyGSTIN = companyInfo?.gstin || '';
    const companyEmail = companyInfo?.email || '';
    const companyWebsite = companyInfo?.website || '';
    const bankDetails = {
        name: companyInfo?.bank_details?.account_holder_name || companyName,
        bank_name: companyInfo?.bank_details?.bank_name || '',
        branch: companyInfo?.bank_details?.branch || '',
        accountNo: companyInfo?.bank_details?.account_number || '',
        IFSC_code: companyInfo?.bank_details?.ifsc_code || ''
    };

    let itemsHTML = "";
    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;
    let totalTax = 0;
    // Totals for items table footer in preview
    let totalQtySum = 0;
    let totalUnitPriceSum = 0;
    let totalTaxableSum = 0;
    let totalItemsTaxSum = 0;
    let totalPriceSum = 0;
    let hasTax = showTax;
    let items: InvoiceItem[] = [];

    if (type === 'original') {
        items = invoice.items_original || [];
    } else {
        items = invoice.items_duplicate || [];
    }

    if (items.length > 0) {
        let sno = 1;
        items.forEach(item => {
            const description = item.description || "-";
            const hsnSac = item.hsn_sac || item.HSN_SAC || "-";
            const qty = parseFloat(String(item.quantity || 0));
            const unitPrice = parseFloat(String(item.unit_price || 0));
            const rate = parseFloat(String(item.gst_rate || item.rate || 0));

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

                totalQtySum += qty;
                totalUnitPriceSum += unitPrice;
                totalTaxableSum += taxableValue;
                totalItemsTaxSum += (cgstValue + sgstValue);
                totalPriceSum += rowTotal;

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

                totalQtySum += qty;
                totalUnitPriceSum += unitPrice;
                totalPriceSum += rowTotal;

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

        let non_items: NonInvoiceItem[] = [];
        if (type === 'original') {
            non_items = invoice.non_items_original || [];
        } else {
            non_items = invoice.non_items_duplicate || [];
        }

        non_items.forEach(item => {
            const description = item.description || "-";
            const price = parseFloat(String(item.price || 0));
            const rate = parseFloat(String(item.rate || 0));

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

                totalTaxableSum += price;
                totalItemsTaxSum += (cgstValue + sgstValue);
                totalPriceSum += rowTotal;

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

                totalTaxableSum += price;
                totalPriceSum += rowTotal;

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
        const itemsTableElement = document.getElementById("detail-items-table") || document.getElementById("items-table") || document.getElementById("view-items-table");
        const itemsTable = itemsTableElement?.getElementsByTagName("tbody")[0] as HTMLTableSectionElement | null;
        if (!itemsTable) {
            const previewEl = document.getElementById("view-preview-content");
            if (previewEl) previewEl.innerHTML = "<p>No items to preview.</p>";
            return;
        }
        const calc = (window as any).calculateInvoice(itemsTable);
        itemsHTML = calc.itemsHTML;
        totalPrice = calc.totalPrice;
        totalCGST = calc.totalCGST;
        totalSGST = calc.totalSGST;
        totalTaxableValue = calc.totalTaxableValue;
        hasTax = calc.hasTax;
    }

    const grandTotal = totalTaxableValue + totalCGST + totalSGST;
    const roundedGrandTotal = Math.round(grandTotal);
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

    // Build totals-row HTML (inserted on last items page in preview)
    let totalsRowHTML = '';
    if (hasTax) {
        totalsRowHTML = `
            <tr class="totals-row">
                <td colspan="3" class="text-left">TOTAL</td>
                <td class="text-right">${totalQtySum}</td>
                <td class="text-right">₹&nbsp;${formatIndian(totalUnitPriceSum, 2)}</td>
                <td class="text-right">₹&nbsp;${formatIndian(totalTaxableSum, 2)}</td>
                <td class="text-right">₹&nbsp;${formatIndian(totalItemsTaxSum, 2)}</td>
                <td class="text-right">₹&nbsp;${formatIndian(totalPriceSum, 2)}</td>
            </tr>
        `;
    } else {
        totalsRowHTML = `
            <tr class="totals-row">
                <td colspan="3" class="text-left">TOTAL</td>
                <td class="text-right">${totalQtySum}</td>
                <td class="text-right">₹&nbsp;${formatIndian(totalUnitPriceSum, 2)}</td>
                <td class="text-right">₹&nbsp;${formatIndian(totalPriceSum, 2)}</td>
            </tr>
        `;
    }

    const totalsHTML = `
        <div style="display: flex; width: 100%;">
            <div class="totals-section-sub1" style="width: 50%;">
                ${hasTaxSection}
                <p>Grand Total:</p>
            </div>
            <div class="totals-section-sub2" style="width: 50%;">
                ${hasTaxValues}
                <p>₹ ${formatIndian(finalTotal, 2)}</p>
            </div>
        </div>`;

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
                    <p><strong>Date: </strong>${(window as any).formatDate ? (window as any).formatDate(invoice.invoice_date) : (invoice.invoice_date || '-')}</p>
                </div>
            </div>
            ${index === 0 ? `
            <div class="third-section">
                <div class="buyer-details">
                    <p><strong>Bill To:</strong></p>
                    <p>${invoice.customer_name || ''}</p>
                    <p>${invoice.customer_address || ''}</p>
                    <p>Ph. ${invoice.customer_phone || ''}</p>
                    ${invoice.customer_GSTIN ? `<p>GSTIN: ${invoice.customer_GSTIN}</p>` : ''}
                </div>
                <div class="order-info">
                    <p><strong>Project:</strong> ${invoice.project_name || ''}</p>
                    <p><strong>P.O No:</strong> ${invoice.po_number || ''}</p>
                    <p><strong>D.C No:</strong> ${invoice.dc_number || ''}</p>
                    ${((invoice as any).consignee && ((invoice as any).consignee.name || (invoice as any).consignee.address)) || invoice.consignee_name || invoice.consignee_address ? `
                    <div class="consignee-details">
                        <p><strong>Consignee:</strong></p>
                        <p>${(invoice as any).consignee?.name || invoice.consignee_name || ''}</p>
                        <p>${getFormattedAddress((invoice as any).consignee?.address, invoice.consignee_address) || ''}</p>
                    </div>
                    ` : ''}
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
                        ${isLastPage ? (pageHTML + totalsRowHTML) : pageHTML}
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

    const previewEl = document.getElementById("view-preview-content");
    if (previewEl) previewEl.innerHTML = pagesHTML;
}

async function renderInvoiceView(invoice: Invoice, userRole: string, viewType: string) {
    const { docType } = parseViewType(viewType);
    const showTax = true; // Always calculate details card sections with tax details
    
    const showTaxPreview = sessionStorage.getItem('view-invoice-showTax') !== 'false';
    const taxToggle = document.getElementById('preview-tax-toggle') as HTMLInputElement | null;
    if (taxToggle) {
        taxToggle.checked = showTaxPreview;
        const textWith = document.querySelector('.slide-toggle-text-with');
        const textWithout = document.querySelector('.slide-toggle-text-without');
        if (showTaxPreview) {
            textWith?.classList.add('slide-toggle-active');
            textWithout?.classList.remove('slide-toggle-active');
        } else {
            textWith?.classList.remove('slide-toggle-active');
            textWithout?.classList.add('slide-toggle-active');
        }
    }

    const invoiceIdLocal = invoice?.invoice_id;
    let sno = 0;
    const itemsForType = (docType === 'original') ? (invoice.items_original || []) : (invoice.items_duplicate || []);
    const nonItemsForType = (docType === 'original') ? (invoice.non_items_original || []) : (invoice.non_items_duplicate || []);

    let view_totalTaxable = 0;
    let view_totalCGST = 0;
    let view_totalSGST = 0;
    let view_grandTotal = 0;
    let totalQty = 0;

    let view_nonItemsTaxable = 0;
    let view_nonItemsCGST = 0;
    let view_nonItemsSGST = 0;
    let view_nonItemsGrandTotal = 0;

    const setTextContent = (id: string, value: any) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || '-';
    };

    setTextContent('view-project-name', invoice.project_name);
    setTextContent('view-project-id', invoice.invoice_id);
    // Prefer human-friendly quotation number when available. Handle cases where
    // `quotation_id` may be a string, an ObjectId string, or a populated object.
    const displayQuotationId = (
        (invoice as any).quotation_no ||
        (typeof invoice.quotation_id === 'string' ? invoice.quotation_id : undefined) ||
        ((invoice as any).quotation_id && ((invoice as any).quotation_id.quotation_no || (invoice as any).quotation_id._id)) ||
        ''
    );
    setTextContent('view-quotation-id', displayQuotationId);
    setTextContent('view-invoice-date', invoice.invoice_date ? formatDateIndian(invoice.invoice_date) : null);
    setTextContent('view-purchase-order-number', (invoice.po_number && invoice.po_number !== 'undefined') ? invoice.po_number : null);
    setTextContent('view-purchase-order-date', invoice.po_date ? formatDateIndian(invoice.po_date) : null);
    setTextContent('view-delivery-challan-number', (invoice.dc_number && invoice.dc_number !== 'undefined') ? invoice.dc_number : null);
    setTextContent('view-delivery-challan-date', invoice.dc_date ? formatDateIndian(invoice.dc_date) : null);
    setTextContent('view-service-months', invoice.service_after_months ? String(invoice.service_after_months) : '0');
    setTextContent('view-service-stage', invoice.service_stage ? invoice.service_stage : 'No Service');
    setTextContent('view-payment-status', invoice.payment_status);

    const statusVal = getInvoiceStatus(invoice);
    const detail = INVOICE_STATUS_DETAILS[statusVal];
    const statusEl = document.getElementById('view-invoice-status');
    if (statusEl) {
        statusEl.textContent = detail.label;
        statusEl.className = `px-2.5 py-1 rounded-full text-xs font-semibold inline-block mt-0.5 ${detail.bgClass} ${detail.textClass}`;
    }

    let viewSubtotal = 0;
    let viewTax = 0;
    let viewGrandTotal = 0;

    const computeTotalsFromItems = (itemsList: InvoiceItem[], nonItemsList: NonInvoiceItem[]) => {
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
        const grand = showTax ? (subtotal + tax) : subtotal;
        return { subtotal, tax, grand };
    };

    if (docType === 'original') {
        const givenTotal = Number(invoice.total_amount_original || 0);
        const givenTax = Number(invoice.total_tax_original || 0);
        if (givenTotal > 0) {
            viewGrandTotal = givenTotal;
            viewTax = givenTax;
            viewSubtotal = Math.max(0, viewGrandTotal - viewTax);
            if (!showTax) {
                viewGrandTotal = viewSubtotal;
            }
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
            if (!showTax) {
                viewGrandTotal = viewSubtotal;
            }
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

    const balanceDueComputed = Number(viewGrandTotal || 0) - Number(invoice.total_paid_amount || 0);
    setTextContent('view-balance-due', `₹ ${formatIndian(balanceDueComputed, 2)}`);

    setTextContent('view-buyer-name', invoice.customer_snapshot?.name || invoice.customer_name);
    setTextContent('view-buyer-address', getFormattedAddress(invoice.customer_snapshot?.billing_address, invoice.customer_address));
    setTextContent('view-buyer-phone', invoice.customer_snapshot?.phone || invoice.customer_phone);
    setTextContent('view-buyer-email', invoice.customer_snapshot?.email || invoice.customer_email);
    setTextContent('view-buyer-gstin', invoice.customer_snapshot?.gstin || invoice.customer_GSTIN);
    setTextContent('view-consignee-name', invoice.consignee?.name || invoice.consignee_name);
    setTextContent('view-consignee-address', getFormattedAddress(invoice.consignee?.address, invoice.consignee_address));

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

            detailPaymentsTableBody.querySelectorAll('.edit-payment-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = (btn as HTMLElement).dataset.invoiceId;
                    const idxStr = (btn as HTMLElement).dataset.paymentIndex;
                    if (id && idxStr !== undefined) {
                        editPayment(id, parseInt(idxStr, 10));
                    }
                });
            });

            detailPaymentsTableBody.querySelectorAll('.delete-payment-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = (btn as HTMLElement).dataset.invoiceId;
                    const idxStr = (btn as HTMLElement).dataset.paymentIndex;
                    if (id && idxStr !== undefined) {
                        deletePayment(id, parseInt(idxStr, 10));
                    }
                });
            });
        }
    }

    const addPaymentBtn = document.getElementById('view-add-payment-btn');
    if (addPaymentBtn) {
        const newBtn = addPaymentBtn.cloneNode(true);
        if (addPaymentBtn.parentNode) {
            addPaymentBtn.parentNode.replaceChild(newBtn, addPaymentBtn);
        }

        newBtn.addEventListener('click', () => {
            payment(invoice.invoice_id);
        });
    }

    const itemsTableContainer = document.getElementById("view-items-table-container");
    const itemsEmptyState = document.getElementById("view-items-empty-state");

    if (itemsForType.length === 0) {
        if (itemsTableContainer) itemsTableContainer.classList.add("hidden");
        if (itemsEmptyState) itemsEmptyState.classList.remove("hidden");
    } else {
        if (itemsTableContainer) itemsTableContainer.classList.remove("hidden");
        if (itemsEmptyState) itemsEmptyState.classList.add("hidden");

        const detailItemsTableBody = document.querySelector("#view-items-table tbody");
        const detailItemsTableHead = document.querySelector("#view-items-table thead tr");
        const detailItemsTableFoot = document.querySelector("#view-items-table tfoot");
        if (detailItemsTableHead) {
            if (showTax) {
                detailItemsTableHead.innerHTML = `
                    <th class="w-[8%] px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">S.No</th>
                    <th class="w-[27%] px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Description</th>
                    <th class="w-[10%] px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">HSN/SAC</th>
                    <th class="w-[8%] px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Qty</th>
                    <th class="w-[12%] px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Unit Price</th>
                    <th class="w-[12%] px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Taxable Value</th>
                    <th class="w-[10%] px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Tax %</th>
                    <th class="w-[13%] px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Total</th>
                `;
            } else {
                detailItemsTableHead.innerHTML = `
                    <th class="w-[10%] px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">S.No</th>
                    <th class="w-[45%] px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Description</th>
                    <th class="w-[15%] px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">HSN/SAC</th>
                    <th class="w-[10%] px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Qty</th>
                    <th class="w-[10%] px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Unit Price</th>
                    <th class="w-[10%] px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Total</th>
                `;
            }
        }

        if (detailItemsTableBody) {
            detailItemsTableBody.innerHTML = "";
            sno = 0;
            totalQty = 0;
            itemsForType.forEach(item => {
                sno++;
                const qty = parseFloat(String(item.quantity || 0));
                const unitPrice = parseFloat(String(item.unit_price || 0));
                const rate = parseFloat(String(item.gst_rate || item.rate || 0));
                const taxableValue = qty * unitPrice;
                const cgstPercent = rate / 2;
                const sgstPercent = rate / 2;
                const cgstValue = (taxableValue * cgstPercent) / 100;
                const sgstValue = (taxableValue * sgstPercent) / 100;
                const rowTotal = showTax ? (taxableValue + cgstValue + sgstValue) : taxableValue;
                
                totalQty += qty;
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
                        <td class="px-4 py-3 text-sm text-gray-700">${item.hsn_sac || item.HSN_SAC || '-'}</td>
                        <td class="px-4 py-3 text-sm text-right text-gray-900 tabular-nums">${item.quantity || '-'}</td>
                        <td class="px-4 py-3 text-sm text-right text-gray-700 tabular-nums">₹ ${formatIndian(item.unit_price, 2) || '-'}</td>
                        <td class="px-4 py-3 text-sm text-right text-gray-700 tabular-nums">₹ ${formatIndian(taxableValue, 2) || '-'}</td>
                        <td class="px-4 py-3 text-sm text-right text-gray-700 tabular-nums">${(item.gst_rate !== undefined && item.gst_rate !== null) ? item.gst_rate + '%' : (item.rate ? item.rate + '%' : '-')}</td>
                        <td class="px-4 py-3 text-sm text-right font-semibold text-blue-600 tabular-nums">₹ ${formatIndian(rowTotal, 2) || '-'}</td>
                    `;
                } else {
                    row.innerHTML = `
                        <td class="px-4 py-3 text-sm text-gray-900">${sno}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${item.hsn_sac || item.HSN_SAC || '-'}</td>
                        <td class="px-4 py-3 text-sm text-right text-gray-900 tabular-nums">${item.quantity || '-'}</td>
                        <td class="px-4 py-3 text-sm text-right text-gray-700 tabular-nums">₹ ${formatIndian(item.unit_price, 2) || '-'}</td>
                        <td class="px-4 py-3 text-sm text-right font-semibold text-blue-600 tabular-nums">₹ ${formatIndian(taxableValue, 2) || '-'}</td>
                    `;
                }
                detailItemsTableBody.appendChild(row);
            });

            if (detailItemsTableFoot) {
                if (showTax) {
                    detailItemsTableFoot.innerHTML = `
                        <tr>
                            <td class="px-4 py-3 text-left font-bold text-gray-900">Totals</td>
                            <td class="px-4 py-3"></td>
                            <td class="px-4 py-3"></td>
                            <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">${totalQty}</td>
                            <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">₹ ${formatIndian(view_totalTaxable, 2)}</td>
                            <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">₹ ${formatIndian(view_totalTaxable, 2)}</td>
                            <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">₹ ${formatIndian(view_totalCGST + view_totalSGST, 2)}</td>
                            <td class="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">₹ ${formatIndian(view_grandTotal, 2)}</td>
                        </tr>
                    `;
                } else {
                    detailItemsTableFoot.innerHTML = `
                        <tr>
                            <td class="px-4 py-3 text-left font-bold text-gray-900">Totals</td>
                            <td class="px-4 py-3"></td>
                            <td class="px-4 py-3"></td>
                            <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">${totalQty}</td>
                            <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">₹ ${formatIndian(view_totalTaxable, 2)}</td>
                            <td class="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">₹ ${formatIndian(view_grandTotal, 2)}</td>
                        </tr>
                    `;
                }
            }
        }
    }

    const nonItemsTableContainer = document.getElementById("view-non-items-table-container");
    const nonItemsEmptyState = document.getElementById("view-non-items-empty-state");

    if (nonItemsForType.length === 0) {
        if (nonItemsTableContainer) nonItemsTableContainer.classList.add("hidden");
        if (nonItemsEmptyState) nonItemsEmptyState.classList.remove("hidden");
    } else {
        if (nonItemsTableContainer) nonItemsTableContainer.classList.remove("hidden");
        if (nonItemsEmptyState) nonItemsEmptyState.classList.add("hidden");

        const detailNonItemsTableBody = document.querySelector("#view-non-items-table tbody");
        const detailNonItemsTableHead = document.querySelector("#view-non-items-table thead tr");
        const detailNonItemsTableFoot = document.querySelector("#view-non-items-table tfoot");
        if (detailNonItemsTableHead) {
            if (showTax) {
                detailNonItemsTableHead.innerHTML = `
                    <th class="w-[10%] px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">S.No</th>
                    <th class="w-[50%] px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Description</th>
                    <th class="w-[20%] px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Total</th>
                    <th class="w-[20%] px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Tax %</th>
                `;
            } else {
                detailNonItemsTableHead.innerHTML = `
                    <th class="w-[10%] px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">S.No</th>
                    <th class="w-[65%] px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Description</th>
                    <th class="w-[25%] px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Total</th>
                `;
            }
        }
        if (detailNonItemsTableBody) {
            detailNonItemsTableBody.innerHTML = "";
            let nonItemSno = 0;
            nonItemsForType.forEach(item => {
                nonItemSno++;
                const price = parseFloat(String(item.price || 0));
                const rate = parseFloat(String(item.rate || 0));
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
                        <td class="px-4 py-3 text-sm text-right font-semibold text-blue-600 tabular-nums">₹ ${formatIndian(price, 2) || ''}</td>
                        <td class="px-4 py-3 text-sm text-right text-gray-700 tabular-nums">${item.rate ? item.rate + '%' : ''}</td>
                    `;
                } else {
                    row.innerHTML = `
                        <td class="px-4 py-3 text-sm text-gray-900">${nonItemSno}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                        <td class="px-4 py-3 text-sm text-right font-semibold text-blue-600 tabular-nums">₹ ${formatIndian(price, 2) || ''}</td>
                    `;
                }
                detailNonItemsTableBody.appendChild(row);
            });
        }

        if (detailNonItemsTableFoot) {
            if (showTax) {
                detailNonItemsTableFoot.innerHTML = `
                    <tr>
                        <td class="px-4 py-3 text-left font-bold text-gray-900">Totals</td>
                        <td class="px-4 py-3"></td>
                        <td class="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">₹ ${formatIndian(view_nonItemsTaxable, 2)}</td>
                        <td class="px-4 py-3"></td>
                    </tr>
                `;
            } else {
                detailNonItemsTableFoot.innerHTML = `
                    <tr>
                        <td class="px-4 py-3 text-left font-bold text-gray-900">Totals</td>
                        <td class="px-4 py-3"></td>
                        <td class="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">₹ ${formatIndian(view_nonItemsTaxable, 2)}</td>
                    </tr>
                `;
            }
        }
    }

    generateInvoicePreview(invoice, userRole, docType, showTaxPreview);

    const printProjBtn = document.getElementById('printProject');
    if (printProjBtn) {
        printProjBtn.onclick = () => {
            const previewEl = document.getElementById("view-preview-content");
            const previewContent = previewEl ? previewEl.innerHTML : '';
            if ((window as any).electronAPI?.handlePrintEvent) {
                (window as any).electronAPI.handlePrintEvent(previewContent, "print");
            } else {
                if ((window as any).electronAPI?.showAlert1) {
                    (window as any).electronAPI.showAlert1("Print functionality is not available.");
                }
            }
        };
    }

    const savePDFBtn = document.getElementById('saveProjectPDF');
    if (savePDFBtn) {
        savePDFBtn.onclick = () => {
            const previewEl = document.getElementById("view-preview-content");
            const previewContent = previewEl ? previewEl.innerHTML : '';
            if ((window as any).electronAPI?.handlePrintEvent) {
                const name = `Invoice-${invoiceIdLocal}`;
                (window as any).electronAPI.handlePrintEvent(previewContent, "savePDF", name);
            } else {
                if ((window as any).electronAPI?.showAlert1) {
                    (window as any).electronAPI.showAlert1("Print functionality is not available.");
                }
            }
        };
    }

    // Danger Zone Section Logic
    const dangerZoneSection = document.getElementById('danger-zone') || document.getElementById('danger-zone-section');
    if (dangerZoneSection) {
        if (userRole === 'admin' || userRole === 'manager') {
            dangerZoneSection.classList.remove('hidden');
        } else {
            dangerZoneSection.classList.add('hidden');
        }
    }

    const cancelBtn = document.getElementById('cancelInvoiceBtn');
    const deleteBtn = document.getElementById('deleteInvoiceBtn');

    if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true) as HTMLButtonElement;
        cancelBtn.parentNode?.replaceChild(newCancelBtn, cancelBtn);

        const currentStatus = getInvoiceStatus(invoice);
        if (currentStatus === InvoiceStatus.CANCELLED) {
            newCancelBtn.disabled = true;
            newCancelBtn.classList.add('opacity-50', 'cursor-not-allowed');
            newCancelBtn.title = 'Invoice is already cancelled';
        } else {
            newCancelBtn.disabled = false;
            newCancelBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            newCancelBtn.removeAttribute('title');
            newCancelBtn.addEventListener('click', () => {
                const showConfirm = (window as any).showConfirm;
                if (showConfirm) {
                    showConfirm(`Are you sure you want to CANCEL Invoice "${invoice.invoice_id}"? This will revert items to inventory stock.`, async (response: string) => {
                        if (response === 'Yes') {
                            try {
                                const res = await fetch(`/invoice/cancel/${invoice.invoice_id}`, {
                                    method: 'POST'
                                });
                                const data = await res.json();
                                if (res.ok) {
                                    if ((window as any).electronAPI?.showAlert1) {
                                        (window as any).electronAPI.showAlert1('Invoice cancelled successfully.');
                                    }
                                    await viewInvoice(invoice.invoice_id, userRole);
                                } else {
                                    if ((window as any).electronAPI?.showAlert1) {
                                        (window as any).electronAPI.showAlert1(`Error: ${data.message || 'Failed to cancel invoice.'}`);
                                    }
                                }
                            } catch (err) {
                                console.error('Error cancelling invoice:', err);
                                if ((window as any).electronAPI?.showAlert1) {
                                    (window as any).electronAPI.showAlert1('Failed to connect to server.');
                                }
                            }
                        }
                    });
                }
            });
        }
    }

    if (deleteBtn) {
        const newDeleteBtn = deleteBtn.cloneNode(true) as HTMLButtonElement;
        deleteBtn.parentNode?.replaceChild(newDeleteBtn, deleteBtn);
        newDeleteBtn.addEventListener('click', () => {
            const showConfirm = (window as any).showConfirm;
            if (showConfirm) {
                showConfirm(`Are you sure you want to PERMANENTLY delete Invoice "${invoice.invoice_id}"? This action cannot be undone.`, async (response: string) => {
                    if (response === 'Yes') {
                        try {
                            const res = await fetch(`/invoice/${invoice.invoice_id}`, {
                                method: 'DELETE'
                            });
                            const data = await res.json();
                            if (res.ok) {
                                if ((window as any).electronAPI?.showAlert1) {
                                    (window as any).electronAPI.showAlert1('Invoice deleted successfully.');
                                }
                                const homeBtnEl = document.getElementById('home-btn');
                                if (homeBtnEl) {
                                    homeBtnEl.click();
                                } else {
                                    window.location.href = '/invoice';
                                }
                            } else {
                                if ((window as any).electronAPI?.showAlert1) {
                                    (window as any).electronAPI.showAlert1(`Error: ${data.message || 'Failed to delete invoice.'}`);
                                }
                            }
                        } catch (err) {
                            console.error('Error deleting invoice:', err);
                            if ((window as any).electronAPI?.showAlert1) {
                                (window as any).electronAPI.showAlert1('Failed to connect to server.');
                            }
                        }
                    }
                });
            }
        });
    }

    const viewPaymentBtn = document.getElementById('view-payment-btn');
    if (viewPaymentBtn) {
        const newViewPaymentBtn = viewPaymentBtn.cloneNode(true) as HTMLButtonElement;
        viewPaymentBtn.parentNode?.replaceChild(newViewPaymentBtn, viewPaymentBtn);
        newViewPaymentBtn.addEventListener('click', () => {
            if (!cachedInvoice) return;
            const grandTotal = Number(cachedInvoice.total_amount_original || 0);
            const totalPaid = Number(cachedInvoice.total_paid_amount || 0);
            const balanceDue = grandTotal - totalPaid;

            if (cachedInvoice.payment_status === 'PAID' || balanceDue <= 0) {
                if ((window as any).electronAPI?.showAlert1) {
                    (window as any).electronAPI.showAlert1("This invoice is already fully paid.");
                } else {
                    alert("This invoice is already fully paid.");
                }
                return;
            }

            const amount = balanceDue > 0 ? balanceDue : grandTotal;
            const refId = cachedInvoice.invoice_id || cachedInvoice.invoice_no;
            const refType = 'Invoice';
            const partyType = 'Customer';
            const partyId = cachedInvoice.customer_id;
            const partyName = encodeURIComponent((document.getElementById('view-buyer-name') as HTMLElement)?.textContent || '');

            const url = `/payment/payment.html?new=true&direction=IN&amount=${amount}&ref_type=${refType}&ref_id=${refId}&party_type=${partyType}&party_id=${partyId}&party_name=${partyName}`;
            window.location.href = url;
        });
    }

    const archiveBtn = document.getElementById('archiveInvoiceBtn');
    if (archiveBtn) {
        const newArchiveBtn = archiveBtn.cloneNode(true) as HTMLButtonElement;
        archiveBtn.parentNode?.replaceChild(newArchiveBtn, archiveBtn);
        newArchiveBtn.innerHTML = invoice.is_archived
            ? '<i class="fas fa-box-open"></i> Restore from Archive'
            : '<i class="fas fa-archive"></i> Archive Invoice';
        newArchiveBtn.addEventListener('click', async () => {
            const action = invoice.is_archived ? 'restore' : 'archive';
            const message = `Are you sure you want to ${action} Invoice "${invoice.invoice_id}"?`;
            const execute = async () => {
                try {
                    if (invoice.is_archived) {
                        await (window as any).restoreInvoiceFromArchive(invoice.invoice_id);
                    } else {
                        await (window as any).archiveInvoice(invoice.invoice_id);
                    }
                    document.getElementById('home-btn')?.click();
                } catch (error) {
                    (window as any).electronAPI?.showAlert1(`Failed to ${action} invoice.`);
                }
            };
            const electronAPI = (window as any).electronAPI;
            if (electronAPI?.showAlert2 && electronAPI?.receiveAlertResponse) {
                electronAPI.showAlert2(message);
                electronAPI.receiveAlertResponse((response: string) => {
                    if (response === 'Yes') execute();
                });
            } else if ((window as any).showConfirm) {
                (window as any).showConfirm(message, (response: string) => {
                    if (response === 'Yes') execute();
                });
            } else {
                if (confirm(message)) {
                    execute();
                }
            }
        });
    }

    const editBtnView = document.getElementById('editInvoiceBtnView') as HTMLButtonElement;
    if (editBtnView) {
        const newEditBtn = editBtnView.cloneNode(true) as HTMLButtonElement;
        editBtnView.parentNode?.replaceChild(newEditBtn, editBtnView);
        newEditBtn.addEventListener('click', () => {
            const invoiceId = invoice.invoice_id || invoice.invoice_no;
            sessionStorage.setItem('currentTab-status', 'update');
            (window as any).openInvoice(invoiceId);
        });
    }

    const duplicateBtnView = document.getElementById('duplicateInvoiceBtnView') as HTMLButtonElement;
    if (duplicateBtnView) {
        const newDuplicateBtn = duplicateBtnView.cloneNode(true) as HTMLButtonElement;
        duplicateBtnView.parentNode?.replaceChild(newDuplicateBtn, duplicateBtnView);
        newDuplicateBtn.addEventListener('click', () => {
            const invoiceId = invoice.invoice_id || invoice.invoice_no;
            sessionStorage.setItem('currentTab-status', 'clone');
            (window as any).cloneInvoice(invoiceId);
        });
    }

    const sendWhatsAppBtn = document.getElementById('sendWhatsAppBtn') as HTMLButtonElement;
    if (sendWhatsAppBtn) {
        const newSendWhatsAppBtn = sendWhatsAppBtn.cloneNode(true) as HTMLButtonElement;
        sendWhatsAppBtn.parentNode?.replaceChild(newSendWhatsAppBtn, sendWhatsAppBtn);
        newSendWhatsAppBtn.addEventListener('click', () => {
            const invoiceId = invoice.invoice_id || invoice.invoice_no;
            const defaultPhone = invoice.customer_snapshot?.phone || invoice.customer_phone || '';
            
            showWhatsAppPromptModal(defaultPhone, async (phone: string) => {
                const cleanPhone = phone.replace(/\D/g, '');
                if (cleanPhone.length < 10 || cleanPhone.length > 15) {
                    if ((window as any).electronAPI?.showAlert1) {
                        (window as any).electronAPI.showAlert1('Please enter a valid phone number (10 to 15 digits).');
                    } else {
                        alert('Please enter a valid phone number (10 to 15 digits).');
                    }
                    return;
                }
                
                let formattedPhone = cleanPhone;
                if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
                    formattedPhone = '91' + formattedPhone;
                }
                
                newSendWhatsAppBtn.disabled = true;
                newSendWhatsAppBtn.classList.add('opacity-70', 'cursor-not-allowed');
                const originalHTML = newSendWhatsAppBtn.innerHTML;
                newSendWhatsAppBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                
                const previewContentEl = document.getElementById('view-preview-content');
                const htmlContent = previewContentEl ? previewContentEl.innerHTML : '';

                try {
                    const res = await fetch('/comms/send-invoice', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            phone: formattedPhone,
                            invoiceId: invoiceId,
                            htmlContent: htmlContent
                        })
                    });
                    
                    const result = await res.json();
                    if (!res.ok) {
                        throw new Error(result.message || result.error || 'Failed to send WhatsApp message');
                    }
                    
                    // Only update status if it is currently 'DRAFT'
                    if (invoice.status === 'DRAFT') {
                        const statusRes = await fetch(`/invoice/${encodeURIComponent(invoiceId)}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'SENT' })
                        });
                        
                        if (!statusRes.ok) {
                            const statusResult = await statusRes.json();
                            throw new Error(statusResult.message || 'Failed to update invoice status to SENT');
                        }
                    }
                    
                    if (typeof showToast === 'function') {
                        showToast('Invoice PDF sent via WhatsApp successfully!');
                    }
                    
                    // Stop animation and restore button text
                    newSendWhatsAppBtn.disabled = false;
                    newSendWhatsAppBtn.classList.remove('opacity-70', 'cursor-not-allowed');
                    newSendWhatsAppBtn.innerHTML = originalHTML;
                    
                    await (window as any).viewInvoice(invoiceId, cachedUserRole);
                    
                } catch (err: any) {
                    console.error('WhatsApp send error:', err);
                    const errMsg = err.message || 'Error occurred while sending';
                    if ((window as any).electronAPI?.showAlert1) {
                        (window as any).electronAPI.showAlert1(errMsg);
                    } else {
                        alert(errMsg);
                    }
                } finally {
                    newSendWhatsAppBtn.disabled = false;
                    newSendWhatsAppBtn.classList.remove('opacity-70', 'cursor-not-allowed');
                    newSendWhatsAppBtn.innerHTML = originalHTML;
                }
            });
        });
    }

    updateInvoiceStatusTracker(invoice);
}

function updateInvoiceStatusTracker(invoice: Invoice) {
    const trackerEl = document.getElementById('invoice-status-tracker');
    if (!trackerEl) return;

    const status = getInvoiceStatus(invoice);
    
    let step1State = 'completed';
    let step2State = 'pending';
    let step3State = 'pending';
    let step4State = 'pending';

    let step3Label = 'Payment';
    let step3Subtitle = 'Awaiting payment';
    let step3Icon = 'fa-wallet';
    let step3ColorClass = 'blue';

    let step4Label = 'Fully Settled';
    let step4Subtitle = 'Invoice cleared';
    let step4Icon = 'fa-check-double';
    let step4ColorClass = 'emerald';

    let progressWidth = '0%';

    if (status === InvoiceStatus.DRAFT) {
        step1State = 'active';
        progressWidth = '0%';
    } else if (status === InvoiceStatus.SENT) {
        step1State = 'completed';
        step2State = 'active';
        progressWidth = '33.33%';
    } else if (status === InvoiceStatus.OVERDUE) {
        step1State = 'completed';
        step2State = 'completed';
        step3State = 'warning';
        step3Label = 'Overdue';
        step3Subtitle = 'Payment delayed';
        step3Icon = 'fa-exclamation-triangle';
        step3ColorClass = 'red';
        progressWidth = '66.66%';
    } else if (status === InvoiceStatus.PARTIALLY_PAID) {
        step1State = 'completed';
        step2State = 'completed';
        step3State = 'active';
        step3Label = 'Partially Paid';
        const totalAmt = invoice.total_amount_duplicate || invoice.total_amount_original || 0;
        const percent = totalAmt ? Math.round(((invoice.total_paid_amount || 0) / totalAmt) * 100) : 0;
        step3Subtitle = `${percent}% paid`;
        step3Icon = 'fa-hourglass-half';
        step3ColorClass = 'amber';
        progressWidth = '66.66%';
    } else if (status === InvoiceStatus.PAID) {
        step1State = 'completed';
        step2State = 'completed';
        step3State = 'completed';
        step4State = 'completed';
        step3Label = 'Paid';
        step3Subtitle = 'Fully paid';
        step3Icon = 'fa-check';
        progressWidth = '100%';
    } else if (status === InvoiceStatus.CANCELLED) {
        step1State = 'completed';
        step2State = 'completed';
        step4State = 'failed';
        step4Label = 'Cancelled';
        step4Subtitle = 'Invoice voided';
        step4Icon = 'fa-ban';
        step4ColorClass = 'red';
        progressWidth = '100%';
    } else if (status === InvoiceStatus.REFUNDED) {
        step1State = 'completed';
        step2State = 'completed';
        step3State = 'completed';
        step4State = 'warning';
        step4Label = 'Refunded';
        step4Subtitle = 'Amount returned';
        step4Icon = 'fa-undo';
        step4ColorClass = 'purple';
        progressWidth = '100%';
    }

    const renderStepCircle = (state: string, icon: string, color: string, label: string, subtitle: string) => {
        let circleClass = '';
        let labelClass = 'text-gray-800';
        let iconMarkup = `<i class="fas ${icon} text-sm"></i>`;

        if (state === 'completed') {
            circleClass = 'bg-emerald-500 text-white ring-4 ring-emerald-100';
            iconMarkup = `<i class="fas fa-check text-sm"></i>`;
        } else if (state === 'active') {
            if (color === 'amber') {
                circleClass = 'bg-amber-500 text-white ring-4 ring-amber-100';
                labelClass = 'text-amber-600 font-bold';
            } else {
                circleClass = 'bg-blue-600 text-white ring-4 ring-blue-100';
                labelClass = 'text-blue-600 font-bold';
            }
        } else if (state === 'warning') {
            if (color === 'red') {
                circleClass = 'bg-red-500 text-white ring-4 ring-red-100';
                labelClass = 'text-red-600 font-bold';
            } else if (color === 'purple') {
                circleClass = 'bg-purple-500 text-white ring-4 ring-purple-100';
                labelClass = 'text-purple-600 font-bold';
            } else {
                circleClass = 'bg-amber-500 text-white ring-4 ring-amber-100';
                labelClass = 'text-amber-600 font-bold';
            }
        } else if (state === 'failed') {
            circleClass = 'bg-red-500 text-white ring-4 ring-red-100';
            labelClass = 'text-red-600 font-bold';
        } else {
            circleClass = 'bg-gray-100 text-gray-400 border border-gray-200';
            labelClass = 'text-gray-400';
        }

        return `
            <div class="flex flex-col items-center z-10 flex-1 relative">
                <div class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${circleClass}">
                    ${iconMarkup}
                </div>
                <span class="text-xs font-bold mt-2 ${labelClass}">${label}</span>
                <span class="text-[10px] text-gray-500 mt-0.5">${subtitle}</span>
            </div>
        `;
    };

    trackerEl.innerHTML = `
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <i class="fas fa-route text-blue-600 text-xl"></i>
            <h3 class="text-lg font-bold text-gray-800">Status Tracker</h3>
        </div>
        <div class="relative w-full max-w-4xl mx-auto py-6">
            <!-- Background progress line -->
            <div class="absolute top-[36px] left-[20px] right-[20px] h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full">
                <div class="h-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-all duration-500 rounded-full" style="width: ${progressWidth}"></div>
            </div>
            
            <!-- Steps Container -->
            <div class="relative flex justify-between items-center z-10 w-full">
                ${renderStepCircle(step1State, 'fa-file-signature', 'blue', 'Draft', 'Created')}
                ${renderStepCircle(step2State, 'fa-paper-plane', 'blue', 'Sent', 'Shared with client')}
                ${renderStepCircle(step3State, step3Icon, step3ColorClass, step3Label, step3Subtitle)}
                ${renderStepCircle(step4State, step4Icon, step4ColorClass, step4Label, step4Subtitle)}
            </div>
        </div>
    `;
    trackerEl.classList.remove('hidden');
}

async function viewInvoice(invoiceId: string, userRole?: string | null) {
    if (!document.getElementById('view-project-name')) {
        window.location.href = `/invoice/details?id=${encodeURIComponent(invoiceId)}`;
        return;
    }
    try {
        let role = userRole;
        if (!role) {
            role = sessionStorage.getItem('userRole') || 'user';
        }

        let type = sessionStorage.getItem('view-invoice-full') || sessionStorage.getItem('view-invoice') || 'duplicate';
        if (role === 'manager') {
            if (!type.startsWith('original')) {
                type = type.endsWith('-tax') ? 'original-tax' : 'original';
            }
        } else {
            if (!type.startsWith('duplicate')) {
                type = type.endsWith('-tax') ? 'duplicate-tax' : 'duplicate';
            }
        }



        const response = await fetch(`/invoice/${invoiceId}`);
        const showDeletedInvoiceAlert = () => {
            const msg = "Reference is deleted.";
            if ((window as any).electronAPI?.showAlert1) {
                (window as any).electronAPI.showAlert1(msg);
            } else {
                alert(msg);
            }
            const viewPreview = document.getElementById('view-preview');
            const home = document.getElementById('home');
            const newSection = document.getElementById('new');
            const view = document.getElementById('view');

            if (view) view.style.display = 'none';
            if (viewPreview) viewPreview.style.display = 'none';
            if (newSection) newSection.style.display = 'none';
            if (home) home.style.display = 'block';

            if (typeof (window as any).updateHeaderVisibility === 'function') {
                (window as any).updateHeaderVisibility();
            }
        };

        if (response.status === 404) {
            showDeletedInvoiceAlert();
            return;
        }

        if (!response.ok) {
            throw new Error("Failed to fetch invoice");
        }

        const data = await response.json();
        const invoice = data.invoice as Invoice;

        if (invoice.deletion?.is_deleted) {
            showDeletedInvoiceAlert();
            return;
        }

        cachedInvoice = invoice;
        cachedUserRole = role;
        currentInvoiceViewType = type;

        updateInvoiceViewTypeTabs(type);

        const viewPreview = document.getElementById('view-preview');
        const home = document.getElementById('home');
        const newSection = document.getElementById('new');
        const view = document.getElementById('view');

        if (viewPreview) viewPreview.style.display = 'none';
        if (home) home.style.display = 'none';
        if (newSection) newSection.style.display = 'none';
        if (view) view.style.display = 'flex';

        const viewPaymentBtn = document.getElementById('view-payment-btn');
        const editBtn = document.getElementById('editInvoiceBtnView');
        const duplicateBtn = document.getElementById('duplicateInvoiceBtnView');

        if (viewPaymentBtn) viewPaymentBtn.style.display = 'flex';
        if (editBtn) editBtn.style.display = 'flex';
        if (duplicateBtn) duplicateBtn.style.display = 'flex';

        await renderInvoiceView(invoice, role, type);

    } catch (error) {
        console.error("Error fetching invoice:", error);
        if ((window as any).electronAPI?.showAlert1) {
            (window as any).electronAPI.showAlert1("Failed to fetch invoice. Please try again later.");
        }
    }
}

(window as any).viewInvoice = viewInvoice;

function showWhatsAppPromptModal(defaultPhone: string, callback: (phone: string) => void) {
    const modalHTML = `
        <div id="whatsapp-prompt-modal" class="fixed inset-0 bg-slate-900/40 backdrop-blur-[4px] z-[999] flex items-center justify-center transition-all duration-200">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-slate-100 flex flex-col">
                <div class="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <i class="fab fa-whatsapp text-emerald-500 text-xl"></i>
                        <h3 class="text-lg font-bold text-slate-800">Send via WhatsApp</h3>
                    </div>
                    <button id="close-whatsapp-modal" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label for="whatsapp-prompt-phone" class="block text-sm font-medium text-slate-700 mb-2">
                            Enter Client's WhatsApp Number
                        </label>
                        <input type="tel" id="whatsapp-prompt-phone" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all" 
                            placeholder="e.g., 9876543210 or 919876543210" value="${defaultPhone}">
                        <p class="text-xs text-slate-400 mt-2">Specify the number with country code if outside India.</p>
                    </div>
                </div>
                <div class="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button id="cancel-whatsapp-modal" class="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold text-sm transition-all cursor-pointer">
                        Cancel
                    </button>
                    <button id="submit-whatsapp-modal" class="px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-semibold text-sm transition-all cursor-pointer shadow-sm shadow-emerald-500/10 flex items-center gap-2">
                        <i class="fas fa-paper-plane text-xs"></i> Send
                    </button>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('whatsapp-prompt-modal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('whatsapp-prompt-modal')!;
    const closeBtn = document.getElementById('close-whatsapp-modal')!;
    const cancelBtn = document.getElementById('cancel-whatsapp-modal')!;
    const submitBtn = document.getElementById('submit-whatsapp-modal')!;
    const phoneInput = document.getElementById('whatsapp-prompt-phone') as HTMLInputElement;

    const closeModal = () => modal.remove();

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    phoneInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        target.value = target.value.replace(/[^\d+]/g, '');
    });

    const submit = () => {
        const phone = phoneInput.value.trim();
        if (phone) {
            callback(phone);
            closeModal();
        } else {
            phoneInput.classList.add('border-red-500');
            phoneInput.focus();
        }
    };

    submitBtn.addEventListener('click', submit);
    phoneInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            submit();
        } else if (e.key === 'Escape') {
            closeModal();
        }
    });

    setTimeout(() => phoneInput.focus(), 100);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}
})();
