// @ts-nocheck
async function getQuotationHeaderHTML() {
    if (window.SectionRenderers && typeof window.SectionRenderers.renderQuotationDocumentHeader === "function") {
        return await window.SectionRenderers.renderQuotationDocumentHeader();
    }
    // Fallback header if SectionRenderers not loaded
    return `
        <div class="header">
            <div class="quotation-brand">
                <div class="logo">
                    <img src="../assets/icon.png" alt="Shresht Logo">
                </div>
                <div class="quotation-brand-text">
                    <h1>SHRESHT SYSTEMS</h1>
                    <p class="quotation-tagline">CCTV & Energy Solutions</p>
                </div>
            </div>
            <div class="company-details">
                <p>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>
    `;
}

// ====== View Type Switching State ======
let cachedQuotation = null;
let currentViewType = 1; // Default: Without Tax

/**
 * Update active tab styling - segmented control style
 */
function updateViewTypeTabs(activeViewType: number) {
    const tabs = document.querySelectorAll('.view-type-tab');
    const pill = document.getElementById('segmented-pill');
    
    if (pill) {
        // Since pill is 33.333% width and each container third is 100% of pill width,
        // we scale the translation:
        // viewType 1 -> 0%
        // viewType 2 -> 100%
        // viewType 3 -> 200%
        const translatePercent = (activeViewType - 1) * 100;
        pill.style.transform = `translateX(${translatePercent}%)`;
    }

    tabs.forEach(tab => {
        const hasDataset = tab as HTMLElement;
        const viewType = parseInt(hasDataset.dataset.viewType || '1');
        if (viewType === activeViewType) {
            // Active state
            tab.classList.add('active', 'text-slate-800');
            tab.classList.remove('text-slate-500', 'hover:text-slate-700');
        } else {
            // Inactive state
            tab.classList.remove('active', 'text-slate-800');
            tab.classList.add('text-slate-500', 'hover:text-slate-700');
        }
    });
    currentViewType = activeViewType;
}

/**
 * Initialize view type tab click handlers
 */
function initViewTypeTabs() {
    const tabs = document.querySelectorAll('.view-type-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            const viewType = parseInt(tab.dataset.viewType);
            if (viewType === currentViewType) return; // Already active

            updateViewTypeTabs(viewType);

            // Re-render with cached quotation data
            if (cachedQuotation) {
                await renderQuotationView(cachedQuotation, viewType);
            }
        });
    });
}

// Initialize tabs when DOM is ready
document.addEventListener('DOMContentLoaded', initViewTypeTabs);

function normalizeTermsHTML(raw) {
    if (!raw) return '';
    if (/ <\s*(ul|li|ol|p|br|div|h[1-6])/.test(raw) || /<\s*(ul|li|ol|p|br|div|h[1-6])/.test(raw)) return raw;
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return '';
    return `<ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul>`;
}

function getQuotationStatusClass(status) {
    const styles = {
        Draft: 'bg-gray-100 text-gray-700 border-gray-200',
        Sent: 'bg-blue-100 text-blue-700 border-blue-200',
        Approved: 'bg-green-100 text-green-700 border-green-200',
        Rejected: 'bg-red-100 text-red-700 border-red-200',
        Converted: 'bg-purple-100 text-purple-700 border-purple-200',
        Expired: 'bg-orange-100 text-orange-700 border-orange-200'
    };
    return styles[status || 'Draft'] || styles.Draft;
}

/**
 * Generate and display the preview for the quotation in view-preview-content.
 * This works for both withTax and withoutTax view modes.
 */
