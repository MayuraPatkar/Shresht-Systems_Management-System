let currentStep = 1;
const totalSteps = 4;

// Event listener for the "Next" button
document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentStep < totalSteps) {
        if (validateStep(currentStep)) {
            changeStep(currentStep + 1);
            if (currentStep === totalSteps) generatePreview();
        }
    } else {
        // Handle form submission
        window.electronAPI.showAlert('Form submitted!');
    }
});

// Event listener for the "Previous" button
document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentStep > 1) {
        changeStep(currentStep - 1);
    }
});

// Function to change the current step
function changeStep(step) {
    document.getElementById(`step-${currentStep}`).classList.remove("active");
    currentStep = step;
    document.getElementById(`step-${currentStep}`).classList.add("active");
    updateNavigation();
}

// Function to update the navigation buttons
function updateNavigation() {
    document.getElementById("prevBtn").disabled = currentStep === 1;
    document.getElementById("nextBtn").textContent = currentStep === totalSteps ? 'Submit' : 'Next';
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

// Function to add a new item row to the table
function addItem() {
    const tableBody = document.querySelector("#items-table tbody");
    const row = document.createElement("tr");

    row.innerHTML = `
        <td><input type="text" placeholder="Item Description" required></td>
        <td><input type="text" placeholder="HSN/SAC" required></td>
        <td><input type="number" placeholder="Qty" min="1" required></td>
        <td><input type="text" placeholder="Unit Price" required></td>
        <td><input type="text" placeholder="Rate" required></td>
        <td><button type="button" class="remove-item-btn">Remove</button></td>
    `;

    tableBody.appendChild(row);
}

// Event listener for the "Remove Item" button
document.querySelector("#items-table").addEventListener("click", (event) => {
    if (event.target.classList.contains('remove-item-btn')) {
        event.target.closest('tr').remove();
    }
});

// Function to generate the preview
function generatePreview() {
    const handledBy = document.getElementById("handledBy").value || "";
    const supplierName = document.getElementById("supplierName").value || "";
    const supplierAddress = document.getElementById("supplierAddress").value || "";
    const supplierPhone = document.getElementById("supplierPhone").value || "";
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];
    let totalPrice = 0;
    let grandTotal = 0;

    let itemsHTML = "";
    for (const row of itemsTable.rows) {
        const description = row.cells[0].querySelector("input").value || "-";
        const qty = row.cells[1].querySelector("input").value || "0";
        const unitPrice = row.cells[2].querySelector("input").value || "0";
        const rate = row.cells[3].querySelector("input").value || "0";

        const taxableValue = qty * unitPrice;
        const cgstTotal = ((rate / 2) * taxableValue / 100).toFixed(2);
        const sgstTotal = ((rate / 2) * taxableValue / 100).toFixed(2);
        const rowTotal = taxableValue + parseFloat(cgstTotal) + parseFloat(sgstTotal);

        totalPrice += rowTotal;
        grandTotal += rowTotal;

        itemsHTML += `<tr>
            <td>${description}</td>
            <td>${qty}</td>
            <td>${unitPrice}</td>
            <td>${rate}</td>
            <td>${taxableValue.toFixed(2)}</td>
            <td>${(rate / 2).toFixed(2)}</td>
            <td>${cgstTotal}</td>
            <td>${(rate / 2).toFixed(2)}</td>
            <td>${sgstTotal}</td>
            <td>${rowTotal.toFixed(2)}</td>
        </tr>`;
    }

    document.getElementById("preview-content").innerHTML = `
    <div class="header">
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
        <p><strong>To:</strong> ${supplierName}<br>
        ${supplierAddress}<br>
        Ph: ${supplierPhone}</p>
    </div>
    <h3>Item Details</h3>
    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
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
        <p><strong>Total Amount:</strong> ₹${totalPrice.toFixed(2)}</p>
        <p><strong>CGST Total:</strong> ₹${(totalPrice * 0.09).toFixed(2)}</p>
        <p><strong>SGST Total:</strong> ₹${(totalPrice * 0.09).toFixed(2)}</p>
        <p><strong>Grand Total:</strong> ₹${grandTotal.toFixed(2)}</p>
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

// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    try {
        const response = await fetch("/purchaseOrder/save-purchase-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();

        if (response.ok) {
            document.getElementById("purchaseOrderId").value = responseData.purchaseOrder.purchase_order_id;
            window.electronAPI.showAlert("Purchase order saved successfully!");
        } else if (responseData.message === "Purchase order already exists") {
            if (!shouldPrint) {
                window.electronAPI.showAlert("Purchase order already exists.");
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
    const purchaseOrderData = collectFormData();
    sendToServer(purchaseOrderData, false);
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
        purchase_order_id: document.getElementById("purchaseOrderId").value,
        projectName: document.getElementById("projectName").value,
        handledBy: document.getElementById("handledBy").value,
        supplier_name: document.getElementById("supplierName").value,
        supplier_address: document.getElementById("supplierAddress").value,
        supplier_phone: document.getElementById("supplierPhone").value,
        supplier_email: document.getElementById("supplierEmail").value,
        supplier_GSTIN: document.getElementById("supplierGSTIN").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(1) input").value,
            HSN_SAC: row.querySelector("td:nth-child(2) input").value,
            quantity: row.querySelector("td:nth-child(3) input").value,
            unitPrice: row.querySelector("td:nth-child(4) input").value,
            rate: row.querySelector("td:nth-child(5) input").value,
        })),
    };
}