// Step navigation variables (global so accessible from waybill_home.js keyboard shortcuts)
window.currentStep = 1;
window.totalSteps = 6;

// Change step function - made global for keyboard shortcuts
window.changeStep = async function(step) {
    document.getElementById(`step-${window.currentStep}`).classList.remove("active");
    window.currentStep = step;
    document.getElementById(`step-${window.currentStep}`).classList.add("active");
    updateNavigation();
    document.getElementById("step-indicator").textContent = `Step ${window.currentStep} of ${window.totalSteps}`;
    
    // Generate preview when reaching the last step
    if (window.currentStep === window.totalSteps) {
        await generatePreview();
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
        nextBtn.addEventListener("click", async () => {
            if (typeof window.validateCurrentStep === 'function') {
                const ok = await window.validateCurrentStep();
                if (!ok) return;
            }
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

// Set default waybill date and fetch new ID if empty
document.addEventListener('DOMContentLoaded', async () => {
    const dateInput = document.getElementById('waybill-date');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    const waybillIdEl = document.getElementById('waybill-id');
    if (waybillIdEl && !waybillIdEl.value) {
        await getWaybillId();
    }
});

// Fetch next Waybill ID from server
async function getWaybillId() {
    try {
        const response = await fetch('/wayBill/generate-id');
        if (!response.ok) throw new Error('Failed to fetch waybill id');
        const data = await response.json();
        document.getElementById('waybill-id').value = data.waybill_id;
    } catch (err) {
        console.error('Error fetching waybill id:', err);
    }
}

// Listen for manual typing in the items table to fetch additional data (HSN, price, rate)
const waybillItemsTable = document.querySelector('#items-table');
if (waybillItemsTable) {
    waybillItemsTable.addEventListener('input', async (event) => {
        const row = event.target.closest('tr');
        if (!row) return;
        // Only react when user types in the description column (first input)
        const descInput = row.querySelector('input[type="text"]');
        if (event.target === descInput) {
            const itemName = descInput.value.trim();
            if (itemName.length > 2) {
                await fillWaybill(itemName, row);
            }
        }
    });
}

// Validate current step similar to quotation/service
window.validateCurrentStep = async function () {
    // Step 2: Project details
    if (window.currentStep === 2) {
        const projectName = document.getElementById('project-name');
        const waybillId = document.getElementById('waybill-id');
        if (!projectName || !projectName.value.trim()) {
            window.electronAPI.showAlert1('Please enter the Project Name.');
            projectName?.focus();
            return false;
        }
        if (!waybillId || !waybillId.value.trim()) {
            window.electronAPI.showAlert1('Please enter the Way Bill ID.');
            waybillId?.focus();
            return false;
        }
    }

    // Step 3: Shipped To info must be filled
    if (window.currentStep === 3) {
        const buyerName = document.getElementById('buyer-name');
        const buyerAddress = document.getElementById('buyer-address');
        const buyerPhone = document.getElementById('buyer-phone');
        if (!buyerName || !buyerName.value.trim()) {
            window.electronAPI.showAlert1('Please enter the Buyer Name.');
            buyerName?.focus();
            return false;
        }
        if (!buyerAddress || !buyerAddress.value.trim()) {
            window.electronAPI.showAlert1('Please enter the Buyer Address.');
            buyerAddress?.focus();
            return false;
        }
        if (!buyerPhone || !buyerPhone.value.trim()) {
            window.electronAPI.showAlert1('Please enter the Buyer Phone Number.');
            buyerPhone?.focus();
            return false;
        }
    }

    // Step 5: Items check
    if (window.currentStep === 5) {
        const itemsTable = document.querySelector('#items-table tbody');
        if (!itemsTable || itemsTable.rows.length === 0) {
            window.electronAPI.showAlert1('Please add at least one item.');
            return false;
        }
        for (const [index, row] of Array.from(itemsTable.rows).entries()) {
            const desc = row.querySelector('td:nth-child(2) input');
            const qty = row.querySelector('td:nth-child(4) input');
            const price = row.querySelector('td:nth-child(5) input');
            if (!desc || !desc.value.trim()) {
                window.electronAPI.showAlert1(`Item #${index + 1}: Description is required.`);
                desc?.focus();
                return false;
            }
            if (!qty || Number(qty.value) <= 0) {
                window.electronAPI.showAlert1(`Item #${index + 1}: Quantity must be greater than 0.`);
                qty?.focus();
                return false;
            }
            if (!price || Number(price.value) < 0) {
                window.electronAPI.showAlert1(`Item #${index + 1}: Unit Price is required.`);
                price?.focus();
                return false;
            }
        }
    }

    return true;
};

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
        // Populate waybill date for editing. Use ISO YYYY-MM-DD for input value.
        const wbDateEl = document.getElementById('waybill-date');
        if (wbDateEl) {
            if (wayBill.waybill_date) {
                const dt = new Date(wayBill.waybill_date);
                wbDateEl.value = dt.toISOString().split('T')[0];
            } else {
                wbDateEl.value = '';
            }
        }
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
                <input type="text" value="${item.description || ''}" placeholder="Enter item description" required>
                <ul class="suggestions"></ul>
            </div>
        </div>
        <div class="item-field hsn">
            <input type="text" value="${item.HSN_SAC || ''}" placeholder="Code" required>
        </div>
        <div class="item-field qty">
            <input type="number" value="${item.quantity || ''}" placeholder="0" min="1" required>
        </div>
        <div class="item-field price">
            <input type="number" value="${item.unit_price || ''}" placeholder="0.00" step="0.01" required>
        </div>
        <div class="item-field rate">
            <input type="number" value="${item.rate || ''}" placeholder="0" min="0" step="0.01">
        </div>
        <button type="button" class="remove-item-btn" title="Remove Item">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;
    itemsContainer.appendChild(card);
    
    // Create hidden table row
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><div class="item-number">${itemSno}</div></td>
        <td>
            <input type="text" value="${item.description || ''}" placeholder="Item Description" required>
            <ul class="suggestions"></ul>
        </td>
        <td><input type="text" value="${item.HSN_SAC || ''}" placeholder="HSN/SAC" required></td>
        <td><input type="number" value="${item.quantity || ''}" placeholder="Qty" min="1" required></td>
        <td><input type="number" value="${item.unit_price || ''}" placeholder="Unit Price" required></td>
        <td><input type="number" value="${item.rate || ''}" placeholder="Rate" min="0.01" step="0.01" required></td>
        <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
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

    // Setup autocomplete for description input (module-specific)
    const cardDescriptionInput = card.querySelector('input[placeholder="Description"]');
    const cardSuggestions = card.querySelector('.suggestions');
    const rowDescriptionInput = row.querySelector('td:nth-child(2) input[type="text"]');
    const rowSuggestions = row.querySelector('.suggestions');

    if (cardDescriptionInput && cardSuggestions) {
        cardDescriptionInput.addEventListener('input', function () {
            showSuggestionsWaybill(cardDescriptionInput, cardSuggestions);
        });
        cardDescriptionInput.addEventListener('keydown', function (event) {
            handleKeyboardNavigationWaybill(event, cardDescriptionInput, cardSuggestions);
        });
    }
    if (rowDescriptionInput && rowSuggestions) {
        rowDescriptionInput.addEventListener('input', function () {
            showSuggestionsWaybill(rowDescriptionInput, rowSuggestions);
            // Sync with card input
            if (cardDescriptionInput) cardDescriptionInput.value = rowDescriptionInput.value;
        });
        rowDescriptionInput.addEventListener('keydown', function (event) {
            handleKeyboardNavigationWaybill(event, rowDescriptionInput, rowSuggestions);
        });
    }
    
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

// --- Waybill-specific autocomplete implementation ---
let waybillSelectedIndex = -1;
let waybillData = [];

async function fetchWaybillStockNames() {
    try {
        const response = await fetch('/stock/get-names');
        waybillData = await response.json();
    } catch (error) {
        console.error('Error fetching stock names for waybill:', error);
    }
}

fetchWaybillStockNames();

async function fetchWaybillStockData(itemName) {
    try {
        const response = await fetch(`/stock/get-stock-item?item=${encodeURIComponent(itemName)}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching stock data for waybill:', error);
        return null;
    }
}

function showSuggestionsWaybill(input, suggestionsList) {
    const query = input.value.toLowerCase();
    suggestionsList.innerHTML = '';
    waybillSelectedIndex = -1;
    if (!query) {
        suggestionsList.style.display = 'none';
        return;
    }

    const filtered = waybillData.filter(item => item.toLowerCase().includes(query));
    if (!filtered.length) {
        suggestionsList.style.display = 'none';
        return;
    }
    suggestionsList.style.display = 'block';
    filtered.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        li.addEventListener('click', async () => {
            input.value = item;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            const parent = input.closest('.item-card') || input.closest('tr');
            await fillWaybill(item, parent);
            suggestionsList.style.display = 'none';
            waybillSelectedIndex = -1;
        });
        suggestionsList.appendChild(li);
    });
}

async function handleKeyboardNavigationWaybill(event, input, suggestionsList) {
    const items = suggestionsList.querySelectorAll('li');
    if (!items.length) return;

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        waybillSelectedIndex = (waybillSelectedIndex + 1) % items.length;
        input.value = items[waybillSelectedIndex].textContent;
        items.forEach((it, idx) => it.classList.toggle('selected', idx === waybillSelectedIndex));
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        waybillSelectedIndex = (waybillSelectedIndex - 1 + items.length) % items.length;
        input.value = items[waybillSelectedIndex].textContent;
        items.forEach((it, idx) => it.classList.toggle('selected', idx === waybillSelectedIndex));
    } else if (event.key === 'Enter') {
        event.preventDefault();
        if (waybillSelectedIndex >= 0 && items[waybillSelectedIndex]) {
            const selectedItem = items[waybillSelectedIndex].textContent;
            input.value = selectedItem;
            suggestionsList.style.display = 'none';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            const parent = input.closest('.item-card') || input.closest('tr');
            await fillWaybill(selectedItem, parent);
            waybillSelectedIndex = -1;
        }
    }
}

async function fillWaybill(itemName, element) {
    const isCard = element.classList.contains('item-card');
    const stockData = await fetchWaybillStockData(itemName);
    if (!stockData) return;

    if (isCard) {
        const inputs = element.querySelectorAll('input');
        // We assume column order: description, hsn, qty, unit_price, rate
        // Here inputs[1] => HSN, inputs[3] => Unit Price, inputs[4] => Rate (based on card structure in waybill)
        inputs[1].value = stockData.HSN_SAC || '';
        // unit_price is index 3? Check template: description, hsn, qty, unit_price, rate -> idx 3 & 4
        if (inputs[3]) inputs[3].value = stockData.unitPrice || 0;
        if (inputs[4]) inputs[4].value = stockData.GST || 0;
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        if (inputs[3]) inputs[3].dispatchEvent(new Event('input', { bubbles: true }));
        if (inputs[4]) inputs[4].dispatchEvent(new Event('input', { bubbles: true }));

        // Also update table row
        const cardIndex = Array.from(document.querySelectorAll('#items-container .item-card')).indexOf(element);
        const tableRow = document.querySelector(`#items-table tbody tr:nth-child(${cardIndex + 1})`);
        if (tableRow) {
            const rowInputs = tableRow.querySelectorAll('input');
            if (rowInputs.length >= 5) {
                rowInputs[1].value = stockData.HSN_SAC || '';
                rowInputs[3].value = stockData.unitPrice || 0;
                rowInputs[4].value = stockData.GST || 0;
            }
        }
    } else {
        // Table row
        const rowInputs = element.querySelectorAll('input');
        if (rowInputs.length >= 5) {
            rowInputs[1].value = stockData.HSN_SAC || '';
            rowInputs[3].value = stockData.unitPrice || 0;
            rowInputs[4].value = stockData.GST || 0;
        }
    }
}

// Local click handler to close suggestions dropdowns on waybill page
document.addEventListener('click', function (event) {
    if (!window.location.pathname.toLowerCase().includes('/waybill')) return;
    const allSuggestions = document.querySelectorAll('#items-container .suggestions, #items-table .suggestions');
    allSuggestions.forEach(suggestionsList => {
        const parentInput = suggestionsList.previousElementSibling || suggestionsList.parentElement?.querySelector('input');
        if (parentInput && !parentInput.contains(event.target) && !suggestionsList.contains(event.target)) {
            suggestionsList.style.display = 'none';
        }
    });
});

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
        const badge = row.querySelector('td:first-child .item-number');
        if (badge) {
            badge.textContent = index + 1;
        } else {
            const numberCell = row.querySelector('td:first-child');
            if (numberCell) numberCell.textContent = index + 1;
        }
    });
}

async function generatePreview() {
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
    const grandTotal = Math.round(subtotal + totalTax);
    // Build totals using shared renderer
    const totals = { taxableValue: subtotal, cgst: totalCGST, sgst: totalSGST, total: grandTotal };
    const hasTax = (totalCGST + totalSGST) > 0;
    const totalsHTML = `
        <div class="fifth-section">
            <div class="fifth-section-sub1">
                <div class="fifth-section-sub2">
                    ${SectionRenderers.renderAmountInWords(grandTotal)}
                </div>
                <div class="totals-section">
                    ${SectionRenderers.renderTotals(totals, hasTax)}
                </div>
            </div>
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

    const waybillDate = document.getElementById('waybill-date')?.value || document.getElementById('date')?.value || (new Date()).toISOString().split('T')[0];
    const waybillDateDisplay = typeof formatDateIndian === 'function' ? formatDateIndian(waybillDate) : (window.formatDate ? window.formatDate(waybillDate) : waybillDate);

    const infoSectionHTML = SectionRenderers.renderInfoSection([
        { label: 'Date', value: waybillDateDisplay },
        { label: 'Project Name', value: projectName },
        { label: 'Transportation Mode', value: transportMode },
        { label: 'Vehicle Number', value: vehicleNumber },
        { label: 'Place to Supply', value: placeSupply }
    ]);

    const itemColumns = ['Sl. No', 'Description', 'HSN Code', 'Qty', 'Unit Price', 'Tax Rate', 'Total'];

    // Build the complete document
    const documentHTML = await buildSimpleDocument({
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
    const rawDate = document.getElementById('waybill-date')?.value || document.getElementById('date')?.value || document.getElementById('waybill_date')?.value || (new Date()).toISOString().split('T')[0];
    let waybillDateISO = rawDate;
    try {
        // Convert YYYY-MM-DD to ISO string for backend consistency
        const d = new Date(rawDate);
        waybillDateISO = d.toISOString();
    } catch (err) {
        waybillDateISO = rawDate;
    }

    return {
        wayBillId: document.getElementById("waybill-id").value,
        waybillDate: waybillDateISO,
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

// Expose a generic getId() used by globalScript.js
async function getId() {
    return getWaybillId();
}