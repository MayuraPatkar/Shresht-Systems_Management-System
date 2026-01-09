// Step navigation variables (global so accessible from waybill_home.js keyboard shortcuts)
window.currentStep = 1;
window.totalSteps = 6;

// Change step function - made global for keyboard shortcuts
window.changeStep = async function (step) {
    document.getElementById(`step-${window.currentStep}`).classList.remove("active");
    window.currentStep = step;
    const nextStepEl = document.getElementById(`step-${window.currentStep}`);
    nextStepEl.classList.add("active");

    // Focus first input
    const firstInput = nextStepEl.querySelector('input, select, textarea');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 50);
    }

    updateNavigation();
    document.getElementById("step-indicator").textContent = `Step ${window.currentStep} of ${window.totalSteps}`;

    // Generate preview when reaching the last step
    if (window.currentStep === window.totalSteps) {
        await generatePreview();
    }
};

function updateNavigation() {
    const isUpdateMode = sessionStorage.getItem('currentTab-status') === 'update';
    if (isUpdateMode && window.currentStep === 2) {
        document.getElementById("prev-btn").disabled = true;
    } else {
        document.getElementById("prev-btn").disabled = window.currentStep === 1;
    }
    document.getElementById("next-btn").disabled = window.currentStep === window.totalSteps;
}

// Setup navigation button listeners
document.addEventListener('DOMContentLoaded', function () {
    // Next button - replace with cloned node to clear any previously attached handlers
    let nextBtnOld = document.getElementById("next-btn");
    let nextBtn = null;
    if (nextBtnOld) {
        nextBtn = nextBtnOld.cloneNode(true);
        nextBtnOld.parentNode.replaceChild(nextBtn, nextBtnOld);
    }
    if (nextBtn) {
        nextBtn.addEventListener("click", async () => {
            if (nextBtn.dataset.processing === "1") return; nextBtn.dataset.processing = "1"; try {
                if (typeof window.validateCurrentStep === 'function') {
                    const ok = await window.validateCurrentStep();
                    if (!ok) return;
                }

                // Advance to the next step after passing validation
                if (window.currentStep < window.totalSteps) {
                    window.changeStep(window.currentStep + 1);
                }
            } finally {
                delete nextBtn.dataset.processing;
            }
        });
    }

    // Previous button - replace with cloned node to clear any previously attached handlers
    let prevBtnOld = document.getElementById("prev-btn");
    let prevBtn = null;
    if (prevBtnOld) {
        prevBtn = prevBtnOld.cloneNode(true);
        prevBtnOld.parentNode.replaceChild(prevBtn, prevBtnOld);
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (prevBtn.dataset.processing === '1') return; prevBtn.dataset.processing = '1'; try {
                if (window.currentStep > 1) {
                    window.changeStep(window.currentStep - 1);
                }
            } finally { delete prevBtn.dataset.processing; }
        });
    }
});

// Set default waybill date
document.addEventListener('DOMContentLoaded', async () => {
    const dateInput = document.getElementById('waybill-date');
    if (dateInput && !dateInput.value) {
        dateInput.value = window.getTodayForInput ? window.getTodayForInput() : new Date().toISOString().split('T')[0];
    }
});

