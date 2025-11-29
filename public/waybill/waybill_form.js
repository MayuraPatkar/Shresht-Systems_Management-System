// Step navigation variables (global so accessible from waybill_home.js keyboard shortcuts)
window.currentStep = 1;
window.totalSteps = 6;

// Change step function - made global for keyboard shortcuts
window.changeStep = function(step) {
    document.getElementById(`step-${window.currentStep}`).classList.remove("active");
    window.currentStep = step;
    document.getElementById(`step-${window.currentStep}`).classList.add("active");
    updateNavigation();
    document.getElementById("step-indicator").textContent = `Step ${window.currentStep} of ${window.totalSteps}`;
    
    // Generate preview when reaching the last step
    if (window.currentStep === window.totalSteps) {
        generatePreview();
    }
};

function updateNavigation() {
    document.getElementById("prev-btn").disabled = window.currentStep === 1;
    document.getElementById("next-btn").disabled = window.currentStep === window.totalSteps;
}

// Setup navigation button listeners
document.addEventListener('DOMContentLoaded', function() {
    // Next button
    const nextBtn = document.getElementById("next-btn");
    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (window.currentStep < window.totalSteps) {
                window.changeStep(window.currentStep + 1);
            }
        });
    }
    
    // Previous button
    const prevBtn = document.getElementById("prev-btn");
    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (window.currentStep > 1) {
                window.changeStep(window.currentStep - 1);
            }
        });
    }
});

// Open a way bill for editing
async function openWayBill(wayBillId) {
    const data = await fetchDocumentById('wayBill', wayBillId);
    if (!data) return;
    
    const wayBill = data.wayBill;

        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'block';
        document.getElementById('new-waybill-btn').style.display = 'none';
        document.getElementById('view-preview').style.display = 'block';

        if (window.currentStep === 1) {
            window.changeStep(2);
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
        const itemsContainer = document.getElementById("items-container");
        itemsContainer.innerHTML = "";
        let sno = 1;

        (wayBill.items || []).forEach(item => {
            addItemFromData(item, sno);
            sno++;
        });
}

// Event listener for the "Next" button - fetch quotation data on step 2
document.addEventListener('DOMContentLoaded', function() {
    const nextBtn = document.getElementById("next-btn");
    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (window.currentStep === 2 && !document.getElementById("waybill-id").value) {
                const quotationId = document.getElementById("quotation-id").value;

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
                            const itemsContainer = document.getElementById("items-container");
                            itemsContainer.innerHTML = "";
                            let itemSno = 1;

                            quotation.items.forEach(item => {
                                addItemFromData(item, itemSno);
                                itemSno++;
                            });
                        })
                        .catch(error => {
                            console.error("Error:", error);
                            window.electronAPI.showAlert1("Failed to fetch quotation.");
                        });
                }
            }
        });
    }
});

// Setup add item button listener after DOM loads
document.addEventListener('DOMContentLoaded', function() {
    const addItemBtn = document.getElementById('add-item-btn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', addItem);
    } else {
        console.error('add-item-btn not found in DOM');
    }
});

