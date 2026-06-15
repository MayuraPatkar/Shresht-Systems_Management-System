const totalSteps = 4;
let purchaseOrderId = '';
let totalAmount = 0;

// Supplier data for autocomplete
let supplierData = [];
let supplierNames = [];
let selectedSupplierIndex = -1;

// Company and Category suggestions
let companySuggestionList = [];
let categorySuggestionList = [];

// Helper function to close all suggestion dropdowns
function closeAllSuggestions() {
    document.querySelectorAll('.suggestions').forEach(ul => {
        ul.style.display = 'none';
    });
}

async function fetchCompanyAndCategorySuggestions() {
    try {
        const response = await fetch('/stock/all');
        if (response.ok) {
            const stockData = await response.json();
            companySuggestionList = [...new Set(stockData.map(s => s.company).filter(Boolean))];
            categorySuggestionList = [...new Set(stockData.map(s => s.category).filter(Boolean))];
        }
    } catch (error) {
        console.error('Error fetching company/category suggestions:', error);
    }
}

function setupGenericAutocomplete(input, dataList) {
    let suggestionsContainer = input.parentElement.querySelector('.suggestions');
    if (!suggestionsContainer) {
        suggestionsContainer = document.createElement('ul');
        suggestionsContainer.className = 'suggestions';
        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(suggestionsContainer);
    }

    // Track if input was from user typing or programmatic
    let isUserTyping = false;
    let focusedItemIndex = -1;

    input.addEventListener('keydown', function (e) {
        // Always track that user is interacting
        isUserTyping = true;

        const suggestions = suggestionsContainer.querySelectorAll('li');
        if (suggestions.length === 0 || suggestionsContainer.style.display === 'none') {
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            focusedItemIndex = (focusedItemIndex + 1) % suggestions.length;
            updateSelection(suggestions);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            focusedItemIndex = (focusedItemIndex - 1 + suggestions.length) % suggestions.length;
            updateSelection(suggestions);
        } else if (e.key === 'Enter') {
            if (focusedItemIndex >= 0 && suggestions[focusedItemIndex]) {
                e.preventDefault();
                e.stopPropagation(); // Prevent triggering other Enter handlers (like Next Step)
                suggestions[focusedItemIndex].click();
            }
        } else if (e.key === 'Escape') {
            suggestionsContainer.style.display = 'none';
            focusedItemIndex = -1;
        }
    });

    function updateSelection(suggestions) {
        if (focusedItemIndex >= 0 && suggestions[focusedItemIndex]) {
            input.value = suggestions[focusedItemIndex].textContent;
            suggestions.forEach((li, index) => {
                if (index === focusedItemIndex) {
                    li.classList.add('selected');
                    // Ensure the selected item is visible in scrollable list
                    li.scrollIntoView({ block: 'nearest' });
                } else {
                    li.classList.remove('selected');
                }
            });
        }
    }

    input.addEventListener('input', function (e) {
        // Only show suggestions if user is actually typing
        if (!isUserTyping) {
            isUserTyping = false;
            return;
        }
        isUserTyping = false;

        // Close all other suggestions first
        closeAllSuggestions();

        const query = this.value.toLowerCase().trim();
        suggestionsContainer.innerHTML = '';
        focusedItemIndex = -1;
        if (query.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        const filtered = dataList.filter(item => item && item.toLowerCase().includes(query));
        if (filtered.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        suggestionsContainer.style.display = 'block';
        filtered.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            li.onclick = function () {
                input.value = item;
                suggestionsContainer.style.display = 'none';
                // Don't trigger autocomplete on the other fields
                isUserTyping = false;
                // Dispatch input event to sync with hidden table inputs
                input.dispatchEvent(new Event('input', { bubbles: true }));
            };
            suggestionsContainer.appendChild(li);
        });
    });

    // Close suggestions when clicking outside
    input.addEventListener('blur', function () {
        // Delay to allow click on suggestion
        setTimeout(() => {
            suggestionsContainer.style.display = 'none';
        }, 200);
    });

    input.addEventListener('focus', function () {
        // Don't auto-show on focus, only when typing
        suggestionsContainer.style.display = 'none';
    });
}

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

    supplierNameInput.addEventListener('input', function () {
        showSupplierSuggestions(this, suggestionsContainer);
    });

    supplierNameInput.addEventListener('keydown', function (event) {
        handleSupplierKeyboardNavigation(event, this, suggestionsContainer);
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', function (e) {
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

        li.onclick = function () {
            fillSupplierDetails(supplier);
            suggestionsList.style.display = 'none';
            selectedSupplierIndex = -1;
        };

        li.onmouseenter = function () {
            li.style.backgroundColor = '#f0f0f0';
        };
        li.onmouseleave = function () {
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
        // Only handle Enter if an item is actually selected in the suggestions
        if (selectedSupplierIndex >= 0 && items[selectedSupplierIndex]) {
            event.preventDefault();
            event.stopPropagation();
            items[selectedSupplierIndex].click();
        }
        // If no item selected, let Enter propagate to trigger Next Step shortcut
    } else if (event.key === 'Escape') {
        suggestionsList.style.display = 'none';
        selectedSupplierIndex = -1;
    }
}

// Validate supplier step (and email/phone rules)
window.validateCurrentStep = async function () {
    if (typeof currentStep === 'undefined') return true;
    if (currentStep === 1) {
        const supplierName = document.getElementById('supplier-name');
        const supplierPhone = document.getElementById('supplier-phone');
        const supplierEmail = document.getElementById('supplier-email');

        if (!supplierName || !supplierName.value.trim()) {
            window.electronAPI.showAlert1('Please enter the Supplier Name.');
            supplierName?.focus();
            return false;
        }
        if (!supplierPhone || !supplierPhone.value.trim()) {
            window.electronAPI.showAlert1('Please enter the Supplier Phone Number.');
            supplierPhone?.focus();
            return false;
        }
        const cleanedPhone = (supplierPhone.value || '').replace(/\D/g, '');
        if (cleanedPhone.length !== 10) {
            window.electronAPI.showAlert1('Please enter a valid 10-digit Supplier Phone Number.');
            supplierPhone?.focus();
            return false;
        }
        if (supplierEmail && supplierEmail.value.trim()) {
            const cleanedEmail = supplierEmail.value.trim().replace(/\s+/g, '');
            const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRe.test(cleanedEmail)) {
                window.electronAPI.showAlert1('Please enter a valid Supplier Email address.');
                supplierEmail?.focus();
                return false;
            }
        }
        // If GSTIN provided, ensure it's exactly 15 characters
        const supplierGstin = document.getElementById('supplier-GSTIN');
        if (supplierGstin && supplierGstin.value.trim()) {
            if (supplierGstin.value.trim().length !== 15) {
                window.electronAPI.showAlert1('GSTIN must be exactly 15 characters.');
                supplierGstin?.focus();
                return false;
            }
        }
    }
    return true;
};

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
    fetchCompanyAndCategorySuggestions();
    initSupplierAutocomplete();

    // Add sanitization for supplier phone and email
    const phoneInput = document.getElementById('supplier-phone');
    if (phoneInput) {
        phoneInput.setAttribute('inputmode', 'numeric');
        phoneInput.setAttribute('maxlength', '10');
        phoneInput.setAttribute('pattern', '[0-9]{10}');
        phoneInput.addEventListener('input', () => {
            const cleaned = phoneInput.value.replace(/\D/g, '').slice(0, 10);
            if (phoneInput.value !== cleaned) phoneInput.value = cleaned;
        });
    }
    const emailInput = document.getElementById('supplier-email');
    if (emailInput) {
        emailInput.setAttribute('maxlength', '254');
        emailInput.addEventListener('input', () => {
            const cleaned = emailInput.value.trim().replace(/\s+/g, '');
            if (emailInput.value !== cleaned) emailInput.value = cleaned;
        });
    }

    // Global delegation for quantity inputs in Purchase Order
    document.body.addEventListener('keypress', function (e) {
        if (e.target && (e.target.matches('.item-field.qty input') || e.target.closest('td:nth-child(7)')?.querySelector('input') === e.target)) {
            if (e.key === '.' || e.key === 'e' || e.key === '-' || e.key === '+') {
                e.preventDefault();
            }
        }
    });
    document.body.addEventListener('input', function (e) {
        if (e.target && (e.target.matches('.item-field.qty input') || e.target.closest('td:nth-child(7)')?.querySelector('input') === e.target)) {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        }
    });
});