// Function to fetch and import invoice data
async function importInvoiceData(invoiceId) {
    try {
        // Try to fetch invoice by invoice_id
        const response = await fetch(`/invoice/${encodeURIComponent(invoiceId)}`);
        if (!response.ok) {
            throw new Error('Invoice not found');
        }
        const data = await response.json();
        const invoice = data.invoice;

        if (!invoice) {
            throw new Error('Invoice data not found');
        }

        // Clear existing items
        const itemsTableBody = document.querySelector("#items-table tbody");
        const itemsContainer = document.getElementById("items-container");
        if (itemsTableBody) itemsTableBody.innerHTML = "";
        if (itemsContainer) itemsContainer.innerHTML = "";

        // Populate items from invoice (use items_original or items_duplicate)

        const items = invoice.items_original || invoice.items_duplicate || [];
        let sno = 1;

        for (const item of items) {
            let stockId = item.stock_id || '';

            // If stock_id is missing, try to fetch it from stock based on description
            if (!stockId && item.description) {
                try {
                    // Try to find fetchStockData function (global)
                    const fetchFn = window.fetchStockData || (typeof fetchStockData === 'function' ? fetchStockData : null);

                    if (fetchFn) {
                        const stockData = await fetchFn(item.description);
                        if (stockData && stockData._id) {
                            stockId = stockData._id;
                        }
                    }
                } catch (error) {
                    console.warn('Could not fetch stock data for item:', item.description);
                }
            }

            addItemFromData({
                description: item.description || '',
                hsn_sac: item.HSN_SAC || item.hsn_sac || '',
                quantity: item.quantity || 0,
                unit_price: item.unit_price || 0,
                gst_rate: item.rate || item.gst_rate || 0,
                stock_id: stockId // Import stock_id if available or fetched
            }, sno);
            sno++;
        }

        // Populate addresses
        const fromAddressEl = document.getElementById('from-address');
        const toAddressEl = document.getElementById('to-address');

        // Fetch company info for from_address
        if (fromAddressEl && window.companyConfig) {
            try {
                const company = await window.companyConfig.getCompanyInfo();
                if (company) {
                    let fromAddress = company.company || '';
                    if (company.address) fromAddress += '\n' + company.address;
                    if (company.phone) {
                        const phone = company.phone.ph1 + (company.phone.ph2 ? ' / ' + company.phone.ph2 : '');
                        fromAddress += '\nPhone: ' + phone;
                    }
                    if (company.GSTIN) fromAddress += '\nGSTIN: ' + company.GSTIN;
                    fromAddressEl.value = fromAddress;
                }
            } catch (companyErr) {
                console.warn('Could not fetch company info for from_address:', companyErr);
            }
        }

        // Use customer details as to_address
        if (toAddressEl && invoice.customer_name) {
            let toAddress = invoice.customer_name || '';
            if (invoice.customer_address) toAddress += '\n' + invoice.customer_address;
            if (invoice.customer_phone) toAddress += '\nPhone: ' + invoice.customer_phone;
            if (invoice.customer_GSTIN) toAddress += '\nGSTIN: ' + invoice.customer_GSTIN;
            toAddressEl.value = toAddress;
        }

        // Store invoice MongoDB _id for reference
        document.getElementById('waybill-form').dataset.invoiceId = invoice._id;

        return true;
    } catch (error) {
        console.error('Error importing invoice:', error);
        window.electronAPI?.showAlert1('Failed to import invoice. Please check the Invoice ID.');
        return false;
    }
}

// Function to check if an e-way bill already exists for an invoice
async function checkExistingEWayBillForInvoice(invoiceId) {
    try {
        // We need to search e-way bills that reference this invoice
        // Using the search endpoint to look for the invoice ID in the invoice_id field match
        const response = await fetch(`/eWayBill/check-invoice/${encodeURIComponent(invoiceId)}`);
        if (response.ok) {
            const data = await response.json();
            return data.exists;
        }
        return false;
    } catch (error) {
        console.warn('Could not verify existing e-way bill:', error);
        return false;
    }
}

// Function to check if an e-way bill number already exists
async function checkExistingEWayBillNo(ewaybillNo, excludeId = null) {
    try {
        let url = `/eWayBill/check-ewaybill-no/${encodeURIComponent(ewaybillNo)}`;
        if (excludeId) {
            url += `?excludeId=${encodeURIComponent(excludeId)}`;
        }
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            return data.exists;
        }
        return false;
    } catch (error) {
        console.warn('Could not verify existing e-way bill number:', error);
        return false;
    }
}

