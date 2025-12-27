async function generateViewPreviewHTML(wayBill) {
    // Build items table rows similar to Invoice preview layout
    let itemsHTML = "";
    let sno = 0;
    (wayBill.items || []).forEach(item => {
        const description = item.description || "-";
        const hsnCode = item.HSN_SAC || item.hsn_sac || "-";
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const rate = Number(item.rate || 0);

        const taxableValue = qty * unitPrice;
        const rowTotal = taxableValue + (taxableValue * rate / 100);

        itemsHTML += `
            <tr>
                <td>${++sno}</td>
                <td>${description}</td>
                <td>${hsnCode}</td>
                <td>${qty}</td>
                <td>${formatIndian(unitPrice, 2)}</td>
                ${rate > 0 ? `<td>${formatIndian(taxableValue, 2)}</td><td>${rate.toFixed(2)}</td>` : ''}
                <td>${formatIndian(rowTotal, 2)}</td>
            </tr>`;
    });

    // Totals calculation (match invoice behavior)
    let totalTaxableValue = 0;
    let totalCGST = 0;
    let totalSGST = 0;

    (wayBill.items || []).forEach(item => {
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const rate = Number(item.rate || 0);
        const taxableValue = qty * unitPrice;
        totalTaxableValue += taxableValue;
        if (rate > 0) {
            const cgst = (taxableValue * (rate / 2)) / 100;
            const sgst = (taxableValue * (rate / 2)) / 100;
            totalCGST += cgst;
            totalSGST += sgst;
        }
    });

    const totalTax = totalCGST + totalSGST;
    const grandTotal = Math.round(totalTaxableValue + totalTax);

    // Build paginated pages using the Invoice-style layout
    const itemRows = itemsHTML.split('</tr>').filter(r => r.trim().length > 0).map(r => r + '</tr>');
    const ITEMS_PER_PAGE = 15;
    const SUMMARY_SECTION_ROW_COUNT = 8;

    const pages = [];
    let currentPageHTML = '';
    let currentCount = 0;

    itemRows.forEach((row, idx) => {
        const isLast = idx === itemRows.length - 1;
        const req = 1;

        if (currentCount > 0 && (( !isLast && currentCount + req > ITEMS_PER_PAGE) || (isLast && currentCount + req + SUMMARY_SECTION_ROW_COUNT > ITEMS_PER_PAGE))) {
            pages.push(currentPageHTML);
            currentPageHTML = '';
            currentCount = 0;
        }
        currentPageHTML += row;
        currentCount += req;
    });
    if (currentPageHTML) pages.push(currentPageHTML);

    // Company and header info
    const company = window.companyConfig ? await window.companyConfig.getCompanyInfo() : {};
    const companyName = company?.company || '';
    const companyAddress = company?.address || '';
    const companyPhone = company?.phone ? (company.phone.ph1 + (company.phone.ph2 ? ' / ' + company.phone.ph2 : '')) : '';
    const companyGSTIN = company?.GSTIN || '';
    const companyEmail = company?.email || '';
    const companyWebsite = company?.website || '';
    const bank = company?.bank_details || {};

    const pagesHTML = pages.map((pageHTML, index) => {
        const isLast = index === pages.length - 1;
        return `
        <div class="preview-container doc-standard doc-invoice doc-quotation">
            <div class="header">
                <div class="quotation-brand">
                    <div class="logo"><img src="../assets/icon.png" alt="${companyName} Logo"></div>
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
                    <p>WAYBILL-${wayBill.waybill_id || ''}</p>
                    <p><strong>Date: </strong>${formatDateIndian ? formatDateIndian(wayBill.waybill_date) : (window.formatDate ? window.formatDate(wayBill.waybill_date) : '')}</p>
                </div>
            </div>

            ${index === 0 ? `
            <div class="third-section">
                <div class="buyer-details">
                    <p><strong>Ship To:</strong></p>
                    <p>${wayBill.customer_name || ''}</p>
                    <p>${wayBill.customer_address || ''}</p>
                    <p>Ph. ${wayBill.customer_phone || ''}</p>
                </div>
                <div class="order-info">
                    <p><strong>Project:</strong> ${wayBill.project_name || ''}</p>
                    <p><strong>Transport Mode:</strong> ${wayBill.transport_mode || ''}</p>
                    <p><strong>Vehicle No:</strong> ${wayBill.vehicle_number || ''}</p>
                    <p><strong>Place of Supply:</strong> ${wayBill.place_supply || ''}</p>
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
                            ${ (totalCGST + totalSGST) > 0 ? `<th>Taxable Value (₹)</th><th>Tax Rate (%)</th>` : '' }
                            <th>Total Price (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pageHTML}
                    </tbody>
                </table>
            </div>

            ${ !isLast ? `<div class="continuation-text" style="text-align:center;margin:20px 0;font-style:italic;color:#666;">Continued on next page...</div>` : '' }

            ${ isLast ? `
            <div class="fifth-section">
                <div class="fifth-section-sub1">
                    <div class="fifth-section-sub2">
                        <div class="fifth-section-sub3">
                            <p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p>
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(grandTotal)} Only.</span></p>
                        </div>
                        
                    </div>
                    <div class="totals-section">
                        <div style="display:flex; width:100%;">
                            <div class="totals-section-sub1" style="width:50%;">
                                <p>Grand Total:</p>
                            </div>
                            <div class="totals-section-sub2" style="width:50%;">
                                <p>₹ ${formatIndian(grandTotal, 2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
             <div class="eighth-section">
                <p>For ${companyName}</p>
                <div class="eighth-section-space"></div>
                <p><strong>Authorized Signatory</strong></p>
            </div>
            
            <div class="ninth-section">
                <p>This is a computer-generated way bill.</p>
            </div>
            ` : '' }
        </div>
        `;
    }).join('');

    document.getElementById("view-preview-content").innerHTML = pagesHTML;
}

// Print and Save as PDF handlers (match HTML IDs)
document.getElementById("printProject").addEventListener("click", () => {
    const previewContent = document.getElementById("view-preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        window.electronAPI.handlePrintEvent(previewContent, "print");
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

document.getElementById("saveProjectPDF").addEventListener("click", () => {
    const previewContent = document.getElementById("view-preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        // Use the displayed waybill id for file naming
        const idEl = document.getElementById('view-waybill-id');
        const name = idEl ? `WayBill-${idEl.textContent.replace(/\s+/g, '')}` : 'WayBill';
        window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// NOTE: formatIndian has been moved to public/js/shared/utils.js
// It is now available globally via window.formatIndian

async function viewWayBill(wayBillId) {
    try {
        const response = await fetch(`/wayBill/${wayBillId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch waybill");
        }

        const data = await response.json();
        const waybill = data.wayBill;
        let sno = 0;

            // Hide other sections, show view section (consistent layout)
            document.getElementById('home').style.display = 'none';
            document.getElementById('new').style.display = 'none';
            // Use flex to match other modules' view layout
            const viewEl = document.getElementById('view');
            if (viewEl) viewEl.style.display = 'flex';
            const homeBtn = document.getElementById('new-waybill-btn');
            if (homeBtn) homeBtn.style.display = 'none';
            const previewBtn = document.getElementById('view-preview');
            if (previewBtn) previewBtn.style.display = 'none';

        // Fill Project Details
        document.getElementById('view-project-name').textContent = waybill.project_name || '-';
        document.getElementById('view-waybill-id').textContent = waybill.waybill_id || '-';
        // Display the waybill date if available
        const viewDateEl = document.getElementById('view-waybill-date');
        if (viewDateEl) viewDateEl.textContent = waybill.waybill_date ? (typeof formatDateIndian === 'function' ? formatDateIndian(waybill.waybill_date) : (window.formatDate ? window.formatDate(waybill.waybill_date) : waybill.waybill_date)) : '-';

        // Buyer & Consignee
        document.getElementById('view-buyer-name').textContent = waybill.customer_name || '-';
        document.getElementById('view-buyer-address').textContent = waybill.customer_address || '-';
        document.getElementById('view-buyer-phone').textContent = waybill.customer_phone || '-';
        document.getElementById('view-buyer-email').textContent = waybill.customer_email || '-';

        // Transportation Details
        document.getElementById('view-transport-mode').textContent = waybill.transport_mode || '-';
        document.getElementById('view-vehicle-number').textContent = waybill.vehicle_number || '-';
        document.getElementById('view-place-supply').textContent = waybill.place_supply || '-';

        // Item List
        const viewItemsTableBody = document.querySelector("#view-items-table tbody");
        if (viewItemsTableBody) viewItemsTableBody.innerHTML = "";

        (waybill.items || []).forEach(item => {
            const row = document.createElement("tr");
            // Use consistent classes used in other modules for visual parity
            row.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-700">${++sno}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${item.HSN_SAC || item.hsn_sac || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${item.quantity || '-'}</td>
                <td class="px-4 py-3 text-sm font-semibold text-blue-600">₹ ${formatIndian(item.unit_price, 2) || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${item.rate || '-'}%</td>
            `;
            if (viewItemsTableBody) viewItemsTableBody.appendChild(row);
        });

        // Calculate and set totals (professional 3-box layout)
        let subtotal = 0;
        let totalTax = 0;
        
        (waybill.items || []).forEach(item => {
            const qty = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
            const rate = parseFloat(item.rate || 0);
            const taxableValue = qty * unitPrice;
            const cgst = (taxableValue * rate / 2) / 100;
            const sgst = (taxableValue * rate / 2) / 100;
            
            subtotal += taxableValue;
            totalTax += (cgst + sgst);
        });
        
        const grandTotal = Math.round(subtotal + totalTax);
        
        const setTextContent = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
        setTextContent('view-subtotal', `₹ ${formatIndian(subtotal, 2)}`);
        setTextContent('view-tax', totalTax > 0 ? `₹ ${formatIndian(totalTax, 2)}` : 'No Tax');
        setTextContent('view-grand-total', `₹ ${formatIndian(grandTotal, 2)}`);

        await generateViewPreviewHTML(waybill);

    } catch (error) {
        console.error("Error fetching waybill:", error);
        window.electronAPI?.showAlert1("Failed to fetch waybill. Please try again later.");
    }
}

// Expose viewWayBill globally so it can be invoked from other scripts
window.viewWayBill = viewWayBill;