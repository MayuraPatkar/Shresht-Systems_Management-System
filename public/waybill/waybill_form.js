// Event listener for the "Next" button
document.getElementById("next-btn").addEventListener("click", () => {
    if (currentStep === 2 && !document.getElementById("waybill-id").value) {
        const quotationId = document.getElementById("quotation-id").value;

        let sno = 0;
        if (quotationId) {
            fetch(`/quotation/${quotationId}`)
                .then(response => response.json())
                .then(data => {
                    const quotation = data.quotation;
                    document.getElementById("project-name").value = quotation.project_name;
                    document.getElementById("buyer-name").value = quotation.customer_name;
                    document.getElementById("buyer-address").value = quotation.customer_address;
                    document.getElementById("buyer-phone").value = quotation.customer_phone;
                    const itemsTableBody = document.querySelector("#items-table tbody");
                    itemsTableBody.innerHTML = "";

                    quotation.items.forEach(item => {
                        const row = document.createElement("tr");
                        row.className = "border-b border-gray-200 hover:bg-gray-50";
                        row.innerHTML = `
                            <td class="border border-gray-300 px-4 py-3 text-center text-base">${++sno}</td>
                            <td class="border border-gray-300 px-2 py-2"><input type="text" value="${item.description}" required></td>
                            <td class="border border-gray-300 px-2 py-2"><input type="text" value="${item.HSN_SAC}" required></td>
                            <td class="border border-gray-300 px-2 py-2"><input type="number" value="${item.quantity}" min="1" required></td>
                            <td class="border border-gray-300 px-2 py-2"><input type="number" value="${item.unit_price}" required></td>
                            <td class="border border-gray-300 px-2 py-2"><input type="number" value="${item.rate}" required></td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <button type="button" class="remove-item-btn bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 text-sm">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        `;
                        itemsTableBody.appendChild(row);
                    });
                })
                .catch(error => {
                    console.error("Error:", error);
                    window.electronAPI.showAlert1("Failed to fetch quotation.");
                });
        }
    }
});

document.getElementById('add-item-btn').addEventListener('click', addItem);

