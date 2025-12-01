const totalSteps = 4;
let purchaseOrderId = '';
let totalAmount = 0;

// Supplier data for autocomplete
let supplierData = [];
let supplierNames = [];
let selectedSupplierIndex = -1;

// Fetch supplier data on load
async function fetchSuppliers() {
    try {
        const response = await fetch('/purchaseOrder/suppliers/list');
        if (response.ok) {
            const data = await response.json();
            supplierData = data.suppliers || [];
            supplierNames = supplierData.map(s => s.name);
        }
    } catch (error) {
        console.error('Error fetching suppliers:', error);
    }
}

// Initialize supplier autocomplete
function initSupplierAutocomplete() {
    const supplierNameInput = document.getElementById('supplier-name');
    if (!supplierNameInput) return;
    
    // Create suggestions list if it doesn't exist
    let suggestionsContainer = supplierNameInput.parentElement.querySelector('.supplier-suggestions');
    if (!suggestionsContainer) {
        suggestionsContainer = document.createElement('ul');
        suggestionsContainer.className = 'supplier-suggestions suggestions';
        supplierNameInput.parentElement.style.position = 'relative';
        supplierNameInput.parentElement.appendChild(suggestionsContainer);
    }
    
    supplierNameInput.addEventListener('input', function() {
        showSupplierSuggestions(this, suggestionsContainer);
    });
    
    supplierNameInput.addEventListener('keydown', function(event) {
        handleSupplierKeyboardNavigation(event, this, suggestionsContainer);
    });
    
    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!supplierNameInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });
}

