let currentStep = 1;
const totalSteps = 6;

// Event listener for the "Next" button
document.getElementById("nextBtn").addEventListener("click", () => {
    if (validateStep(currentStep)) {
        if (currentStep < totalSteps) {
            document.getElementById(`step-${currentStep}`).classList.remove("active");
            currentStep++;
            document.getElementById(`step-${currentStep}`).classList.add("active");
        }
        updateNavigation();
    }
    if (currentStep === totalSteps) generatePreview();
});

// Event listener for the "Previous" button
document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentStep > 1) {
        document.getElementById(`step-${currentStep}`).classList.remove("active");
        currentStep--;
        document.getElementById(`step-${currentStep}`).classList.add("active");
    }
    updateNavigation();
});

// Function to update navigation buttons
function updateNavigation() {
    document.getElementById("prevBtn").disabled = currentStep === 1;
    document.getElementById("nextBtn").disabled = currentStep === totalSteps;
}

// Function to validate the current step
function validateStep(step) {
    const stepElement = document.getElementById(`step-${step}`);
    const inputs = stepElement.querySelectorAll('input[required], textarea[required]');
    for (const input of inputs) {
        if (!input.value.trim()) {
            window.electronAPI.showAlert('Please fill all required fields.');
            return false;
        }
    }
    return true;
}

// Event listener for the "Add Item" button
document.getElementById('add-item-btn').addEventListener('click', addItem);

// Function to add a new item row to the items table
function addItem() {
    const tableBody = document.querySelector("#items-table tbody");
    const row = document.createElement("tr");

    row.innerHTML = `
        <td><input type="text" placeholder="Item Description" required></td>
        <td><input type="text" placeholder="HSN/SAC" required></td>
        <td><input type="number" placeholder="Qty" min="1" required></td>
        <td><input type="text" placeholder="Unit Price" required></td>
        <td><input type="number" placeholder="Rate" min="0.01" step="0.01" required></td>
        <td><button type="button" class="remove-item-btn" onclick="removeItem(this)">Remove</button></td>
    `;

    tableBody.appendChild(row);
}

// Function to remove an item row from the items table
function removeItem(button) {
    button.parentElement.parentElement.remove();
}

