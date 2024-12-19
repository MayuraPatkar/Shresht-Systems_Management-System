document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

let currentStep = 1;
const totalSteps = 5;

document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentStep < totalSteps) {
        document.getElementById(`step-${currentStep}`).classList.remove("active");
        currentStep++;
        document.getElementById(`step-${currentStep}`).classList.add("active");
    }
    updateNavigation();
    if (currentStep === totalSteps) generatePreview();
});

document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentStep > 1) {
        document.getElementById(`step-${currentStep}`).classList.remove("active");
        currentStep--;
        document.getElementById(`step-${currentStep}`).classList.add("active");
    }
    updateNavigation();
});

function updateNavigation() {
    document.getElementById("prevBtn").disabled = currentStep === 1;
    document.getElementById("nextBtn").disabled = currentStep === totalSteps;
}

document.getElementById('add-item-btn').addEventListener('click', addItem);

function addItem() {
    const tableBody = document.querySelector("#items-table tbody");
    const row = document.createElement("tr");

    row.innerHTML = `
        <td><input type="text" placeholder="Item Description" required></td>
        <td><input type="number" placeholder="Qty" min="1" required></td>
        <td><input type="text" placeholder="Unit Price" required></td>
        <td><input type="number" placeholder="Total Price" min="0" step="0.01" required readonly></td>
        <td><button type="button" class="remove-item-btn" onclick="removeItem(this)">Remove</button></td>
    `;

    tableBody.appendChild(row);
    updateTotals();
}

function removeItem(button) {
    button.parentElement.parentElement.remove();
    updateTotals();
}

document.querySelector("#items-table").addEventListener("input", updateTotals);

function updateTotals() {
    let totalPrice = 0;

    const rows = document.querySelectorAll("#items-table tbody tr");
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector("td:nth-child(2) input").value) || 0;
        const unitPrice = parseFloat(row.querySelector("td:nth-child(3) input").value) || 0;
        const rowTotal = qty * unitPrice;

        row.querySelector("td:nth-child(4) input").value = rowTotal.toFixed(2);
        totalPrice += rowTotal;
    });

    document.getElementById("totalAmount").value = totalPrice.toFixed(2);
}

function generatePreview() {
    const projectName = document.getElementById("projectName").value || "";
    const buyerName = document.getElementById("buyerName").value || "";
    const buyerAddress = document.getElementById("buyerAddress").value || "";
    const buyerPhone = document.getElementById("buyerPhone").value || "";
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];
    let totalPrice = 0;

    let itemsHTML = "";
    for (let row of itemsTable.rows) {
        const description = row.cells[0].querySelector("input").value || "-";
        const qty = row.cells[1].querySelector("input").value || "0";
        const unitPrice = row.cells[2].querySelector("input").value || "0";
        const rowTotal = row.cells[3].querySelector("input").value || "0";

        itemsHTML += `<tr>
            <td>${description}</td>
            <td>-</td> <!-- Placeholder for HSN/SAC -->
            <td>${qty}</td>
            <td>-</td> <!-- Placeholder for UOM -->
            <td>${unitPrice}</td>
            <td>${rowTotal}</td>
            <td>9%</td> <!-- Placeholder for CGST (%) -->
            <td>${(rowTotal * 0.09).toFixed(2)}</td>
            <td>9%</td> <!-- Placeholder for SGST (%) -->
            <td>${(rowTotal * 0.09).toFixed(2)}</td>
            <td>${(rowTotal * 1.18).toFixed(2)}</td>
        </tr>`;

        totalPrice += parseFloat(rowTotal) || 0;
    }

    document.getElementById("preview-content").innerHTML = `<div class="header">
        <div class="logo">
<img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/Shresht-Logo-Final.png" alt="Shresht Logo">
        </div>
        <div class="company-details">
            <h1>SHRESHT SYSTEMS</h1>
            <p>3-125-13, Harshitha, Udupi Ontibettu, Hiradka - 576113</p>
            <p>Ph: +91 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
            <p>Email: shreshtsystems@gmail.com | Website: <a href="http://www.shreshtsystems.com">www.shreshtsystems.com</a></p>
        </div>
    </div>
    <hr>
    <div class="info-section">
        <p><strong>To:</strong> ${buyerName}<br>
        ${buyerAddress}<br>
        Ph: ${buyerPhone}</p>
    </div>
    <h3>Item Details</h3>
    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>UOM</th>
                <th>Rate (₹)</th>
                <th>Taxable Value (₹)</th>
                <th>CGST (%)</th>
                <th>CGST (₹)</th>
                <th>SGST (%)</th>
                <th>SGST (₹)</th>
                <th>Total Price (₹)</th>
            </tr>
        </thead>
        <tbody>
        ${itemsHTML}
        </tbody>
    </table>
    <hr>
    <div class="totals">
        <p><strong>Total Amount:</strong> ₹[Total Amount]</p>
        <p><strong>Grand Total:</strong> ₹${totalPrice}</p>
    </div>
    <hr>
    <div class="signature">
        <p>For SHRESHT SYSTEMS</p>
        <div class="signature-space"></div>
        <p><strong>Authorized Signatory</strong></p>
    </div>
    <div class="footer">
        <p>This is a computer-generated purchase order</p>
    </div>`;
}

document.getElementById("print").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.printInvoice) {
        window.electronAPI.printInvoice(previewContent);
    } else {
        console.error("Print functionality is not available.");
    }
});