document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

let currentStep = 1;
const totalSteps = 7;

document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentStep < totalSteps) {
        document.getElementById(`step-${currentStep}`).classList.remove("active");
        currentStep++;
        document.getElementById(`step-${currentStep}`).classList.add("active");
    }
    updateNavigation();
    if (currentStep == 7) generatePreview();
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

document.getElementById('add-item-btn').addEventListener('click', () => {
    addItem();
});

// Function to dynamically add items to the invoice
function addItem() {
    const tableBody = document.querySelector("#items-table tbody");
    const row = document.createElement("tr");

    row.innerHTML = `
        <td><input type="text" placeholder="Item Description" required></td>
        <td><input type="text" placeholder="HSN/SAC" required></td>
        <td><input type="number" placeholder="Qty" min="1" required></td>
        <td><input type="text" placeholder="UOM" required></td>
        <td><input type="number" placeholder="Rate" min="0.01" step="0.01" required></td>
        <td><input type="number" placeholder="Taxable Value" min="0.01" step="0.01" required></td>
        <td><input type="number" placeholder="%" min="0" step="0.01" required></td>
        <td><input type="number" placeholder="CGST" min="0" step="0.01" required></td>
        <td><input type="number" placeholder="%" min="0" step="0.01" required></td>
        <td><input type="number" placeholder="SGST" min="0" step="0.01" required></td>
        <td><input type="number" placeholder="Total Price" min="0" step="0.01" required></td>
        <td><button type="button" class="remove-item-btn" onclick="removeItem(this)">Remove</button></td>
    `;

    tableBody.appendChild(row);
}

// Function to remove a specific item row
function removeItem(button) {
    button.parentElement.parentElement.remove();
}

// Add event listener for dynamic row addition
document.getElementById("add-item-btn").addEventListener("click", () => {
    updateTotals(); // Ensure totals are recalculated when a new row is added
});

// Add event listener for row removal
document.querySelector("#items-table").addEventListener("click", (event) => {
    if (event.target.classList.contains("remove-item-btn")) {
        updateTotals(); // Recalculate totals when a row is removed
    }
});

// Attach event listeners to dynamically calculate totals
document.querySelector("#items-table").addEventListener("input", updateTotals);

function updateTotals() {
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTaxableValue = 0;

    const rows = document.querySelectorAll("#items-table tbody tr");
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector("td:nth-child(3) input").value) || 0;
        const rate = parseFloat(row.querySelector("td:nth-child(5) input").value) || 0;
        const cgstPercent = parseFloat(row.querySelector("td:nth-child(7) input").value) || 0;
        const sgstPercent = parseFloat(row.querySelector("td:nth-child(9) input").value) || 0;

        // Calculate taxable value, CGST, SGST, and total price
        const taxableValue = qty * rate;
        const cgstValue = (taxableValue * cgstPercent) / 100;
        const sgstValue = (taxableValue * sgstPercent) / 100;
        const totalPrice = taxableValue + cgstValue + sgstValue;

        // Update row values
        row.querySelector("td:nth-child(6) input").value = taxableValue.toFixed(2);
        row.querySelector("td:nth-child(8) input").value = cgstValue.toFixed(2);
        row.querySelector("td:nth-child(10) input").value = sgstValue.toFixed(2);
        row.querySelector("td:nth-child(11) input").value = totalPrice.toFixed(2);

        // Accumulate totals
        totalTaxableValue += taxableValue;
        totalCGST += cgstValue;
        totalSGST += sgstValue;
    });

    // Calculate overall totals
    const invoiceTotal = totalTaxableValue + totalCGST + totalSGST;
    const roundOff = Math.round(invoiceTotal) - invoiceTotal;

    // Update form fields
    document.getElementById("totalAmount").value = totalTaxableValue.toFixed(2);
    document.getElementById("cgstTotal").value = totalCGST.toFixed(2);
    document.getElementById("sgstTotal").value = totalSGST.toFixed(2);
    document.getElementById("roundOff").value = roundOff.toFixed(2);
    document.getElementById("invoiceTotal").value = (invoiceTotal + roundOff).toFixed(2);
}

let previewContent = ``;

