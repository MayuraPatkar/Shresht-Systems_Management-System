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

    const previewHTML = `
    <div class="preview-container doc-quotation doc-waybill">
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
            <p>WAY BILL-${wayBill.waybill_id || " "}</p>
        </div>

        <div class="third-section">
            <div class="buyer-details">
                <h3>Buyer Details</h3>
                <p>${wayBill.customer_name || ""}</p>
                <p>${wayBill.customer_address || ""}</p>
                <p>${wayBill.customer_phone || ""}</p>
                <p>${wayBill.customer_email || ""}</p>
            </div>
            <div class="info-section">
                <p><strong>Project Name:</strong> ${wayBill.project_name || ""}</p>
                <p><strong>Transportation Mode:</strong> ${wayBill.transport_mode || ""}</p>
                <p><strong>Vehicle Number:</strong> ${wayBill.vehicle_number || ""}</p>
                <p><strong>Place to Supply:</strong> ${wayBill.place_supply || ""}</p>
            </div>  
        </div>
        <div class="fourth-section">
        <table>
            <thead>
                <tr>
                    <th>Sl. No</th>
                    <th>Description</th>
                    <th>HSN Code</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Tax Rate</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>
        </div>
        <br>
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding: 0 20px;">
            <div style="flex: 1; max-width: 60%; padding: 15px; background-color: #f7fafc; border-left: 4px solid #3765BC; border-radius: 4px;">
                <p style="margin: 0; font-size: 11px; color: #2d3748; font-weight: 500;">We declare that this way bill shows the actual details of the goods being transported and that all particulars are true and correct.</p>
            </div>
            <div style="text-align: center; margin-left: 40px;">
                <p style="margin: 0 0 10px 0; font-size: 13px; color: #2d3748;">For SHRESHT SYSTEMS</p>
                <div style="margin: 20px 0 10px 0; width: 180px; height: 1px; background-color: #2d3748;"></div>
                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #1a1a1a;">Authorized Signatory</p>
            </div>
        </div>

        <footer style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="margin: 0; font-size: 10px; color: #718096; font-style: italic;">This is a computer-generated way bill.</p>
        </footer>
    </div>`;

    document.getElementById('view-preview-content').innerHTML = previewHTML;
}

// Print and Save as PDF handlers (match HTML IDs)
document.getElementById("print-project-btn").addEventListener("click", () => {
    const previewContent = document.getElementById("view-preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        window.electronAPI.handlePrintEvent(previewContent, "print");
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

document.getElementById("save-project-pdf-btn").addEventListener("click", () => {
    const previewContent = document.getElementById("view-preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        let name = 'WayBill';
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

        // Hide other sections, show view section
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'none';
        document.getElementById('view').style.display = 'block';
        document.getElementById('new-waybill-btn').style.display = 'none';
        document.getElementById('view-preview-btn').style.display = 'none';

        // Fill Project Details
        document.getElementById('view-project-name').textContent = waybill.project_name || '-';
        document.getElementById('view-waybill-id').textContent = waybill.waybill_id || '-';

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
        viewItemsTableBody.innerHTML = "";

        (waybill.items || []).forEach(item => {
            const row = document.createElement("tr");
            row.className = "hover:bg-gray-50";
            row.innerHTML = `
                <td class="border border-gray-300 px-5 py-3 text-base text-gray-700">${++sno}</td>
                <td class="border border-gray-300 px-5 py-3 text-base text-gray-700">${item.description || '-'}</td>
                <td class="border border-gray-300 px-5 py-3 text-base text-gray-700">${item.HSN_SAC || item.hsn_sac || '-'}</td>
                <td class="border border-gray-300 px-5 py-3 text-base text-gray-700">${item.quantity || '-'}</td>
                <td class="border border-gray-300 px-5 py-3 text-base text-gray-700">${formatIndian(item.unit_price, 2) || '-'}</td>
                <td class="border border-gray-300 px-5 py-3 text-base text-gray-700">${item.rate || '-'}%</td>
            `;
            viewItemsTableBody.appendChild(row);
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
        
        document.getElementById('view-subtotal').textContent = `₹ ${formatIndian(subtotal, 2)}`;
        document.getElementById('view-tax').textContent = totalTax > 0 ? `₹ ${formatIndian(totalTax, 2)}` : 'No Tax';
        document.getElementById('view-grand-total').textContent = `₹ ${formatIndian(grandTotal, 2)}`;

        generateViewPreviewHTML(waybill);

    } catch (error) {
        console.error("Error fetching waybill:", error);
        window.electronAPI?.showAlert1("Failed to fetch waybill. Please try again later.");
    }
}