function showSupplierSuggestions(input, suggestionsList) {
    const query = input.value.toLowerCase().trim();
    suggestionsList.innerHTML = '';
    selectedSupplierIndex = -1;
    
    if (query.length === 0) {
        suggestionsList.style.display = 'none';
        return;
    }
    
    const filtered = supplierData.filter(s => 
        s.name && s.name.toLowerCase().includes(query)
    );
    
    if (filtered.length === 0) {
        suggestionsList.style.display = 'none';
        return;
    }
    
    suggestionsList.style.display = 'block';
    
    filtered.forEach((supplier, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${supplier.name}</strong><br><small style="color: #666;">${supplier.address || ''}</small>`;
        li.style.padding = '8px 12px';
        li.style.cursor = 'pointer';
        li.style.borderBottom = '1px solid #eee';
        
        li.onclick = function() {
            fillSupplierDetails(supplier);
            suggestionsList.style.display = 'none';
            selectedSupplierIndex = -1;
        };
        
        li.onmouseenter = function() {
            li.style.backgroundColor = '#f0f0f0';
        };
        li.onmouseleave = function() {
            li.style.backgroundColor = '';
        };
        
        suggestionsList.appendChild(li);
    });
}

function handleSupplierKeyboardNavigation(event, input, suggestionsList) {
    const items = suggestionsList.querySelectorAll('li');
    if (items.length === 0) return;
    
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedSupplierIndex = (selectedSupplierIndex + 1) % items.length;
        updateSupplierSelection(items);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedSupplierIndex = (selectedSupplierIndex - 1 + items.length) % items.length;
        updateSupplierSelection(items);
    } else if (event.key === 'Enter') {
        event.preventDefault();
        if (selectedSupplierIndex >= 0 && items[selectedSupplierIndex]) {
            items[selectedSupplierIndex].click();
        }
    } else if (event.key === 'Escape') {
        suggestionsList.style.display = 'none';
        selectedSupplierIndex = -1;
    }
}

function updateSupplierSelection(items) {
    items.forEach((item, index) => {
        if (index === selectedSupplierIndex) {
            item.style.backgroundColor = '#e0e7ff';
        } else {
            item.style.backgroundColor = '';
        }
    });
    
    // Scroll selected item into view
    if (selectedSupplierIndex >= 0 && items[selectedSupplierIndex]) {
        items[selectedSupplierIndex].scrollIntoView({ block: 'nearest' });
    }
}

function fillSupplierDetails(supplier) {
    document.getElementById('supplier-name').value = supplier.name || '';
    document.getElementById('supplier-address').value = supplier.address || '';
    document.getElementById('supplier-phone').value = supplier.phone || '';
    document.getElementById('supplier-email').value = supplier.email || '';
    document.getElementById('supplier-GSTIN').value = supplier.GSTIN || '';
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    await fetchSuppliers();
    initSupplierAutocomplete();
});

// Note: selectedIndex, data, fetchData, fetchStockData, showSuggestions, and handleKeyboardNavigation
// are already defined in globalScript.js

// Override showSuggestions for purchase order to use fillPurchaseOrderItem
function showSuggestionsPO(input, suggestionsList) {
    const query = input.value.toLowerCase();
    suggestionsList.innerHTML = ""; // Clear old suggestions
    selectedIndex = -1; // Reset index when showing new suggestions

    if (query.length === 0) {
        suggestionsList.style.display = "none";
        return;
    }

    const filtered = data.filter(item => item.toLowerCase().includes(query));

    if (filtered.length === 0) {
        suggestionsList.style.display = "none";
        return;
    }

    suggestionsList.style.display = "block";

    filtered.forEach((item, index) => {
        let li = document.createElement("li");
        li.textContent = item;
        li.onclick = async function () {
            input.value = item;
            // Trigger input event to sync description with table
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            const parent = input.closest('.item-card') || input.closest('tr');
            await fillPurchaseOrderItem(item, parent);
            suggestionsList.style.display = "none";
            // Reset selected index
            selectedIndex = -1;
        };
        suggestionsList.appendChild(li);
    });
}

// Override handleKeyboardNavigation for purchase order
async function handleKeyboardNavigationPO(event, input, suggestionsList) {
    const items = suggestionsList.querySelectorAll("li");
    if (items.length === 0) return;

    if (event.key === "ArrowDown") {
        event.preventDefault(); // Prevent cursor movement and scrolling
        selectedIndex = (selectedIndex + 1) % items.length;
        input.value = items[selectedIndex].textContent;
        
        // Update visual selection
        items.forEach((item, index) => {
            item.classList.toggle("selected", index === selectedIndex);
        });
    } else if (event.key === "ArrowUp") {
        event.preventDefault(); // Prevent cursor movement and scrolling
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        input.value = items[selectedIndex].textContent;
        
        // Update visual selection
        items.forEach((item, index) => {
            item.classList.toggle("selected", index === selectedIndex);
        });
    } else if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        
        if (selectedIndex >= 0 && items[selectedIndex]) {
            const selectedItem = items[selectedIndex].textContent;
            input.value = selectedItem;
            suggestionsList.style.display = "none";
            
            // Trigger input event to sync description with table
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Fill other fields from stock data
            const parent = input.closest('.item-card') || input.closest('tr');
            await fillPurchaseOrderItem(selectedItem, parent);
            
            // Reset selected index
            selectedIndex = -1;
        }
        return;
    }
}

// Function to autofill row data for purchase order
async function fillPurchaseOrderItem(itemName, element) {
    // Check if element is a card or a table row
    const isCard = element.classList.contains('item-card');
    
    const stockData = await fetchStockData(itemName);
    if (stockData) {
        if (isCard) {
            // Fill card inputs - new two-row layout
            // Row 1 inputs: description, hsn, qty, unit_price, rate
            // Row 2 inputs: company, type, category
            const row1Inputs = element.querySelectorAll('.item-row-1 input');
            const row2Inputs = element.querySelectorAll('.item-row-2 input');
            
            // Row 1: [0]=description, [1]=HSN, [2]=qty, [3]=unit_price, [4]=rate
            if (row1Inputs[1]) row1Inputs[1].value = stockData.HSN_SAC || "";
            // Leave qty blank (user needs to enter)
            if (row1Inputs[3]) row1Inputs[3].value = stockData.unitPrice || 0;
            if (row1Inputs[4]) row1Inputs[4].value = stockData.GST || 0;
            
            // Row 2: [0]=company, [1]=type, [2]=category
            if (row2Inputs[0]) row2Inputs[0].value = stockData.company || "";
            if (row2Inputs[1]) row2Inputs[1].value = stockData.type || "";
            if (row2Inputs[2]) row2Inputs[2].value = stockData.category || "";
            
            // Trigger input events to sync with table
            [...row1Inputs, ...row2Inputs].forEach(input => {
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
            
            // Also update corresponding table row
            const cardIndex = Array.from(document.querySelectorAll('#items-container .item-card')).indexOf(element);
            const tableRow = document.querySelector(`#items-table tbody tr:nth-child(${cardIndex + 1})`);
            if (tableRow) {
                // Get inputs from each cell
                const cells = tableRow.querySelectorAll('td');
                const descInput = cells[1]?.querySelector('input');
                const hsnInput = cells[2]?.querySelector('input');
                const companyInput = cells[3]?.querySelector('input');
                const typeInput = cells[4]?.querySelector('input');
                const categoryInput = cells[5]?.querySelector('input');
                const qtyInput = cells[6]?.querySelector('input');
                const priceInput = cells[7]?.querySelector('input');
                const rateInput = cells[8]?.querySelector('input');
                
                if (hsnInput) hsnInput.value = stockData.HSN_SAC || "";
                if (companyInput) companyInput.value = stockData.company || "";
                if (typeInput) typeInput.value = stockData.type || "";
                if (categoryInput) categoryInput.value = stockData.category || "";
                if (priceInput) priceInput.value = stockData.unitPrice || 0;
                if (rateInput) rateInput.value = stockData.GST || 0;
                
                // Store specification in row dataset
                tableRow.dataset.specification = stockData.specifications || '';
            }
        } else {
            // Fill table row - get inputs from each cell
            const cells = element.querySelectorAll('td');
            const descInput = cells[1]?.querySelector('input');
            const hsnInput = cells[2]?.querySelector('input');
            const companyInput = cells[3]?.querySelector('input');
            const typeInput = cells[4]?.querySelector('input');
            const categoryInput = cells[5]?.querySelector('input');
            const qtyInput = cells[6]?.querySelector('input');
            const priceInput = cells[7]?.querySelector('input');
            const rateInput = cells[8]?.querySelector('input');
            
            if (hsnInput) hsnInput.value = stockData.HSN_SAC || "";
            if (companyInput) companyInput.value = stockData.company || "";
            if (typeInput) typeInput.value = stockData.type || "";
            if (categoryInput) categoryInput.value = stockData.category || "";
            if (priceInput) priceInput.value = stockData.unitPrice || 0;
            if (rateInput) rateInput.value = stockData.GST || 0;
            
            // Store specification in row dataset
            element.dataset.specification = stockData.specifications || '';
            
            // Also sync with card if it exists
            const rowIndex = Array.from(element.parentElement.children).indexOf(element);
            const card = document.querySelector(`#items-container .item-card:nth-child(${rowIndex + 1})`);
            if (card) {
                const row1Inputs = card.querySelectorAll('.item-row-1 input');
                const row2Inputs = card.querySelectorAll('.item-row-2 input');
                
                if (row1Inputs[1]) row1Inputs[1].value = stockData.HSN_SAC || "";
                if (row1Inputs[3]) row1Inputs[3].value = stockData.unitPrice || 0;
                if (row1Inputs[4]) row1Inputs[4].value = stockData.GST || 0;
                if (row2Inputs[0]) row2Inputs[0].value = stockData.company || "";
                if (row2Inputs[1]) row2Inputs[1].value = stockData.type || "";
                if (row2Inputs[2]) row2Inputs[2].value = stockData.category || "";
            }
        }
    }
}

