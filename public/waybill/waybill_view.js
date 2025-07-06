function generateViewPreviewHTML(wayBill) {
    let itemsHTML = "";
    (wayBill.items || []).forEach(item => {
        const description = item.description || "-";
        const hsnCode = item.HSN_SAC || item.hsn_sac || "-";
        const qty = item.quantity || "0";
        const unitPrice = item.unitPrice || item.UnitPrice || "0";
        const rate = item.rate || "0";
        const total = (qty * unitPrice).toFixed(2);

        itemsHTML += `<tr>
            <td>${description}</td>
            <td>${hsnCode}</td>
            <td>${qty}</td>
            <td>${unitPrice}</td>
            <td>${rate}</td>
            <td>${total}</td>
        </tr>`;
    });

    document.getElementById("view-preview-content").innerHTML = `
    <div class="preview-container">
        <div class="header">
            <div class="logo">
                <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/logo.png"
                    alt="Shresht Logo">
            </div>
            <div class="company-details">
                <h1>SHRESHT SYSTEMS</h1>
                <p>3-125-13, Harshitha, Udupi Ontibettu, Hiradka - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>

        <div class="title">Way Bill #${wayBill.wayBill_id || wayBill.waybill_id || wayBill.ewayBillNumber || ""}</div>

        <div class="first-section">
            <div class="buyer-details">
                <h3>Buyer Details</h3>
                <p>${wayBill.buyer_name || wayBill.buyerName || ""}</p>
                <p>${wayBill.buyer_address || wayBill.buyerAddress || ""}</p>
                <p>${wayBill.buyer_phone || wayBill.buyerPhone || ""}</p>
                <p>${wayBill.buyer_email || wayBill.buyerEmail || ""}</p>
            </div>
            <div class="info-section">
                <p><strong>Project Name:</strong> ${wayBill.project_name || wayBill.projectName || ""}</p>
                <p><strong>Transportation Mode:</strong> ${wayBill.transport_mode || wayBill.transportMode || ""}</p>
                <p><strong>Vehicle Number:</strong> ${wayBill.vehicle_number || wayBill.vehicleNumber || ""}</p>
                <p><strong>Place to Supply:</strong> ${wayBill.place_supply || wayBill.placeSupply || ""}</p>
            </div>  
        </div>
        <div class="second-section">
        <table>
            <thead>
                <tr>
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
        <div class="fifth-section">
        <div class="signature">
            <p>For SHRESHT SYSTEMS</p>
            <div class="signature-space"></div>
            <p><strong>Authorized Signatory</strong></p>
        </div>
        </div>
        <footer>
            <p>This is a computer-generated way bill</p>
        </footer>
    </div>`;
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

async function viewWayBill(wayBillId) {
    try {
        const response = await fetch(`/wayBill/${wayBillId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch waybill");
        }

        const data = await response.json();
        const waybill = data.wayBill;

        // Hide other sections, show view section
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'none';
        document.getElementById('view').style.display = 'flex';

        // Fill Project Details
        document.getElementById('view-project-name').textContent = waybill.project_name || '';
        document.getElementById('view-waybill-id').textContent = waybill.wayBill_id || waybill.waybill_id || '';

        // Buyer & Consignee
        document.getElementById('view-buyer-name').textContent = waybill.buyer_name || '';
        document.getElementById('view-buyer-address').textContent = waybill.buyer_address || '';
        document.getElementById('view-buyer-phone').textContent = waybill.buyer_phone || '';
        document.getElementById('view-buyer-email').textContent = waybill.buyer_email || '';

        // Transportation Details
        document.getElementById('view-transport-mode').textContent = waybill.transport_mode || waybill.transportMode || '';
        document.getElementById('view-vehicle-number').textContent = waybill.vehicle_number || waybill.vehicleNumber || '';
        document.getElementById('view-place-supply').textContent = waybill.place_supply || waybill.placeSupply || '';

        // Item List
        const viewItemsTableBody = document.querySelector("#view-items-table tbody");
        viewItemsTableBody.innerHTML = "";

        (waybill.items || []).forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.description || ''}</td>
                <td>${item.HSN_SAC || item.hsn_sac || ''}</td>
                <td>${item.quantity || ''}</td>
                <td>${item.unitPrice || item.UnitPrice || ''}</td>
                <td>${item.rate || ''}</td>
            `;
            viewItemsTableBody.appendChild(row);
        });

        generateViewPreviewHTML(waybill);

    } catch (error) {
        console.error("Error fetching waybill:", error);
        window.electronAPI?.showAlert1("Failed to fetch waybill. Please try again later.");
    }
}