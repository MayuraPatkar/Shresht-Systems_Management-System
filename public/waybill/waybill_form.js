// Open a way bill for editing
async function openWayBill(wayBillId) {
    const data = await fetchDocumentById('wayBill', wayBillId);
    if (!data) return;
    
    const wayBill = data.wayBill;

        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'block';
        document.getElementById('new-waybill-btn').style.display = 'none';
        document.getElementById('view-preview-btn').style.display = 'block';

        if (currentStep === 1) {
            changeStep(2);
        }

        document.getElementById('waybill-id').value = wayBill.waybill_id;
        document.getElementById('project-name').value = wayBill.project_name;
        document.getElementById('buyer-name').value = wayBill.customer_name;
        document.getElementById('buyer-address').value = wayBill.customer_address;
        document.getElementById('buyer-phone').value = wayBill.customer_phone;
        document.getElementById('buyer-email').value = wayBill.customer_email || "";
        document.getElementById('transport-mode').value = wayBill.transport_mode;
        document.getElementById('vehicle-number').value = wayBill.vehicle_number;
        document.getElementById('place-supply').value = wayBill.place_supply;

        const itemsTableBody = document.querySelector("#items-table tbody");
        itemsTableBody.innerHTML = "";
        let sno = 0;

        (wayBill.items || []).forEach(item => {
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
}

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
    
    // Collect items from table
    const items = Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
        description: row.cells[1].querySelector("input").value || "-",
        HSN_SAC: row.cells[2].querySelector("input").value || "-",
        quantity: row.cells[3].querySelector("input").value || "0",
        unit_price: row.cells[4].querySelector("input").value || "0",
        rate: row.cells[5].querySelector("input").value || "0"
    }));

    // Use CalculationEngine for simple calculation
    const calculator = new CalculationEngine(items, []);
    const { itemsHTML } = calculator.calculateSimple();

    // Use SectionRenderers to build the document
    const buyerInfoHTML = `
        <div class="buyer-details">
            <h3>Buyer Details</h3>
            <p>${buyerName}</p>
            <p>${buyerAddress}</p>
            <p>${buyerPhone}</p>
            ${buyerEmail ? `<p>${buyerEmail}</p>` : ''}
        </div>`;

    const infoSectionHTML = SectionRenderers.renderInfoSection([
        { label: 'Project Name', value: projectName },
        { label: 'Transportation Mode', value: transportMode },
        { label: 'Vehicle Number', value: vehicleNumber },
        { label: 'Place to Supply', value: placeSupply }
    ]);

    const itemColumns = ['Sl. No', 'Description', 'HSN Code', 'Qty', 'Unit Price', 'Tax Rate', 'Total'];

    // Build the complete document
    const documentHTML = buildSimpleDocument({
        documentId: waybillId,
        documentType: 'WAY BILL',
        buyerInfo: buyerInfoHTML,
        infoSection: infoSectionHTML,
        itemsHTML: itemsHTML,
        itemColumns: itemColumns,
        footerMessage: 'This is a computer-generated way bill'
    });

    document.getElementById("preview-content").innerHTML = documentHTML;
}

// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    return await sendDocumentToServer("/wayBill/save-way-bill", data);
}

// Event listener for the "Save" button
document.getElementById("save-btn").addEventListener("click", async () => {
    const wayBillData = collectFormData();
    const ok = await sendToServer(wayBillData, false);
    if (ok) window.electronAPI.showAlert1("Way Bill saved successfully!");
});

// Event listener for the "Print" button
document.getElementById("print-btn").addEventListener("click", async () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const wayBillData = collectFormData();
        const ok = await sendToServer(wayBillData, true);
        if (ok) {
            window.electronAPI.handlePrintEvent(previewContent, "print");
        }
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Event listener for the "Save as PDF" button
document.getElementById("save-pdf-btn").addEventListener("click", async () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const wayBillData = collectFormData();
        const ok = await sendToServer(wayBillData, true);
        if (ok) {
            let name = `WayBill-${wayBillData.waybill_id}`;
            window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
        }
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