// Function to generate the invoice preview
function generatePreview() {
    const projectName = document.getElementById("projectName").value;
    const poNumber = document.getElementById("poNumber").value;
    const poDate = document.getElementById("poDate").value;
    const dcNumber = document.getElementById("dcNumber").value;
    const dcDate = document.getElementById("dcDate").value;
    const ewayBillNumber = document.getElementById("ewayBillNumber").value;
    const buyerName = document.getElementById("buyerName").value;
    const buyerAddress = document.getElementById("buyerAddress").value;
    const buyerPhone = document.getElementById("buyerPhone").value;
    const transportMode = document.getElementById("transportMode").value;
    const vehicleNumber = document.getElementById("vehicleNumber").value;
    const placeSupply = document.getElementById("placeSupply").value;
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];

    let totalAmount = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let roundOff = 0;
    let invoiceTotal = 0;
    let itemsHTML = "";

    // Calculate totals and generate items HTML
    for (let row of itemsTable.rows) {
        const description = row.cells[0].querySelector("input").value;
        const hsnSac = row.cells[1].querySelector("input").value;
        const qty = parseFloat(row.cells[2].querySelector("input").value);
        const unitPrice = parseFloat(row.cells[3].querySelector("input").value);
        const rate = parseFloat(row.cells[4].querySelector("input").value);

        const taxableValue = qty * unitPrice;
        const cgst = (rate / 2) * taxableValue / 100;
        const sgst = (rate / 2) * taxableValue / 100;
        const totalPrice = taxableValue + cgst + sgst;

        totalAmount += taxableValue;
        cgstTotal += cgst;
        sgstTotal += sgst;
        invoiceTotal += totalPrice;

        itemsHTML += `<tr>
            <td>${description}</td>
            <td>${hsnSac}</td>
            <td>${qty}</td>
            <td>${unitPrice}</td>
            <td>${rate}</td>
            <td>${taxableValue.toFixed(2)}</td>
            <td>${(rate / 2).toFixed(2)}</td>
            <td>${cgst.toFixed(2)}</td>
            <td>${(rate / 2).toFixed(2)}</td>
            <td>${sgst.toFixed(2)}</td>
            <td>${totalPrice.toFixed(2)}</td>
        </tr>`;
    }

    // Generate preview content
    const previewContent = `
        <div class="header">
            <div class="logo">
                <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/Shresht-Logo-Final.png" alt="Shresht Logo">
            </div>
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
                    <td>Invoice No: ${document.getElementById("invoiceId").value}</td>
                    <td>Project: ${projectName}</td>
                    <td>P.O No: ${poNumber}</td>
                </tr>
                <tr>
                    <td>P.O Date: ${poDate}</td>
                    <td>D.C No: ${dcNumber}</td>
                    <td>D.C Date: ${dcDate}</td>
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
                <tr>
                    <td>Transportation: ${transportMode}</td>
                    <td>Vehicle No: ${vehicleNumber}</td>
                    <td>Place Supply: ${placeSupply}</td>
                </tr>
                <tr>
                    <td colspan="3">E-Way Bill: ${ewayBillNumber}</td>
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
            <p>Total: ₹${totalAmount.toFixed(2)}</p>
            <p>CGST Total: ₹${cgstTotal.toFixed(2)}</p>
            <p>SGST Total: ₹${sgstTotal.toFixed(2)}</p>
            <p>Round Off: ₹${roundOff.toFixed(2)}</p>
            <h3>Invoice Total: ₹${invoiceTotal.toFixed(2)}</h3>
        </div>
        <hr>
        <div class="bank-details">
            <p><strong>Bank Name:</strong> Canara Bank</p>
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
    `;

    document.getElementById("preview-content").innerHTML = previewContent;
}

// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    try {
        const response = await fetch("/invoice/save-invoice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();

        if (response.ok) {
            window.electronAPI.showAlert("Invoice saved successfully!");
            document.getElementById("invoiceId").value = responseData.invoice.invoice_id;
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

// Event listener for the "Save" button
document.getElementById("save").addEventListener("click", () => {
    const invoiceData = collectFormData();
    sendToServer(invoiceData, false);
});

// Event listener for the "Print" button
document.getElementById("print").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.print) {
        const purchaseOrderData = collectFormData();
        sendToServer(purchaseOrderData, true);
        window.electronAPI.print(previewContent);
    } else {
        window.electronAPI.showAlert("Print functionality is not available.");
    }
});

// Function to collect form data
function collectFormData() {
    return {
        projectName: document.getElementById("projectName").value,
        invoiceId: document.getElementById("invoiceId").value,
        poNumber: document.getElementById("poNumber").value,
        poDate: document.getElementById("poDate").value,
        dcNumber: document.getElementById("dcNumber").value,
        dcDate: document.getElementById("dcDate").value,
        ewayBillNumber: document.getElementById("ewayBillNumber").value,
        buyerName: document.getElementById("buyerName").value,
        buyerAddress: document.getElementById("buyerAddress").value,
        buyerPhone: document.getElementById("buyerPhone").value,
        consigneeName: document.getElementById("consigneeName").value,
        consigneeAddress: document.getElementById("consigneeAddress").value,
        transportMode: document.getElementById("transportMode").value,
        vehicleNumber: document.getElementById("vehicleNumber").value,
        placeSupply: document.getElementById("placeSupply").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(1) input").value,
            hsnSac: row.querySelector("td:nth-child(2) input").value,
            qty: row.querySelector("td:nth-child(3) input").value,
            unitPrice: row.querySelector("td:nth-child(4) input").value,
            rate: row.querySelector("td:nth-child(5) input").value,
        })),
    };
}