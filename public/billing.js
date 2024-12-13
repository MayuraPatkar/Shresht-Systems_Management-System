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

// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    try {
        const response = await fetch("http://localhost:3000/invoice/save-invoice", {
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
    console.log(invoiceData)
    sendToServer(invoiceData, true);
});

function collectFormData() {
    return {
        projectName: document.getElementById("projectName").value,
        invoiceNumber: document.getElementById("invoiceNumber").value,
        ewayBillNumber: document.getElementById("ewayBillNumber").value,
        date: new Date().toISOString(),
        buyer: document.getElementById("buyer").value,
        address: document.getElementById("address").value,
        phone: document.getElementById("phone").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(1) input").value,
            hsnSac: row.querySelector("td:nth-child(2) input").value,
            qty: row.querySelector("td:nth-child(3) input").value,
            uom: row.querySelector("td:nth-child(4) input").value,
            rate: row.querySelector("td:nth-child(5) input").value,
            taxableValue: row.querySelector("td:nth-child(6) input").value,
            cgst: row.querySelector("td:nth-child(7) input").value,
            sgst: row.querySelector("td:nth-child(8) input").value,
            totalPrice: row.querySelector("td:nth-child(9) input").value,
        })),
        totalAmount: document.getElementById("totalAmount").value,
    };
}