// Note: Global click handler for closing suggestions is already defined in globalScript.js

document.getElementById("view-preview").addEventListener("click", () => {
    changeStep(totalSteps);
    generatePreview();
});

// Open a purchase order for editing
async function openPurchaseOrder(purchaseOrderId) {
    const data = await fetchDocumentById('purchaseOrder', purchaseOrderId);
    if (!data) return;

    const purchaseOrder = data.purchaseOrder;

        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'block';
        document.getElementById('new-purchase').style.display = 'none';
        document.getElementById('view-preview').style.display = 'block';
        document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;

        document.getElementById('id').value = purchaseOrder.purchase_order_id;
        document.getElementById('purchase-invoice-id').value = purchaseOrder.purchase_invoice_id;
        document.getElementById('purchase-date').value = formatDate(purchaseOrder.purchase_date);
        document.getElementById('supplier-name').value = purchaseOrder.supplier_name;
        document.getElementById('supplier-address').value = purchaseOrder.supplier_address;
        document.getElementById('supplier-phone').value = purchaseOrder.supplier_phone;
        document.getElementById('supplier-email').value = purchaseOrder.supplier_email;
        document.getElementById('supplier-GSTIN').value = purchaseOrder.supplier_GSTIN;

        const itemsTableBody = document.querySelector("#items-table tbody");
        itemsTableBody.innerHTML = "";
        const itemsContainer = document.getElementById("items-container");
        itemsContainer.innerHTML = "";
        let sno = 1;
        (purchaseOrder.items || []).forEach(item => {
            // Create card
            const card = document.createElement("div");
            card.className = "item-card";
            card.innerHTML = `
                <div class="item-row-1">
                    <div class="item-number">${sno}</div>
                    <div class="item-field description">
                        <div style="position: relative;">
                            <input type="text" value="${item.description}" placeholder="Description" class="item_name" required>
                            <ul class="suggestions"></ul>
                        </div>
                    </div>
                    <div class="item-field hsn">
                        <input type="text" value="${item.HSN_SAC}" placeholder="HSN/SAC" required>
                    </div>
                    <div class="item-field qty">
                        <input type="number" value="${item.quantity}" placeholder="Qty" min="1" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" value="${item.unit_price}" placeholder="Unit Price" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" value="${item.rate}" placeholder="GST %" min="0" step="0.01">
                    </div>
                    <button type="button" class="remove-item-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="item-row-2">
                    <div class="row-spacer"></div>
                    <div class="item-field">
                        <input type="text" value="${item.company || ''}" placeholder="Company">
                    </div>
                    <div class="item-field">
                        <input type="text" value="${item.type || ''}" placeholder="Type">
                    </div>
                    <div class="item-field">
                        <input type="text" value="${item.category || ''}" placeholder="Category">
                    </div>
                    <div class="row-spacer"></div>
                </div>
            `;
            itemsContainer.appendChild(card);
            
            // Setup autocomplete for loaded items
            const cardInput = card.querySelector(".item_name");
            const cardSuggestions = card.querySelector(".suggestions");
            
            if (cardInput && cardSuggestions) {
                cardInput.addEventListener("input", function () {
                    showSuggestionsPO(cardInput, cardSuggestions);
                });

                cardInput.addEventListener("keydown", function (event) {
                    handleKeyboardNavigationPO(event, cardInput, cardSuggestions);
                });
            }
            
            // Create hidden table row
            const row = document.createElement("tr");
            row.dataset.specification = item.specification || ''; // Store specification
            row.innerHTML = `
                <td class="text-center"><div class="item-number">${sno}</div></td>
                <td><input type="text" value="${item.description}" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="text" value="${item.HSN_SAC}" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="text" value="${item.company || ''}" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="text" value="${item.type || ''}" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="text" value="${item.category || ''}" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="number" value="${item.quantity}" min="1" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="number" value="${item.unit_price}" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="number" value="${item.rate}" min="0.01" step="0.01" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><button type="button" class="remove-item-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"><i class="fas fa-trash"></i></button></td>
            `;
            itemsTableBody.appendChild(row);
            
            // Sync card inputs with table inputs using new two-row layout
            // Card Row 1: description, hsn, qty, unit_price, rate
            // Card Row 2: company, type, category
            // Table: description, hsn, company, type, category, qty, unit_price, rate
            const row1Inputs = card.querySelectorAll('.item-row-1 input');
            const row2Inputs = card.querySelectorAll('.item-row-2 input');
            const tableInputs = row.querySelectorAll('input');
            
            const inputMapping = [
                { card: row1Inputs[0], table: tableInputs[0] }, // description
                { card: row1Inputs[1], table: tableInputs[1] }, // hsn
                { card: row2Inputs[0], table: tableInputs[2] }, // company
                { card: row2Inputs[1], table: tableInputs[3] }, // type
                { card: row2Inputs[2], table: tableInputs[4] }, // category
                { card: row1Inputs[2], table: tableInputs[5] }, // qty
                { card: row1Inputs[3], table: tableInputs[6] }, // unit_price
                { card: row1Inputs[4], table: tableInputs[7] }, // rate
            ];
            
            inputMapping.forEach(({ card: cardInput, table: tableInput }) => {
                if (cardInput && tableInput) {
                    cardInput.addEventListener('input', () => {
                        tableInput.value = cardInput.value;
                    });
                }
            });
            
            // Add remove button event listener
            const removeBtn = card.querySelector(".remove-item-btn");
            removeBtn.addEventListener("click", function() {
                card.remove();
                row.remove();
            });
            
            sno++;
        });
}