async function generateViewPreviewHTML(quotation, viewType) {
    // Fetch company data from database
    const company = await window.companyConfig.getCompanyInfo();
    const bank = company.bank_details || {};
    const phoneStr = company.phone.ph1 + (company.phone.ph2 ? ' / ' + company.phone.ph2 : '');

    // ====== Missing variable declarations (fixes ReferenceError) ======
    const CHARS_PER_LINE = 60;
    let allRenderableItems = [];
    let totalTaxableValue = 0;
    let totalTax = 0;
    let totalPrice = 0;
    let sno = 0;
    const headerHTML = await getQuotationHeaderHTML();
    // ===================================================================

    let totalQtySum = 0;
    let totalTaxableSum = 0;
    let totalPriceSum = 0;
    let totalUnitPriceSum = 0;
    let totalItemsTaxSum = 0;

    // Process regular items
    (quotation.items || []).forEach(item => {
        const qty = parseFloat(item.quantity || 0);
        const unitPrice = parseFloat(item.unit_price || 0);
        const taxRate = parseFloat(item.rate || item.Rate || item.gst_rate || 0);
        const description = item.description || '';
        const hsnSac = item.HSN_SAC || item.hsn_sac || '';
        const taxableValue = qty * unitPrice;
        const taxAmount = (taxableValue * taxRate) / 100;
        
        totalQtySum += qty;
        totalTaxableSum += taxableValue;
        totalTaxableValue += taxableValue;
        totalTax += taxAmount;
        totalUnitPriceSum += unitPrice;
        totalItemsTaxSum += taxAmount;
        sno++;

        let itemHTML = "";
        if (viewType === 2) {
            const totalWithTax = taxableValue + taxAmount;
            totalPrice += totalWithTax;
            totalPriceSum += totalWithTax;
            itemHTML = `<tr><td class="text-center">${sno}</td><td class="text-left">${description}</td><td class="text-center">${hsnSac || '-'}</td><td class="text-right">${qty || '-'}</td><td class="text-right">${unitPrice ? '₹&nbsp;' + formatIndian(unitPrice, 2) : '-'}</td><td class="text-right">${taxableValue ? '₹&nbsp;' + formatIndian(taxableValue, 2) : '-'}</td><td class="text-right">${taxRate}%</td><td class="text-right">${totalWithTax ? '₹&nbsp;' + formatIndian(totalWithTax, 2) : '-'}</td></tr>`;
        } else if (viewType === 1) {
            totalPrice += taxableValue;
            totalPriceSum += taxableValue;
            itemHTML = `<tr><td class="text-center">${sno}</td><td class="text-left">${description}</td><td class="text-center">${hsnSac || '-'}</td><td class="text-right">${qty || '-'}</td><td class="text-right">${unitPrice ? '₹&nbsp;' + formatIndian(unitPrice, 2) : '-'}</td><td class="text-right">${taxableValue ? '₹&nbsp;' + formatIndian(taxableValue, 2) : '-'}</td></tr>`;
        } else {
            // Compact view: S.No, Description, Specifications, Qty, Total (With Tax)
            const totalWithTax = taxableValue + taxAmount;
            totalPrice += totalWithTax;
            totalPriceSum += totalWithTax;
            itemHTML = `<tr><td class="text-center">${sno}</td><td class="text-left">${description}</td><td class="text-left">${item.specification || ''}</td><td class="text-center">${qty || '-'}</td><td class="text-right">${totalWithTax ? '₹&nbsp;' + formatIndian(totalWithTax, 2) : '-'}</td></tr>`;
        }
        const rowCount = Math.ceil(description.length / CHARS_PER_LINE) || 1;
        allRenderableItems.push({ html: itemHTML, rowCount: rowCount });
    });

    // Process non-items
    let totalNonItemsPrice = 0;
    (quotation.non_items || []).forEach(item => {
        const price = parseFloat(item.price || 0);
        const taxRate = parseFloat(item.rate || item.Rate || item.gst_rate || 0);
        const description = item.description || '-';
        const taxableValue = price;
        const taxAmount = (taxableValue * taxRate) / 100;
        
        totalTaxableSum += price;
        totalTaxableValue += taxableValue;
        totalTax += taxAmount;
        sno++;

        let nonItemHTML = "";
        if (viewType === 2) {
            const totalWithTax = taxableValue + taxAmount;
            totalNonItemsPrice += totalWithTax;
            totalPriceSum += totalWithTax;
            nonItemHTML = `<tr><td class="text-center">${sno}</td><td class="text-left">${description}</td><td class="text-center">-</td><td class="text-right">-</td><td class="text-right">-</td><td class="text-right">${price ? '₹&nbsp;' + formatIndian(price, 2) : '-'}</td><td class="text-right">${taxRate}%</td><td class="text-right">${totalWithTax ? '₹&nbsp;' + formatIndian(totalWithTax, 2) : '-'}</td></tr>`;
        } else if (viewType === 1) {
            totalNonItemsPrice += taxableValue;
            totalPriceSum += taxableValue;
            nonItemHTML = `<tr><td class="text-center">${sno}</td><td class="text-left">${description}</td><td class="text-center">-</td><td class="text-right">-</td><td class="text-right">-</td><td class="text-right">${price ? '₹&nbsp;' + formatIndian(price, 2) : '-'}</td></tr>`;
        } else {
            // Compact view: include total with tax
            const totalWithTax = taxableValue + taxAmount;
            totalNonItemsPrice += totalWithTax;
            totalPriceSum += totalWithTax;
            nonItemHTML = `<tr><td class="text-center">${sno}</td><td class="text-left">${description}</td><td class="text-left">${item.specification || ''}</td><td class="text-center">-</td><td class="text-right">${totalWithTax ? '₹&nbsp;' + formatIndian(totalWithTax, 2) : '-'}</td></tr>`;
        }
        const rowCount = Math.ceil(description.length / CHARS_PER_LINE) || 1;
        allRenderableItems.push({ html: nonItemHTML, rowCount: rowCount });
    });

    // Grand totals - read directly from quotation totals if saved
    const totals = quotation.totals || {};
    const hasTaxVal = viewType === 2;
    const discountAmount = quotation.discount || 0;

    const taxableValue = totals.taxable_value ?? totalTaxableValue;
    const totalCGST = totals.cgst ?? (totalTax / 2);
    const totalSGST = totals.sgst ?? (totalTax - totalCGST);
    const totalIGST = totals.igst ?? 0;
    const roundOff = (viewType === 1) ? (Math.round(totalPrice + totalNonItemsPrice) - (totalPrice + totalNonItemsPrice)) : (totals.round_off ?? (Math.round(totalPrice + totalNonItemsPrice) - (totalPrice + totalNonItemsPrice)));
    const grandTotal = (viewType === 1) ? Math.round(totalPrice + totalNonItemsPrice) : (totals.grand_total ?? Math.round(totalPrice + totalNonItemsPrice));

    // Format the date for display (DD/MM/YYYY format)
    const formattedDate = formatDateIndian(quotation.quotation_date);

    // Table headers
    let tableHead = "";
    if (viewType === 2) {
        tableHead = `<th class="text-center">Sr. No</th><th class="text-left">Description</th><th class="text-center">HSN/SAC</th><th class="text-right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Taxable Value</th><th class="text-right">Tax</th><th class="text-right">Total</th>`;
    } else if (viewType === 1) {
        tableHead = `<th class="text-center">Sr. No</th><th class="text-left">Description</th><th class="text-center">HSN/SAC</th><th class="text-right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th>`;
    } else {
        // Compact: S.No, Description, Specifications, Qty, Total (With Tax)
        tableHead = `<th class="text-center">Sr. No</th><th class="text-left">Description</th><th class="text-left">Specifications</th><th class="text-center">Qty</th><th class="text-right">Total</th>`;
    }

    // Totals HTML
    let totalsHTML = "";
    if (hasTaxVal) {
        totalsHTML = `
        <div style="display: flex; width: 100%;">
            <div class="totals-section-sub1" style="width: 55%;">
                <p>Subtotal:</p>
                ${totalIGST > 0 ? `
                <p>Total IGST:</p>` : `
                <p>Total CGST:</p>
                <p>Total SGST:</p>`}
                ${discountAmount > 0 ? `<p>Discount:</p>` : ""}
                <p>Round Off:</p>
                <p>Grand Total:</p>
            </div>
            <div class="totals-section-sub2" style="width: 45%;">
                <p>₹ ${formatIndian(taxableValue, 2)}</p>
                ${totalIGST > 0 ? `
                <p>₹ ${formatIndian(totalIGST, 2)}</p>` : `
                <p>₹ ${formatIndian(totalCGST, 2)}</p>
                <p>₹ ${formatIndian(totalSGST, 2)}</p>`}
                ${discountAmount > 0 ? `<p>-₹ ${formatIndian(discountAmount, 2)}</p>` : ""}
                <p>₹ ${roundOff >= 0 ? "+" : ""}${formatIndian(roundOff, 2)}</p>
                <p>₹ ${formatIndian(grandTotal, 2)}</p>
            </div>
        </div>`;
    } else {
        // Compact view: only Grand Total
        totalsHTML = `
        <div style="display: flex; width: 100%;">
            <div class="totals-section-sub1" style="width: 55%;">
                <p><strong>Grand Total:</strong></p>
            </div>
            <div class="totals-section-sub2" style="width: 45%;">
                <p><strong>₹ ${formatIndian(grandTotal, 2)}</strong></p>
            </div>
        </div>`;
    }

    let totalsRowHTML = "";
    if (viewType === 2) {
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
    } else if (viewType === 1) {
        totalsRowHTML = `
            <tr class="totals-row">
                <td colspan="3" class="text-left">TOTAL</td>
                <td class="text-right">${totalQtySum}</td>
                <td class="text-right">₹&nbsp;${formatIndian(totalUnitPriceSum, 2)}</td>
                <td class="text-right">₹&nbsp;${formatIndian(totalPriceSum, 2)}</td>
            </tr>
        `;
    } else {
        // Compact view: TOTAL row with qty and total with tax
        totalsRowHTML = `
            <tr class="totals-row">
                <td colspan="3" class="text-left">TOTAL</td>
                <td class="text-center">${totalQtySum}</td>
                <td class="text-right">₹&nbsp;${formatIndian(totalPriceSum, 2)}</td>
            </tr>
        `;
    }

    const ITEMS_PER_PAGE = 20;
    const SUMMARY_SECTION_ROW_COUNT = 8;

    const itemPages = [];
    let currentPageItemsHTML = '';
    let currentPageRowCount = 0;

    allRenderableItems.forEach((item, index) => {
        const isLastItem = index === allRenderableItems.length - 1;
        const itemSpace = item.rowCount;
        const requiredSpaceForLastItem = itemSpace + SUMMARY_SECTION_ROW_COUNT;

        if (currentPageRowCount > 0 && ((!isLastItem && currentPageRowCount + itemSpace > ITEMS_PER_PAGE) || (isLastItem && currentPageRowCount + requiredSpaceForLastItem > ITEMS_PER_PAGE))) {
            itemPages.push(currentPageItemsHTML);
            currentPageItemsHTML = '';
            currentPageRowCount = 0;
        }
        currentPageItemsHTML += item.html;
        currentPageRowCount += item.rowCount;
    });

    if (currentPageItemsHTML !== '') {
        itemPages.push(currentPageItemsHTML);
    }

    const itemsPageHTML = itemPages.map((pageHTML, index) => {
        const isLastItemsPage = index === itemPages.length - 1;
        const contentHTML = isLastItemsPage ? (pageHTML + totalsRowHTML) : pageHTML;
        return `
        <div class="preview-container doc-quotation">
            ${headerHTML}
            <div class="items-section">
                ${index === 0 ? `<div class="table headline-section"><p><u>${quotation.headline || 'Items and Charges'}</u></p></div>` : ''}
                <table class="items-table"><thead><tr>${tableHead}</tr></thead><tbody>${contentHTML}</tbody></table>
            </div>
            ${!isLastItemsPage ? `<div class="continuation-text">Continued on next page...</div>` : ''}
            ${isLastItemsPage ? `
            <div class="fifth-section">
                <div class="fifth-section-sub1">
                    <div class="fifth-section-sub2">
                        <div class="fifth-section-sub3"><p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p><p class="fifth-section-sub3-2"><span>${numberToWords(grandTotal)} Only</span></p></div>
                        <h3>Payment Details:</h3>
                        <div class="bank-details">
                            <div class="QR-code bank-details-sub1"><img src="../assets/shresht-systems-payment-QR-code.jpg" alt="qr-code" /></div>
                            <div class="bank-details-sub2"><p><strong>Account Holder Name: </strong>${bank.account_holder_name || company.company || company.company_name}</p><p><strong>Bank Name: </strong>${bank.bank_name || ''}</p><p><strong>Branch Name: </strong>${bank.branch || ''}</p><p><strong>Account No: </strong>${bank.account_number || ''}</p><p><strong>IFSC Code: </strong>${bank.ifsc_code || ''}</p></div>
                        </div>
                    </div>
                    <div class="totals-section">${totalsHTML}</div>
                </div>
            </div>
            <div class="notes-section">
                <p><strong>Notes:</strong></p>
                <ul>
                    ${(quotation.notes || []).map(note => `<li>${note}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            <footer><p>This is a computer-generated quotation.</p></footer>
        </div>`;
    }).join('');

    // --- FINAL HTML ASSEMBLY ---
    document.getElementById("view-preview-content").innerHTML = `
    <div class="preview-container doc-quotation">
        ${headerHTML}
        <div class="title">Quotation-${quotation.quotation_id}</div>
        <div class="quotation-letter-date">
            <p><strong>Date:</strong> ${formattedDate}</p>
        </div>
        <div class="quotation-letter-content">
            <p><strong>To:</strong><br>${quotation.customer_name}<br>${quotation.customer_address}<br>${quotation.customer_phone}${quotation.customer_GSTIN ? '<br>GSTIN: ' + quotation.customer_GSTIN : ''}</p>
            <p><strong>Subject:</strong> ${quotation.subject || ''}</p>
            <p>Dear ${quotation.customer_name},</p>
            <p>${quotation.letter_1 || ''}</p>
            <p>Our proposal includes:</p>
            <ul>${(quotation.letter_2 || []).map(li => `<li>${li}</li>`).join('')}</ul>
            <p>${quotation.letter_3 || ''}</p>
            <p>We look forward to your positive response and the opportunity to collaborate with you.</p>
            <p>Best regards,</p>
            <p><strong>${company.company}</strong><br>Ph: ${phoneStr}<br>Email: ${company.email}<br>Website: ${company.website}</p>
        </div>
        <footer><p>This is a computer-generated quotation.</p></footer>
    </div>
    ${itemsPageHTML}
    <div class="preview-container doc-quotation">
        ${headerHTML}
        <div class="terms-section">${normalizeTermsHTML(quotation.termsAndConditions || '')}</div>
        <div class="closing-section">
            <p>We look forward to your order confirmation. Please contact us for any further technical or commercial clarifications.</p>
            <p>Thanking you,</p>
            <p><strong>For ${company.company},</strong><br>Mob: +91 ${phoneStr}</p>
        </div>
        <footer><p>This is a computer-generated quotation.</p></footer>
    </div>`;
}

/**
 * Render the quotation view with the given data and view type
 * Separated from fetching to allow tab switching without re-fetching
 */
async function renderQuotationView(quotation, viewType) {
    const detailViewType = 2; // Always render upper details card and tables using static with-tax layout

    // Fill Project Details
    document.getElementById('view-project-name').textContent = quotation.project_name || '-';
    document.getElementById('view-project-id').textContent = quotation.quotation_id || '-';
    
    // Click-to-copy Quotation ID with premium visual feedback
    const copyBtn = document.getElementById('copy-quotation-id-btn');
    if (copyBtn) {
        const newCopyBtn = copyBtn.cloneNode(true) as HTMLButtonElement;
        copyBtn.parentNode?.replaceChild(newCopyBtn, copyBtn);
        newCopyBtn.addEventListener('click', async () => {
            const qId = quotation.quotation_id || quotation.quotation_no || '';
            if (qId && qId !== '-') {
                try {
                    await navigator.clipboard.writeText(qId);
                    const icon = newCopyBtn.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-check text-green-500 text-lg';
                        const originalTitle = newCopyBtn.title;
                        newCopyBtn.title = 'Copied!';
                        setTimeout(() => {
                            icon.className = 'far fa-copy text-lg';
                            newCopyBtn.title = originalTitle;
                        }, 2000);
                    }
                    if (typeof showToast === 'function') {
                        showToast('Quotation ID copied to clipboard!');
                    }
                } catch (err) {
                    console.error('Failed to copy text: ', err);
                }
            }
        });
    }

    document.getElementById('view-quotation-date').textContent = formatDateIndian(quotation.quotation_date) || '-';
    const statusEl = document.getElementById('view-quotation-status');
    if (statusEl) {
        statusEl.textContent = quotation.quotation_status || 'Draft';
        statusEl.className = `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getQuotationStatusClass(quotation.quotation_status)}`;
    }
    const validTillEl = document.getElementById('view-valid-till');
    if (validTillEl) validTillEl.textContent = quotation.valid_till ? formatDateIndian(quotation.valid_till) : '-';

    // Buyer Details
    document.getElementById('view-buyer-name').textContent = quotation.customer_name || '-';
    document.getElementById('view-buyer-address').textContent = quotation.customer_address || '-';
    document.getElementById('view-buyer-phone').textContent = quotation.customer_phone || '-';
    document.getElementById('view-buyer-email').textContent = quotation.customer_email || '-';
    document.getElementById('view-buyer-gstin').textContent = quotation.customer_GSTIN || '-';

    // Calculation variables
    let totalTaxable = 0, totalTax = 0, grandTotal = 0;

    // Item List - combine items and non-items
    const viewItemsTableBody = document.querySelector("#view-items-table tbody");
    const viewItemsTableFoot = document.querySelector("#view-items-table tfoot");
    const viewSpecificationsTableBody = document.querySelector("#view-specifications-table tbody");
    viewItemsTableBody.innerHTML = "";
    viewSpecificationsTableBody.innerHTML = "";

    let itemNumber = 1;
    let totalQty = 0;
    const itemsList = quotation.items || [];

    if (itemsList.length === 0) {
        const colSpan = detailViewType === 2 ? 7 : 6;
        viewItemsTableBody.innerHTML = `<tr><td colspan="${colSpan}" class="px-4 py-8 text-center text-gray-500 font-medium bg-gray-50 border-b border-gray-200">No items found</td></tr>`;
    }

    // Process regular items
    itemsList.forEach(item => {
        const qty = parseFloat(item.quantity || 0);
        const unitPrice = parseFloat(item.unit_price || 0);
        const taxRate = parseFloat(item.rate || item.Rate || item.gst_rate || 0);
        const taxableValue = qty * unitPrice;
        const taxAmount = (taxableValue * taxRate) / 100;
        let totalWithTax = taxableValue + taxAmount;

        totalQty += qty;
        totalTaxable += taxableValue;
        totalTax += taxAmount;
        // Note: grandTotal is accumulated here but will be rounded at the end
        grandTotal += (detailViewType === 2 || detailViewType === 3) ? totalWithTax : taxableValue;

        const row = document.createElement("tr");
        if (detailViewType === 2) {
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${item.HSN_SAC || item.hsn_sac || '-'}</td>
                <td class="px-4 py-3 text-sm text-right text-gray-900 tabular-nums">${item.quantity || '-'}</td>
                <td class="px-4 py-3 text-sm text-right text-gray-900 tabular-nums">₹ ${formatIndian(item.unit_price, 2) || '-'}</td>
                <td class="px-4 py-3 text-sm text-right text-gray-900">${taxRate}%</td>
                <td class="px-4 py-3 text-sm text-right font-semibold text-blue-600 tabular-nums">₹ ${totalWithTax ? formatIndian(totalWithTax, 2) : '-'}</td>
            `;
        } else if (detailViewType === 1) {
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${item.HSN_SAC || item.hsn_sac || '-'}</td>
                <td class="px-4 py-3 text-sm text-right text-gray-900 tabular-nums">${item.quantity || '-'}</td>
                <td class="px-4 py-3 text-sm text-right text-gray-900 tabular-nums">₹ ${formatIndian(item.unit_price, 2) || '-'}</td>
                <td class="px-4 py-3 text-sm text-right font-semibold text-blue-600 tabular-nums">₹ ${taxableValue ? formatIndian(taxableValue, 2) : '-'}</td>
            `;
        } else {
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${item.specification || '-'}</td>
                <td class="px-4 py-3 text-sm text-center text-gray-900">${item.quantity || '-'}</td>
                <td class="px-4 py-3 text-sm text-right text-gray-900">${taxRate}%</td>
                <td class="px-4 py-3 text-sm text-right font-semibold text-blue-600 tabular-nums">₹ ${totalWithTax ? formatIndian(totalWithTax, 2) : '-'}</td>
            `;
        }
        viewItemsTableBody.appendChild(row);

        // Add to specifications table
        const specRow = document.createElement("tr");
        specRow.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.specification || '-'}</td>
        `;
        viewSpecificationsTableBody.appendChild(specRow);
        itemNumber++;
    });

    // Populate Items totals footer
    if (viewItemsTableFoot && itemsList.length > 0) {
        if (detailViewType === 2) {
            viewItemsTableFoot.innerHTML = `
                <tr>
                    <td colspan="3" class="px-4 py-3 text-left font-bold text-gray-900">Totals</td>
                    <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">${totalQty}</td>
                    <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">₹ ${formatIndian(totalTaxable, 2)}</td>
                    <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">${totalTax > 0 ? '₹ ' + formatIndian(totalTax, 2) : '-'}</td>
                    <td class="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">₹ ${formatIndian(grandTotal, 2)}</td>
                </tr>
            `;
        } else if (detailViewType === 1) {
            viewItemsTableFoot.innerHTML = `
                <tr>
                    <td colspan="3" class="px-4 py-3 text-left font-bold text-gray-900">Totals</td>
                    <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">${totalQty}</td>
                    <td class="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">₹ ${formatIndian(totalTaxable, 2)}</td>
                    <td class="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">₹ ${formatIndian(totalTaxable, 2)}</td>
                </tr>
            `;
        } else {
            viewItemsTableFoot.innerHTML = `
                <tr>
                    <td colspan="3" class="px-4 py-3 text-left font-bold text-gray-900">Totals</td>
                    <td class="px-4 py-3 text-center font-bold text-gray-900 tabular-nums">${totalQty}</td>
                    <td class="px-4 py-3"></td>
                    <td class="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">₹ ${formatIndian(grandTotal, 2)}</td>
                </tr>
            `;
        }
    } else if (viewItemsTableFoot) {
        viewItemsTableFoot.innerHTML = "";
    }

    // Process non-items (Other Charges) into a separate table
    const viewNonItemsTableBody = document.querySelector("#view-non-items-table tbody");
    const viewNonItemsTableHead = document.querySelector("#view-non-items-table thead tr");
    const viewNonItemsTableFoot = document.querySelector("#view-non-items-table tfoot");
    const nonItemsList = quotation.non_items || [];

    if (viewNonItemsTableHead) {
        if (nonItemsList.length === 0) {
            viewNonItemsTableHead.innerHTML = "";
        } else if (detailViewType === 2) {
            viewNonItemsTableHead.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">S. No</th>
                <th class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Description</th>
                <th class="px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Price</th>
                <th class="px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Tax</th>
            `;
        } else {
            viewNonItemsTableHead.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">S. No</th>
                <th class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Description</th>
                <th class="px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Tax %</th>
                <th class="px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">Total (With Tax)</th>
            `;
        }
    }

    // Prepare totals for non-items
    let view_nonItemsTaxable = 0;
    let view_nonItemsCGST = 0;
    let view_nonItemsSGST = 0;
    let view_nonItemsGrandTotal = 0;

    const noOtherChargesMsg = document.getElementById("no-other-charges-msg");
    const otherChargesContent = document.getElementById("other-charges-content");

    if (nonItemsList.length === 0) {
        if (noOtherChargesMsg) noOtherChargesMsg.classList.remove("hidden");
        if (otherChargesContent) otherChargesContent.classList.add("hidden");
    } else {
        if (noOtherChargesMsg) noOtherChargesMsg.classList.add("hidden");
        if (otherChargesContent) otherChargesContent.classList.remove("hidden");
    }

    if (viewNonItemsTableBody) {
        viewNonItemsTableBody.innerHTML = "";
        
        let nonItemNumber = 1;
        nonItemsList.forEach(item => {
            const price = parseFloat(item.price || 0);
            const rate = parseFloat(item.rate || item.Rate || item.gst_rate || 0);
            const cgst = (price * (rate / 2)) / 100;
            const sgst = (price * (rate / 2)) / 100;
            const rowTotal = (detailViewType === 2 || detailViewType === 3) ? (price + cgst + sgst) : price;

            view_nonItemsTaxable += price;
            if (detailViewType === 2 || detailViewType === 3) {
                view_nonItemsCGST += cgst;
                view_nonItemsSGST += sgst;
            }
            view_nonItemsGrandTotal += rowTotal;

            const row = document.createElement("tr");
            row.className = "border-b border-gray-200 hover:bg-gray-50";
            if (detailViewType === 2) {
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-900">${nonItemNumber}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                    <td class="px-4 py-3 text-sm text-right font-semibold text-gray-900 tabular-nums">₹ ${price ? formatIndian(price, 2) : '-'}</td>
                    <td class="px-4 py-3 text-sm text-right text-gray-700">${rate}%</td>
                `;
            } else {
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-900">${nonItemNumber}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                    <td class="px-4 py-3 text-sm text-right text-gray-700">${rate}%</td>
                    <td class="px-4 py-3 text-sm text-right font-semibold text-gray-900 tabular-nums">₹ ${rowTotal ? formatIndian(rowTotal, 2) : '-'}</td>
                `;
            }
            viewNonItemsTableBody.appendChild(row);

            // Keep adding specification rows for backward compatibility
            const specRow = document.createElement("tr");
            specRow.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${item.specification || '-'}</td>
            `;
            viewSpecificationsTableBody.appendChild(specRow);

            nonItemNumber++;
            itemNumber++;
        });

        // Populate Non-Items totals footer
        if (viewNonItemsTableFoot && nonItemsList.length > 0) {
            if (detailViewType === 2) {
                viewNonItemsTableFoot.innerHTML = `
                    <tr>
                        <td colspan="2" class="px-4 py-3 text-left font-bold text-gray-900">Totals</td>
                        <td class="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">₹ ${formatIndian(view_nonItemsTaxable, 2)}</td>
                        <td class="px-4 py-3"></td>
                    </tr>
                `;
            } else {
                viewNonItemsTableFoot.innerHTML = `
                    <tr>
                        <td colspan="2" class="px-4 py-3 text-left font-bold text-gray-900">Totals</td>
                        <td class="px-4 py-3"></td>
                        <td class="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">₹ ${formatIndian(view_nonItemsGrandTotal, 2)}</td>
                    </tr>
                `;
            }
        } else if (viewNonItemsTableFoot) {
            viewNonItemsTableFoot.innerHTML = "";
        }
    }

    // Add non-items totals to main totals
    totalTaxable += view_nonItemsTaxable;
    if (detailViewType === 2) {
        totalTax += (view_nonItemsCGST + view_nonItemsSGST);
    }
    grandTotal += view_nonItemsGrandTotal;

    // Set totals (professional 3-box layout) - round off grand total
    const subtotal = totalTaxable;
    const tax = totalTax;
    const total = Math.round(grandTotal);

    document.getElementById('view-subtotal').textContent = `₹ ${formatIndian(subtotal, 2) || '-'}`;
    document.getElementById('view-tax').textContent = detailViewType === 2 ? `₹ ${formatIndian(tax, 2) || '-'}` : 'No Tax';
    document.getElementById('view-grand-total').textContent = `₹ ${formatIndian(total, 2) || '-'}`;
    const totals = quotation.totals || {};
    const cgstEl = document.getElementById('view-cgst');
    const sgstEl = document.getElementById('view-sgst');
    const roundOffEl = document.getElementById('view-round-off');
    if (cgstEl) cgstEl.textContent = `₹ ${formatIndian(detailViewType === 1 ? 0 : (totals.cgst ?? (tax / 2)), 2)}`;
    if (sgstEl) sgstEl.textContent = `₹ ${formatIndian(detailViewType === 1 ? 0 : (totals.sgst ?? (tax / 2)), 2)}`;
    if (roundOffEl) roundOffEl.textContent = `₹ ${formatIndian(detailViewType === 1 ? (total - grandTotal) : (totals.round_off ?? (total - grandTotal)), 2)}`;

    // Update table header based on view type
    const tableHead = document.querySelector("#view-items-table thead tr");
    if (tableHead) {
        if ((quotation.items || []).length === 0) {
            tableHead.innerHTML = "";
        } else if (detailViewType === 2) {
            tableHead.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">S. No</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Description</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">HSN/SAC</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Qty</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Unit Price</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Tax</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Total</th>
            `;
        } else if (detailViewType === 1) {
            tableHead.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">S. No</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Description</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">HSN/SAC</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Qty</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Unit Price</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Total</th>
            `;
        } else {
            // Compact view: S.No, Description, Specifications, Qty, Tax %, Total (With Tax)
            tableHead.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">S. No</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Description</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Specifications</th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Qty</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Tax %</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Total</th>
            `;
        }
    }

    // Task 3: Show/hide subtotal and round-off cards based on view type
    const subtotalCard = document.getElementById('view-subtotal')?.closest('.bg-gray-50');
    const roundOffCard = document.getElementById('view-round-off')?.closest('.bg-gray-50');
    const taxCard = document.getElementById('view-tax')?.closest('.bg-gray-50');
    const cgstCard = document.getElementById('view-cgst')?.closest('.bg-gray-50');
    const sgstCard = document.getElementById('view-sgst')?.closest('.bg-gray-50');

    if (detailViewType === 3) {
        // Compact: hide subtotal, tax(GST), CGST, SGST, round off — only show grand total
        if (subtotalCard) (subtotalCard as HTMLElement).style.display = 'none';
        if (roundOffCard) (roundOffCard as HTMLElement).style.display = 'none';
        if (taxCard) (taxCard as HTMLElement).style.display = 'none';
        if (cgstCard) (cgstCard as HTMLElement).style.display = 'none';
        if (sgstCard) (sgstCard as HTMLElement).style.display = 'none';
    } else {
        // Restore all cards for other views
        if (subtotalCard) (subtotalCard as HTMLElement).style.display = '';
        if (roundOffCard) (roundOffCard as HTMLElement).style.display = '';
        if (taxCard) (taxCard as HTMLElement).style.display = '';
        if (cgstCard) (cgstCard as HTMLElement).style.display = '';
        if (sgstCard) (sgstCard as HTMLElement).style.display = '';
    }

    // Show the preview in view-preview-content
    await generateViewPreviewHTML(quotation, viewType);

    // Print and Save as PDF handlers - use currentViewType for consistency
    document.getElementById('printProject').onclick = () => {
        const content = document.getElementById('view-preview-content').innerHTML;
        if (window.electronAPI && window.electronAPI.handlePrintEventQuatation) {
            let name = `Quotation-${quotation.quotation_id}`;
            window.electronAPI.handlePrintEventQuatation(content, "print", name);
        } else {
            window.print();
        }
    };
    document.getElementById('saveProjectPDF').onclick = () => {
        const content = document.getElementById('view-preview-content').innerHTML;
        if (window.electronAPI && window.electronAPI.handlePrintEventQuatation) {
            let name = `Quotation-${quotation.quotation_id}`;
            window.electronAPI.handlePrintEventQuatation(content, "savePDF", name);
        } else {
            window.print();
        }
    };

    const dangerZoneSection = document.getElementById('danger-zone-section');
    if (dangerZoneSection) {
        dangerZoneSection.classList.remove('hidden');
    }

    const rejectBtn = document.getElementById('ejectQuotationBtn');
    if (rejectBtn) {
        const newRejectBtn = rejectBtn.cloneNode(true) as HTMLButtonElement;
        rejectBtn.parentNode?.replaceChild(newRejectBtn, rejectBtn);
        if (quotation.quotation_status === 'Rejected') {
            newRejectBtn.disabled = true;
            newRejectBtn.classList.add('opacity-60', 'cursor-not-allowed');
            newRejectBtn.innerHTML = '<i class="fas fa-check-circle"></i> Already Rejected';
        }
        newRejectBtn.addEventListener('click', async () => {
            const confirmMsg = `Are you sure you want to mark Quotation "${quotation.quotation_id}" as Rejected?`;
            const electronAPI = (window as any).electronAPI;
            const perform = async () => {
                try {
                    const urlId = quotation.quotation_id || quotation.quotation_no;
                    const res = await fetch(`/quotation/${encodeURIComponent(urlId)}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ quotation_status: 'Rejected' })
                    });
                    if (!res.ok) throw new Error('Failed to update status');
                    const data = await res.json();
                    const updated = data.quotation || data;
                    const statusElLocal = document.getElementById('view-quotation-status');
                    if (statusElLocal) {
                        statusElLocal.textContent = updated.quotation_status || 'Rejected';
                        statusElLocal.className = `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getQuotationStatusClass(updated.quotation_status)}`;
                    }
                    if (typeof showToast === 'function') showToast('Quotation marked as Rejected');
                    const homeBtnEl = document.getElementById('home-btn');
                    if (homeBtnEl) homeBtnEl.click();
                } catch (err) {
                    console.error('Failed to reject quotation', err);
                    (window as any).electronAPI?.showAlert1('Failed to mark quotation as Rejected.');
                }
            };

            if (electronAPI?.showAlert2 && electronAPI?.receiveAlertResponse) {
                electronAPI.showAlert2(confirmMsg);
                electronAPI.receiveAlertResponse((response: string) => {
                    if (response === 'Yes') perform();
                });
            } else if (confirm(confirmMsg)) {
                await perform();
            }
        });
    }

    // Show and wire up the Convert to Invoice button
    const convertToInvoiceSection = document.getElementById('convert-to-invoice-section');
    if (convertToInvoiceSection) {
        convertToInvoiceSection.classList.remove('hidden');
    }
    const convertToInvoiceBtn = document.getElementById('convertToInvoiceBtn');
    if (convertToInvoiceBtn) {
        const newConvertBtn = convertToInvoiceBtn.cloneNode(true) as HTMLButtonElement;
        convertToInvoiceBtn.parentNode?.replaceChild(newConvertBtn, convertToInvoiceBtn);
        newConvertBtn.addEventListener('click', () => {
            // quotation.quotation_id is mapped to quotation_no (e.g. "QUO-001"), which the backend route accepts
            const displayId = quotation.quotation_id || quotation.quotation_no;
            sessionStorage.setItem('quotation-to-invoice-id', displayId);
            sessionStorage.setItem('currentTab-status', 'new');
            // Navigate to the invoice module
            window.location.href = '../invoice/invoice.html';
        });
    }

    const deleteBtn = document.getElementById('deleteQuotationBtn');
    if (deleteBtn) {
        const newDeleteBtn = deleteBtn.cloneNode(true) as HTMLButtonElement;
        deleteBtn.parentNode?.replaceChild(newDeleteBtn, deleteBtn);
        newDeleteBtn.addEventListener('click', () => {
            const electronAPI = (window as any).electronAPI;
            if (electronAPI?.showAlert2 && electronAPI?.receiveAlertResponse) {
                electronAPI.showAlert2(`Are you sure you want to delete Quotation "${quotation.quotation_id}"?`);
                
                electronAPI.receiveAlertResponse((response: string) => {
                    if (response === 'Yes') {
                        if (typeof (window as any).deleteDocument === 'function') {
                            (window as any).deleteDocument('quotation', quotation.quotation_id, 'Quotation', () => {
                                const homeBtnEl = document.getElementById('home-btn');
                                if (homeBtnEl) {
                                    homeBtnEl.click();
                                    
                                    // Refresh the list view automatically
                                    const refreshBtnEl = document.getElementById('refresh-btn');
                                    if (refreshBtnEl) refreshBtnEl.click();
                                } else {
                                    window.location.reload();
                                }
                            });
                        }
                    }
                });
            } else {
                if (confirm(`Are you sure you want to delete Quotation "${quotation.quotation_id}"?`)) {
                    if (typeof (window as any).deleteDocument === 'function') {
                        (window as any).deleteDocument('quotation', quotation.quotation_id, 'Quotation', () => {
                            window.location.href = '/quotation/quotation.html';
                        });
                    }
                }
            }
        });
    }

    const archiveBtn = document.getElementById('archiveQuotationBtn');
    if (archiveBtn) {
        const newArchiveBtn = archiveBtn.cloneNode(true) as HTMLButtonElement;
        archiveBtn.parentNode?.replaceChild(newArchiveBtn, archiveBtn);
        newArchiveBtn.innerHTML = quotation.is_archived
            ? '<i class="fas fa-box-open"></i> Restore from Archive'
            : '<i class="fas fa-archive"></i> Archive Quotation';
        newArchiveBtn.addEventListener('click', async () => {
            const action = quotation.is_archived ? 'restore' : 'archive';
            const message = `Are you sure you want to ${action} Quotation "${quotation.quotation_id}"?`;
            const execute = async () => {
                try {
                    if (quotation.is_archived) {
                        await (window as any).restoreQuotationFromArchive(quotation.quotation_id);
                    } else {
                        await (window as any).archiveQuotation(quotation.quotation_id);
                    }
                    document.getElementById('home-btn')?.click();
                } catch (error) {
                    (window as any).electronAPI?.showAlert1(`Failed to ${action} quotation.`);
                }
            };
            const electronAPI = (window as any).electronAPI;
            if (electronAPI?.showAlert2 && electronAPI?.receiveAlertResponse) {
                electronAPI.showAlert2(message);
                electronAPI.receiveAlertResponse((response: string) => {
                    if (response === 'Yes') execute();
                });
            } else if (confirm(message)) {
                await execute();
            }
        });
    }

}

async function viewQuotation(quotationId, viewType) {
    try {
        const response = await fetch(`/quotation/${quotationId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch quotation");
        }

        const data = await response.json();
        const rawQuotation = data.quotation;

        // Map backend schema to the flat structure expected by the frontend
        const quotation = {
            ...rawQuotation,
            quotation_id: rawQuotation.quotation_no || rawQuotation.quotation_id,
            quotation_status: rawQuotation.quotation_status || 'Draft',
            valid_till: rawQuotation.valid_till,
            customer_name: rawQuotation.customer_snapshot?.name || rawQuotation.customer_name,
            customer_address: (() => {
                const b = rawQuotation.customer_snapshot?.billing_address;
                if (!b) return rawQuotation.customer_address;
                if (typeof b === 'string') return b;
                const parts = [b.line1, b.line2, b.city, b.state, b.pincode, b.country].filter(p => p && typeof p === 'string' && p.trim() !== '');
                return parts.length > 0 ? parts.join(', ') : rawQuotation.customer_address;
            })(),
            customer_phone: rawQuotation.customer_snapshot?.phone || rawQuotation.customer_phone,
            customer_email: rawQuotation.customer_snapshot?.email || rawQuotation.customer_email,
            customer_GSTIN: rawQuotation.customer_snapshot?.gstin || rawQuotation.customer_GSTIN,
            non_items: rawQuotation.other_charges || rawQuotation.non_items || [],
            subject: rawQuotation.content?.subject || rawQuotation.subject,
            letter_1: rawQuotation.content?.letter_1 || rawQuotation.letter_1,
            letter_2: rawQuotation.content?.letter_2 || rawQuotation.letter_2,
            letter_3: rawQuotation.content?.letter_3 || rawQuotation.letter_3,
            headline: rawQuotation.content?.headline || rawQuotation.headline,
            notes: rawQuotation.content?.notes || rawQuotation.notes,
            termsAndConditions: rawQuotation.content?.terms_and_conditions || rawQuotation.termsAndConditions,
            total_amount_tax: rawQuotation.totals?.grand_total || rawQuotation.total_amount_tax
        };

        // Cache quotation for tab switching
        cachedQuotation = quotation;
        currentViewType = viewType;

        // Update tab styling to match the requested view type
        updateViewTypeTabs(viewType);

        // Hide other sections, show view section
        document.getElementById('view-preview').style.display = 'none';
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'none';
        document.getElementById('view').style.display = 'block';

        // Hide trash button while in view mode
        const trashBtnEl = document.getElementById('showDeletedBtn');
        if (trashBtnEl) trashBtnEl.style.display = 'none';

        const homeBtnEl = document.getElementById('home-btn');
        if (homeBtnEl) homeBtnEl.style.display = '';

        // Render the view with fetched data
        await renderQuotationView(quotation, viewType);

    } catch (error) {
        console.error("Error fetching quotation:", error);
        window.electronAPI?.showAlert1("Failed to fetch quotation. Please try again later.");
    }
}

// Expose viewQuotation globally for use in other scripts
window.viewQuotation = viewQuotation;
