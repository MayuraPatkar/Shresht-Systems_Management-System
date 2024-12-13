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


// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    try {
        const response = await fetch("http://localhost:3000/project/save-invoice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            console.log("Invoice saved successfully!");
            if (shouldPrint) {
                // Trigger printing via ipcRenderer (or the exposed API)
                window.electronAPI.printInvoice(data);
            }
        } else {
            console.error("Error saving invoice.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Failed to connect to server.");
    }
}

document.getElementById("save").addEventListener("click", () => {
    const invoiceData = collectFormData();
    sendToServer(invoiceData, false);
});

document.getElementById("print").addEventListener("click", () => {
    const invoiceData = collectFormData();
    sendToServer(invoiceData, true);
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