// fuction to get the quotation id
async function getId() {
    try {
        const response = await fetch("/purchaseOrder/generate-id");
        if (!response.ok) {
            throw new Error("Failed to fetch quotation id");
        }

        const data = await response.json();
        document.getElementById('id').value = data.purchase_order_id;
        purchaseOrderId = data.purchase_order_id;
        if (purchaseOrderId) generatePreview();
    } catch (error) {
        console.error("Error fetching quotation id:", error);
        window.electronAPI.showAlert1("Failed to fetch quotation id. Please try again later.");
    }
}

// Improved: Async/await for save/print, better feedback, and bug fixes
document.getElementById("save-btn").addEventListener("click", async () => {
    const purchaseOrderData = collectFormData();
    const ok = await sendToServer(purchaseOrderData);
    if (ok) window.electronAPI.showAlert1("Purchase Order saved successfully!");
});

document.getElementById("print-btn").addEventListener("click", async () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const purchaseOrderData = collectFormData();
        const ok = await sendToServer(purchaseOrderData);
        if (ok) window.electronAPI.handlePrintEvent(previewContent, "print", "print");
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

document.getElementById("save-pdf-btn").addEventListener("click", async () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const purchaseOrderData = collectFormData();
        const ok = await sendToServer(purchaseOrderData);
        if (ok) {
            let name = `PurchaseOrder-${purchaseOrderId}`;
            window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
        }
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Function to generate the preview
async function generatePreview() {
    // Fetch company data from database
    const companyData = await window.companyConfig.getCompanyInfo();
    const bank = companyData.bank_details || {};
    
    if (!purchaseOrderId) purchaseOrderId = document.getElementById('id').value;
    const purchaseDate = document.getElementById("purchase-date").value || new Date().toLocaleDateString();
    const purchaseInvoiceId = document.getElementById("purchase-invoice-id").value || purchaseOrderId;
    const supplierName = document.getElementById("supplier-name").value || "";
    const supplierAddress = document.getElementById("supplier-address").value || "";
    const supplierPhone = document.getElementById("supplier-phone").value || "";
    const GSTIN = document.getElementById("supplier-GSTIN").value || "";
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];
    let totalPrice = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTax = 0;
    let totalTaxableValue = 0;
    let roundOff = 0;
    let sno = 0;

    let itemsHTML = "";
    let hasTax = Array.from(itemsTable.rows).some(row => parseFloat(row.cells[8].querySelector("input").value) > 0);

    for (const row of itemsTable.rows) {
        const description = row.cells[1]?.querySelector("input")?.value || "-";
        const hsnSac = row.cells[2]?.querySelector("input")?.value || "-";
        const company = row.cells[3]?.querySelector("input")?.value || "-";
        const type = row.cells[4]?.querySelector("input")?.value || "-";
        const category = row.cells[5]?.querySelector("input")?.value || "-";
        const qty = parseFloat(row.cells[6]?.querySelector("input")?.value || "0");
        const unitPrice = parseFloat(row.cells[7]?.querySelector("input")?.value || "0");
        const rate = parseFloat(row.cells[8]?.querySelector("input")?.value || "0");

        const taxableValue = qty * unitPrice;
        totalTaxableValue += taxableValue;

        if (hasTax) {
            const cgstPercent = rate / 2;
            const sgstPercent = rate / 2;
            const cgstValue = (taxableValue * cgstPercent) / 100;
            const sgstValue = (taxableValue * sgstPercent) / 100;
            const rowTotal = taxableValue + cgstValue + sgstValue;

            totalCGST += cgstValue;
            totalSGST += sgstValue;
            totalTax = totalCGST + totalSGST;
            totalPrice += rowTotal;

            itemsHTML += `
                <tr>
                    <td>${++sno}</td>
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${formatIndian(taxableValue, 2)}</td>
                    <td>${rate.toFixed(2)}</td>
                    <td>${formatIndian(rowTotal, 2)}</td>
                </tr>
            `;
        } else {
            const rowTotal = taxableValue;
            totalPrice += rowTotal;

            itemsHTML += `
                <tr>
                    <td>${++sno}</td>
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${formatIndian(rowTotal, 2)}</td>
                </tr>
            `;
        }
    }

    const grandTotal = totalPrice;
    roundOff = Math.round(grandTotal) - grandTotal;
    totalAmount = grandTotal + roundOff;

    let totalsHTML = `
        <div style="display: flex; width: 100%;">
            <div class="totals-section-sub1" style="width: 50%;">
                ${hasTax ? `
                <p>Taxable Value:</p>
                <p>Total CGST:</p>
                <p>Total SGST:</p>` : ""}
                <p>Grand Total:</p>
            </div>
            <div class="totals-section-sub2" style="width: 50%;">
                ${hasTax ? `
                <p>₹ ${formatIndian(totalTaxableValue, 2)}</p>
                <p>₹ ${formatIndian(totalCGST, 2)}</p>
                <p>₹ ${formatIndian(totalSGST, 2)}</p>` : ""}
                <p>₹ ${formatIndian(totalAmount, 2)}</p>
            </div>
        </div>
    `;

    // Split items into rows for pagination
    const itemRows = itemsHTML.split('</tr>').filter(row => row.trim().length > 0).map(row => row + '</tr>');
    
    const ITEMS_PER_PAGE = 15;
    const SUMMARY_SECTION_ROW_COUNT = 8;
    
    const itemPages = [];
    let currentPageItemsHTML = '';
    let currentPageRowCount = 0;

    itemRows.forEach((row, index) => {
        const isLastItem = index === itemRows.length - 1;
        const itemSpace = 1; // Each row takes 1 line
        const requiredSpaceForLastItem = itemSpace + SUMMARY_SECTION_ROW_COUNT;

        if (currentPageRowCount > 0 &&
            ((!isLastItem && currentPageRowCount + itemSpace > ITEMS_PER_PAGE) ||
                (isLastItem && currentPageRowCount + requiredSpaceForLastItem > ITEMS_PER_PAGE))) {
            itemPages.push(currentPageItemsHTML);
            currentPageItemsHTML = '';
            currentPageRowCount = 0;
        }

        currentPageItemsHTML += row;
        currentPageRowCount += itemSpace;
    });

    if (currentPageItemsHTML !== '') {
        itemPages.push(currentPageItemsHTML);
    }

    // Generate pages
    const pagesHTML = itemPages.map((pageHTML, index) => {
        const isLastPage = index === itemPages.length - 1;
        return `
    <div class="preview-container doc-standard doc-quotation">
        <div class="header">
        <div class="quotation-brand">
            <div class="logo">
                <img src="../assets/icon.png" alt="${companyData.company} Logo">
            </div>
            <div class="quotation-brand-text">
                <h1>${companyData.company.toUpperCase()}</h1>
                <p class="quotation-tagline">CCTV & Energy Solutions</p>
            </div>
        </div>
        <div class="company-details">
            <p>${companyData.address}</p>
            <p>Ph: ${companyData.phone.ph1}${companyData.phone.ph2 ? ' / ' + companyData.phone.ph2 : ''}</p>
            <p>GSTIN: ${companyData.GSTIN}</p>
            <p>Email: ${companyData.email}</p>
            <p>Website: ${companyData.website}</p>
        </div>
    </div>

        <div class="second-section">
            <p>Purchase Order-${purchaseOrderId}</p>
        </div>

        ${index === 0 ? `
        <div class="third-section">
            <div class="buyer-details">
                <p><strong>Purchase From:</strong></p>
                <p>${supplierName}</p>
                <p>${supplierAddress}</p>
                <p>Ph: ${supplierPhone}</p>
                <p>GSTIN: ${GSTIN}</p>
            </div>
            <div class="order-info">
                <p><strong>Purchase Invoice ID:</strong> ${purchaseInvoiceId}</p>
                <p><strong>Date:</strong> ${purchaseDate}</p>
            </div>
        </div>
        ` : ''}

        <div class="fourth-section">
        <table>
        <thead>
            <tr>
                <th>S.No</th>
                <th>Description</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>Unit Price</th>
                ${hasTax ? `
                    <th>Taxable Value (₹)</th>
                    <th>Tax Rate (%)</th>` : ""}
                <th>Total Price (₹)</th>
            </tr>
        </thead>
        <tbody>
            ${pageHTML}
        </tbody>
        </table>
        </div>

        ${!isLastPage ? `<div class="continuation-text" style="text-align: center; margin: 20px 0; font-style: italic; color: #666;">Continued on next page...</div>` : ''}

        ${isLastPage ? `
        <div class="fifth-section">
            <div class="fifth-section-sub1">
                <div class="fifth-section-sub2">
                    <div class="fifth-section-sub3">
                        <p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p>
                        <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(grandTotal + roundOff)} Only</span></p>
                    </div>
                    <h3>Payment Details</h3>
                    <div class="bank-details">
                        <div class="QR-code bank-details-sub1">
                            <img src="../assets/shresht-systems-payment-QR-code.jpg"
                                alt="qr-code" />
                        </div>
                        <div class="bank-details-sub2">
                            <p><strong>Account Holder Name: </strong>${bank.name || companyData.company}</p>
                            <p><strong>Bank Name: </strong>${bank.bank_name || ''}</p>
                            <p><strong>Branch Name: </strong>${bank.branch || ''}</p>
                            <p><strong>Account No: </strong>${bank.accountNo || ''}</p>
                            <p><strong>IFSC Code: </strong>${bank.IFSC_code || ''}</p>
                        </div>
                    </div>
                </div>
                <div class="totals-section">
                    ${totalsHTML}
                </div>
            </div>
        </div>

        <div class="sixth-section">
            <div class="declaration" contenteditable="true">
                <p>We declare that this purchase order shows the actual price of the goods described and that all particulars are true and correct.</p>
            </div>
        </div>

        <div class="seventh-section">
            <div class="terms-section" contenteditable="true">
                <h4>Terms & Conditions:</h4>
                <p>1. Goods should be delivered within the stipulated time period.</p>
                <p>2. Quality of goods should match the specifications mentioned.</p>
                <p>3. Payment terms as per mutual agreement.</p>
            </div>
        </div>

        <div class="eighth-section">
            <p>For ${companyData.company.toUpperCase()}</p>
            <div class="eighth-section-space"></div>
            <p><strong>Authorized Signatory</strong></p>
        </div>
        ` : ''}

        <div class="ninth-section">
            <p>This is a computer-generated purchase order.</p>
        </div>
    </div>
    `;
    }).join('');

    document.getElementById("preview-content").innerHTML = pagesHTML;
}