// This script dynamically generates the preview content based on the form input.
function generatePreview() {
    const projectName = document.getElementById("projectName").value;
    const invoiceNumber = document.getElementById("invoiceNumber").value;
    const poNumber = document.getElementById("poNumber").value;
    const poDate = document.getElementById("poDate").value;
    const dcNumber = document.getElementById("dcNumber").value;
    const dcDate = document.getElementById("dcDate").value;
    const transportMode = document.getElementById("transportMode").value;
    const vehicleNumber = document.getElementById("vehicleNumber").value;
    const placeSupply = document.getElementById("placeSupply").value;
    const ewayBillNumber = document.getElementById("ewayBillNumber").value;
    const buyerName = document.getElementById("buyerName").value;
    const buyerAddress = document.getElementById("buyerAddress").value;
    const buyerPhone = document.getElementById("buyerPhone").value;

    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];
    const totalAmount = document.getElementById("totalAmount").value;
    const cgstTotal = document.getElementById("cgstTotal").value;
    const sgstTotal = document.getElementById("sgstTotal").value;
    const roundOff = document.getElementById("roundOff").value;
    const invoiceTotal = document.getElementById("invoiceTotal").value;

    let itemsHTML = "";
    for (let i = 0; i < itemsTable.rows.length; i++) {
        const row = itemsTable.rows[i];
        itemsHTML += `<tr>
            <td>${row.cells[0].querySelector("input").value}</td>
            <td>${row.cells[1].querySelector("input").value}</td>
            <td>${row.cells[2].querySelector("input").value}</td>
            <td>${row.cells[3].querySelector("input").value}</td>
            <td>${row.cells[4].querySelector("input").value}</td>
            <td>${row.cells[5].querySelector("input").value}</td>
            <td>${row.cells[6].querySelector("input").value}</td>
            <td>${row.cells[7].querySelector("input").value}</td>
            <td>${row.cells[8].querySelector("input").value}</td>
            <td>${row.cells[9].querySelector("input").value}</td>
            <td>${row.cells[10].querySelector("input").value}</td>
        </tr>`;
    }

    previewContent = `
    <div class="quotation-container">
    <div class="header">
        <div class="logo">
<img src="" alt="Shresht Logo"></div>

        <div class="company-details">
            <h1>SHRESHT SYSTEMS</h1>
            <p>3-125-13, Harshitha, Udupi Ontibettu, Hiradka - 576113</p>
            <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
            <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
        </div>
    </div>
    <hr>
    <div class="info-section">
        <table>
            <tr>
                <td>Project: ${projectName}</td>
            </tr>
        </table>
    </div>
    <hr>
    <div class="buyer-details">
        <table>
            <tr>
                <td>Buyer: ${buyerName}</td>
                <td>Address: ${buyerAddress}</td>
                <td>Phone: ${buyerPhone}</td>
            </tr>
        </table>
    </div>
    <hr>
    <table class="items-table" border="1">
        <thead>
            <tr>
                <th>Description</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>UOM</th>
                <th>Rate</th>
                <th>Taxable Value</th>
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
        <p>Total: ₹${totalAmount}</p>
        <p>CGST Total: ₹${cgstTotal}</p>
        <p>SGST Total: ₹${sgstTotal}</p>
    </div>
    <hr>
    <div class="bank-details">
        <p><strong>Bank Name:</strong> canara Bank</p>
        <p><strong>Branch Name:</strong> ShanthiNagar Manipal</p>
        <p><strong>Account No:</strong> xxxxxxxxxxx</p>
        <p><strong>IFSC Code:</strong> yyyyyyyy</p>
    </div>
    <hr>
    <div class="declaration">
        <p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
    </div>
    <div class="signature">
        <p>For SHRESHT SYSTEMS</p>
        <div class="signature-space"></div>
        <p><strong>Authorized Signatory</strong></p>
    </div>
    <footer>
        <p>This is a computer-generated invoice.</p>
    </footer>
</div>
    `;

    document.getElementById("preview-content").innerHTML = previewContent;
}

// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    try {
        const response = await fetch("http://localhost:3000/project/save-invoice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();

        if (response.ok) {
            window.electronAPI.showAlert("Invoice saved successfully!");
        } else if (responseData.message === "Invoice already exists") {
            if (!shouldPrint) {
                window.electronAPI.showAlert("Invoice already exists.");
            }
        } else {
            window.electronAPI.showAlert(`Error: ${responseData.message || "Unknown error occurred."}`);
        }
    } catch (error) {
        console.error("Error:", error);
        window.electronAPI.showAlert("Failed to connect to server.");
    }
}


document.getElementById("save").addEventListener("click", () => {
    const invoiceData = collectFormData();
    sendToServer(invoiceData, false);
});

document.getElementById("print").addEventListener("click", () => {
    const invoiceData = collectFormData();
    sendToServer(invoiceData, true);
    window.electronAPI.printInvoice(previewContent);
});

function collectFormData() {
    return {
        projectName: document.getElementById("projectName").value,
        invoiceNumber: document.getElementById("invoiceNumber").value,
        poNumber: document.getElementById("poNumber").value,
        poDate: document.getElementById("poDate").value,
        dcNumber: document.getElementById("dcNumber").value,
        dcDate: document.getElementById("dcDate").value,
        transportMode: document.getElementById("transportMode").value,
        vehicleNumber: document.getElementById("vehicleNumber").value,
        placeSupply: document.getElementById("placeSupply").value,
        ewayBillNumber: document.getElementById("ewayBillNumber").value,
        buyerName: document.getElementById("buyerName").value,
        buyerAddress: document.getElementById("buyerAddress").value,
        buyerPhone: document.getElementById("buyerPhone").value,
        consigneeName: document.getElementById("consigneeName").value,
        consigneeAddress: document.getElementById("consigneeAddress").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(1) input").value,
            hsnSac: row.querySelector("td:nth-child(2) input").value,
            qty: row.querySelector("td:nth-child(3) input").value,
            uom: row.querySelector("td:nth-child(4) input").value,
            rate: row.querySelector("td:nth-child(5) input").value,
            taxableValue: row.querySelector("td:nth-child(6) input").value,
            cgstPercent: row.querySelector("td:nth-child(7) input").value,
            cgstValue: row.querySelector("td:nth-child(8) input").value,
            sgstPercent: row.querySelector("td:nth-child(9) input").value,
            sgstValue: row.querySelector("td:nth-child(10) input").value,
            totalPrice: row.querySelector("td:nth-child(11) input").value,
        })),
        totalAmount: document.getElementById("totalAmount").value,
        cgstTotal: document.getElementById("cgstTotal").value,
        sgstTotal: document.getElementById("sgstTotal").value,
        roundOff: document.getElementById("roundOff").value,
        invoiceTotal: document.getElementById("invoiceTotal").value,
    };
}