// Validate current step
window.validateCurrentStep = async function () {
    // Step 1: Invoice ID is required - fetch and populate data
    if (window.currentStep === 1) {
        const invoiceId = document.getElementById('invoice-id');
        if (!invoiceId || !invoiceId.value.trim()) {
            window.electronAPI.showAlert1('Please enter an Invoice ID.');
            invoiceId?.focus();
            return false;
        }

        // Check if e-way bill already exists for this invoice (only for new e-way bills)
        const formEl = document.getElementById('waybill-form');
        const isEditing = formEl?.dataset?.ewaybillId;
        if (!isEditing) {
            const exists = await checkExistingEWayBillForInvoice(invoiceId.value.trim());
            if (exists) {
                window.electronAPI.showAlert1('An E-Way Bill already exists for this Invoice. Each invoice can only have one E-Way Bill.');
                return false;
            }
        }

        // Try to import invoice data
        const imported = await importInvoiceData(invoiceId.value.trim());
        if (!imported) {
            return false;
        }
    }

    // Step 2: E-Way Bill Number is required
    if (window.currentStep === 2) {
        const ewaybillNo = document.getElementById('ewaybill-no');
        if (!ewaybillNo || !ewaybillNo.value.trim()) {
            window.electronAPI.showAlert1('Please enter an E-Way Bill Number.');
            ewaybillNo?.focus();
            return false;
        }

        // Check if e-way bill number already exists
        // When editing, exclude the current e-waybill from duplicate check
        const formEl = document.getElementById('waybill-form');
        const currentEWayBillId = formEl?.dataset?.ewaybillId;
        const exists = await checkExistingEWayBillNo(
            ewaybillNo.value.trim(),
            currentEWayBillId || null
        );
        if (exists) {
            window.electronAPI.showAlert1('An E-Way Bill with this number already exists. Please enter a unique E-Way Bill Number.');
            ewaybillNo?.focus();
            return false;
        }
    }

    // Step 3: Address details must be filled
    if (window.currentStep === 3) {
        const fromAddress = document.getElementById('from-address');
        const toAddress = document.getElementById('to-address');
        if (!fromAddress || !fromAddress.value.trim()) {
            window.electronAPI.showAlert1('Please enter the From Address.');
            fromAddress?.focus();
            return false;
        }
        if (!toAddress || !toAddress.value.trim()) {
            window.electronAPI.showAlert1('Please enter the To Address.');
            toAddress?.focus();
            return false;
        }
    }

    // Step 4: Transportation mode is required
    if (window.currentStep === 4) {
        const transportMode = document.getElementById('transport-mode');
        if (!transportMode || !transportMode.value.trim()) {
            window.electronAPI.showAlert1('Please select a Transportation Mode.');
            transportMode?.focus();
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
            const desc = row.querySelector('td:nth-child(2) input[type="text"]');
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
            if (!price || !price.value.trim() || Number(price.value) <= 0) {
                window.electronAPI.showAlert1(`Item #${index + 1}: Unit Price must be greater than 0.`);
                price?.focus();
                return false;
            }
        }
    }

    return true;
};

// Open an e-way bill for editing
async function openWayBill(wayBillId) {
    try {
        const response = await fetch(`/eWayBill/${wayBillId}`);
        if (!response.ok) throw new Error('Failed to fetch e-way bill');
        const data = await response.json();
        const wayBill = data.eWayBill;

        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'block';
        document.getElementById('new-waybill-btn').style.display = 'none';
        document.getElementById('view-preview').style.display = 'block';

        if (window.currentStep === 1) {
            window.changeStep(2);
        }

        // Store the MongoDB _id for updates
        document.getElementById('waybill-form').dataset.ewaybillId = wayBill._id;

        // Store invoice ID from populated object or direct value
        if (wayBill.invoice_id) {
            if (typeof wayBill.invoice_id === 'object' && wayBill.invoice_id._id) {
                document.getElementById('waybill-form').dataset.invoiceId = wayBill.invoice_id._id;
                // Also populate the input if it exists
                const invoiceIdInput = document.getElementById('invoice-id');
                if (invoiceIdInput) invoiceIdInput.value = wayBill.invoice_id.invoice_id || '';
            } else {
                document.getElementById('waybill-form').dataset.invoiceId = wayBill.invoice_id;
            }
        }

        // Populate form fields based on new schema
        document.getElementById('ewaybill-no').value = wayBill.ewaybill_no || '';
        document.getElementById('ewaybill-status').value = wayBill.ewaybill_status || 'Draft';

        const wbDateEl = document.getElementById('waybill-date');
        if (wbDateEl && wayBill.ewaybill_generated_at) {
            const dt = new Date(wayBill.ewaybill_generated_at);
            wbDateEl.value = window.formatDateInput ? window.formatDateInput(dt) : dt.toISOString().split('T')[0];
        }

        document.getElementById('from-address').value = wayBill.from_address || '';
        document.getElementById('to-address').value = wayBill.to_address || '';

        // Transport details
        const transport = wayBill.transport || {};
        document.getElementById('transport-mode').value = transport.mode || 'Road';
        document.getElementById('vehicle-number').value = transport.vehicle_number || '';
        document.getElementById('transporter-id').value = transport.transporter_id || '';
        document.getElementById('transporter-name').value = transport.transporter_name || '';
        document.getElementById('distance-km').value = transport.distance_km || '';

        // Populate items
        const itemsTableBody = document.querySelector("#items-table tbody");
        itemsTableBody.innerHTML = "";
        const itemsContainer = document.getElementById("items-container");
        itemsContainer.innerHTML = "";
        let sno = 1;

        (wayBill.items || []).forEach(item => {
            addItemFromData(item, sno);
            sno++;
        });
    } catch (error) {
        console.error('Error opening e-way bill:', error);
        window.electronAPI?.showAlert1('Failed to load e-way bill.');
    }
}