// Function to collect form data and send to server
async function sendToServer(data) {
    return await sendDocumentToServer("/purchaseOrder/save-purchase-order", data);
}

// Function to collect form data
function collectFormData() {
    return {
        purchaseOrderId: document.getElementById("id").value,
        purchaseInvoiceId: document.getElementById("purchase-invoice-id").value,
        purchaseDate: document.getElementById("purchase-date").value,
        supplierName: document.getElementById("supplier-name").value,
        supplierAddress: document.getElementById("supplier-address").value,
        supplierPhone: document.getElementById("supplier-phone").value,
        supplierEmail: document.getElementById("supplier-email").value,
        supplierGSTIN: document.getElementById("supplier-GSTIN").value,
        items: Array.from(document.querySelectorAll("#items-table tbody tr")).map((row, index) => {
            const specRow = document.querySelector(`#items-specifications-table tbody tr:nth-child(${index + 1})`);
            return {
                description: row.querySelector("td:nth-child(2) input").value,
                HSN_SAC: row.querySelector("td:nth-child(3) input").value,
                company: row.querySelector("td:nth-child(4) input").value,
                type: row.querySelector("td:nth-child(5) input").value,
                category: row.querySelector("td:nth-child(6) input").value,
                quantity: row.querySelector("td:nth-child(7) input").value,
                unit_price: row.querySelector("td:nth-child(8) input").value,
                rate: row.querySelector("td:nth-child(9) input").value,
                specification: specRow ? specRow.querySelector("td:nth-child(3) input").value : ''
            };
        }),
        totalAmount: totalAmount
    };
}