// Helper function to add item with data (used by openWayBill and quotation fetch)
function addItemFromData(item, itemSno) {
    const itemsContainer = document.getElementById("items-container");
    const itemsTableBody = document.querySelector("#items-table tbody");
    
    // Create card
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
        <div class="item-number">${itemSno}</div>
        <div class="item-field description">
            <div style="position: relative;">
                <input type="text" value="${item.description || ''}" placeholder="Description" required>
                <ul class="suggestions"></ul>
            </div>
        </div>
        <div class="item-field hsn">
            <input type="text" value="${item.HSN_SAC || ''}" placeholder="HSN Code" required>
        </div>
        <div class="item-field qty">
            <input type="number" value="${item.quantity || ''}" placeholder="Qty" min="1" required>
        </div>
        <div class="item-field rate">
            <input type="number" value="${item.unit_price || ''}" placeholder="Unit Price" required>
        </div>
        <div class="item-field rate">
            <input type="number" value="${item.rate || ''}" placeholder="Tax Rate" required>
        </div>
        <button type="button" class="remove-item-btn">
            <i class="fas fa-times"></i>
        </button>
    `;
    itemsContainer.appendChild(card);
    
    // Create hidden table row
    const row = document.createElement("tr");
    row.className = "border-b border-gray-200 hover:bg-gray-50";
    row.innerHTML = `
        <td class="border border-gray-300 px-4 py-3 text-center text-base">${itemSno}</td>
        <td class="border border-gray-300 px-2 py-2"><input type="text" value="${item.description || ''}" required></td>
        <td class="border border-gray-300 px-2 py-2"><input type="text" value="${item.HSN_SAC || ''}" required></td>
        <td class="border border-gray-300 px-2 py-2"><input type="number" value="${item.quantity || ''}" min="1" required></td>
        <td class="border border-gray-300 px-2 py-2"><input type="number" value="${item.unit_price || ''}" required></td>
        <td class="border border-gray-300 px-2 py-2"><input type="number" value="${item.rate || ''}" required></td>
        <td class="border border-gray-300 px-2 py-2 text-center">
            <button type="button" class="remove-item-btn bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 text-sm">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    itemsTableBody.appendChild(row);
    
    // Sync card inputs with table inputs
    const cardInputs = card.querySelectorAll('input');
    const rowInputs = row.querySelectorAll('input');
    cardInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            rowInputs[index].value = input.value;
        });
    });
    
    // Add remove button event listeners (both card and table)
    const cardRemoveBtn = card.querySelector(".remove-item-btn");
    const tableRemoveBtn = row.querySelector(".remove-item-btn");
    
    cardRemoveBtn.addEventListener("click", function() {
        card.remove();
        row.remove();
        renumberItems();
    });
    
    tableRemoveBtn.addEventListener("click", function() {
        card.remove();
        row.remove();
        renumberItems();
    });
}

// Add a new empty item
function addItem() {
    const itemsTableBody = document.querySelector("#items-table tbody");
    const itemSno = itemsTableBody.rows.length + 1;
    
    addItemFromData({
        description: '',
        HSN_SAC: '',
        quantity: '',
        unit_price: '',
        rate: ''
    }, itemSno);
}

// Renumber items after deletion
function renumberItems() {
    const cards = document.querySelectorAll("#items-container .item-card");
    const rows = document.querySelectorAll("#items-table tbody tr");
    
    cards.forEach((card, index) => {
        const numberDiv = card.querySelector('.item-number');
        if (numberDiv) {
            numberDiv.textContent = index + 1;
        }
    });
    
    rows.forEach((row, index) => {
        const numberCell = row.querySelector('td:first-child');
        if (numberCell) {
            numberCell.textContent = index + 1;
        }
    });
}

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

    // Calculate totals for preview
    let subtotal = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    (items || []).forEach(item => {
        const qty = parseFloat(item.quantity || 0);
        const unitPrice = parseFloat(item.unit_price || 0);
        const rate = parseFloat(item.rate || 0);
        const taxableValue = qty * unitPrice;
        const cgst = (taxableValue * rate / 2) / 100;
        const sgst = (taxableValue * rate / 2) / 100;
        subtotal += taxableValue;
        totalCGST += cgst;
        totalSGST += sgst;
    });
    const totalTax = totalCGST + totalSGST;
    const grandTotal = subtotal + totalTax;
    // Build totals using shared renderer
    const totals = { taxableValue: subtotal, cgst: totalCGST, sgst: totalSGST, total: grandTotal };
    const hasTax = (totalCGST + totalSGST) > 0;
    const totalsHTML = `
        <div class="fifth-section">
            ${SectionRenderers.renderTotals(totals, hasTax, true)}
        </div>`;

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
        footerMessage: 'This is a computer-generated way bill',
        additionalSections: [totalsHTML]
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