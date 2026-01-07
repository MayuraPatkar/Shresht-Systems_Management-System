// Generate HTML for preview, returns the HTML string.
// If targetElementId is provided, it also updates that element's innerHTML.
async function generateViewPreviewHTML(wayBill, targetElementId = "view-preview-content") {
    // Build items table rows
    let itemsHTML = "";
    let sno = 0;
    (wayBill.items || []).forEach(item => {
        const description = item.description || "-";
        const hsnCode = item.hsn_sac || item.HSN_SAC || "-";
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const gstRate = Number(item.gst_rate || 0);

        const taxableValue = qty * unitPrice;
        const cgst = (taxableValue * (gstRate / 2)) / 100;
        const sgst = (taxableValue * (gstRate / 2)) / 100;
        const rowTotal = taxableValue + cgst + sgst;

        itemsHTML += `
            <tr>
                <td>${++sno}</td>
                <td>${description}</td>
                <td>${hsnCode}</td>
                <td>${qty}</td>
                <td>${formatIndian(unitPrice, 2)}</td>
                <td>${formatIndian(taxableValue, 2)}</td>
                <td>${gstRate > 0 ? gstRate.toFixed(2) + '%' : '0%'}</td>
                <td>${formatIndian(rowTotal, 2)}</td>
            </tr>`;
    });

    // Totals calculation
    let totalTaxableValue = wayBill.total_taxable_value || 0;
    let totalCGST = wayBill.cgst || 0;
    let totalSGST = wayBill.sgst || 0;

    // If totals not provided in object (e.g. during preview before save), calculate them
    if (!totalTaxableValue && wayBill.items && wayBill.items.length > 0) {
        totalTaxableValue = 0;
        totalCGST = 0;
        totalSGST = 0;
        (wayBill.items || []).forEach(item => {
            const qty = Number(item.quantity || 0);
            const unitPrice = Number(item.unit_price || 0);
            const gstRate = Number(item.gst_rate || 0);
            const taxableValue = qty * unitPrice;
            totalTaxableValue += taxableValue;
            if (gstRate > 0) {
                const cgst = (taxableValue * (gstRate / 2)) / 100;
                const sgst = (taxableValue * (gstRate / 2)) / 100;
                totalCGST += cgst;
                totalSGST += sgst;
            }
        });
    }

    const totalTax = totalCGST + totalSGST;
    const grandTotal = wayBill.total_invoice_value || Math.round(totalTaxableValue + totalTax);
    const hasTax = totalTax > 0;

    // Build paginated pages
    const itemRows = itemsHTML.split('</tr>').filter(r => r.trim().length > 0).map(r => r + '</tr>');
    const ITEMS_PER_PAGE = 15;
    const SUMMARY_SECTION_ROW_COUNT = 8;

    const pages = [];
    let currentPageHTML = '';
    let currentCount = 0;

    itemRows.forEach((row, idx) => {
        const isLast = idx === itemRows.length - 1;
        const req = 1;

        if (currentCount > 0 && ((!isLast && currentCount + req > ITEMS_PER_PAGE) || (isLast && currentCount + req + SUMMARY_SECTION_ROW_COUNT > ITEMS_PER_PAGE))) {
            pages.push(currentPageHTML);
            currentPageHTML = '';
            currentCount = 0;
        }
        currentPageHTML += row;
        currentCount += req;
    });
    if (currentPageHTML !== '') pages.push(currentPageHTML);
    if (pages.length === 0 && itemsHTML === '') pages.push(''); // Handle empty case

    // Company and header info
    const company = window.companyConfig ? await window.companyConfig.getCompanyInfo() : {};
    const companyName = company?.company || 'Company Name';
    const companyAddress = company?.address || '';
    const companyPhone = company?.phone ? (company.phone.ph1 + (company.phone.ph2 ? ' / ' + company.phone.ph2 : '')) : '';
    const companyGSTIN = company?.GSTIN || '';
    const companyEmail = company?.email || '';
    const companyWebsite = company?.website || '';

    const transport = wayBill.transport || {};
    const transportDate = wayBill.ewaybill_generated_at || new Date();

    const pagesHTML = pages.map((pageHTML, index) => {
        const isLastPage = index === pages.length - 1;

        // Construct the transport details section cleanly
        const transportDetails = `
            <div class="transport-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 10px 0; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px;">
                <div>
                   <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Mode</p>
                   <p class="text-sm font-medium text-gray-900">${transport.mode || '-'}</p>
                </div>
                <div>
                   <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Vehicle No</p>
                   <p class="text-sm font-medium text-gray-900">${transport.vehicle_number || '-'}</p>
                </div>
                 <div>
                   <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Transporter</p>
                   <p class="text-sm font-medium text-gray-900">${transport.transporter_name || '-'}</p>
                </div>
                <div>
                   <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Distance</p>
                   <p class="text-sm font-medium text-gray-900">${transport.distance_km ? transport.distance_km + ' km' : '-'}</p>
                </div>
            </div>
        `;

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
                    <p>E-WAY BILL ${wayBill.ewaybill_no ? `- ${wayBill.ewaybill_no}` : ''}</p>
                    <p><strong>Date: </strong>${formatDateIndian ? formatDateIndian(transportDate) : (window.formatDate ? window.formatDate(transportDate) : '')}</p>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center; margin-top: 4px;">
                     <p><strong>Status: </strong><span style="display:inline-block; padding: 2px 8px; border-radius: 9999px; background-color: #f3f4f6; font-size: 0.8em;">${wayBill.ewaybill_status || 'Draft'}</span></p>
                </div>
            </div>

            ${index === 0 ? `
            <div class="third-section">
                <div class="buyer-details">
                    <p class="section-title" style="border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; font-weight: bold; color: #444;">Dispatch From</p>
                    <p style="white-space: pre-line; min-height: 80px;">${wayBill.from_address || ''}</p>
                </div>
                <div class="order-info">
                    <p class="section-title" style="border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; font-weight: bold; color: #444;">Ship To</p>
                    <p style="white-space: pre-line; min-height: 80px;">${wayBill.to_address || ''}</p>
                </div>
            </div>
            
            ${transportDetails}
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
                            <th>Taxable (₹)</th>
                            <th>Tax (%)</th>
                            <th>Total (₹)</th>
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
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(grandTotal)} Only.</span></p>
                        </div>
                    </div>
                    <div class="totals-section">
                        <div style="display: flex; width: 100%;">
                            <div class="totals-section-sub1" style="width: 50%;">
                                <p>Taxable Value:</p>
                                <p>Total CGST:</p>
                                <p>Total SGST:</p>
                                <p><strong>Grand Total:</strong></p>
                            </div>
                            <div class="totals-section-sub2" style="width: 50%;">
                                <p>₹ ${formatIndian(totalTaxableValue, 2)}</p>
                                <p>₹ ${formatIndian(totalCGST, 2)}</p>
                                <p>₹ ${formatIndian(totalSGST, 2)}</p>
                                <p><strong>₹ ${formatIndian(grandTotal, 2)}</strong></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="sixth-section">
                 <div class="declaration">
                     <p>Certified that the particulars given above are true and correct.</p>
                </div>
            </div>

            <div class="eighth-section">
                <p>For ${companyName}</p>
                <div class="eighth-section-space"></div>
                <p><strong>Authorized Signatory</strong></p>
            </div>
            ` : ''}

            <div class="ninth-section">
                <p>This is a computer-generated document.</p>
            </div>
        </div>
        `;
    }).join('');

    // If target provided, update it
    if (targetElementId) {
        const target = document.getElementById(targetElementId);
        if (target) target.innerHTML = pagesHTML;
    }

    return pagesHTML;
}

// Print and Save as PDF handlers
document.getElementById("printProject")?.addEventListener("click", () => {
    const previewContent = document.getElementById("view-preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        window.electronAPI.handlePrintEvent(previewContent, "print");
    } else {
        window.electronAPI?.showAlert1("Print functionality is not available.");
    }
});

document.getElementById("saveProjectPDF")?.addEventListener("click", () => {
    const previewContent = document.getElementById("view-preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const idEl = document.getElementById('view-ewaybill-no');
        const name = idEl && idEl.textContent !== '-' ? `EWayBill-${idEl.textContent.replace(/\s+/g, '')}` : 'EWayBill';
        window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
    } else {
        window.electronAPI?.showAlert1("Print functionality is not available.");
    }
});

async function viewWayBill(wayBillId) {
    try {
        const response = await fetch(`/eWayBill/${wayBillId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch e-way bill");
        }

        const data = await response.json();
        const waybill = data.eWayBill;
        let sno = 0;

        // Hide other sections, show view section
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'none';
        const viewEl = document.getElementById('view');
        if (viewEl) viewEl.style.display = 'flex';
        const homeBtn = document.getElementById('new-waybill-btn');
        if (homeBtn) homeBtn.style.display = 'none';
        const previewBtn = document.getElementById('view-preview');
        if (previewBtn) previewBtn.style.display = 'none';

        // Fill E-Way Bill Details
        document.getElementById('view-ewaybill-no').textContent = waybill.ewaybill_no || '-';
        document.getElementById('view-ewaybill-status').textContent = waybill.ewaybill_status || '-';
        const viewDateEl = document.getElementById('view-waybill-date');
        if (viewDateEl) viewDateEl.textContent = waybill.ewaybill_generated_at ? (typeof formatDateIndian === 'function' ? formatDateIndian(waybill.ewaybill_generated_at) : waybill.ewaybill_generated_at) : '-';

        // Address Details
        document.getElementById('view-from-address').textContent = waybill.from_address || '-';
        document.getElementById('view-to-address').textContent = waybill.to_address || '-';

        // Transportation Details
        const transport = waybill.transport || {};
        document.getElementById('view-transport-mode').textContent = transport.mode || '-';
        document.getElementById('view-vehicle-number').textContent = transport.vehicle_number || '-';
        document.getElementById('view-transporter-id').textContent = transport.transporter_id || '-';
        document.getElementById('view-transporter-name').textContent = transport.transporter_name || '-';
        document.getElementById('view-distance-km').textContent = transport.distance_km ? `${transport.distance_km} km` : '-';

        // Item List
        const viewItemsTableBody = document.querySelector("#view-items-table tbody");
        if (viewItemsTableBody) viewItemsTableBody.innerHTML = "";

        (waybill.items || []).forEach(item => {
            const row = document.createElement("tr");
            const taxableValue = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
            row.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-700">${++sno}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${item.hsn_sac || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${item.quantity || '-'}</td>
                <td class="px-4 py-3 text-sm font-semibold text-blue-600">₹ ${formatIndian(item.unit_price, 2) || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${item.gst_rate || '0'}%</td>
                <td class="px-4 py-3 text-sm text-gray-700">₹ ${formatIndian(taxableValue, 2)}</td>
            `;
            if (viewItemsTableBody) viewItemsTableBody.appendChild(row);
        });

        // Set totals
        const setTextContent = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setTextContent('view-total-taxable', `₹ ${formatIndian(waybill.total_taxable_value || 0, 2)}`);
        setTextContent('view-cgst', `₹ ${formatIndian(waybill.cgst || 0, 2)}`);
        setTextContent('view-sgst', `₹ ${formatIndian(waybill.sgst || 0, 2)}`);
        setTextContent('view-total-invoice', `₹ ${formatIndian(waybill.total_invoice_value || 0, 2)}`);

        await generateViewPreviewHTML(waybill);

    } catch (error) {
        console.error("Error fetching e-way bill:", error);
        window.electronAPI?.showAlert1("Failed to fetch e-way bill. Please try again later.");
    }
}

// Expose viewWayBill globally
window.viewWayBill = viewWayBill;