// Function to populate specifications step
async function populateSpecifications() {
    const itemsTableBody = document.querySelector("#items-table tbody");
    const specificationsContainer = document.getElementById("specifications-container");
    const specificationsTableBody = document.querySelector("#items-specifications-table tbody");
    specificationsContainer.innerHTML = "";
    specificationsTableBody.innerHTML = "";

    const rows = Array.from(itemsTableBody.rows);
    
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const description = row.cells[1].querySelector("input").value;
        let existingSpecification = row.dataset.specification || '';
        
        // Try to fetch specification from stock if not already present
        if (!existingSpecification && description.trim()) {
            try {
                const stockData = await fetchStockData(description);
                if (stockData && stockData.specifications) {
                    existingSpecification = stockData.specifications;
                    row.dataset.specification = existingSpecification;
                }
            } catch (error) {
                // No stock data found
            }
        }

        // Create card
        const card = document.createElement("div");
        card.className = "spec-card";
        card.innerHTML = `
            <div class="item-number">${index + 1}</div>
            <div class="spec-field description">
                <input type="text" value="${description}" readonly>
            </div>
            <div class="spec-field specification">
                <input type="text" placeholder="Enter specifications" value="${existingSpecification}">
            </div>
        `;
        specificationsContainer.appendChild(card);

        // Create hidden table row
        const specRow = document.createElement("tr");
        specRow.innerHTML = `
            <td><div class="item-number">${index + 1}</div></td>
            <td><input type="text" value="${description}" readonly></td>
            <td><input type="text" placeholder="Enter specifications" value="${existingSpecification}"></td>
        `;
        specificationsTableBody.appendChild(specRow);

        // Sync card input with table input
        const cardInput = card.querySelector('.specification input');
        const rowInput = specRow.querySelector('td:nth-child(3) input');
        cardInput.addEventListener('input', () => {
            rowInput.value = cardInput.value;
            row.dataset.specification = cardInput.value;
        });
    }
}