// Setup add item button listener after DOM loads
document.addEventListener('DOMContentLoaded', function () {
    const addItemBtnOld = document.getElementById('add-item-btn');
    if (addItemBtnOld) {
        const addItemBtn = addItemBtnOld.cloneNode(true);
        addItemBtnOld.parentNode.replaceChild(addItemBtn, addItemBtnOld);
        addItemBtn.addEventListener('click', () => {
            if (addItemBtn.dataset.processing === '1') return;
            addItemBtn.dataset.processing = '1';
            try {
                addItem();
            } finally {
                delete addItemBtn.dataset.processing;
            }
        });
    }
});

// Helper function to add item with data
function addItemFromData(item, itemSno, insertIndex) {
    const itemsContainer = document.getElementById("items-container");
    const itemsTableBody = document.querySelector("#items-table tbody");

    // Create card
    const card = document.createElement("div");
    card.className = "item-card";
    card.setAttribute("draggable", "true");
    card.innerHTML = `
        <div class="drag-handle" title="Drag to reorder">
            <i class="fas fa-grip-vertical"></i>
        </div>
        <div class="item-number">${itemSno}</div>
        <div class="item-field description">
            <div style="position: relative;">
                <input type="hidden" class="stock-id" value="${item.stock_id || ''}">
                <input type="text" value="${item.description || ''}" placeholder="Enter item description" required>
                <ul class="suggestions"></ul>
            </div>
        </div>
        <div class="item-field hsn">
            <input type="text" value="${item.hsn_sac || item.HSN_SAC || ''}" placeholder="Code" required>
        </div>
        <div class="item-field qty">
            <input type="number" value="${item.quantity || ''}" placeholder="0" min="1" required>
        </div>
        <div class="item-field price">
            <input type="number" value="${item.unit_price || ''}" placeholder="0.00" step="0.01" required>
        </div>
        <div class="item-field rate">
            <input type="number" value="${item.gst_rate || item.rate || ''}" placeholder="0" min="0" step="0.01">
        </div>
        <div class="item-actions">
            <button type="button" class="remove-item-btn" title="Remove Item">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;

    if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex < itemsContainer.children.length) {
        itemsContainer.insertBefore(card, itemsContainer.children[insertIndex]);
    } else {
        itemsContainer.appendChild(card);
    }

    // Create hidden table row
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><div class="item-number">${itemSno}</div></td>
        <td>
            <input type="hidden" class="stock-id" value="${item.stock_id || ''}">
            <input type="text" value="${item.description || ''}" placeholder="Item Description" required>
            <ul class="suggestions"></ul>
        </td>
        <td><input type="text" value="${item.hsn_sac || item.HSN_SAC || ''}" placeholder="HSN/SAC" required></td>
        <td><input type="number" value="${item.quantity || ''}" placeholder="Qty" min="1" required></td>
        <td><input type="number" value="${item.unit_price || ''}" placeholder="Unit Price" required></td>
        <td><input type="number" value="${item.gst_rate || item.rate || ''}" placeholder="GST Rate" min="0" step="0.01" required></td>
        <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
    `;

    if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex < itemsTableBody.children.length) {
        itemsTableBody.insertBefore(row, itemsTableBody.children[insertIndex]);
    } else {
        itemsTableBody.appendChild(row);
    }

    // Sync card inputs with table inputs
    const cardInputs = card.querySelectorAll('input');
    const rowInputs = row.querySelectorAll('input');
    cardInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            rowInputs[index].value = input.value;
        });
    });

    // Integer validation for quantity inputs
    const qtyInputs = [card.querySelector('.item-field.qty input'), row.querySelector('td:nth-child(4) input')];
    qtyInputs.forEach(input => {
        if (input) {
            input.setAttribute('step', '1');
            input.addEventListener('keypress', function (event) {
                if (event.key === '.' || event.key === 'e' || event.key === '-' || event.key === '+') event.preventDefault();
            });
            input.addEventListener('input', function () {
                this.value = this.value.replace(/[^0-9]/g, '');
            });
        }
    });

    // Setup autocomplete for description input - use global functions
    const cardDescriptionInput = card.querySelector('.item-field.description input[type="text"]');
    const cardSuggestions = card.querySelector('.item-field.description .suggestions');
    const rowDescriptionInput = row.querySelector('td:nth-child(2) input[type="text"]');
    const rowSuggestions = row.querySelector('td:nth-child(2) .suggestions');

    if (cardDescriptionInput && cardSuggestions) {
        cardDescriptionInput.addEventListener('input', function () {
            showSuggestions(cardDescriptionInput, cardSuggestions);
        });
        cardDescriptionInput.addEventListener('keydown', function (event) {
            handleKeyboardNavigation(event, cardDescriptionInput, cardSuggestions);
        });
    }
    if (rowDescriptionInput && rowSuggestions) {
        rowDescriptionInput.addEventListener('input', function () {
            showSuggestions(rowDescriptionInput, rowSuggestions);
            if (cardDescriptionInput) cardDescriptionInput.value = rowDescriptionInput.value;
        });
        rowDescriptionInput.addEventListener('keydown', function (event) {
            handleKeyboardNavigation(event, rowDescriptionInput, rowSuggestions);
        });
    }

    // Add remove button event listeners
    const cardRemoveBtn = card.querySelector(".remove-item-btn");
    const tableRemoveBtn = row.querySelector(".remove-item-btn");

    cardRemoveBtn.addEventListener("click", function () {
        card.remove();
        row.remove();
        renumberItems();
    });

    tableRemoveBtn.addEventListener("click", function () {
        card.remove();
        row.remove();
        renumberItems();
    });

    if (typeof insertIndex === 'number') {
        renumberItems();
    }
}

