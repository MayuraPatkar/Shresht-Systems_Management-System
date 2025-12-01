function getQuotationHeaderHTML() {
    if (window.SectionRenderers && typeof window.SectionRenderers.renderQuotationDocumentHeader === "function") {
        return window.SectionRenderers.renderQuotationDocumentHeader();
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

function normalizeTermsHTML(raw) {
    if (!raw) return '';
    if (/ <\s*(ul|li|ol|p|br|div|h[1-6])/.test(raw) || /<\s*(ul|li|ol|p|br|div|h[1-6])/.test(raw)) return raw;
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return '';
    return `<ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul>`;
}

/**
 * Generate and display the preview for the quotation in view-preview-content.
 * This works for both withTax and withoutTax view modes.
 */
function generateViewPreviewHTML(quotation, viewType) {
    let totalTaxableValue = 0;
    let totalTax = 0;
    let totalPrice = 0;
    let sno = 0;

    const allRenderableItems = [];
    const CHARS_PER_LINE = 60; // Estimated row height for pagination
    const headerHTML = getQuotationHeaderHTML();

    // Process regular items
    (quotation.items || []).forEach(item => {
        const qty = parseFloat(item.quantity || 0);
        const unitPrice = parseFloat(item.unit_price || 0);
        const taxRate = parseFloat(item.rate || 0);
        const description = item.description || '';
        const hsnSac = item.HSN_SAC || '';
        const taxableValue = qty * unitPrice;
        const taxAmount = (taxableValue * taxRate) / 100;
        totalTaxableValue += taxableValue;
        totalTax += taxAmount;
        sno++;

        let itemHTML = "";
        if (viewType === 2) {
            const totalWithTax = taxableValue + taxAmount;
            totalPrice += totalWithTax;
            itemHTML = `<tr><td>${sno}</td><td>${description}</td><td>${hsnSac || '-'}</td><td>${qty || '-'}</td><td>${unitPrice ? formatIndian(unitPrice, 2) : '-'}</td><td>${taxableValue ? formatIndian(taxableValue, 2) : '-'}</td><td>${taxRate}%</td><td>${totalWithTax ? formatIndian(totalWithTax, 2) : '-'}</td></tr>`;
        } else if (viewType === 1) {
            totalPrice += taxableValue;
            itemHTML = `<tr><td>${sno}</td><td>${description}</td><td>${hsnSac || '-'}</td><td>${qty || '-'}</td><td>${unitPrice ? formatIndian(unitPrice, 2) : '-'}</td><td>${taxableValue ? formatIndian(taxableValue, 2) : '-'}</td></tr>`;
        } else {
            totalPrice += taxableValue + taxAmount;
            itemHTML = `<tr><td>${sno}</td><td>${description}</td><td>${item.specification || ''}</td><td>${qty || '-'}</td></tr>`;
        }
        const rowCount = Math.ceil(description.length / CHARS_PER_LINE) || 1;
        allRenderableItems.push({ html: itemHTML, rowCount: rowCount });
    });

    // Process non-items
    let totalNonItemsPrice = 0;
    (quotation.non_items || []).forEach(item => {
        const price = parseFloat(item.price || 0);
        const taxRate = parseFloat(item.rate || 0);
        const description = item.description || '-';
        const taxableValue = price;
        const taxAmount = (taxableValue * taxRate) / 100;
        totalTaxableValue += taxableValue;
        totalTax += taxAmount;
        sno++;

        let nonItemHTML = "";
        if (viewType === 2) {
            const totalWithTax = taxableValue + taxAmount;
            totalNonItemsPrice += totalWithTax;
            nonItemHTML = `<tr><td>${sno}</td><td>${description}</td><td>-</td><td>-</td><td>-</td><td>${price ? formatIndian(price, 2) : '-'}</td><td>${taxRate}%</td><td>${totalWithTax ? formatIndian(totalWithTax, 2) : '-'}</td></tr>`;
        } else if (viewType === 1) {
            totalNonItemsPrice += taxableValue;
            nonItemHTML = `<tr><td>${sno}</td><td>${description}</td><td>-</td><td>-</td><td>-</td><td>${price ? formatIndian(price, 2) : '-'}</td></tr>`;
        } else {
            totalNonItemsPrice += taxableValue;
            nonItemHTML = `<tr><td>${sno}</td><td>${description}</td><td>${item.specification || ''}</td><td>-</td></tr>`;
        }
        const rowCount = Math.ceil(description.length / CHARS_PER_LINE) || 1;
        allRenderableItems.push({ html: nonItemHTML, rowCount: rowCount });
    });

    // Grand totals - round off to nearest rupee
    let grandTotal = Math.round(totalPrice + totalNonItemsPrice);

    // Format the date for display (DD/MM/YYYY format)
    const formattedDate = formatDateIndian(quotation.quotation_date);

    // Table headers
    let tableHead = "";
    if (viewType === 2) {
        tableHead = `<th>Sr. No</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Unit Price</th><th>Taxable Value</th><th>Rate</th><th>Total (With Tax)</th>`;
    } else if (viewType === 1) {
        tableHead = `<th>Sr. No</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Unit Price</th><th>Total</th>`;
    } else {
        tableHead = `<th>Sr. No</th><th>Description</th><th>Specifications</th><th>Qty</th>`;
    }

    // Totals HTML
    let totalsHTML = "";
    if (viewType === 2) {
        const totalCGST = totalTax / 2;
        const totalSGST = totalTax / 2;
        totalsHTML = `
        <div style="display: flex; width: 100%;">
            <div class="totals-section-sub1" style="width: 50%;">
                <p>Taxable Value:</p>
                <p>Total CGST:</p>
                <p>Total SGST:</p>
                <p>Grand Total:</p>
            </div>
            <div class="totals-section-sub2" style="width: 50%;">
                <p>₹ ${formatIndian(totalTaxableValue, 2)}</p>
                <p>₹ ${formatIndian(totalCGST, 2)}</p>
                <p>₹ ${formatIndian(totalSGST, 2)}</p>
                <p>₹ ${formatIndian(grandTotal, 2)}</p>
            </div>
        </div>`;
    } else {
        totalsHTML = `
        <div style="display: flex; width: 100%;">
            <div class="totals-section-sub1" style="width: 50%;">
                <p>Grand Total:</p>
            </div>
            <div class="totals-section-sub2" style="width: 50%;">
                <p>₹ ${formatIndian(grandTotal, 2)}</p>
            </div>
        </div>`;
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
        return `
        <div class="preview-container doc-quotation">
            ${headerHTML}
            <div class="items-section">
                ${index === 0 ? `<div class="table headline-section"><p><u>${quotation.headline || 'Items and Charges'}</u></p></div>` : ''}
                <table class="items-table"><thead><tr>${tableHead}</tr></thead><tbody>${pageHTML}</tbody></table>
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
                            <div class="bank-details-sub2"><p><strong>Account Holder Name: </strong>Shresht Systems</p><p><strong>Bank Name: </strong>Canara Bank</p><p><strong>Branch Name: </strong>Shanthi Nagar Manipal</p><p><strong>Account No: </strong>120002152652</p><p><strong>IFSC Code: </strong>CNRB0010261</p></div>
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
            <p><strong>To:</strong><br>${quotation.customer_name}<br>${quotation.customer_address}<br>${quotation.customer_phone}</p>
            <p><strong>Subject:</strong> ${quotation.subject || ''}</p>
            <p>Dear ${quotation.customer_name},</p>
            <p>${quotation.letter_1 || ''}</p>
            <p>Our proposal includes:</p>
            <ul>${(quotation.letter_2 || []).map(li => `<li>${li}</li>`).join('')}</ul>
            <p>${quotation.letter_3 || ''}</p>
            <p>We look forward to your positive response and the opportunity to collaborate with you.</p>
            <p>Best regards,</p>
            <p><strong>Sandeep Nayak</strong><br><strong>Shresht Systems</strong><br>Ph: 7204657707 / 9901730305<br>Email: shreshtsystems@gmail.com<br>Website: www.shreshtsystems.com</p>
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
            <p><strong>For Shresht Systems,</strong><br>Sandeep Nayak<br>Mob: +91 7204657707 / 9901730305</p>
        </div>
        <footer><p>This is a computer-generated quotation.</p></footer>
    </div>`;
}

async function viewQuotation(quotationId, viewType) {
    try {
        const response = await fetch(`/quotation/${quotationId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch quotation");
        }

        const data = await response.json();
        const quotation = data.quotation;

        // Hide other sections, show view section
        document.getElementById('view-preview').style.display = 'none';
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'none';
        document.getElementById('view').style.display = 'block';

        // Fill Project Details
        document.getElementById('view-project-name').textContent = quotation.project_name || '-';
        document.getElementById('view-project-id').textContent = quotation.quotation_id || '-';
        document.getElementById('view-quotation-date').textContent = formatDateIndian(quotation.quotation_date) || '-';

        // Buyer Details
        document.getElementById('view-buyer-name').textContent = quotation.customer_name || '-';
        document.getElementById('view-buyer-address').textContent = quotation.customer_address || '-';
        document.getElementById('view-buyer-phone').textContent = quotation.customer_phone || '-';
        document.getElementById('view-buyer-email').textContent = quotation.customer_email || '-';

        // Calculation variables
        let totalTaxable = 0, totalTax = 0, grandTotal = 0;

        // Item List - combine items and non-items
        const viewItemsTableBody = document.querySelector("#view-items-table tbody");
        const viewSpecificationsTableBody = document.querySelector("#view-specifications-table tbody");
        viewItemsTableBody.innerHTML = "";
        viewSpecificationsTableBody.innerHTML = "";

        let itemNumber = 1;

        // Process regular items
        (quotation.items || []).forEach(item => {
            const qty = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
            const taxRate = parseFloat(item.rate || 0);
            const taxableValue = qty * unitPrice;
            const taxAmount = (taxableValue * taxRate) / 100;
            let totalWithTax = taxableValue + taxAmount;

            totalTaxable += taxableValue;
            totalTax += taxAmount;
            // Note: grandTotal is accumulated here but will be rounded at the end
            grandTotal += (viewType === 2) ? totalWithTax : taxableValue;

            const row = document.createElement("tr");
            if (viewType === 2) {
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.HSN_SAC || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.quantity || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.unit_price ? formatIndian(item.unit_price, 2) : '-'}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-gray-900">${totalWithTax ? formatIndian(totalWithTax, 2) : '-'}</td>
                `;
            } else if (viewType === 1) {
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.HSN_SAC || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.quantity || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.unit_price ? formatIndian(item.unit_price, 2) : '-'}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-gray-900">${taxableValue ? formatIndian(taxableValue, 2) : '-'}</td>
                `;
            } else {
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.HSN_SAC || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.quantity || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.unit_price ? formatIndian(item.unit_price, 2) : '-'}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-gray-900">${taxRate ? taxRate + '%' : '-'}</td>
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

        // Process non-items
        (quotation.non_items || []).forEach(item => {
            const price = parseFloat(item.price || 0);
            const taxRate = parseFloat(item.rate || 0);
            const taxAmount = (price * taxRate) / 100;
            let totalWithTax = price + taxAmount;

            totalTaxable += price;
            totalTax += taxAmount;
            grandTotal += (viewType === 2) ? totalWithTax : price;

            const row = document.createElement("tr");
            if (viewType === 2) {
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">-</td>
                    <td class="px-4 py-3 text-sm text-gray-900">-</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${price ? formatIndian(price, 2) : '-'}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-gray-900">${totalWithTax ? formatIndian(totalWithTax, 2) : '-'}</td>
                `;
            } else if (viewType === 1) {
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">-</td>
                    <td class="px-4 py-3 text-sm text-gray-900">-</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${price ? formatIndian(price, 2) : '-'}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-gray-900">${price ? formatIndian(price, 2) : '-'}</td>
                `;
            } else {
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">-</td>
                    <td class="px-4 py-3 text-sm text-gray-900">-</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${price ? formatIndian(price, 2) : '-'}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-gray-900">${taxRate ? taxRate + '%' : '-'}</td>
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

        // Set totals (professional 3-box layout) - round off grand total
        const subtotal = totalTaxable;
        const tax = totalTax;
        const total = Math.round(grandTotal);

        document.getElementById('view-subtotal').textContent = `₹ ${formatIndian(subtotal, 2) || '-'}`;
        document.getElementById('view-tax').textContent = viewType === 2 ? `₹ ${formatIndian(tax, 2) || '-'}` : 'No Tax';
        document.getElementById('view-grand-total').textContent = `₹ ${formatIndian(total, 2) || '-'}`;

        // Update table header based on view type
        const tableHead = document.querySelector("#view-items-table thead tr");
        if (viewType === 2) {
            tableHead.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">S. No</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Description</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">HSN/SAC</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Qty</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Unit Price</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Total (With Tax)</th>
            `;
        } else if (viewType === 1) {
            tableHead.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">S. No</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Description</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">HSN/SAC</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Qty</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Unit Price</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Total</th>
            `;
        } else {
            tableHead.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">S. No</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Description</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">HSN/SAC</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Qty</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Unit Price</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Rate</th>
            `;
        }

        // Show the preview in view-preview-content
        generateViewPreviewHTML(quotation, viewType);

        // Print and Save as PDF handlers
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

    } catch (error) {
        console.error("Error fetching quotation:", error);
        window.electronAPI?.showAlert1("Failed to fetch quotation. Please try again later.");
    }
}

// Expose viewQuotation globally for use in other scripts
window.viewQuotation = viewQuotation;