// Override the global addItem function with purchase order specific implementation
const addItemBtn = document.getElementById('add-item-btn');
if (addItemBtn) {
    // Remove the global listener first to prevent double-adding
    const newAddItemBtn = addItemBtn.cloneNode(true);
    addItemBtn.parentNode.replaceChild(newAddItemBtn, addItemBtn);
    
    // Add Purchase Order specific listener
    newAddItemBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const container = document.getElementById("items-container");
        const tableBody = document.querySelector("#items-table tbody");
        const itemNumber = tableBody.children.length + 1;
    
    // Create card element
    const card = document.createElement("div");
    card.className = "item-card";
    
    card.innerHTML = `
        <div class="item-row-1">
            <div class="item-number">${itemNumber}</div>
            <div class="item-field description">
                <div style="position: relative;">
                    <input type="text" placeholder="Description" class="item_name" required>
                    <ul class="suggestions"></ul>
                </div>
            </div>
            <div class="item-field hsn">
                <input type="text" placeholder="HSN/SAC" required>
            </div>
            <div class="item-field qty">
                <input type="number" placeholder="Qty" min="1" required>
            </div>
            <div class="item-field rate">
                <input type="number" placeholder="Unit Price" step="0.01" required>
            </div>
            <div class="item-field rate">
                <input type="number" placeholder="GST %" min="0" step="0.01">
            </div>
            <button type="button" class="remove-item-btn" title="Remove Item">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
        <div class="item-row-2">
            <div class="row-spacer"></div>
            <div class="item-field">
                <input type="text" placeholder="Company">
            </div>
            <div class="item-field">
                <input type="text" placeholder="Type">
            </div>
            <div class="item-field">
                <input type="text" placeholder="Category">
            </div>
            <div class="row-spacer"></div>
        </div>
    `;
    
    // Append card to container
    if (container) {
        container.appendChild(card);
    }
    
    // Setup autocomplete for the card
    const cardInput = card.querySelector(".item_name");
    const cardSuggestions = card.querySelector(".suggestions");
    
    cardInput.addEventListener("input", function () {
        showSuggestionsPO(cardInput, cardSuggestions);
    });

    cardInput.addEventListener("keydown", function (event) {
        handleKeyboardNavigationPO(event, cardInput, cardSuggestions);
    });
    
    // Also add to hidden table for backward compatibility
    const row = document.createElement("tr");
    row.innerHTML = `
        <td class="text-center"><div class="item-number">${itemNumber}</div></td>
        <td>
            <div style="position: relative;">
                <input type="text" placeholder="Item Description" class="item_name w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" required>
                <ul class="suggestions"></ul>
            </div>
        </td>
        <td><input type="text" placeholder="HSN/SAC" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td><input type="text" placeholder="Company" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td><input type="text" placeholder="Type" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td><input type="text" placeholder="Category" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td><input type="number" placeholder="Qty" min="1" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td><input type="number" placeholder="Unit Price" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td><input type="number" placeholder="Rate" min="0.01" step="0.01" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td><button type="button" class="remove-item-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"><i class="fas fa-trash"></i></button></td>
    `;
    tableBody.appendChild(row);
    
    // Setup autocomplete for the table input
    const tableInput = row.querySelector(".item_name");
    const tableSuggestions = row.querySelector(".suggestions");
    
    if (tableInput && tableSuggestions) {
        tableInput.addEventListener("input", function () {
            showSuggestionsPO(tableInput, tableSuggestions);
            // Sync with card input
            if (cardInput) {
                cardInput.value = tableInput.value;
            }
        });

        tableInput.addEventListener("keydown", function (event) {
            handleKeyboardNavigationPO(event, tableInput, tableSuggestions);
        });
    }
    
    // Sync inputs from card to table with new two-row layout
    // Card Row 1: description, hsn, qty, unit_price, rate
    // Card Row 2: company, type, category
    // Table: description, hsn, company, type, category, qty, unit_price, rate
    const row1Inputs = card.querySelectorAll('.item-row-1 input');
    const row2Inputs = card.querySelectorAll('.item-row-2 input');
    const tableInputs = row.querySelectorAll('input');
    
    // Map card inputs to table inputs
    // Row 1: [0]=description, [1]=hsn, [2]=qty, [3]=unit_price, [4]=rate
    // Row 2: [0]=company, [1]=type, [2]=category
    // Table: [0]=description, [1]=hsn, [2]=company, [3]=type, [4]=category, [5]=qty, [6]=unit_price, [7]=rate
    
    const inputMapping = [
        { card: row1Inputs[0], table: tableInputs[0] }, // description
        { card: row1Inputs[1], table: tableInputs[1] }, // hsn
        { card: row2Inputs[0], table: tableInputs[2] }, // company
        { card: row2Inputs[1], table: tableInputs[3] }, // type
        { card: row2Inputs[2], table: tableInputs[4] }, // category
        { card: row1Inputs[2], table: tableInputs[5] }, // qty
        { card: row1Inputs[3], table: tableInputs[6] }, // unit_price
        { card: row1Inputs[4], table: tableInputs[7] }, // rate
    ];
    
    inputMapping.forEach(({ card: cardInput, table: tableInput }) => {
        if (cardInput && tableInput) {
            cardInput.addEventListener('input', () => {
                tableInput.value = cardInput.value;
            });
        }
    });
    
    // Handle remove button
    const removeBtn = card.querySelector(".remove-item-btn");
    removeBtn.addEventListener("click", function() {
        card.remove();
        row.remove();
    });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        // Clone the button to remove any existing event listeners (like the one from globalScript.js)
        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

        newNextBtn.addEventListener('click', async () => {
            if (typeof window.validateCurrentStep === 'function') {
                const ok = await window.validateCurrentStep();
                if (!ok) return;
            }
            if (currentStep < totalSteps) {
                // When moving from step 2 (Item Details) to step 3 (Add Specifications)
                if (currentStep === 2) {
                    await populateSpecifications();
                }
                changeStep(currentStep + 1);
            }
            // When on the last step, generate the preview
            if (currentStep === totalSteps) {
                const idInput = document.getElementById('id');
                if (!idInput?.value) {
                    getId(); // This will also trigger generatePreview
                } else {
                    generatePreview();
                }
            }
        });
    }
});

// Validate current step before navigation
window.validateCurrentStep = async function () {
    // Step 1: Supplier details
    if (currentStep === 1) {
        const fields = [
            { id: 'purchase-invoice-id', name: 'Purchase Invoice ID' },
            { id: 'purchase-date', name: 'Purchase Date' },
            { id: 'supplier-name', name: 'Supplier Name' },
            { id: 'supplier-address', name: 'Supplier Address' },
        ];
        for (const f of fields) {
            const el = document.getElementById(f.id);
            if (!el || !el.value.trim()) {
                window.electronAPI.showAlert1(`Please enter ${f.name}.`);
                el?.focus();
                return false;
            }
        }
    }

    // Step 2: At least one item
    if (currentStep === 2) {
        const itemsTable = document.querySelector('#items-table tbody');
        if (!itemsTable || itemsTable.rows.length === 0) {
            window.electronAPI.showAlert1('Please add at least one item.');
            return false;
        }
        for (const [index, row] of Array.from(itemsTable.rows).entries()) {
            const desc = row.querySelector('td:nth-child(2) input');
            const qty = row.querySelector('td:nth-child(7) input');
            const price = row.querySelector('td:nth-child(8) input');
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