// Add a new empty item
function addItem(insertIndex) {
    if (addItem._processing) return;
    addItem._processing = true;
    try {
        const itemsTableBody = document.querySelector("#items-table tbody");
        const itemSno = itemsTableBody.rows.length + 1;

        addItemFromData({
            description: '',
            stock_id: '',
            hsn_sac: '',
            quantity: '',
            unit_price: '',
            gst_rate: ''
        }, itemSno, insertIndex);
    } finally {
        setTimeout(() => { delete addItem._processing; }, 50);
    }
}

// Close suggestions dropdowns on click outside
document.addEventListener('click', function (event) {
    if (!window.location.pathname.toLowerCase().includes('/ewaybill')) return;
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
    const ewaybillNo = document.getElementById("ewaybill-no")?.value || "";
    const ewaybillStatus = document.getElementById("ewaybill-status")?.value || "Draft";
    // Prefer the visible input value (readable ID) over the dataset (likely ObjectId)
    const invoiceId = document.getElementById("invoice-id")?.value || document.getElementById('waybill-form')?.dataset?.invoiceId || "";
    const fromAddress = document.getElementById("from-address")?.value || "";
    const toAddress = document.getElementById("to-address")?.value || "";
    const transportMode = document.getElementById("transport-mode")?.value || "";
    const vehicleNumber = document.getElementById("vehicle-number")?.value || "";
    const transporterId = document.getElementById("transporter-id")?.value || "";
    const transporterName = document.getElementById("transporter-name")?.value || "";
    const distanceKm = document.getElementById("distance-km")?.value || "";

    // Collect items from table
    const items = Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => {
        // Find inputs carefully. 
        // We added a hidden input in the 2nd cell (index 1).
        const stockIdInput = row.querySelector('.stock-id');

        return {
            stock_id: stockIdInput ? stockIdInput.value : null,
            description: row.cells[1].querySelector("input[type=text]").value || "-",
            hsn_sac: row.cells[2].querySelector("input").value || "-",
            quantity: row.cells[3].querySelector("input").value || "0",
            unit_price: row.cells[4].querySelector("input").value || "0",
            gst_rate: row.cells[5].querySelector("input").value || "0"
        };
    });

    // Calculate totals
    let totalTaxableValue = 0;
    let cgst = 0;
    let sgst = 0;
    items.forEach(item => {
        const qty = parseFloat(item.quantity || 0);
        const unitPrice = parseFloat(item.unit_price || 0);
        const gstRate = parseFloat(item.gst_rate || 0);
        const taxableValue = qty * unitPrice;
        const tax = (taxableValue * gstRate) / 100;
        totalTaxableValue += taxableValue;
        cgst += tax / 2;
        sgst += tax / 2;
    });
    const totalInvoiceValue = Math.round(totalTaxableValue + cgst + sgst);

    const waybillDate = document.getElementById('waybill-date')?.value || (window.getTodayForInput ? window.getTodayForInput() : new Date().toISOString().split('T')[0]);

    const wayBillObj = {
        ewaybill_no: ewaybillNo,
        ewaybill_status: ewaybillStatus,
        invoice_id: invoiceId,
        ewaybill_generated_at: waybillDate,
        from_address: fromAddress,
        to_address: toAddress,
        transport: {
            mode: transportMode,
            vehicle_number: vehicleNumber,
            transporter_id: transporterId,
            transporter_name: transporterName,
            distance_km: Number(distanceKm) || 0
        },
        items: items.map(it => ({
            stock_id: it.stock_id,
            description: it.description,
            hsn_sac: it.hsn_sac,
            quantity: Number(it.quantity) || 0,
            unit_price: Number(it.unit_price) || 0,
            gst_rate: Number(it.gst_rate) || 0
        })),
        total_taxable_value: totalTaxableValue,
        cgst,
        sgst,
        total_invoice_value: totalInvoiceValue
    };

    const pagesHTML = await generateViewPreviewHTML(wayBillObj, null); // Pass null so it doesn't write to view-preview-content
    document.getElementById("preview-content").innerHTML = pagesHTML;
}

// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    return await sendDocumentToServer("/eWayBill/save-ewaybill", data);
}

// Event listener for the "Save" button
const saveBtn = document.getElementById("save-btn");
if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
        const wasNewWayBill = sessionStorage.getItem('currentTab-status') !== 'update';
        const wayBillData = collectFormData();
        const ok = await sendToServer(wayBillData, false);
        if (ok) {
            window.electronAPI.showAlert1("E-Way Bill saved successfully!");
            if (wasNewWayBill) {
                sessionStorage.removeItem('currentTab-status');
                window.location = '/ewaybill';
            }
        }
    });
}

// Function to collect form data
function collectFormData() {
    const rawDate = document.getElementById('waybill-date')?.value || (window.getTodayForInput ? window.getTodayForInput() : new Date().toISOString().split('T')[0]);
    let waybillDateISO = rawDate;
    try {
        const d = new Date(rawDate);
        waybillDateISO = d.toISOString();
    } catch (err) {
        waybillDateISO = rawDate;
    }

    // Get _id if editing existing document
    const formEl = document.getElementById('waybill-form');
    const existingId = formEl?.dataset?.ewaybillId || '';

    return {
        _id: existingId,
        invoiceId: document.getElementById('waybill-form')?.dataset?.invoiceId || '',
        eWayBillNo: document.getElementById("ewaybill-no")?.value || '',
        eWayBillStatus: document.getElementById("ewaybill-status")?.value || 'Draft',
        eWayBillDate: waybillDateISO,
        fromAddress: document.getElementById("from-address")?.value || '',
        toAddress: document.getElementById("to-address")?.value || '',
        transportMode: document.getElementById("transport-mode")?.value || '',
        vehicleNumber: document.getElementById("vehicle-number")?.value || '',
        transporterId: document.getElementById("transporter-id")?.value || '',
        transporterName: document.getElementById("transporter-name")?.value || '',
        distanceKm: Number(document.getElementById("distance-km")?.value) || 0,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map(row => ({
            stock_id: row.querySelector("td:nth-child(2) input.stock-id")?.value || '',
            description: row.querySelector("td:nth-child(2) input[type='text']")?.value || '',
            hsn_sac: row.querySelector("td:nth-child(3) input")?.value || '',
            quantity: row.querySelector("td:nth-child(4) input")?.value || '',
            unit_price: row.querySelector("td:nth-child(5) input")?.value || '',
            gst_rate: row.querySelector("td:nth-child(6) input")?.value || '',
        })),
    };
}

// Initialize drag-drop reordering for waybill items
document.addEventListener('DOMContentLoaded', function () {
    if (window.itemReorder && typeof window.itemReorder.initDragDrop === 'function') {
        window.itemReorder.initDragDrop('items-container', renumberItems);
    }
});