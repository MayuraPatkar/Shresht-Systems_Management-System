document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
});

let currentStep = 1;
const totalSteps = 5;

document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentStep < totalSteps) {
        if (validateStep(currentStep)) {
            document.getElementById(`step-${currentStep}`).classList.remove("active");
            currentStep++;
            document.getElementById(`step-${currentStep}`).classList.add("active");
            updateNavigation();
            if (currentStep === totalSteps) generatePreview();
        }
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

function validateStep(step) {
    const stepElement = document.getElementById(`step-${step}`);
    const inputs = stepElement.querySelectorAll('input[required], textarea[required]');
    for (let input of inputs) {
        if (!input.value.trim()) {
            window.electronAPI.showAlert('Please fill all required fields.');
            return false;
        }
    }
    return true;
}

document.getElementById('add-item-btn').addEventListener('click', addItem);

function addItem() {
    const tableBody = document.querySelector("#items-table tbody");
    const row = document.createElement("tr");

    row.innerHTML = `
        <td><input type="text" placeholder="Item Description" required></td>
        <td><input type="number" placeholder="Qty" min="1" required></td>
        <td><button type="button" class="remove-item-btn" onclick="removeItem(this)">Remove</button></td>
    `;

    tableBody.appendChild(row);
}

function removeItem(button) {
    button.parentElement.parentElement.remove();
}

function generatePreview() {
    const projectName = document.getElementById("projectName").value || "";
    const buyerName = document.getElementById("buyerName").value || "";
    const buyerAddress = document.getElementById("buyerAddress").value || "";
    const buyerPhone = document.getElementById("buyerPhone").value || "";
    const transportMode = document.getElementById("transportMode").value || "";
    const vehicleNumber = document.getElementById("vehicleNumber").value || "";
    const placeSupply = document.getElementById("placeSupply").value || "";
    const ewayBillNumber = document.getElementById("ewayBillNumber").value || "";
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];

    let itemsHTML = "";
    for (let row of itemsTable.rows) {
        const description = row.cells[0].querySelector("input").value || "-";
        const qty = row.cells[1].querySelector("input").value || "0";

        itemsHTML += `<tr>
            <td>${description}</td>
            <td>${qty}</td>
        </tr>`;
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
        <p><strong>Project Name:</strong> ${projectName}</p>
        <p><strong>To:</strong> ${buyerName}<br>
        ${buyerAddress}<br>
        Ph: ${buyerPhone}</p>
        <p><strong>Transportation Mode:</strong> ${transportMode}</p>
        <p><strong>Vehicle Number:</strong> ${vehicleNumber}</p>
        <p><strong>Place to Supply:</strong> ${placeSupply}</p>
        <p><strong>E-Way Bill Number:</strong> ${ewayBillNumber}</p>
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
    <hr>
    <div class="signature">
        <p>For SHRESHT SYSTEMS</p>
        <div class="signature-space"></div>
        <p><strong>Authorized Signatory</strong></p>
    </div>
    <div class="footer">
        <p>This is a computer-generated way bill</p>
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