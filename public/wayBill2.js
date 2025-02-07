let currentStep = 1;
const totalSteps = 5;

document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentStep < totalSteps) {
        document.getElementById(`step-${currentStep}`).classList.remove("active");
        currentStep++;
        document.getElementById(`step-${currentStep}`).classList.add("active");
        updateNavigation();
        if (currentStep === totalSteps) generatePreview();
    } else {
        // Handle form submission
        window.electronAPI.showAlert('Form submitted!');
    }
});

document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentStep > 1) {
        document.getElementById(`step-${currentStep}`).classList.remove("active");
        currentStep--;
        document.getElementById(`step-${currentStep}`).classList.add("active");
        updateNavigation();
    }
});

function updateNavigation() {
    document.getElementById("prevBtn").disabled = currentStep === 1;
    document.getElementById("nextBtn").textContent = currentStep === totalSteps ? 'Submit' : 'Next';
}

document.getElementById('add-item-btn').addEventListener('click', addItem);

function addItem() {
    const tableBody = document.querySelector("#items-table tbody");
    const row = document.createElement("tr");

    row.innerHTML = `
        <td><input type="text" placeholder="Item Description" required></td>
        <td><input type="text" placeholder="HSN-SAC" required></td>
        <td><input type="number" placeholder="Qty" min="1" required></td>
        <td><input type="text" placeholder="Unit Price" required></td>
        <td><button type="button" class="remove-item-btn" onclick="removeItem(this)">Remove</button></td>
    `;

    tableBody.appendChild(row);
}

function removeItem(button) {
    button.parentElement.parentElement.remove();
}

function generatePreview() {
    const projectName = document.getElementById("projectName").value || "";
    const ewayBillNumber = document.getElementById("wayBillId").value || "";
    const buyerName = document.getElementById("buyerName").value || "";
    const buyerAddress = document.getElementById("buyerAddress").value || "";
    const buyerPhone = document.getElementById("buyerPhone").value || "";
    const transportMode = document.getElementById("transportMode").value || "";
    const vehicleNumber = document.getElementById("vehicleNumber").value || "";
    const placeSupply = document.getElementById("placeSupply").value || "";
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];

    let itemsHTML = "";
    for (let row of itemsTable.rows) {
        const description = row.cells[0].querySelector("input").value || "-";
        const qty = row.cells[2].querySelector("input").value || "0";

        itemsHTML += `<tr>
            <td>${description}</td>
            <td>${qty}</td>
        </tr>`;
    }

    document.getElementById("preview-content").innerHTML = `<div class="header">
        <div class="container">
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

        <div class="title">Way Bill #${ewayBillNumber}</div>

    <div class="first-section">
        <div>
            <p><strong>To:</strong></p> 
            <p>Buyer: ${buyerName}</p>
            <p>Address: ${buyerAddress}</p>
            <p>Ph: ${buyerPhone}</p>
        </div>
        <div>
            <p><strong>Project Name:</strong> ${projectName}</p>
            <p><strong>Transportation Mode:</strong> ${transportMode}</p>
            <p><strong>Vehicle Number:</strong> ${vehicleNumber}</p>
            <p><strong>Place to Supply:</strong> ${placeSupply}</p>
        </div>   
    </div>
    <h3>Item Details</h3>
    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Qty</th>
            </tr>
        </thead>
        <tbody>
        ${itemsHTML}
        </tbody>
    </table>
    <div class="signature">
        <p>For SHRESHT SYSTEMS</p>
        <div class="signature-space"></div>
        <p><strong>Authorized Signatory</strong></p>
    </div>
    <footer>
        <p>This is a computer-generated way bill</p>
    </footer>
    </div>`;
}

// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    try {
        const response = await fetch("/wayBill/save-way-bill", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();

        if (response.ok) {
            document.getElementById("wayBillId").value = responseData.wayBill.wayBill_id;
            window.electronAPI.showAlert("Way bill saved successfully!");
        } else if (responseData.message === "Way bill already exists") {
            if (!shouldPrint) {
                window.electronAPI.showAlert("Way bill already exists.");
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
    const wayBillData = collectFormData();
    sendToServer(wayBillData, false);
});

// Event listener for the "Print" button
document.getElementById("print").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.print) {
        const wayBillData = collectFormData();
        sendToServer(wayBillData, true);
        window.electronAPI.print(previewContent);
    } else {
        window.electronAPI.showAlert("Print functionality is not available.");
    }
});

// Function to collect form data
function collectFormData() {
    return {
        way_bill_id: document.getElementById("wayBillId").value,
        projectName: document.getElementById("projectName").value,
        buyer_name: document.getElementById("buyerName").value,
        buyer_address: document.getElementById("buyerAddress").value,
        buyer_phone: document.getElementById("buyerPhone").value,
        transport_mode: document.getElementById("transportMode").value,
        vehicle_number: document.getElementById("vehicleNumber").value,
        place_supply: document.getElementById("placeSupply").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(1) input").value,
            HSN_SAC: row.querySelector("td:nth-child(2) input").value,
            quantity: row.querySelector("td:nth-child(3) input").value,
            unitPrice: row.querySelector("td:nth-child(4) input").value,
        })),
    };
}