// Note: selectedIndex, data, fetchData, fetchStockData, showSuggestions, and handleKeyboardNavigation
// are already defined in globalScript.js

// Flag to prevent showSuggestionsPO during autofill
let isAutofillInProgressPO = false;

// Override showSuggestions for purchase order to use fillPurchaseOrderItem
function showSuggestionsPO(input, suggestionsList) {
    // Skip showing suggestions if autofill is in progress
    if (isAutofillInProgressPO) {
        return;
    }
    // Close all other suggestions first
    closeAllSuggestions();

    const query = input.value.toLowerCase().trim();
    suggestionsList.innerHTML = ""; // Clear old suggestions
    selectedIndex = -1; // Reset index when showing new suggestions

    if (query.length === 0) {
        suggestionsList.style.display = "none";
        return;
    }

    const filtered = data.filter(item => item && typeof item === 'string' && item.toLowerCase().includes(query));

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
            // Hide suggestions immediately to prevent re-triggering showSuggestionsPO
            suggestionsList.style.display = "none";
            // Set flag to prevent showSuggestionsPO from running during autofill
            isAutofillInProgressPO = true;
            // Trigger input event to sync description with table
            input.dispatchEvent(new Event('input', { bubbles: true }));
            isAutofillInProgressPO = false;

            const parent = input.closest('.item-card') || input.closest('tr');
            await fillPurchaseOrderItem(item, parent);
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
        // Only handle Enter if an item is actually selected in the suggestions
        if (selectedIndex >= 0 && items[selectedIndex]) {
            event.preventDefault();
            event.stopPropagation();

            const selectedItem = items[selectedIndex].textContent;
            input.value = selectedItem;
            suggestionsList.style.display = "none";

            // Set flag to prevent showSuggestionsPO from running during autofill
            isAutofillInProgressPO = true;
            // Trigger input event to sync description with table
            input.dispatchEvent(new Event('input', { bubbles: true }));
            isAutofillInProgressPO = false;

            // Fill other fields from stock data
            const parent = input.closest('.item-card') || input.closest('tr');
            await fillPurchaseOrderItem(selectedItem, parent);

            // Reset selected index
            selectedIndex = -1;
        }
        // If no item selected, let Enter propagate to trigger Next Step shortcut
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
            // Row 2 inputs: company, category
            const row2Inputs = element.querySelectorAll('.item-row-2 input');
            // Row 2 select: type
            const row2Select = element.querySelector('.item-row-2 select');

            // Row 1: [0]=description, [1]=HSN, [2]=qty, [3]=unit_price, [4]=rate
            if (row1Inputs[1]) row1Inputs[1].value = stockData.HSN_SAC || "";
            // Leave qty blank (user needs to enter)
            if (row1Inputs[3]) row1Inputs[3].value = parseFloat(stockData.unit_price ?? stockData.unitPrice ?? 0) || 0;
            if (row1Inputs[4]) row1Inputs[4].value = stockData.GST || 0;

            // Row 2: [0]=company, [1]=category
            if (row2Inputs[0]) row2Inputs[0].value = stockData.company || "";
            // row2Inputs[1] is Category input
            if (row2Inputs[1]) row2Inputs[1].value = stockData.category || "";

            // Set Type (Select)
            if (row2Select) row2Select.value = stockData.type || "Material";

            // Trigger input events to sync with table (but skip description to avoid triggering autocomplete)
            row1Inputs.forEach((input, index) => {
                // Skip description field (index 0) to prevent re-triggering autocomplete
                if (index > 0) {
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
            // For row2 inputs (Company, Category), sync values
            row2Inputs.forEach(input => {
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
            // For row2 select (Type), sync value
            if (row2Select) {
                row2Select.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Also update corresponding table row
            const cardIndex = Array.from(document.querySelectorAll('#items-container .item-card')).indexOf(element);
            const tableRow = document.querySelector(`#items-table tbody tr:nth-child(${cardIndex + 1})`);
            if (tableRow) {
                // Get inputs from each cell
                const cells = tableRow.querySelectorAll('td');
                const descInput = cells[1]?.querySelector('input');
                const hsnInput = cells[2]?.querySelector('input');
                const companyInput = cells[3]?.querySelector('input');
                const typeInput = cells[4]?.querySelector('select');
                const categoryInput = cells[5]?.querySelector('input');
                const qtyInput = cells[6]?.querySelector('input');
                const priceInput = cells[7]?.querySelector('input');
                const rateInput = cells[8]?.querySelector('input');

                if (hsnInput) hsnInput.value = stockData.HSN_SAC || "";
                if (companyInput) companyInput.value = stockData.company || "";
                if (typeInput) typeInput.value = stockData.type || "Material";
                if (categoryInput) categoryInput.value = stockData.category || "";
                if (priceInput) priceInput.value = parseFloat(stockData.unit_price ?? stockData.unitPrice ?? 0) || 0;
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
            const typeInput = cells[4]?.querySelector('select');
            const categoryInput = cells[5]?.querySelector('input');
            const qtyInput = cells[6]?.querySelector('input');
            const priceInput = cells[7]?.querySelector('input');
            const rateInput = cells[8]?.querySelector('input');

            if (hsnInput) hsnInput.value = stockData.HSN_SAC || "";
            if (companyInput) companyInput.value = stockData.company || "";
            if (typeInput) typeInput.value = stockData.type || "Material";
            if (categoryInput) categoryInput.value = stockData.category || "";
            if (priceInput) {
                priceInput.value = parseFloat(stockData.unit_price ?? stockData.unitPrice ?? 0) || 0;
                priceInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (rateInput) {
                rateInput.value = stockData.GST || 0;
                rateInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Store specification in row dataset
            element.dataset.specification = stockData.specifications || '';

            // Also sync with card if it exists
            const rowIndex = Array.from(element.parentElement.children).indexOf(element);
            const card = document.querySelector(`#items-container .item-card:nth-child(${rowIndex + 1})`);
            if (card) {
                const row1Inputs = card.querySelectorAll('.item-row-1 input');
                const row2Inputs = card.querySelectorAll('.item-row-2 input');

                if (row1Inputs[1]) row1Inputs[1].value = stockData.HSN_SAC || "";
                if (row1Inputs[3]) row1Inputs[3].value = parseFloat(stockData.unit_price ?? stockData.unitPrice ?? 0) || 0;
                if (row1Inputs[4]) row1Inputs[4].value = stockData.GST || 0;
                if (row2Inputs[0]) row2Inputs[0].value = stockData.company || "";
                if (row2Inputs[1]) row2Inputs[1].value = stockData.type || "";
                if (row2Inputs[2]) row2Inputs[2].value = stockData.category || "";
            }
        }
    }
}

// Note: Global click handler for closing suggestions is already defined in globalScript.js

document.getElementById("view-preview").addEventListener("click", async () => {
    // Navigate step-by-step to trigger validation at each step
    const navigateToPreview = async () => {
        // If already on preview step, just generate preview
        if (currentStep === totalSteps) {
            await generatePreview();
            return;
        }

        const nextBtn = document.getElementById('next-btn');
        if (!nextBtn) return;

        const stepBefore = currentStep;
        nextBtn.click();

        // Wait for validation and step change
        await new Promise(resolve => setTimeout(resolve, 100));

        // If step didn't change, validation failed - stop
        if (currentStep === stepBefore) return;

        // If reached preview, generate it
        if (currentStep === totalSteps) {
            await generatePreview();
            return;
        }

        // Continue to next step
        await navigateToPreview();
    };

    await navigateToPreview();
});

// Open a purchase order for editing
async function openPurchaseOrder(purchaseOrderId) {
    const data = await fetchDocumentById('purchaseOrder', purchaseOrderId);
    if (!data) return;

    const purchaseOrder = data.purchaseOrder;

    // Helper function to format date to YYYY-MM-DD for input fields
    const formatDateForInput = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "";
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
    document.getElementById('new-purchase').style.display = 'none';
    document.getElementById('view-preview').style.display = 'block';
    document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;

    document.getElementById('id').value = purchaseOrder.purchase_order_id;
    document.getElementById('purchase-invoice-id').value = purchaseOrder.purchase_invoice_id;
    document.getElementById('purchase-date').value = formatDateForInput(purchaseOrder.purchase_date);
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
        card.setAttribute("draggable", "true");
        card.innerHTML = `
                <div class="drag-handle" title="Drag to reorder">
                    <i class="fas fa-grip-vertical"></i>
                </div>
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
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="item-row-2">
                    <div class="row-spacer"></div>
                    <div class="item-field">
                        <div style="position: relative;">
                            <input type="text" value="${item.company || ''}" placeholder="Company" class="item-company">
                            <ul class="suggestions"></ul>
                        </div>
                    </div>
                    <div class="item-field">
                        <select class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="Material" ${(!item.type || item.type === 'Material') ? 'selected' : ''}>Material</option>
                            <option value="Asset" ${item.type === 'Asset' ? 'selected' : ''}>Asset</option>
                        </select>
                    </div>
                    <div class="item-field">
                        <div style="position: relative;">
                            <input type="text" value="${item.category || ''}" placeholder="Category" class="item-category">
                            <ul class="suggestions"></ul>
                        </div>
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

        // Setup autocomplete for Company and Category
        const cardCompany = card.querySelector(".item-company");
        const cardCategory = card.querySelector(".item-category");
        if (cardCompany) setupGenericAutocomplete(cardCompany, companySuggestionList);
        if (cardCategory) setupGenericAutocomplete(cardCategory, categorySuggestionList);

        // Create hidden table row
        const row = document.createElement("tr");
        row.dataset.specification = item.specification || ''; // Store specification
        row.innerHTML = `
                <td class="text-center"><div class="item-number">${sno}</div></td>
                <td><input type="text" value="${item.description}" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="text" value="${item.HSN_SAC}" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="text" value="${item.company || ''}" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td>
                    <select class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="Material" ${(!item.type || item.type === 'Material') ? 'selected' : ''}>Material</option>
                        <option value="Asset" ${item.type === 'Asset' ? 'selected' : ''}>Asset</option>
                    </select>
                </td>
                <td><input type="text" value="${item.category || ''}" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="number" value="${item.quantity}" min="1" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="number" value="${item.unit_price}" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><input type="number" value="${item.rate}" min="0.01" step="0.01" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
                <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
            `;
        itemsTableBody.appendChild(row);

        // Sync card inputs with table inputs using new two-row layout
        // Card Row 1: description, hsn, qty, unit_price, rate
        // Card Row 2: company, type (select), category
        // Table: description, hsn, company, type (select), category, qty, unit_price, rate
        const row1Inputs = card.querySelectorAll('.item-row-1 input');
        const row2Inputs = card.querySelectorAll('.item-row-2 input');
        const row2Selects = card.querySelectorAll('.item-row-2 select');
        const tableInputs = row.querySelectorAll('input');
        const tableSelects = row.querySelectorAll('select');

        const inputMapping = [
            { card: row1Inputs[0], table: tableInputs[0] }, // description
            { card: row1Inputs[1], table: tableInputs[1] }, // hsn
            { card: row2Inputs[0], table: tableInputs[2] }, // company
            { card: row2Selects[0], table: tableSelects[0] }, // type
            { card: row2Inputs[1], table: tableInputs[3] }, // category
            { card: row1Inputs[2], table: tableInputs[4] }, // qty
            { card: row1Inputs[3], table: tableInputs[5] }, // unit_price
            { card: row1Inputs[4], table: tableInputs[6] }, // rate
        ];

        inputMapping.forEach(({ card: cardInput, table: tableInput }) => {
            if (cardInput && tableInput) {
                // Sync card -> table
                cardInput.addEventListener('input', () => {
                    tableInput.value = cardInput.value;
                });
                // Sync table -> card
                tableInput.addEventListener('input', () => {
                    cardInput.value = tableInput.value;
                });
            }
        });

        // Add Integer validation for quantity inputs
        const qtyInputs = [card.querySelector('.item-field.qty input'), row.querySelector('td:nth-child(7) input')];
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

        // Add remove button event listener
        const removeBtn = card.querySelector(".remove-item-btn");
        if (removeBtn) {
            removeBtn.addEventListener("click", function () {
                card.remove();
                row.remove();
                renumberItems();
            });
        }

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
    const wasNewPurchaseOrder = sessionStorage.getItem('currentTab-status') !== 'update';
    const ok = await sendToServer(purchaseOrderData);
    if (ok) {
        window.electronAPI.showAlert1("Purchase Order saved successfully!");
        if (wasNewPurchaseOrder) {
            sessionStorage.removeItem('currentTab-status');
            window.location = '/purchaseorder';
        }
    }
});

// Function to generate the preview
async function generatePreview() {
    // Fetch company data from database
    const companyData = await window.companyConfig.getCompanyInfo();
    const bank = companyData.bank_details || {};

    if (!purchaseOrderId) purchaseOrderId = document.getElementById('id').value;
    const purchaseDate = document.getElementById("purchase-date").value || (window.getTodayForInput ? window.getTodayForInput() : new Date().toLocaleDateString());
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
        const type = row.cells[4]?.querySelector("select")?.value || "-";
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

    const formattedDate = await formatDate(purchaseDate);

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
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <p>Purchase Order-${purchaseOrderId}</p>
            <div style="text-align:right;"> 
                        <p><strong>Date:</strong> ${formattedDate || (window.formatDateDisplay ? window.formatDateDisplay(new Date()) : new Date().toLocaleDateString())}</p>
                    </div>
                    </div>
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
                type: row.querySelector("td:nth-child(5) select").value,
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
        card.setAttribute("draggable", "true");
        card.innerHTML = `
            <div class="drag-handle" title="Drag to reorder">
                <i class="fas fa-grip-vertical"></i>
            </div>
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

    // Function to add item to purchase order (supports insertion)
    function addPurchaseOrderItem(insertIndex) {
        const container = document.getElementById("items-container");
        const tableBody = document.querySelector("#items-table tbody");
        const itemNumber = tableBody.children.length + 1;

        // Create card element
        const card = document.createElement("div");
        card.className = "item-card";
        card.setAttribute("draggable", "true");

        card.innerHTML = `
    <div class="drag-handle" title="Drag to reorder">
        <i class="fas fa-grip-vertical"></i>
    </div>
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
        <div class="item-actions">
            <button type="button" class="remove-item-btn" title="Remove Item">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    </div>
    <div class="item-row-2">
        <div class="row-spacer"></div>
        <div class="item-field">
            <div style="position: relative;">
                <input type="text" placeholder="Company" class="item-company">
                <ul class="suggestions"></ul>
            </div>
        </div>
        <div class="item-field">
            <select class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="Material" selected>Material</option>
                <option value="Asset">Asset</option>
            </select>
        </div>
        <div class="item-field">
            <div style="position: relative;">
                <input type="text" placeholder="Category" class="item-category">
                <ul class="suggestions"></ul>
            </div>
        </div>
        <div class="row-spacer"></div>
    </div>
`;

        // Insert or Append card
        if (container) {
            if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex < container.children.length) {
                container.insertBefore(card, container.children[insertIndex]);
            } else {
                container.appendChild(card);
            }
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

        // Setup autocomplete for Company and Category
        const cardCompany = card.querySelector(".item-company");
        const cardCategory = card.querySelector(".item-category");
        if (cardCompany) setupGenericAutocomplete(cardCompany, companySuggestionList);
        if (cardCategory) setupGenericAutocomplete(cardCategory, categorySuggestionList);

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
    <td>
        <select class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="Material" selected>Material</option>
            <option value="Asset">Asset</option>
        </select>
    </td>
    <td><input type="text" placeholder="Category" class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
    <td><input type="number" placeholder="Qty" min="1" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
    <td><input type="number" placeholder="Unit Price" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
    <td><input type="number" placeholder="Rate" min="0.01" step="0.01" required class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"></td>
    <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
`;
        // Insert or Append row
        if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex < tableBody.children.length) {
            tableBody.insertBefore(row, tableBody.children[insertIndex]);
        } else {
            tableBody.appendChild(row);
        }

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

        // Sync card inputs with table inputs using new two-row layout
        // Card Row 1: description, hsn, qty, unit_price, rate
        // Card Row 2: company, type (select), category
        // Table: description, hsn, company, type (select), category, qty, unit_price, rate
        const row1Inputs = card.querySelectorAll('.item-row-1 input');
        const row2Inputs = card.querySelectorAll('.item-row-2 input');
        const row2Selects = card.querySelectorAll('.item-row-2 select');
        const tableInputs = row.querySelectorAll('input');
        const tableSelects = row.querySelectorAll('select');

        const inputMapping = [
            { card: row1Inputs[0], table: tableInputs[0] }, // description
            { card: row1Inputs[1], table: tableInputs[1] }, // hsn
            { card: row2Inputs[0], table: tableInputs[2] }, // company
            { card: row2Selects[0], table: tableSelects[0] }, // type
            { card: row2Inputs[1], table: tableInputs[3] }, // category
            { card: row1Inputs[2], table: tableInputs[4] }, // qty
            { card: row1Inputs[3], table: tableInputs[5] }, // unit_price
            { card: row1Inputs[4], table: tableInputs[6] }, // rate
        ];

        inputMapping.forEach(({ card: cardInput, table: tableInput }) => {
            if (cardInput && tableInput) {
                // Sync card -> table
                cardInput.addEventListener("input", () => {
                    tableInput.value = cardInput.value;
                });
                // Sync table -> card
                tableInput.addEventListener("input", () => {
                    cardInput.value = tableInput.value;
                });
            }
        });

        // Add remove button event listener for CARD
        const cardRemoveBtn = card.querySelector(".remove-item-btn");
        if (cardRemoveBtn) {
            cardRemoveBtn.addEventListener("click", function () {
                card.remove();
                row.remove();
                // Renumber remaining items
                renumberItems();
            });
        }

        // Add remove button event listener for TABLE ROW
        const tableRemoveBtn = row.querySelector(".remove-item-btn");
        if (tableRemoveBtn) {
            tableRemoveBtn.addEventListener("click", function () {
                card.remove();
                row.remove();
                // Renumber remaining items
                renumberItems();
            });
        }

        if (typeof insertIndex === 'number') {
            renumberItems();
        }
    }

    // Add Purchase Order specific listener
    newAddItemBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        addPurchaseOrderItem();
    });
}

// Helper function to renumber items after deletion
function renumberItems() {
    const cards = document.querySelectorAll("#items-container .item-card");
    const tableRows = document.querySelectorAll("#items-table tbody tr");

    cards.forEach((card, index) => {
        const numberBadge = card.querySelector(".item-number");
        if (numberBadge) {
            numberBadge.textContent = index + 1;
        }
    });

    tableRows.forEach((row, index) => {
        const numberBadge = row.querySelector(".item-number");
        if (numberBadge) {
            numberBadge.textContent = index + 1;
        }
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
        // Validate phone if provided
        const supplierPhone = document.getElementById('supplier-phone');
        if (supplierPhone && supplierPhone.value.trim()) {
            const cleanedPhone = supplierPhone.value.replace(/\D/g, '');
            if (cleanedPhone.length !== 10) {
                window.electronAPI.showAlert1('Please enter a valid 10-digit Supplier Phone Number.');
                supplierPhone.focus();
                return false;
            }
        }
        // Validate email if provided
        const supplierEmail = document.getElementById('supplier-email');
        if (supplierEmail && supplierEmail.value.trim()) {
            const cleanedEmail = supplierEmail.value.trim().replace(/\s+/g, '');
            const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRe.test(cleanedEmail)) {
                window.electronAPI.showAlert1('Please enter a valid Supplier Email address.');
                supplierEmail.focus();
                return false;
            }
        }
        // If GSTIN provided, ensure it's exactly 15 characters
        const supplierGstin = document.getElementById('supplier-GSTIN');
        if (supplierGstin && supplierGstin.value.trim()) {
            if (supplierGstin.value.trim().length !== 15) {
                window.electronAPI.showAlert1('GSTIN must be exactly 15 characters.');
                supplierGstin.focus();
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
            if (!price || Number(price.value) <= 0) {
                window.electronAPI.showAlert1(`Item #${index + 1}: Unit Price must be greater than 0.`);
                price?.focus();
                return false;
            }
        }
    }

    return true;
};

// Initialize drag-drop reordering for purchase order items
document.addEventListener('DOMContentLoaded', function () {
    if (window.itemReorder && typeof window.itemReorder.initDragDrop === 'function') {
        window.itemReorder.initDragDrop('items-container', renumberItems);
    }
});
