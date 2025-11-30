function generateViewPreviewHTML(wayBill) {
    let itemsHTML = "";
    let sno = 0;
    (wayBill.items || []).forEach(item => {
        const description = item.description || "-";
        const hsnCode = item.HSN_SAC || "-";
        const qty = item.quantity || "0";
        const unitPrice = item.unit_price || "0";
        const rate = item.rate || "0";
        const total = (qty * unitPrice).toFixed(2);

        itemsHTML += `<tr>
            <td>${++sno}</td>
            <td>${description}</td>
            <td>${hsnCode}</td>
            <td>${qty}</td>
            <td>${formatIndian(unitPrice, 2)}</td>
            <td>${rate}%</td>
            <td>${formatIndian(total, 2)}</td>
        </tr>`;
    });

        // Calculate totals for preview
        let subtotal = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        (wayBill.items || []).forEach(item => {
            const qty = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
            const rate = parseFloat(item.rate || 0);
            const taxableValue = qty * unitPrice;
            const cgst = (taxableValue * rate / 2) / 100;
            const sgst = (taxableValue * rate / 2) / 100;
            subtotal += taxableValue;
            totalCGST += cgst;
            totalSGST += sgst;
        });
        const totalTax = totalCGST + totalSGST;
        const grandTotal = subtotal + totalTax;

    // Use the shared builder to generate consistent preview HTML
    const buyerInfoHTML = `
        <div class="buyer-details">
            <h3>Buyer Details</h3>
            <p>${wayBill.customer_name || ''}</p>
            <p>${wayBill.customer_address || ''}</p>
            <p>${wayBill.customer_phone || ''}</p>
            ${wayBill.customer_email ? `<p>${wayBill.customer_email}</p>` : ''}
        </div>`;
    const infoSectionHTML = `
        <div class="info-section">
            <p><strong>Date:</strong> ${window.formatDate(wayBill.waybill_date) || ''}</p>
            <p><strong>Project Name:</strong> ${wayBill.project_name || ''}</p>
            <p><strong>Transportation Mode:</strong> ${wayBill.transport_mode || ''}</p>
            <p><strong>Vehicle Number:</strong> ${wayBill.vehicle_number || ''}</p>
            <p><strong>Place to Supply:</strong> ${wayBill.place_supply || ''}</p>
        </div>`;
    const itemColumns = ['Sl. No', 'Description', 'HSN Code', 'Qty', 'Unit Price', 'Tax Rate', 'Total'];
    // Build totals using shared renderer (keeps preview consistent with Invoice/Quotation)
    const totals = { taxableValue: subtotal, cgst: totalCGST, sgst: totalSGST, total: grandTotal };
    const hasTax = (totalCGST + totalSGST) > 0;
    const totalsHTML = `
        <div class="fifth-section">
            <div class="fifth-section-sub1">
                <div class="fifth-section-sub2">
                    ${SectionRenderers.renderAmountInWords(grandTotal)}
                </div>
                <div class="totals-section">
                    ${SectionRenderers.renderTotals(totals, hasTax)}
                </div>
            </div>
        </div>`;

    const documentHTML = buildSimpleDocument({
        documentId: wayBill.waybill_id || '',
        documentType: 'WAY BILL',
        buyerInfo: buyerInfoHTML,
        infoSection: infoSectionHTML,
        itemsHTML: itemsHTML,
        itemColumns: itemColumns,
        footerMessage: 'This is a computer-generated way bill',
        additionalSections: [totalsHTML]
    });
    document.getElementById("view-preview-content").innerHTML = documentHTML;
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
        if (viewDateEl) viewDateEl.textContent = waybill.waybill_date ? window.formatDate(waybill.waybill_date) : '-';

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
        
        const grandTotal = subtotal + totalTax;
        
        const setTextContent = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
        setTextContent('view-subtotal', `₹ ${formatIndian(subtotal, 2)}`);
        setTextContent('view-tax', totalTax > 0 ? `₹ ${formatIndian(totalTax, 2)}` : 'No Tax');
        setTextContent('view-grand-total', `₹ ${formatIndian(grandTotal, 2)}`);

        generateViewPreviewHTML(waybill);

    } catch (error) {
        console.error("Error fetching waybill:", error);
        window.electronAPI?.showAlert1("Failed to fetch waybill. Please try again later.");
    }
}

// Expose viewWayBill globally so it can be invoked from other scripts
window.viewWayBill = viewWayBill;