function addItem() {
    const tableBody = document.querySelector("#items-table tbody");
    const row = document.createElement("tr");
    const rowCount = tableBody.rows.length + 1;

    row.className = "border-b border-gray-200 hover:bg-gray-50";
    row.innerHTML = `
        <td class="border border-gray-300 px-4 py-3 text-center text-base">${rowCount}</td>
        <td class="border border-gray-300 px-2 py-2"><input type="text" placeholder="Item Description" required></td>
        <td class="border border-gray-300 px-2 py-2"><input type="text" placeholder="HSN Code" required></td>
        <td class="border border-gray-300 px-2 py-2"><input type="number" placeholder="Qty" min="1" required></td>
        <td class="border border-gray-300 px-2 py-2"><input type="number" placeholder="Unit Price" required></td>
        <td class="border border-gray-300 px-2 py-2"><input type="number" placeholder="Tax Rate" required></td>
        <td class="border border-gray-300 px-2 py-2 text-center">
            <button type="button" class="remove-item-btn bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 text-sm" onclick="removeItem(this)">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    tableBody.appendChild(row);
}

function removeItem(button) {
    button.parentElement.parentElement.remove();
}

// Event listener for the "Remove Item" button
document.querySelector("#items-table").addEventListener("click", (event) => {
    if (event.target.classList.contains('remove-item-btn')) {
        event.target.closest('tr').remove();
    }
});

function generatePreview() {
    const projectName = document.getElementById("project-name").value || "";
    const waybillId = document.getElementById("waybill-id").value || "";
    const buyerName = document.getElementById("buyer-name").value || "";
    const buyerAddress = document.getElementById("buyer-address").value || "";
    const buyerPhone = document.getElementById("buyer-phone").value || "";
    const buyerEmail = document.getElementById("buyer-email").value || "";
    const transportMode = document.getElementById("transport-mode").value || "";
    const vehicleNumber = document.getElementById("vehicle-number").value || "";
    const placeSupply = document.getElementById("place-supply").value || "";
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];

    let itemsHTML = "";
    let sno = 0;
    for (let row of itemsTable.rows) {
        const description = row.cells[1].querySelector("input").value || "-";
        const hsnCode = row.cells[2].querySelector("input").value || "-";
        const qty = row.cells[3].querySelector("input").value || "0";
        const unitPrice = row.cells[4].querySelector("input").value || "0";
        const rate = row.cells[5].querySelector("input").value || "0";
        const total = (qty * unitPrice).toFixed(2);

        itemsHTML += `<tr>
            <td>${++sno}</td>
            <td>${description}</td>
            <td>${hsnCode}</td>
            <td>${qty}</td>
            <td>${unitPrice}</td>
            <td>${rate}</td>
            <td>${total}</td>
        </tr>`;
    }

    document.getElementById("preview-content").innerHTML = `
    <div class="preview-container">
        <div class="first-section">
            <div class="logo">
                <img src="https://raw.githubusercontent.com/ShreshtSystems/ShreshtSystems.github.io/main/assets/logo.png"
                    alt="Shresht Logo">
            </div>
            <div class="company-details">
                <h1>SHRESHT SYSTEMS</h1>
                <p>3-125-13, Harshitha, Onthibettu, Hiriadka, Udupi - 576113</p>
                <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
                <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
            </div>
        </div>

        <div class="second-section">
            <p>WAY BILL-${waybillId}</p>
        </div>

        <div class="third-section">
            <div class="buyer-details">
                <h3>Buyer Details</h3>
                <p>${buyerName}</p>
                <p>${buyerAddress}</p>
                <p>${buyerPhone}</p>
                <p>${buyerEmail}</p>
            </div>
            <div class="info-section">
                <p><strong>Project Name:</strong> ${projectName}</p>
                <p><strong>Transportation Mode:</strong> ${transportMode}</p>
                <p><strong>Vehicle Number:</strong> ${vehicleNumber}</p>
                <p><strong>Place to Supply:</strong> ${placeSupply}</p>
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
        <div class="eighth-section">
            <p>For SHRESHT SYSTEMS</p>
            <div class="eighth-section-space"></div>
            <p><strong>Authorized Signatory</strong></p>
        </div>
        <div class="ninth-section">
            <p>This is a computer-generated way bill</p>
        </div>
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

        if (!response.ok) {
            window.electronAPI.showAlert1(`Error: ${responseData.message || "Unknown error occurred."}`);
        }
    } catch (error) {
        console.error("Error:", error);
        window.electronAPI.showAlert1("Failed to connect to server.");
    }
}

// Event listener for the "Save" button
document.getElementById("save-btn").addEventListener("click", () => {
    const wayBillData = collectFormData();
    sendToServer(wayBillData, false);
    window.electronAPI.showAlert1("Way Bill saved successfully!");
});

// Event listener for the "Print" button
document.getElementById("print-btn").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const wayBillData = collectFormData();
        sendToServer(wayBillData, true);
        window.electronAPI.handlePrintEvent(previewContent, "print");
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Event listener for the "Save as PDF" button
document.getElementById("save-pdf-btn").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const wayBillData = collectFormData();
        sendToServer(wayBillData, true);
        let name = `WayBill-${wayBillData.waybill_id}`;
        window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Function to collect form data
function collectFormData() {
    return {
        wayBillId: document.getElementById("waybill-id").value,
        projectName: document.getElementById("project-name").value,
        buyerName: document.getElementById("buyer-name").value,
        buyerAddress: document.getElementById("buyer-address").value,
        buyerPhone: document.getElementById("buyer-phone").value,
        buyerEmail: document.getElementById("buyer-email").value,
        transportMode: document.getElementById("transport-mode").value,
        vehicleNumber: document.getElementById("vehicle-number").value,
        placeSupply: document.getElementById("place-supply").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            description: row.querySelector("td:nth-child(2) input").value,
            HSN_SAC: row.querySelector("td:nth-child(3) input").value,
            quantity: row.querySelector("td:nth-child(4) input").value,
            unit_price: row.querySelector("td:nth-child(5) input").value,
            rate: row.querySelector("td:nth-child(6) input").value,
        })),
    };
}