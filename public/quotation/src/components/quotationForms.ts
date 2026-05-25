// @ts-nocheck
const totalSteps = 6;
let quotationId = '';
let totalAmountNoTax = 0;
let totalAmountTax = 0;
let totalTax = 0;
// isCustomId has been deprecated as all quotation IDs are now system-generated and immutable.

function calculateLineTotals(quantity, unitPrice, gstRate) {
    const taxable_value = Math.round((Number(quantity || 0) * Number(unitPrice || 0)) * 100) / 100;
    const tax_amount = Math.round((taxable_value * Number(gstRate || 0) / 100) * 100) / 100;
    return {
        taxable_value,
        tax_amount,
        total: Math.round((taxable_value + tax_amount) * 100) / 100
    };
}

function getBillingAddressSnapshot() {
    return {
        line1: (document.getElementById("buyer-address-line1") as HTMLInputElement)?.value || "",
        line2: (document.getElementById("buyer-address-line2") as HTMLInputElement)?.value || "",
        city: (document.getElementById("buyer-city") as HTMLInputElement)?.value || "",
        state: (document.getElementById("buyer-state") as HTMLInputElement)?.value || "Karnataka",
        pincode: (document.getElementById("buyer-pincode") as HTMLInputElement)?.value || "",
        country: (document.getElementById("buyer-country") as HTMLInputElement)?.value || "India"
    };
}

async function autofillStockItem(input) {
    const itemName = input?.value?.trim();
    if (!itemName) return;
    try {
        const response = await fetch(`/stock/get-stock-item?item=${encodeURIComponent(itemName)}`);
        if (!response.ok) return;
        const item = await response.json();
        if (!item) return;

        const card = input.closest('.item-card');
        const cards = Array.from(document.querySelectorAll('#items-container .item-card'));
        const index = cards.indexOf(card);
        const row = document.querySelectorAll('#items-table tbody tr')[index];
        if (row) row.dataset.itemId = item._id || '';

        const values = {
            hsn: item.hsn_sac || '',
            price: item.selling_price || item.purchase_price || 0,
            gst: item.gst_rate || 0
        };

        const cardInputs = card?.querySelectorAll('input') || [];
        if (cardInputs[1] && !cardInputs[1].value) cardInputs[1].value = values.hsn;
        if (cardInputs[3] && !Number(cardInputs[3].value || 0)) cardInputs[3].value = values.price;
        if (cardInputs[4] && !Number(cardInputs[4].value || 0)) cardInputs[4].value = values.gst;

        if (row) {
            const rowInputs = row.querySelectorAll('input');
            if (rowInputs[1] && !rowInputs[1].value) rowInputs[1].value = values.hsn;
            if (rowInputs[3] && !Number(rowInputs[3].value || 0)) rowInputs[3].value = values.price;
            if (rowInputs[4] && !Number(rowInputs[4].value || 0)) rowInputs[4].value = values.gst;
        }
    } catch (error) {
        console.warn('Stock autofill failed', error);
    }
}

// Helper: sync hidden #buyer-name from first+last name inputs
function syncBuyerName() {
    const first = (document.getElementById('buyer-first-name') as HTMLInputElement)?.value.trim() || '';
    const last = (document.getElementById('buyer-last-name') as HTMLInputElement)?.value.trim() || '';
    const combined = [first, last].filter(Boolean).join(' ');
    const hidden = document.getElementById('buyer-name') as HTMLInputElement;
    if (hidden) hidden.value = combined;
}

// Setup Customer Autocomplete
function setupCustomerAutocomplete() {
    const input = document.getElementById('buyer-first-name');
    const suggestionsList = document.getElementById('customer-suggestions');
    if (!input || !suggestionsList) return;

    let debounceTimer;
    let selectedIndex = -1;
    let currentCustomers = [];

    async function fetchCustomers(query) {
        try {
            const response = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
            return await response.json();
        } catch (err) {
            console.error('Failed to fetch customers:', err);
            return [];
        }
    }

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = input.value.trim();
        syncBuyerName();
        
        // Clear hidden ID when input changes manually
        const idInput = document.getElementById('buyer-customer-id');
        if (idInput) idInput.value = '';
        
        if (query.length < 2) {
            suggestionsList.style.display = 'none';
            return;
        }

        debounceTimer = setTimeout(async () => {
            currentCustomers = await fetchCustomers(query);
            suggestionsList.innerHTML = '';
            selectedIndex = -1;

            if (currentCustomers.length === 0) {
                suggestionsList.style.display = 'none';
                return;
            }

            suggestionsList.style.display = 'block';
            
            currentCustomers.forEach((customer, index) => {
                const li = document.createElement('li');
                li.className = 'px-4 py-2 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-0';
                
                const name = customer.customer?.name || customer.customer_name || 'Unknown';
                const phone = customer.customer?.phone || '';
                
                li.innerHTML = `
                    <div class="font-medium text-gray-800">${name}</div>
                    ${phone ? `<div class="text-sm text-gray-500">${phone}</div>` : ''}
                `;
                
                li.onclick = () => selectCustomer(customer);
                suggestionsList.appendChild(li);
            });
        }, 300);
    });

    input.addEventListener('keydown', (e) => {
        // Prevent Enter from submitting the form or triggering next step
        if (e.key === 'Enter') {
            e.preventDefault();
        }

        const items = suggestionsList.querySelectorAll('li');
        if (items.length === 0 || suggestionsList.style.display === 'none') return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            updateSelection(items);
        } else if (e.key === 'Enter') {
            if (selectedIndex >= 0) {
                selectCustomer(currentCustomers[selectedIndex]);
            } else if (currentCustomers.length > 0) {
                // If they press enter without selecting, select the first suggestion
                selectCustomer(currentCustomers[0]);
            }
        }
    });

    // Hide suggestions on outside click
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestionsList.contains(e.target)) {
            suggestionsList.style.display = 'none';
        }
    });

    function updateSelection(items) {
        items.forEach((item, idx) => {
            if (idx === selectedIndex) {
                item.classList.add('bg-purple-100');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('bg-purple-100');
            }
        });
    }

    function selectCustomer(customer) {
        const fullName = customer.customer?.name || customer.customer_name || '';
        // Split into first/last on first space
        const spaceIdx = fullName.indexOf(' ');
        const firstNameEl = document.getElementById('buyer-first-name') as HTMLInputElement;
        const lastNameEl = document.getElementById('buyer-last-name') as HTMLInputElement;
        if (firstNameEl) firstNameEl.value = spaceIdx > -1 ? fullName.slice(0, spaceIdx) : fullName;
        if (lastNameEl) lastNameEl.value = spaceIdx > -1 ? fullName.slice(spaceIdx + 1) : '';
        syncBuyerName();
        
        // Populate other fields
        const idInput = document.getElementById('buyer-customer-id') as HTMLInputElement;
        const line1Input = document.getElementById('buyer-address-line1') as HTMLInputElement;
        const line2Input = document.getElementById('buyer-address-line2') as HTMLInputElement;
        const cityInput = document.getElementById('buyer-city') as HTMLInputElement;
        const stateInput = document.getElementById('buyer-state') as HTMLInputElement;
        const pincodeInput = document.getElementById('buyer-pincode') as HTMLInputElement;
        const countryInput = document.getElementById('buyer-country') as HTMLInputElement;
        const phoneInput = document.getElementById('buyer-phone') as HTMLInputElement;
        const emailInput = document.getElementById('buyer-email') as HTMLInputElement;
        const gstinInput = document.getElementById('buyer-gstin') as HTMLInputElement;

        if (idInput) idInput.value = customer._id || '';
        
        const billing = customer.billing_address || {};
        if (line1Input) line1Input.value = billing.line1 || customer.customer_address || '';
        if (line2Input) line2Input.value = billing.line2 || '';
        if (cityInput) cityInput.value = billing.city || '';
        if (stateInput) stateInput.value = billing.state || 'Karnataka';
        if (pincodeInput) pincodeInput.value = billing.pincode || '';
        if (countryInput) countryInput.value = billing.country || 'India';
        if (phoneInput) phoneInput.value = customer.customer?.phone || customer.customer_phone || '';
        if (emailInput) emailInput.value = customer.customer?.email || customer.customer_email || '';
        if (gstinInput) gstinInput.value = customer.gstin || customer.customer_GSTIN || '';

        suggestionsList.style.display = 'none';
    }
}

// Initialize the step indicator on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const stepIndicator = document.getElementById('step-indicator');
    if (stepIndicator) {
        stepIndicator.textContent = `Step 1 of ${totalSteps}`;
    }

    // Custom ID listener removed as all IDs are system-generated.
    
    setupCustomerAutocomplete();

    // Sync buyer-name hidden field when last name changes
    const lastNameInput = document.getElementById('buyer-last-name');
    if (lastNameInput) {
        lastNameInput.addEventListener('input', syncBuyerName);
    }

    // GSTIN uppercase enforcement
    const gstinInput = document.getElementById('buyer-gstin');
    if (gstinInput) {
        gstinInput.addEventListener('input', function() {
            const pos = (this as HTMLInputElement).selectionStart;
            (this as HTMLInputElement).value = (this as HTMLInputElement).value.toUpperCase();
            (this as HTMLInputElement).setSelectionRange(pos, pos);
        });
    }

    // Ensure phone and pincode only accept numbers
    const pincodeInput = document.getElementById('buyer-pincode');
    if (pincodeInput) {
        pincodeInput.addEventListener('input', function() {
            (this as HTMLInputElement).value = (this as HTMLInputElement).value.replace(/[^0-9]/g, '');
        });
    }
    const phoneInput = document.getElementById('buyer-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            (this as HTMLInputElement).value = (this as HTMLInputElement).value.replace(/[^0-9]/g, '');
        });
    }
});

// Helper functions normalizeTermsHTML and getQuotationHeaderHTML are in quotationView.ts

// Globals needed by TS
declare let currentStep: number;
declare let totalSteps: number;
declare let fetchDocumentById: any;
declare function generatePreview(): Promise<void>;
declare function toInputDate(dateString: string): string;
declare function showSuggestions(input: HTMLInputElement, suggestions: HTMLElement): void;
declare function updateSpecificationsTable(): void;
declare function handleKeyboardNavigation(event: KeyboardEvent, input: HTMLInputElement, suggestions: HTMLElement): void;

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

// Open a quotation for editing
async function openQuotation(quotationId) {
    const data = await fetchDocumentById('quotation', quotationId);
    if (!data) return;

    const rawQuotation = data.quotation;
    // Map backend schema to the flat structure expected by the frontend
    const quotation = {
        ...rawQuotation,
        quotation_id: rawQuotation.quotation_no || rawQuotation.quotation_id,
        customer_id: rawQuotation.customer_id || rawQuotation.customer_snapshot?.customer_id || '',
        customer_name: rawQuotation.customer_snapshot?.name || rawQuotation.customer_name,
        customer_address: (() => {
            const b = rawQuotation.customer_snapshot?.billing_address;
            if (!b) return rawQuotation.customer_address;
            if (typeof b === 'string') return b;
            const parts = [b.line1, b.line2, b.city, b.state, b.pincode, b.country].filter(p => p && typeof p === 'string' && p.trim() !== '');
            return parts.length > 0 ? parts.join(', ') : rawQuotation.customer_address;
        })(),
        billing_address: rawQuotation.customer_snapshot?.billing_address || {},
        customer_phone: rawQuotation.customer_snapshot?.phone || rawQuotation.customer_phone,
        customer_email: rawQuotation.customer_snapshot?.email || rawQuotation.customer_email,
        customer_GSTIN: rawQuotation.customer_snapshot?.gstin || rawQuotation.customer_GSTIN,
        non_items: rawQuotation.other_charges || rawQuotation.non_items || [],
        subject: rawQuotation.content?.subject || rawQuotation.subject,
        letter_1: rawQuotation.content?.letter_1 || rawQuotation.letter_1,
        letter_2: rawQuotation.content?.letter_2 || rawQuotation.letter_2,
        letter_3: rawQuotation.content?.letter_3 || rawQuotation.letter_3,
        headline: rawQuotation.content?.headline || rawQuotation.headline,
        notes: rawQuotation.content?.notes || rawQuotation.notes,
        termsAndConditions: rawQuotation.content?.terms_and_conditions || rawQuotation.termsAndConditions,
        total_amount_tax: rawQuotation.totals?.grand_total || rawQuotation.total_amount_tax
    };

    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
    document.getElementById('new-quotation').style.display = 'none';
    const refreshBtnEdit = document.getElementById('refresh-btn');
    if (refreshBtnEdit) refreshBtnEdit.style.display = 'none';
    document.getElementById('view-preview').style.display = 'block';
    
    const homeBtnEl = document.getElementById('home-btn');
    if (homeBtnEl) homeBtnEl.style.display = '';
    if (typeof currentStep !== "undefined" && typeof totalSteps !== "undefined") {
        document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
    }

    const idInput = document.getElementById('id');
    idInput.value = quotation.quotation_id;
    idInput.readOnly = true;
    idInput.style.backgroundColor = '#f3f4f6'; // Light gray to indicate disabled

    // Hide Print, Save as PDF, and Trash buttons in form - only available in View/List mode
    const printBtn = document.getElementById('print-btn');
    const savePdfBtn = document.getElementById('save-pdf-btn');
    const trashBtnEdit = document.getElementById('trash-btn');
    if (printBtn) printBtn.style.display = 'none';
    if (savePdfBtn) savePdfBtn.style.display = 'none';
    if (trashBtnEdit) trashBtnEdit.style.display = 'none';

    document.getElementById('project-name').value = quotation.project_name;
    // Use input-safe ISO date for the date field
    document.getElementById('quotation-date').value = toInputDate(quotation.quotation_date);
    document.getElementById('valid-till').value = toInputDate(quotation.valid_till);
    document.getElementById('quotation-status').value = quotation.quotation_status || 'Draft';
    document.getElementById('quotation-discount').value = quotation.discount || 0;
    
    const idInputCustomer = document.getElementById('buyer-customer-id');
    if (idInputCustomer) idInputCustomer.value = quotation.customer_id || '';
    
    // Split full name into first + last name fields
    const fullNameStr = quotation.customer_name || '';
    const spaceIdx = fullNameStr.indexOf(' ');
    const firstEl = document.getElementById('buyer-first-name') as HTMLInputElement;
    const lastEl = document.getElementById('buyer-last-name') as HTMLInputElement;
    const hiddenNameEl = document.getElementById('buyer-name') as HTMLInputElement;
    if (firstEl) firstEl.value = spaceIdx > -1 ? fullNameStr.slice(0, spaceIdx) : fullNameStr;
    if (lastEl) lastEl.value = spaceIdx > -1 ? fullNameStr.slice(spaceIdx + 1) : '';
    if (hiddenNameEl) hiddenNameEl.value = fullNameStr;
    const line1Input = document.getElementById('buyer-address-line1') as HTMLInputElement;
    const line2Input = document.getElementById('buyer-address-line2') as HTMLInputElement;
    if (line1Input) line1Input.value = quotation.billing_address?.line1 || quotation.customer_address || '';
    if (line2Input) line2Input.value = quotation.billing_address?.line2 || '';
    document.getElementById('buyer-city').value = quotation.billing_address?.city || '';
    document.getElementById('buyer-state').value = quotation.billing_address?.state || 'Karnataka';
    document.getElementById('buyer-pincode').value = quotation.billing_address?.pincode || '';
    document.getElementById('buyer-country').value = quotation.billing_address?.country || 'India';
    document.getElementById('buyer-phone').value = quotation.customer_phone || '';
    document.getElementById('buyer-email').value = quotation.customer_email || '';
    document.getElementById('buyer-gstin').value = quotation.customer_GSTIN || '';

    const itemsContainer = document.getElementById("items-container");
    const nonItemsContainer = document.getElementById("non-items-container");
    const specificationsContainer = document.getElementById("specifications-container");
    const itemsTableBody = document.querySelector("#items-table tbody");
    const nonItemsTableBody = document.querySelector("#non-items-table tbody");
    const itemsSpecificationsTableBody = document.querySelector("#items-specifications-table tbody");

    // Clear existing content
    if (itemsContainer) itemsContainer.innerHTML = "";
    if (nonItemsContainer) nonItemsContainer.innerHTML = "";
    if (specificationsContainer) specificationsContainer.innerHTML = "";
    itemsTableBody.innerHTML = "";
    nonItemsTableBody.innerHTML = "";
    itemsSpecificationsTableBody.innerHTML = "";

    // Load items
    (quotation.items || []).forEach((item, index) => {
        // Create table row first
        const row = document.createElement("tr");
        row.dataset.itemId = item.item_id || '';
        row.innerHTML = `
                <td><div class="item-number">${index + 1}</div></td>
                <td><input type="text" value="${item.description || ''}" required></td>
                <td><input type="text" value="${item.HSN_SAC || item.hsn_sac || ''}" required></td>
                <td><input type="number" value="${item.quantity || ''}" min="1" required></td>
                <td><input type="number" value="${item.unit_price || ''}" required></td>
                <td><input type="number" value="${item.rate || item.Rate || item.gst_rate || ''}" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
            `;
        itemsTableBody.appendChild(row);

        // Create card
        if (itemsContainer) {
            const card = document.createElement("div");
            card.className = "item-card";
            card.setAttribute("draggable", "true");
            card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${index + 1}</div>
                    <div class="item-field description">
                        <div style="position: relative;">
                            <input type="text" class="item_name" value="${item.description || ''}" required>
                            <ul class="suggestions"></ul>
                        </div>
                    </div>
                    <div class="item-field hsn">
                        <input type="text" value="${item.HSN_SAC || item.hsn_sac || ''}" required>
                    </div>
                    <div class="item-field qty">
                        <input type="number" min="0.01" step="0.01" value="${item.quantity || ''}" required>
                    </div>
                    <div class="item-field price">
                        <input type="number" step="0.01" value="${item.unit_price || ''}" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" min="0" step="0.01" value="${item.rate || item.Rate || item.gst_rate || ''}">
                    </div>
                    <div class="item-actions">

                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
            itemsContainer.appendChild(card);

            // Decimal values are now allowed for quantity inputs.

            // Setup autocomplete for loaded items
            const cardInput = card.querySelector(".item_name");
            const cardSuggestions = card.querySelector(".suggestions");

            if (cardInput && cardSuggestions) {
                cardInput.addEventListener("input", function () {
                    showSuggestions(cardInput, cardSuggestions);
                    // Update specifications table when item description changes (with debounce)
                    clearTimeout(cardInput.specUpdateTimeout);
                    cardInput.specUpdateTimeout = setTimeout(() => {
                        if (cardInput.value.trim()) {
                            updateSpecificationsTable();
                        }
                    }, 500);
                });

                cardInput.addEventListener("keydown", function (event) {
                    handleKeyboardNavigation(event, cardInput, cardSuggestions);
                });

                // Close suggestions handled by global listener
            }

            // Sync card inputs with table inputs
            const cardInputs = card.querySelectorAll('input');
            const rowInputs = row.querySelectorAll('input');
            cardInputs.forEach((input, idx) => {
                input.addEventListener('input', () => {
                    if (rowInputs[idx]) {
                        rowInputs[idx].value = input.value;
                    }
                });
            });

            // Add remove button event listener
            const removeBtn = card.querySelector(".remove-item-btn");
            removeBtn.addEventListener("click", function () {
                card.remove();
                row.remove();
                updateItemNumbers();
                updateSpecificationsTable();
            });
        }
    });

    // Load non-items
    (quotation.non_items || []).forEach((item, index) => {
        // Create table row first
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><div class="item-number">${itemsTableBody.rows.length}</div></td>
                <td><input type="text" value="${item.description || ''}" required></td>
                <td><input type="number" value="${item.price || ''}" required></td>
                <td><input type="number" value="${item.rate || item.Rate || item.gst_rate || ''}" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
            `;
        nonItemsTableBody.appendChild(row);

        // Create card
        if (nonItemsContainer) {
            const card = document.createElement("div");
            card.className = "non-item-card";
            card.setAttribute("draggable", "true");
            card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${index + 1}</div>
                    <div class="non-item-field description">
                        <input type="text" value="${item.description || ''}" required>
                    </div>
                    <div class="non-item-field price">
                        <input type="number" step="0.01" value="${item.price || ''}" required>
                    </div>
                    <div class="non-item-field rate">
                        <input type="number" min="0" step="0.01" value="${item.rate || ''}">
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
            nonItemsContainer.appendChild(card);

            // Sync card inputs with table inputs
            const cardInputs = card.querySelectorAll('input');
            const rowInputs = row.querySelectorAll('input');
            cardInputs.forEach((input, idx) => {
                input.addEventListener('input', () => {
                    if (rowInputs[idx]) {
                        rowInputs[idx].value = input.value;
                    }
                });
            });

            // Add remove button event listener
            const removeBtn = card.querySelector(".remove-item-btn");
            removeBtn.addEventListener("click", function () {
                card.remove();
                row.remove();
                updateNonItemNumbers();
                updateSpecificationsTable();
            });

            // Add listener for description change to update specifications
            const descriptionInput = card.querySelector('.non-item-field.description input');
            if (descriptionInput) {
                descriptionInput.addEventListener('input', () => {
                    clearTimeout(descriptionInput.specUpdateTimeout);
                    descriptionInput.specUpdateTimeout = setTimeout(() => {
                        if (descriptionInput.value.trim()) {
                            updateSpecificationsTable();
                        }
                    }, 500);
                });
            }
        }
    });

    // Combine items and non_items for specifications
    const allItemsForSpecs = [
        ...(quotation.items || []).map(item => ({ ...item, type: 'item' })),
        ...(quotation.non_items || []).map(item => ({ ...item, type: 'non_item' }))
    ];

    allItemsForSpecs.forEach((item, index) => {
        // Create specification card
        if (specificationsContainer) {
            const card = document.createElement('div');
            card.className = 'spec-card';
            card.setAttribute('draggable', 'true');
            card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${index + 1}</div>
                    <div class="spec-field description">
                        <input type="text" value="${item.description || ''}" readonly style="background: #f9fafb; cursor: not-allowed;">
                    </div>
                    <div class="spec-field specification">
                        <input type="text" value="${item.specification || ''}" required>
                    </div>
                `;
            specificationsContainer.appendChild(card);
        }

        // Also create table row
        const row = document.createElement("tr");
        row.innerHTML = `
                <td><div class="item-number">${index + 1}</div></td>
                <td>${item.description || ''}</td>
                <td><input type="text" value="${item.specification || ''}" required></td>
            `;
        itemsSpecificationsTableBody.appendChild(row);
    });
}

// Clone a quotation - copies items, content, and customer details
async function cloneQuotation(sourceQuotationId) {
    try {
        // Fetch the source quotation
        const data = await fetchDocumentById('quotation', sourceQuotationId);
        if (!data) {
            window.electronAPI.showAlert1("Failed to load quotation for cloning.");
            return;
        }

        const rawQuotation = data.quotation;
        // Map backend schema to the flat structure expected by the frontend
        const quotation = {
            ...rawQuotation,
            quotation_id: rawQuotation.quotation_no || rawQuotation.quotation_id,
            customer_id: rawQuotation.customer_id || rawQuotation.customer_snapshot?.customer_id || '',
            customer_name: rawQuotation.customer_snapshot?.name || rawQuotation.customer_name,
            customer_address: (() => {
                const b = rawQuotation.customer_snapshot?.billing_address;
                if (!b) return rawQuotation.customer_address;
                if (typeof b === 'string') return b;
                const parts = [b.line1, b.line2, b.city, b.state, b.pincode, b.country].filter(p => p && typeof p === 'string' && p.trim() !== '');
                return parts.length > 0 ? parts.join(', ') : rawQuotation.customer_address;
            })(),
            billing_address: rawQuotation.customer_snapshot?.billing_address || {},
            customer_phone: rawQuotation.customer_snapshot?.phone || rawQuotation.customer_phone,
            customer_email: rawQuotation.customer_snapshot?.email || rawQuotation.customer_email,
            customer_GSTIN: rawQuotation.customer_snapshot?.gstin || rawQuotation.customer_GSTIN,
            non_items: rawQuotation.other_charges || rawQuotation.non_items || [],
            subject: rawQuotation.content?.subject || rawQuotation.subject,
            letter_1: rawQuotation.content?.letter_1 || rawQuotation.letter_1,
            letter_2: rawQuotation.content?.letter_2 || rawQuotation.letter_2,
            letter_3: rawQuotation.content?.letter_3 || rawQuotation.letter_3,
            headline: rawQuotation.content?.headline || rawQuotation.headline,
            notes: rawQuotation.content?.notes || rawQuotation.notes,
            termsAndConditions: rawQuotation.content?.terms_and_conditions || rawQuotation.termsAndConditions,
            total_amount_tax: rawQuotation.totals?.grand_total || rawQuotation.total_amount_tax
        };

        // Show the form (similar to showNewQuotationForm)
        document.getElementById('home').style.display = 'none';
        document.getElementById('new').style.display = 'block';
        document.getElementById('new-quotation').style.display = 'none';
        const refreshBtnClone = document.getElementById('refresh-btn');
        if (refreshBtnClone) refreshBtnClone.style.display = 'none';
        document.getElementById('view-preview').style.display = 'block';
        const trashBtnEl = document.getElementById('trash-btn');
        if (trashBtnEl) trashBtnEl.style.display = 'none';
        
        const homeBtnEl = document.getElementById('home-btn');
        if (homeBtnEl) homeBtnEl.style.display = '';
        
        if (typeof currentStep !== "undefined" && typeof totalSteps !== "undefined") {
            document.getElementById("step-indicator").textContent = `Step ${currentStep} of ${totalSteps}`;
        }

        // Generate a new ID for the clone
        const idResponse = await fetch("/quotation/generate-id");
        if (!idResponse.ok) throw new Error("Failed to generate new quotation ID");
        const { quotation_id: newId } = await idResponse.json();

        // Set the new ID (hidden field)
        const idInput = document.getElementById('id');
        if (idInput) {
            idInput.value = newId;
        }
        quotationId = newId;

        // Hide Print and Save as PDF buttons for cloned (new) quotations
        const printBtn = document.getElementById('print-btn');
        const savePdfBtn = document.getElementById('save-pdf-btn');
        if (printBtn) printBtn.style.display = 'none';
        if (savePdfBtn) savePdfBtn.style.display = 'none';

        // Store the source quotation ID for audit trail
        sessionStorage.setItem('duplicated_from', sourceQuotationId);

        // Store the source quotation content for preview generation
        sessionStorage.setItem('clone_content', JSON.stringify({
            subject: quotation.subject || '',
            letter_1: quotation.letter_1 || '',
            letter_2: quotation.letter_2 || [],
            letter_3: quotation.letter_3 || '',
            headline: quotation.headline || '',
            notes: quotation.notes || [],
            termsAndConditions: quotation.termsAndConditions || ''
        }));

        // Copy project name (append " (Clone)" to indicate copy if desired, but user just asked for details)
        document.getElementById('project-name').value = quotation.project_name || '';

        // Set date to today
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        document.getElementById('quotation-date').value = `${yyyy}-${mm}-${dd}`;
        document.getElementById('valid-till').value = '';
        document.getElementById('quotation-status').value = 'Draft';
        document.getElementById('quotation-discount').value = quotation.discount || 0;

        const idInputCustomer = document.getElementById('buyer-customer-id');
        if (idInputCustomer) idInputCustomer.value = '';

        // Clear first/last name fields and hidden combined field
        const firstEl = document.getElementById('buyer-first-name') as HTMLInputElement;
        const lastEl = document.getElementById('buyer-last-name') as HTMLInputElement;
        const hiddenNameEl = document.getElementById('buyer-name') as HTMLInputElement;
        if (firstEl) firstEl.value = '';
        if (lastEl) lastEl.value = '';
        if (hiddenNameEl) hiddenNameEl.value = '';
        const line1Input = document.getElementById('buyer-address-line1') as HTMLInputElement;
        const line2Input = document.getElementById('buyer-address-line2') as HTMLInputElement;
        if (line1Input) line1Input.value = '';
        if (line2Input) line2Input.value = '';
        document.getElementById('buyer-city').value = '';
        document.getElementById('buyer-state').value = 'Karnataka';
        document.getElementById('buyer-pincode').value = '';
        document.getElementById('buyer-country').value = 'India';
        document.getElementById('buyer-phone').value = '';
        document.getElementById('buyer-email').value = '';
        document.getElementById('buyer-gstin').value = '';

        // Get containers
        const itemsContainer = document.getElementById("items-container");
        const nonItemsContainer = document.getElementById("non-items-container");
        const specificationsContainer = document.getElementById("specifications-container");
        const itemsTableBody = document.querySelector("#items-table tbody");
        const nonItemsTableBody = document.querySelector("#non-items-table tbody");
        const itemsSpecificationsTableBody = document.querySelector("#items-specifications-table tbody");

        // Clear existing content
        if (itemsContainer) itemsContainer.innerHTML = "";
        if (nonItemsContainer) nonItemsContainer.innerHTML = "";
        if (specificationsContainer) specificationsContainer.innerHTML = "";
        itemsTableBody.innerHTML = "";
        nonItemsTableBody.innerHTML = "";
        itemsSpecificationsTableBody.innerHTML = "";

        // Copy items (same logic as openQuotation)
        (quotation.items || []).forEach((item, index) => {
            const row = document.createElement("tr");
            row.dataset.itemId = item.item_id || '';
            row.innerHTML = `
                <td><div class="item-number">${index + 1}</div></td>
                <td><input type="text" value="${item.description || ''}" required></td>
                <td><input type="text" value="${item.HSN_SAC || item.hsn_sac || ''}" required></td>
                <td><input type="number" value="${item.quantity || ''}" min="0.01" step="0.01" required></td>
                <td><input type="number" value="${item.unit_price || ''}" required></td>
                <td><input type="number" value="${item.rate || ''}" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
            `;
            itemsTableBody.appendChild(row);

            if (itemsContainer) {
                const card = document.createElement("div");
                card.className = "item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${index + 1}</div>
                    <div class="item-field description">
                        <div style="position: relative;">
                            <input type="text" class="item_name" value="${item.description || ''}" required>
                            <ul class="suggestions"></ul>
                        </div>
                    </div>
                    <div class="item-field hsn">
                        <input type="text" value="${item.HSN_SAC || item.hsn_sac || ''}" required>
                    </div>
                    <div class="item-field qty">
                        <input type="number" min="0.01" step="0.01" value="${item.quantity || ''}" required>
                    </div>
                    <div class="item-field price">
                        <input type="number" step="0.01" value="${item.unit_price || ''}" required>
                    </div>
                    <div class="item-field rate">
                        <input type="number" min="0" step="0.01" value="${item.rate || ''}">
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                itemsContainer.appendChild(card);

                // Decimal values are now allowed for quantity inputs.

                // Setup autocomplete
                const cardInput = card.querySelector(".item_name");
                const cardSuggestions = card.querySelector(".suggestions");
                if (cardInput && cardSuggestions) {
                    cardInput.addEventListener("input", function () {
                        showSuggestions(cardInput, cardSuggestions);
                        clearTimeout(cardInput.specUpdateTimeout);
                        cardInput.specUpdateTimeout = setTimeout(() => {
                            if (cardInput.value.trim()) {
                                updateSpecificationsTable();
                            }
                        }, 500);
                    });
                    cardInput.addEventListener("keydown", function (event) {
                        handleKeyboardNavigation(event, cardInput, cardSuggestions);
                    });
                }

                // Sync card inputs with table inputs
                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, idx) => {
                    input.addEventListener('input', () => {
                        if (rowInputs[idx]) {
                            rowInputs[idx].value = input.value;
                        }
                    });
                });

                // Remove button
                const removeBtn = card.querySelector(".remove-item-btn");
                removeBtn.addEventListener("click", function () {
                    card.remove();
                    row.remove();
                    updateItemNumbers();
                    updateSpecificationsTable();
                });
            }
        });

        // Copy non-items
        (quotation.non_items || []).forEach((item, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><div class="item-number">${itemsTableBody.rows.length}</div></td>
                <td><input type="text" value="${item.description || ''}" required></td>
                <td><input type="number" value="${item.price || ''}" required></td>
                <td><input type="number" value="${item.rate || ''}" min="0.01" step="0.01" required></td>
                <td><button type="button" class="remove-item-btn table-remove-btn"><i class="fas fa-trash-alt"></i></button></td>
            `;
            nonItemsTableBody.appendChild(row);

            if (nonItemsContainer) {
                const card = document.createElement("div");
                card.className = "non-item-card";
                card.setAttribute("draggable", "true");
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${index + 1}</div>
                    <div class="non-item-field description">
                        <input type="text" value="${item.description || ''}" required>
                    </div>
                    <div class="non-item-field price">
                        <input type="number" step="0.01" value="${item.price || ''}" required>
                    </div>
                    <div class="non-item-field rate">
                        <input type="number" min="0" step="0.01" value="${item.rate || item.Rate || item.gst_rate || ''}">
                    </div>
                    <div class="item-actions">
                        <button type="button" class="remove-item-btn" title="Remove Item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                nonItemsContainer.appendChild(card);

                // Sync card inputs with table inputs
                const cardInputs = card.querySelectorAll('input');
                const rowInputs = row.querySelectorAll('input');
                cardInputs.forEach((input, idx) => {
                    input.addEventListener('input', () => {
                        if (rowInputs[idx]) {
                            rowInputs[idx].value = input.value;
                        }
                    });
                });

                // Remove button
                const removeBtn = card.querySelector(".remove-item-btn");
                removeBtn.addEventListener("click", function () {
                    card.remove();
                    row.remove();
                    updateNonItemNumbers();
                    updateSpecificationsTable();
                });

                // Description change listener
                const descriptionInput = card.querySelector('.non-item-field.description input');
                if (descriptionInput) {
                    descriptionInput.addEventListener('input', () => {
                        clearTimeout(descriptionInput.specUpdateTimeout);
                        descriptionInput.specUpdateTimeout = setTimeout(() => {
                            if (descriptionInput.value.trim()) {
                                updateSpecificationsTable();
                            }
                        }, 500);
                    });
                }
            }
        });

        // Copy specifications
        const allItemsForSpecs = [
            ...(quotation.items || []).map(item => ({ ...item, type: 'item' })),
            ...(quotation.non_items || []).map(item => ({ ...item, type: 'non_item' }))
        ];

        allItemsForSpecs.forEach((item, index) => {
            if (specificationsContainer) {
                const card = document.createElement('div');
                card.className = 'spec-card';
                card.setAttribute('draggable', 'true');
                card.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="item-number">${index + 1}</div>
                    <div class="spec-field description">
                        <input type="text" value="${item.description || ''}" readonly style="background: #f9fafb; cursor: not-allowed;">
                    </div>
                    <div class="spec-field specification">
                        <input type="text" value="${item.specification || ''}" required>
                    </div>
                `;
                specificationsContainer.appendChild(card);
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><div class="item-number">${index + 1}</div></td>
                <td>${item.description || ''}</td>
                <td><input type="text" value="${item.specification || ''}" required></td>
            `;
            itemsSpecificationsTableBody.appendChild(row);
        });

        // Generate preview - content will be populated from sessionStorage in duplicate mode
        await generatePreview();

        // Show success toast
        if (typeof showToast === 'function') {
            showToast(`Quotation cloned from ${sourceQuotationId}.`);
        }

    } catch (error) {
        console.error("Error cloning quotation:", error);
        window.electronAPI.showAlert1("Failed to clone quotation. Please try again.");
    }
}

// Function to get the quotation id
async function getId() {
    try {
        const response = await fetch("/quotation/generate-id");
        if (!response.ok) throw new Error("Failed to fetch quotation id");

        const data = await response.json();
        document.getElementById('id').value = data.quotation_id;
        quotationId = data.quotation_id;
        if (quotationId) await generatePreview();
    } catch (error) {
        console.error("Error fetching quotation id:", error);
        window.electronAPI.showAlert1("Failed to fetch quotation id. Please try again later.");
    }
}

async function generateFilePages(files) {
    if (!files || files.length === 0) return '';

    const getFilePath = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const filePath = await window.electronAPI.saveFile(buffer, file.name);
        return filePath;
    };

    const headerHTML = await getQuotationHeaderHTML();

    const pages = await Promise.all(Array.from(files).map(async (file) => {
        const imagePath = await getFilePath(file);

        return `
            <div class="preview-container doc-quotation">
                ${headerHTML}

                <div class="files-section" style="margin: 20px 0; text-align: center;">
                    <img src="${imagePath}" alt="Uploaded File" style="max-width: 100%; max-height: 800px; object-fit: contain;">
                </div>

                <footer>
                    <p>This is a computer-generated quotation.</p>
                </footer>
            </div>
        `;
    }));

    return pages.join('');
}



// Function to generate the preview for both tax rate and without tax rate
async function generatePreview() {
    // Capture any existing user edits BEFORE regenerating the preview
    // This preserves user modifications to contenteditable fields
    const existingContent = {
        subject: document.querySelector("#preview-content .quotation-letter-content p[contenteditable]")?.innerText.replace("Subject:", "").trim() || null,
        letter_1: document.querySelectorAll("#preview-content .quotation-letter-content p[contenteditable]")[1]?.innerText.trim() || null,
        letter_2: (() => {
            const items = document.querySelectorAll("#preview-content .quotation-letter-content ul[contenteditable] li");
            return items.length > 0 ? Array.from(items).map(li => li.innerText.trim()) : null;
        })(),
        letter_3: document.querySelectorAll("#preview-content .quotation-letter-content p[contenteditable]")[2]?.innerText.trim() || null,
        notes: (() => {
            const items = document.querySelector("#preview-content .notes-section ul")?.querySelectorAll("li");
            return items && items.length > 0 ? Array.from(items).map(li => li.innerText.trim()) : null;
        })(),
        termsAndConditions: document.querySelector("#preview-content .terms-section")?.innerHTML.trim() || null,
        headline: document.querySelector("#preview-content .headline-section p[contenteditable]")?.innerText.trim() || null
    };

    // Fetch company data from database
    const company = await window.companyConfig.getCompanyInfo();
    const bank = company.bank_details || {};
    const phoneStr = company.phone.ph1 + (company.phone.ph2 ? ' / ' + company.phone.ph2 : '');

    if (!quotationId) {
        quotationId = document.getElementById('id').value;
    }
    const projectName = document.getElementById("project-name").value || "";
    const quotationDate = document.getElementById("quotation-date").value || "";
    const validTill = document.getElementById("valid-till")?.value || "";
    const quotationStatus = document.getElementById("quotation-status")?.value || "Draft";
    const discountAmount = Number(document.getElementById("quotation-discount")?.value || 0);
    const buyerName = document.getElementById("buyer-name").value || "";
    const line1 = (document.getElementById("buyer-address-line1") as HTMLInputElement)?.value || "";
    const line2 = (document.getElementById("buyer-address-line2") as HTMLInputElement)?.value || "";
    const city = (document.getElementById("buyer-city") as HTMLInputElement)?.value || "";
    const state = (document.getElementById("buyer-state") as HTMLInputElement)?.value || "";
    const pincode = (document.getElementById("buyer-pincode") as HTMLInputElement)?.value || "";
    const country = (document.getElementById("buyer-country") as HTMLInputElement)?.value || "";

    const addrParts = [
        line1,
        line2,
        [city, state].filter(Boolean).join(", "),
        [country, pincode].filter(Boolean).join(" - ")
    ].filter(Boolean);
    const buyerAddress = addrParts.join("<br>");
    const buyerPhone = document.getElementById("buyer-phone").value || "";
    const buyerGSTIN = document.getElementById("buyer-gstin").value || "";
    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];
    const nonItemsTable = document.querySelector('#non-items-table tbody');
    const headerHTML = await getQuotationHeaderHTML();

    let totalPrice = 0;
    let sno = 0;

    const allRenderableItems = [];
    const CHARS_PER_LINE = 60;

    // Always show tax columns in the preview, even if rate is 0, so the structure is visible.
    let hasTax = true;

    let totalQtySum = 0;
    let totalTaxableSum = 0;
    let totalPriceSum = 0;
    let totalUnitPriceSum = 0;
    let totalItemsTaxSum = 0;

    // Process regular items
    for (const row of itemsTable.rows) {
        const description = row.cells[1].querySelector("input").value || "-";
        const hsnSac = row.cells[2].querySelector("input").value || "-";
        const qty = parseFloat(row.cells[3].querySelector("input").value || "0");
        const unitPrice = parseFloat(row.cells[4].querySelector("input").value || "0");
        const rate = parseFloat(row.cells[5].querySelector("input").value || "0");

        const taxableValue = qty * unitPrice;
        totalQtySum += qty;
        totalTaxableSum += taxableValue;
        totalUnitPriceSum += unitPrice;
        let itemHTML = "";

        if (hasTax) {
            const taxAmount = (taxableValue * rate) / 100;
            const rowTotal = taxableValue + taxAmount;
            totalPriceSum += rowTotal;
            totalItemsTaxSum += taxAmount;

            itemHTML = `<tr><td class="text-center">${sno + 1}</td><td class="text-left">${description}</td><td class="text-center">${hsnSac}</td><td class="text-right">${qty}</td><td class="text-right">₹&nbsp;${formatIndian(unitPrice, 2)}</td><td class="text-right">₹&nbsp;${formatIndian(taxableValue, 2)}</td><td class="text-right">${rate.toFixed(2)}%</td><td class="text-right">₹&nbsp;${formatIndian(rowTotal, 2)}</td></tr>`;
        } else {
            const rowTotal = taxableValue;
            totalPriceSum += rowTotal;
            itemHTML = `<tr><td class="text-center">${sno + 1}</td><td class="text-left">${description}</td><td class="text-center">${hsnSac}</td><td class="text-right">${qty}</td><td class="text-right">₹&nbsp;${formatIndian(unitPrice, 2)}</td><td class="text-right">₹&nbsp;${formatIndian(rowTotal, 2)}</td></tr>`;
        }
        const rowCount = Math.ceil(description.length / CHARS_PER_LINE) || 1;
        allRenderableItems.push({ html: itemHTML, rowCount: rowCount });
        sno++;
    }

    // Process non-items
    const nonItems = Array.from(nonItemsTable.querySelectorAll('tr')).map(row => ({
        descriptions: row.querySelector('input[placeholder="Item Description"]').value,
        price: row.querySelector('input[placeholder="Price"]').value,
        rate: row.querySelector('input[placeholder="Rate"]').value,
    }));

    for (const item of nonItems) {
        const description = item.descriptions || '-';
        const price = Number(item.price) || 0;
        const rate = Number(item.rate) || 0;

        totalTaxableSum += price;

        let rowTotal = price;
        if (hasTax && rate > 0) {
            const taxAmount = (price * rate) / 100;
            rowTotal += taxAmount;
        }
        totalPriceSum += rowTotal;

        // Generate HTML with consistent columns: S.No, Description, HSN/SAC, Qty, Unit Price, [Taxable Value, Rate %], Total
        let itemHTML = "";
        if (hasTax) {
            itemHTML = `<tr><td class="text-center">${sno + 1}</td><td class="text-left">${description}</td><td class="text-center">-</td><td class="text-right">-</td><td class="text-right">-</td><td class="text-right">₹&nbsp;${formatIndian(price, 2)}</td><td class="text-right">${rate > 0 ? rate.toFixed(2) + '%' : '-'}</td><td class="text-right">₹&nbsp;${formatIndian(rowTotal, 2)}</td></tr>`;
        } else {
            itemHTML = `<tr><td class="text-center">${sno + 1}</td><td class="text-left">${description}</td><td class="text-center">-</td><td class="text-right">-</td><td class="text-right">-</td><td class="text-right">₹&nbsp;${formatIndian(rowTotal, 2)}</td></tr>`;
        }
        const rowCount = Math.ceil(description.length / CHARS_PER_LINE) || 1;
        allRenderableItems.push({ html: itemHTML, rowCount: rowCount });
        sno++;
    }

    // Calculate actual pro-rata totals matching backend exactly
    const placeOfSupply = document.getElementById("buyer-state")?.value || "Karnataka";
    const isInterState = String(placeOfSupply).trim().toLowerCase() !== "karnataka";

    const discountRatio = totalTaxableSum > 0 ? Math.max(totalTaxableSum - discountAmount, 0) / totalTaxableSum : 1;

    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    const totalTaxableValue = Math.max(totalTaxableSum - discountAmount, 0);

    for (const row of itemsTable.rows) {
        const qty = parseFloat(row.cells[3].querySelector("input").value || "0");
        const unitPrice = parseFloat(row.cells[4].querySelector("input").value || "0");
        const rate = parseFloat(row.cells[5].querySelector("input").value || "0");
        const taxable = qty * unitPrice * discountRatio;
        const tax = (taxable * rate) / 100;
        if (isInterState) {
            totalIGST += tax;
        } else {
            totalCGST += tax / 2;
            totalSGST += tax - (tax / 2);
        }
    }
    for (const item of nonItems) {
        const price = Number(item.price) || 0;
        const rate = Number(item.rate) || 0;
        const taxable = price * discountRatio;
        const tax = (taxable * rate) / 100;
        if (isInterState) {
            totalIGST += tax;
        } else {
            totalCGST += tax / 2;
            totalSGST += tax - (tax / 2);
        }
    }

    const totalTax = totalIGST + totalCGST + totalSGST;
    totalPrice = totalTaxableValue + totalTax;
    const roundedGrandTotal = Math.round(totalPrice);
    const roundOff = roundedGrandTotal - totalPrice;

    totalAmountNoTax = totalTaxableValue;
    totalAmountTax = roundedGrandTotal.toFixed(2);

    const totalsHTML = `
        <div style="display: flex; width: 100%;">
            <div class="totals-section-sub1" style="width: 55%;">
                <p>Subtotal:</p>
                ${hasTax ? (totalIGST > 0 ? `
                <p>Total IGST:</p>` : `
                <p>Total CGST:</p>
                <p>Total SGST:</p>`) : ""}
                ${discountAmount ? `<p>Discount:</p>` : ""}
                <p>Round Off:</p>
                <p>Grand Total:</p>
            </div>
            <div class="totals-section-sub2" style="width: 45%;">
                <p>₹ ${formatIndian(totalTaxableValue, 2)}</p>
                ${hasTax ? (totalIGST > 0 ? `
                <p>₹ ${formatIndian(totalIGST, 2)}</p>` : `
                <p>₹ ${formatIndian(totalCGST, 2)}</p>
                <p>₹ ${formatIndian(totalSGST, 2)}</p>`) : ""}
                ${discountAmount ? `<p>-₹ ${formatIndian(discountAmount, 2)}</p>` : ""}
                <p>₹ ${roundOff >= 0 ? "+" : ""}${formatIndian(roundOff, 2)}</p>
                <p>₹ ${formatIndian(roundedGrandTotal, 2)}</p>
            </div>
        </div>
    `;

    let totalsRowHTML = "";
    if (hasTax) {
        totalsRowHTML = `
            <tr class="totals-row">
                <td colspan="3" class="text-left">TOTAL</td>
                <td class="text-right">${totalQtySum}</td>
                <td class="text-right">₹&nbsp;${formatIndian(totalUnitPriceSum, 2)}</td>
                <td class="text-right">₹&nbsp;${formatIndian(totalTaxableSum, 2)}</td>
                <td class="text-right">₹&nbsp;${formatIndian(totalItemsTaxSum, 2)}</td>
                <td class="text-right">₹&nbsp;${formatIndian(totalPriceSum, 2)}</td>
            </tr>
        `;
    } else {
        totalsRowHTML = `
            <tr class="totals-row">
                <td colspan="3" class="text-left">TOTAL</td>
                <td class="text-right">${totalQtySum}</td>
                <td class="text-right">₹&nbsp;${formatIndian(totalUnitPriceSum, 2)}</td>
                <td class="text-right">₹&nbsp;${formatIndian(totalPriceSum, 2)}</td>
            </tr>
        `;
    }

    const ITEMS_PER_PAGE = 20; // Represents available lines on a page for items.
    const SUMMARY_SECTION_ROW_COUNT = 8; // Estimated height of totals, payment, and notes sections.

    // Build pages with the new logic
    const itemPages = [];
    let currentPageItemsHTML = '';
    let currentPageRowCount = 0;

    allRenderableItems.forEach((item, index) => {
        const isLastItem = index === allRenderableItems.length - 1;

        // Calculate the space this item will take up.
        const itemSpace = item.rowCount;

        // If this is the last item, the required space must also include the summary.
        const requiredSpaceForLastItem = itemSpace + SUMMARY_SECTION_ROW_COUNT;

        // Condition to create a new page:
        // 1. If the current page is not empty AND
        // 2. EITHER this item (if not the last) overflows the page
        // 3. OR this item (if it IS the last) plus the summary overflows the page.
        if (currentPageRowCount > 0 &&
            ((!isLastItem && currentPageRowCount + itemSpace > ITEMS_PER_PAGE) ||
                (isLastItem && currentPageRowCount + requiredSpaceForLastItem > ITEMS_PER_PAGE))) {

            itemPages.push(currentPageItemsHTML);
            currentPageItemsHTML = '';
            currentPageRowCount = 0;
        }

        currentPageItemsHTML += item.html;
        currentPageRowCount += item.rowCount;
    });

    if (currentPageItemsHTML !== '') {
        itemPages.push(currentPageItemsHTML);
    }

    const itemsPageHTML = itemPages.map((pageHTML, index) => {
        const isLastItemsPage = index === itemPages.length - 1;
        return `
        <div class="preview-container doc-quotation">
            ${headerHTML}
            ${index === 0 ? `<div class="table headline-section"><p contenteditable="true"><u>${projectName || 'Items and Charges'}</u></p></div>` : ''}
            <div class="items-section">
                <table class="items-table">
                    <thead>
                        <tr>
                            <th class="text-center">Sr. No</th>
                            <th class="text-left">Description</th>
                            <th class="text-center">HSN/SAC</th>
                            <th class="text-right">Qty</th>
                            <th class="text-right">Unit Price</th>
                            ${hasTax ? `
                            <th class="text-right">Taxable Value</th>
                            <th class="text-right">Tax</th>
                            <th class="text-right">Total (With Tax)</th>` : `
                            <th class="text-right">Total Price (₹)</th>`}
                        </tr>
                    </thead>
                    <tbody>
                        ${isLastItemsPage ? (pageHTML + totalsRowHTML) : pageHTML}
                    </tbody>
                </table>
            </div>

            ${!isLastItemsPage ? `<div class="continuation-text">Continued on next page...</div>` : ''}

            ${isLastItemsPage ? `
            <div class="fifth-section">
                <div class="fifth-section-sub1">
                    <div class="fifth-section-sub2">
                        <div class="fifth-section-sub3">
                            <p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p>
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(roundedGrandTotal)} Only</span></p>
                        </div>
                        <h3>Payment Details</h3>
                        <div class="bank-details">
                            <div class="QR-code bank-details-sub1">
                                <img src="../assets/shresht-systems-payment-QR-code.jpg"
                                    alt="qr-code" />
                            </div>
                            <div class="bank-details-sub2">
                                <p><strong>Account Holder Name: </strong>${bank.account_holder_name || company.company || company.company_name}</p>
                                <p><strong>Bank Name: </strong>${bank.bank_name || ''}</p>
                                <p><strong>Branch Name: </strong>${bank.branch || ''}</p>
                                <p><strong>Account No: </strong>${bank.account_number || ''}</p>
                                <p><strong>IFSC Code: </strong>${bank.ifsc_code || ''}</p>
                            </div>
                        </div>
                    </div>
                    <div class="totals-section">
                        ${totalsHTML}
                    </div>
                </div>
            </div>
            <div class="notes-section" contenteditable="true">
                <p><strong>Notes:</strong></p>
                <ul>
                    <li>All prices are exclusive of taxes unless stated otherwise.</li>    
                    <li>Payment terms: 50% advance upon order confirmation, 40% before dispatch, and 10% after installation.</li>
                    <li>Delivery and installation will be completed within the stipulated timeline as per mutual agreement.</li>
                    <li>All equipment supplied is covered under the manufacturer’s standard warranty.</li>              
                    <li>All applicable taxes and duties are included unless stated otherwise.</li>
                </ul>
            </div>
            ` : ''}
            <footer>
                <p>This is a computer-generated quotation.</p>
            </footer>
        </div>
        `;
    }).join('');


    // Remove the separate summary page
    const summaryPageHTML = ``;

    // const files = document.getElementById('files');
    // const files = document.getElementById('files');
    const tabStatus = sessionStorage.getItem('currentTab-status');
    const isClone = tabStatus === 'clone';
    const isUpdate = tabStatus === 'update';

    // Format the date for display (DD/MM/YYYY format)
    const formattedDate = formatDateIndian(quotationDate);

    // Get clone content if in clone mode
    let cloneContent = null;
    if (isClone) {
        try {
            const storedContent = sessionStorage.getItem('clone_content');
            if (storedContent) {
                cloneContent = JSON.parse(storedContent);
            }
        } catch (e) {
            console.error('Failed to parse clone content:', e);
        }
    }

    if (!isUpdate && !isClone) {
        document.getElementById("preview-content").innerHTML = `
    <div class="preview-container doc-quotation">
        ${headerHTML}

        <div class="title">Quotation-${quotationId}</div>
        <div class="quotation-letter-date">
            <p><strong>Date:</strong> ${formattedDate}</p>
        </div>
        <div class="quotation-letter-content" >
            <p><strong>To:</strong></p>
              ${buyerName}<br>
              ${buyerAddress}<br>
              ${buyerPhone}<br>
              ${buyerGSTIN ? `GSTIN: ${buyerGSTIN}<br>` : ''}
            <p contenteditable="true"><strong>Subject:</strong> Proposal for the Supply, Installation, and Commissioning of ${projectName}</p>

            <p>Dear ${buyerName},</p>

            <p contenteditable="true">We appreciate the opportunity to submit our proposal for the supply, installation, and commissioning of ${projectName}. At <strong>${company.company}</strong>, we are committed to delivering high-quality, industry-standard solutions tailored to meet your specific requirements.</p>
            <p>Our proposal includes:</p>
            <ul contenteditable="true">
                <li>Cutting-edge technology and premium-grade equipment</li>
                <li>Expert installation by certified professionals</li>
                <li>Comprehensive commissioning and quality assurance</li>
                <li>Reliable after-sales support and service</li>
            </ul>
            
            <p contenteditable="true">We are confident that our offering will add significant value to your operations. Please find the detailed quotation enclosed for your review. Should you require any further information or modifications, feel free to contact us.</p>
            
            <p>We look forward to your positive response and the opportunity to collaborate with you.</p>
          
            <p>Best regards,</p>
            <p><strong>${company.company}</strong><br>
               Ph: ${phoneStr}<br>
               Email: ${company.email}<br>
               Website: ${company.website}</p>
        </div>
        
        <footer>
            <p>This is a computer-generated quotation.</p>
        </footer>
    </div>

    ${itemsPageHTML}

    ${summaryPageHTML}

    <div class="preview-container doc-quotation">
        ${headerHTML}
        <div class="terms-section" contenteditable="true">
            <h3>Terms & Conditions</h3>
            <ul>
                <li><strong>Lead Time:</strong> Delivery and installation will be completed within the stipulated timeline as per mutual agreement.</li>
                <li><strong>Payment Terms:</strong>
                    <ul>
                        <li>50% advance upon order confirmation.</li>
                        <li>40% before dispatch of materials.</li>
                        <li>10% after successful installation and commissioning.</li>
                    </ul>
                </li>
                <li><strong>Warranty:</strong>
                    <ul>
                        <li>All equipment supplied is covered under the manufacturer’s standard warranty.</li>
                        <li>Any defects arising due to manufacturing faults will be rectified as per warranty terms.</li>
                        <li>Warranty does not cover damages due to improper handling, unauthorized modifications, or external factors.</li>
                    </ul>
                </li>
                <li><strong>Customer Scope:</strong> Provision of necessary infrastructure such as power supply, water, and secure storage for materials.</li>
                <li><strong>Quote Validity:</strong> 30 days from the date of issue.</li>
                <li><strong>Taxes & Duties:</strong> All applicable taxes and duties are included unless stated otherwise.</li>
                <li><strong>Force Majeure:</strong> The company shall not be liable for delays or non-performance due to circumstances beyond its control.</li>
            </ul>
        </div>

        <div class="closing-section">
            <p>We look forward to your order confirmation. Please contact us for any further technical or commercial clarifications.</p>
            <p>Thanking you,</p>
            <p><strong>For ${company.company},</strong><br>Mob: +91 ${phoneStr}</p>
        </div>

        <footer>
            <p>This is a computer-generated quotation.</p>
        </footer>
    </div>
    `;
        // generateFilePages(files)
    } else if (isClone && cloneContent) {
        // Clone mode - use content from source quotation stored in sessionStorage
        const itemsPageHTMLDup = itemPages.map((pageHTML, index) => {
            const isLastItemsPage = index === itemPages.length - 1;
            return `
        <div class="preview-container doc-quotation">
            ${headerHTML}
            ${index === 0 ? `<div class="table headline-section"><p contenteditable="true"><u>${cloneContent.headline || 'Items and Charges'}</u></p></div>` : ''}
            <div class="items-section">
                <table class="items-table">
                    <thead>
                        <tr>
                            <th class="text-center">S. No</th>
                            <th class="text-left">Description</th>
                            <th class="text-center">HSN/SAC</th>
                            <th class="text-right">Qty</th>
                            <th class="text-right">Unit Price</th>
                            ${hasTax ? `
                            <th class="text-right">Taxable Value (₹)</th>
                            <th class="text-right">Rate (%)</th>` : ""}
                            <th class="text-right">Total Price (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${isLastItemsPage ? (pageHTML + totalsRowHTML) : pageHTML}
                    </tbody>
                </table>
            </div>

            ${!isLastItemsPage ? `<div class="continuation-text">Continued on next page...</div>` : ''}

            ${isLastItemsPage ? `
            <div class="fifth-section">
                <div class="fifth-section-sub1">
                    <div class="fifth-section-sub2">
                        <div class="fifth-section-sub3">
                            <p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p>
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(roundedGrandTotal)} Only</span></p>
                        </div>
                        <h3>Payment Details</h3>
                        <div class="bank-details">
                            <div class="QR-code bank-details-sub1">
                                <img src="../assets/shresht-systems-payment-QR-code.jpg"
                                    alt="qr-code" />
                            </div>
                            <div class="bank-details-sub2">
                                <p><strong>Account Holder Name: </strong>${bank.account_holder_name || company.company || company.company_name}</p>
                                <p><strong>Bank Name: </strong>${bank.bank_name || ''}</p>
                                <p><strong>Branch Name: </strong>${bank.branch || ''}</p>
                                <p><strong>Account No: </strong>${bank.account_number || ''}</p>
                                <p><strong>IFSC Code: </strong>${bank.ifsc_code || ''}</p>
                            </div>
                        </div>
                    </div>
                    <div class="totals-section">
                        ${totalsHTML}
                    </div>
                </div>
            </div>
            <div class="notes-section" contenteditable="true">
                <p><strong>Notes:</strong></p>
                <ul>
                   ${(cloneContent.notes || []).map(note => `<li>${note}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            <footer>
                <p>This is a computer-generated quotation.</p>
            </footer>
        </div>
        `;
        }).join('');

        document.getElementById("preview-content").innerHTML = `
    <div class="preview-container doc-quotation">
        ${headerHTML}

        <div class="title">Quotation-${quotationId}</div>
        <div class="quotation-letter-date">
            <p><strong>Date:</strong> ${formattedDate}</p>
        </div>
        <div class="quotation-letter-content" >
            <p><strong>To:</strong></p>
              ${buyerName}<br>
              ${buyerAddress}<br>
              ${buyerPhone}<br>
              ${buyerGSTIN ? `GSTIN: ${buyerGSTIN}<br>` : ''}
            <p contenteditable="true"><strong>Subject:</strong> ${cloneContent.subject || ''}</p>

            <p>Dear ${buyerName},</p>

            <p contenteditable="true">${cloneContent.letter_1 || ''}</p>
            <p>Our proposal includes:</p>
            <ul contenteditable="true">
                ${(cloneContent.letter_2 || []).map(li => `<li>${li}</li>`).join('')}
            </ul>
            
            <p contenteditable="true">${cloneContent.letter_3 || ''}</p>
            
            <p>We look forward to your positive response and the opportunity to collaborate with you.</p>
          
            <p>Best regards,</p>
            <p><strong>${company.company}</strong><br>
               Ph: ${phoneStr}<br>
               Email: ${company.email}<br>
               Website: ${company.website}</p>
        </div>
        
        <footer>
            <p>This is a computer-generated quotation.</p>
        </footer>
    </div>

    ${itemsPageHTMLDup}

    ${summaryPageHTML}

    <div class="preview-container doc-quotation">
        ${headerHTML}
        <div class="terms-section" contenteditable="true">
            ${normalizeTermsHTML(cloneContent.termsAndConditions || '')}
        </div>

        <div class="closing-section">
            <p>We look forward to your order confirmation. Please contact us for any further technical or commercial clarifications.</p>
            <p>Thanking you,</p>
            <p><strong>For ${company.company},</strong><br>Mob: +91 ${phoneStr}</p>
        </div>

        <footer>
            <p>This is a computer-generated quotation.</p>
        </footer>
    </div>
    `;
    } else {
        try {
            const response = await fetch(`/quotation/${quotationId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch quotation");
            }

            const data = await response.json();
            const rawQuotation = data.quotation;
            const quotation = {
                ...rawQuotation,
                subject: rawQuotation.content?.subject || rawQuotation.subject,
                letter_1: rawQuotation.content?.letter_1 || rawQuotation.letter_1,
                letter_2: rawQuotation.content?.letter_2 || rawQuotation.letter_2,
                letter_3: rawQuotation.content?.letter_3 || rawQuotation.letter_3,
                headline: rawQuotation.content?.headline || rawQuotation.headline,
                notes: rawQuotation.content?.notes || rawQuotation.notes,
                termsAndConditions: rawQuotation.content?.terms_and_conditions || rawQuotation.termsAndConditions
            };

            const itemsPageHTML = itemPages.map((pageHTML, index) => {
                const isLastItemsPage = index === itemPages.length - 1;
                return `
        <div class="preview-container doc-quotation">
            ${headerHTML}
            ${index === 0 ? `<div class="table headline-section"><p contenteditable="true"><u>${projectName || quotation.headline || 'Items and Charges'}</u></p></div>` : ''}
            <div class="items-section">
                <table class="items-table">
                    <thead>
                        <tr>
                            <th class="text-center">S. No</th>
                            <th class="text-left">Description</th>
                            <th class="text-center">HSN/SAC</th>
                            <th class="text-right">Qty</th>
                            <th class="text-right">Unit Price</th>
                            ${hasTax ? `
                            <th class="text-right">Taxable Value (₹)</th>
                            <th class="text-right">Rate (%)</th>` : ""}
                            <th class="text-right">Total Price (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${isLastItemsPage ? (pageHTML + totalsRowHTML) : pageHTML}
                    </tbody>
                </table>
            </div>

            ${!isLastItemsPage ? `<div class="continuation-text">Continued on next page...</div>` : ''}

            ${isLastItemsPage ? `
            <div class="fifth-section">
                <div class="fifth-section-sub1">
                    <div class="fifth-section-sub2">
                        <div class="fifth-section-sub3">
                            <p class="fifth-section-sub3-1"><strong>Amount in Words: </strong></p>
                            <p class="fifth-section-sub3-2"><span id="totalInWords">${numberToWords(roundedGrandTotal)} Only</span></p>
                        </div>
                        <h3>Payment Details</h3>
                        <div class="bank-details">
                            <div class="QR-code bank-details-sub1">
                                <img src="../assets/shresht-systems-payment-QR-code.jpg"
                                    alt="qr-code" />
                            </div>
                            <div class="bank-details-sub2">
                                <p><strong>Account Holder Name: </strong>${bank.account_holder_name || company.company || company.company_name}</p>
                                <p><strong>Bank Name: </strong>${bank.bank_name || ''}</p>
                                <p><strong>Branch Name: </strong>${bank.branch || ''}</p>
                                <p><strong>Account No: </strong>${bank.account_number || ''}</p>
                                <p><strong>IFSC Code: </strong>${bank.ifsc_code || ''}</p>
                            </div>
                        </div>
                    </div>
                    <div class="totals-section">
                        ${totalsHTML}
                    </div>
                </div>
            </div>
            <div class="notes-section" contenteditable="true">
                <p><strong>Notes:</strong></p>
                <ul>
                   ${(quotation.notes || []).map(note => `<li>${note}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            <footer>
                <p>This is a computer-generated quotation.</p>
            </footer>
        </div>
        `;
            }).join('');

            document.getElementById("preview-content").innerHTML = `
    <div class="preview-container doc-quotation">
        ${headerHTML}

        <div class="title">Quotation-${quotationId}</div>
        <div class="quotation-letter-date">
            <p><strong>Date:</strong> ${formattedDate}</p>
        </div>
        <div class="quotation-letter-content" >
            <p><strong>To:</strong></p>
              ${buyerName}<br>
              ${buyerAddress}<br>
              ${buyerPhone}<br>
              ${buyerGSTIN ? `GSTIN: ${buyerGSTIN}<br>` : ''}
            <p contenteditable="true"><strong>Subject:</strong> ${(quotation.subject && quotation.subject.trim() !== '') ? quotation.subject : (projectName ? `Proposal for the Supply, Installation, and Commissioning of ${projectName}` : '')}</p>

            <p>Dear ${buyerName},</p>

            <p contenteditable="true">${(quotation.letter_1 && quotation.letter_1.trim() !== '') ? quotation.letter_1 : (projectName ? `We appreciate the opportunity to submit our proposal for the supply, installation, and commissioning of ${projectName}. At <strong>${company.company}</strong>, we are committed to delivering high-quality, industry-standard solutions tailored to meet your specific requirements.` : '')}</p>
            <p>Our proposal includes:</p>
            <ul contenteditable="true">
                ${(quotation.letter_2 || []).map(li => `<li>${li}</li>`).join('')}
            </ul>
            
            <p contenteditable="true">${quotation.letter_3 || ''}</p>
            
            <p>We look forward to your positive response and the opportunity to collaborate with you.</p>
          
            <p>Best regards,</p>
            <p><strong>${company.company}</strong><br>
               Ph: ${phoneStr}<br>
               Email: ${company.email}<br>
               Website: ${company.website}</p>
        </div>
        
        <footer>
            <p>This is a computer-generated quotation.</p>
        </footer>
    </div>

    ${itemsPageHTML}

    ${summaryPageHTML}

    <div class="preview-container doc-quotation">
        ${headerHTML}
        <div class="terms-section" contenteditable="true">
            ${normalizeTermsHTML(quotation.termsAndConditions || '')}
        </div>

        <div class="closing-section">
            <p>We look forward to your order confirmation. Please contact us for any further technical or commercial clarifications.</p>
            <p>Thanking you,</p>
            <p><strong>For ${company.company},</strong><br>Mob: +91 ${phoneStr}</p>
        </div>

        <footer>
            <p>This is a computer-generated quotation.</p>
        </footer>
    </div>
    `;
            // generateFilePages(files)

        } catch (error) {

        }
    }

    // Restore any previously captured user edits to the contenteditable elements
    // This runs AFTER the preview HTML has been regenerated
    if (existingContent.subject !== null) {
        const subjectEl = document.querySelector("#preview-content .quotation-letter-content p[contenteditable]");
        if (subjectEl) subjectEl.innerHTML = `<strong>Subject:</strong> ${existingContent.subject}`;
    }
    if (existingContent.letter_1 !== null) {
        const letter1El = document.querySelectorAll("#preview-content .quotation-letter-content p[contenteditable]")[1];
        if (letter1El) letter1El.innerText = existingContent.letter_1;
    }
    if (existingContent.letter_2 !== null) {
        const letter2El = document.querySelector("#preview-content .quotation-letter-content ul[contenteditable]");
        if (letter2El) letter2El.innerHTML = existingContent.letter_2.map(li => `<li>${li}</li>`).join('');
    }
    if (existingContent.letter_3 !== null) {
        const letter3El = document.querySelectorAll("#preview-content .quotation-letter-content p[contenteditable]")[2];
        if (letter3El) letter3El.innerText = existingContent.letter_3;
    }
    if (existingContent.notes !== null) {
        const notesEl = document.querySelector("#preview-content .notes-section ul");
        if (notesEl) notesEl.innerHTML = existingContent.notes.map(li => `<li>${li}</li>`).join('');
    }
    if (existingContent.termsAndConditions !== null) {
        const termsEl = document.querySelector("#preview-content .terms-section");
        if (termsEl) termsEl.innerHTML = existingContent.termsAndConditions;
    }
    if (existingContent.headline !== null) {
        const headlineEl = document.querySelector("#preview-content .headline-section p[contenteditable]");
        if (headlineEl) headlineEl.innerHTML = `<u>${existingContent.headline}</u>`;
    }
}



// Function to collect form data and send to server
async function sendToServer(data, shouldPrint) {
    const result = await sendDocumentToServer("/quotation/save-quotation", data);
    // Clear clone-related data from sessionStorage after successful save
    if (result) {
        sessionStorage.removeItem('duplicated_from');
        sessionStorage.removeItem('clone_content');
        sessionStorage.setItem('currentTab-status', 'update');
    }
    return result;
}

// Event listener for the "Save" button
document.getElementById("save-btn").addEventListener("click", async () => {
    const wasNewQuotation = sessionStorage.getItem('currentTab-status') !== 'update';
    const quotationData = collectFormData();
    const ok = await sendToServer(quotationData, false);
    if (ok) {
        window.electronAPI.showAlert1("Quotation saved successfully!");
        // Redirect to Home after saving a new quotation to prevent ID changes
        if (wasNewQuotation) {
            sessionStorage.removeItem('currentTab-status');
            window.location = '/quotation';
        }
    }
});

// Helper: convert various date values into YYYY-MM-DD for <input type="date">
function toInputDate(value) {
    // Accept Date object, ISO string, timestamp, or null/undefined.
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Function to collect form data
function collectFormData() {
    // Helper function to get specification from either table or cards
    const getSpecification = (desc) => {
        // First, try to find in specification table
        const specRow = Array.from(document.querySelectorAll("#items-specifications-table tbody tr"))
            .find(spec => spec.querySelector("td:nth-child(2)")?.textContent === desc);
        if (specRow) {
            const specValue = specRow.querySelector("td:nth-child(3) input")?.value;
            if (specValue) return specValue;
        }
        // Fallback: check specification cards
        const specCard = Array.from(document.querySelectorAll("#specifications-container .spec-card"))
            .find(card => card.querySelector(".spec-field.description input")?.value === desc);
        if (specCard) {
            return specCard.querySelector(".spec-field.specification input")?.value || "";
        }
        return "";
    };

    const itemRows = Array.from(document.querySelectorAll("#items-table tbody tr"));
    const chargeRows = Array.from(document.querySelectorAll("#non-items-table tbody tr"));
    const items = itemRows.map(row => {
        const quantity = Number(row.querySelector("td:nth-child(4) input").value) || 0;
        const unit_price = Number(row.querySelector("td:nth-child(5) input").value) || 0;
        const gst_rate = Number(row.querySelector("td:nth-child(6) input").value) || 0;
        const lineTotals = calculateLineTotals(quantity, unit_price, gst_rate);
        return {
            item_id: row.dataset.itemId || '',
            description: row.querySelector("td:nth-child(2) input").value,
            hsn_sac: row.querySelector("td:nth-child(3) input").value,
            HSN_SAC: row.querySelector("td:nth-child(3) input").value,
            quantity,
            unit_price,
            gst_rate,
            rate: gst_rate,
            taxable_value: lineTotals.taxable_value,
            total: lineTotals.total,
            specification: getSpecification(row.querySelector("td:nth-child(2) input").value)
        };
    });
    const otherCharges = chargeRows.map(row => {
        const price = Number(row.querySelector("td:nth-child(3) input").value) || 0;
        const gst_rate = Number(row.querySelector("td:nth-child(4) input").value) || 0;
        const lineTotals = calculateLineTotals(1, price, gst_rate);
        return {
            description: row.querySelector("td:nth-child(2) input").value,
            price,
            gst_rate,
            rate: gst_rate,
            taxable_value: lineTotals.taxable_value,
            total: lineTotals.total,
            specification: getSpecification(row.querySelector("td:nth-child(2) input").value)
        };
    });

    return {
        schema_version: 2,
        quotation_id: document.getElementById("id").value,
        quotation_no: document.getElementById("id").value,
        isUpdate: sessionStorage.getItem('currentTab-status') === 'update',
        isCustomId: false,
        projectName: document.getElementById("project-name").value,
        project_name: document.getElementById("project-name").value,
        quotationDate: document.getElementById("quotation-date").value,
        quotation_date: document.getElementById("quotation-date").value,
        valid_till: document.getElementById("valid-till")?.value || '',
        quotation_status: document.getElementById("quotation-status")?.value || 'Draft',
        buyerCustomerId: document.getElementById("buyer-customer-id")?.value || '',
        customer_id: document.getElementById("buyer-customer-id")?.value || '',
        buyerName: document.getElementById("buyer-name").value,
        buyerAddress: [
            (document.getElementById("buyer-address-line1") as HTMLInputElement)?.value || "",
            (document.getElementById("buyer-address-line2") as HTMLInputElement)?.value || "",
            [
                (document.getElementById("buyer-city") as HTMLInputElement)?.value || "",
                (document.getElementById("buyer-state") as HTMLInputElement)?.value || ""
            ].filter(Boolean).join(", "),
            [
                (document.getElementById("buyer-country") as HTMLInputElement)?.value || "",
                (document.getElementById("buyer-pincode") as HTMLInputElement)?.value || ""
            ].filter(Boolean).join(" - ")
        ].filter(Boolean).join("\n"),
        buyerPhone: document.getElementById("buyer-phone").value,
        buyerEmail: document.getElementById("buyer-email").value,
        buyerGSTIN: document.getElementById("buyer-gstin").value,
        customer_snapshot: {
            name: document.getElementById("buyer-name").value,
            phone: document.getElementById("buyer-phone").value,
            email: document.getElementById("buyer-email").value,
            gstin: document.getElementById("buyer-gstin").value,
            billing_address: getBillingAddressSnapshot()
        },
        discount: Number(document.getElementById("quotation-discount")?.value) || 0,
        items,
        other_charges: otherCharges,
        non_items: otherCharges,
        totalTax: totalTax,
        totalAmountNoTax: totalAmountNoTax,
        totalAmountTax: totalAmountTax,

        // Include duplicated_from for audit trail if this is a duplicated quotation
        duplicated_from: sessionStorage.getItem('duplicated_from') || null,

        subject: document.querySelector("#preview-content .quotation-letter-content p[contenteditable]")?.innerText.replace("Subject:", "").trim() || '',
        letter_1: document.querySelectorAll("#preview-content .quotation-letter-content p[contenteditable]")[1]?.innerText.trim() || '',
        letter_2: Array.from(document.querySelectorAll("#preview-content .quotation-letter-content ul[contenteditable] li") || []).map(li => li.innerText.trim()),
        letter_3: document.querySelectorAll("#preview-content .quotation-letter-content p[contenteditable]")[2]?.innerText.trim() || '',
        notes: Array.from(document.querySelector("#preview-content .notes-section ul")?.querySelectorAll("li") || []).map(li => li.innerText.trim()),
        termsAndConditions: document.querySelector("#preview-content .terms-section")?.innerHTML.trim() || '',
        headline: document.querySelector("#preview-content .headline-section p[contenteditable]")?.innerText.trim() || '',
        content: {
            subject: document.querySelector("#preview-content .quotation-letter-content p[contenteditable]")?.innerText.replace("Subject:", "").trim() || '',
            letter_1: document.querySelectorAll("#preview-content .quotation-letter-content p[contenteditable]")[1]?.innerText.trim() || '',
            letter_2: Array.from(document.querySelectorAll("#preview-content .quotation-letter-content ul[contenteditable] li") || []).map(li => li.innerText.trim()),
            letter_3: document.querySelectorAll("#preview-content .quotation-letter-content p[contenteditable]")[2]?.innerText.trim() || '',
            notes: Array.from(document.querySelector("#preview-content .notes-section ul")?.querySelectorAll("li") || []).map(li => li.innerText.trim()),
            terms_and_conditions: document.querySelector("#preview-content .terms-section")?.innerHTML.trim() || '',
            headline: document.querySelector("#preview-content .headline-section p[contenteditable]")?.innerText.trim() || ''
        }
    };
}



/**
 * Validates the current step before allowing navigation to the next.
 * This is called by globalScript.js via the hook.
 */
window.validateCurrentStep = async function () {
    let stepValid = true;
    let firstInvalidElement: HTMLElement | null = null;

    const setFieldValidation = (input: HTMLElement | null, isValid: boolean, message: string = "") => {
        if (!input) return;
        
        // Remove default purple ring and any existing validation classes
        input.classList.remove('border-gray-300', 'border-red-500', 'border-green-500', 'focus:ring-purple-500', 'focus:ring-red-500', 'focus:ring-green-500');
        
        let errorP = input.parentElement?.querySelector('.inline-error') as HTMLElement;
        
        if (isValid) {
            input.classList.add('border-green-500', 'focus:ring-green-500');
            if (errorP) errorP.remove();
        } else {
            input.classList.add('border-red-500', 'focus:ring-red-500');
            if (!errorP && input.parentElement) {
                errorP = document.createElement('p');
                errorP.className = 'text-red-500 text-xs mt-1 font-medium inline-error';
                input.parentElement.appendChild(errorP);
            }
            if (errorP) errorP.textContent = message;
            if (!firstInvalidElement) firstInvalidElement = input;
            stepValid = false;
        }
    };

    if (currentStep === 1) {
        const projectName = document.getElementById('project-name') as HTMLInputElement;
        const quoteDate = document.getElementById('quotation-date') as HTMLInputElement;

        if (!projectName.value.trim()) {
            setFieldValidation(projectName, false, "Please enter the Project Name.");
        } else {
            setFieldValidation(projectName, true);
        }

        if (!quoteDate.value) {
            setFieldValidation(quoteDate, false, "Please select a Quotation Date.");
        } else {
            setFieldValidation(quoteDate, true);
        }
    }

    if (currentStep === 2) {
        syncBuyerName();

        const firstNameInput = document.getElementById('buyer-first-name') as HTMLInputElement;
        const line1Input = document.getElementById('buyer-address-line1') as HTMLInputElement;
        const cityInput = document.getElementById('buyer-city') as HTMLInputElement;
        const stateInput = document.getElementById('buyer-state') as HTMLInputElement;
        const pincodeInput = document.getElementById('buyer-pincode') as HTMLInputElement;
        const buyerPhone = document.getElementById('buyer-phone') as HTMLInputElement;
        const buyerEmail = document.getElementById('buyer-email') as HTMLInputElement;
        const buyerGstin = document.getElementById('buyer-gstin') as HTMLInputElement;

        if (!firstNameInput.value.trim()) {
            setFieldValidation(firstNameInput, false, "Please enter the Buyer First Name.");
        } else {
            setFieldValidation(firstNameInput, true);
        }

        if (!line1Input.value.trim()) {
            setFieldValidation(line1Input, false, "Please enter Address Line 1.");
        } else {
            setFieldValidation(line1Input, true);
        }

        if (!cityInput.value.trim()) {
            setFieldValidation(cityInput, false, "Please enter the City.");
        } else {
            setFieldValidation(cityInput, true);
        }

        if (!stateInput.value.trim()) {
            setFieldValidation(stateInput, false, "Please enter the State.");
        } else {
            setFieldValidation(stateInput, true);
        }

        const pinValue = pincodeInput.value.trim();
        if (!pinValue) {
            setFieldValidation(pincodeInput, false, "Please enter the Pincode.");
        } else if (!/^\d{6}$/.test(pinValue)) {
            setFieldValidation(pincodeInput, false, "Please enter a valid 6-digit Pincode.");
        } else {
            setFieldValidation(pincodeInput, true);
        }

        const phoneClean = buyerPhone.value.replace(/\D/g, '');
        if (!buyerPhone.value.trim()) {
            setFieldValidation(buyerPhone, false, "Please enter the Phone Number.");
        } else if (!/^\d{10}$/.test(phoneClean)) {
            setFieldValidation(buyerPhone, false, "Please enter a valid 10-digit phone number.");
        } else {
            setFieldValidation(buyerPhone, true);
        }

        if (buyerEmail && buyerEmail.value.trim()) {
            const emailVal = buyerEmail.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailVal)) {
                setFieldValidation(buyerEmail, false, "Please enter a valid email address.");
            } else {
                setFieldValidation(buyerEmail, true);
            }
        } else if (buyerEmail) {
            setFieldValidation(buyerEmail, true); // Optional field
        }

        if (buyerGstin && buyerGstin.value.trim()) {
            if (buyerGstin.value.trim().length !== 15) {
                setFieldValidation(buyerGstin, false, "GSTIN must be exactly 15 characters.");
            } else {
                setFieldValidation(buyerGstin, true);
            }
        } else if (buyerGstin) {
            setFieldValidation(buyerGstin, true); // Optional field
        }
    }

    if (currentStep === 3) {
        const itemsContainer = document.getElementById('items-container');
        if (!itemsContainer) return false;
        
        const itemCards = itemsContainer.querySelectorAll('.item-card');

        if (itemCards.length === 0) {
            window.electronAPI.showAlert1("Please add at least one item to the quotation.");
            return false;
        }

        const hsnMap: Record<string, number> = {};

        itemCards.forEach((card, index) => {
            const desc = card.querySelector('.item_name') as HTMLInputElement;
            const hsn = card.querySelector('.item-field.hsn input') as HTMLInputElement;
            const qty = card.querySelector('.item-field.qty input') as HTMLInputElement;
            const price = card.querySelector('.item-field.price input') as HTMLInputElement;

            if (desc) {
                if (!desc.value.trim()) {
                    setFieldValidation(desc, false, `Required.`);
                } else {
                    setFieldValidation(desc, true);
                }
            }

            if (qty) {
                if (!qty.value || parseFloat(qty.value) <= 0) {
                    setFieldValidation(qty, false, `Required.`);
                } else {
                    setFieldValidation(qty, true);
                }
            }

            if (price) {
                if (!price.value || parseFloat(price.value) <= 0) {
                    setFieldValidation(price, false, `Required.`);
                } else {
                    setFieldValidation(price, true);
                }
            }

            const rate = card.querySelector('.item-field.rate input') as HTMLInputElement;
            if (rate) {
                if (!rate.value.trim()) {
                    setFieldValidation(rate, false, `Required.`);
                } else {
                    setFieldValidation(rate, true);
                }
            }

            if (hsn) {
                if (!hsn.value.trim()) {
                    setFieldValidation(hsn, false, `Required.`);
                } else {
                    const hsnVal = hsn.value.trim().toUpperCase();
                    const descVal = desc?.value.trim().toLowerCase() || '';
                    if (hsnMap[hsnVal] !== undefined) {
                        const firstIdx = hsnMap[hsnVal];
                        const firstCard = itemCards[firstIdx] as Element;
                        const firstDesc = (firstCard.querySelector('.item_name') as HTMLInputElement)?.value.trim().toLowerCase() || '';
                        if (firstDesc !== descVal) {
                            setFieldValidation(hsn, false, `HSN "${hsnVal}" is used by Item #${firstIdx + 1}.`);
                        } else {
                            setFieldValidation(hsn, true);
                        }
                    } else {
                        hsnMap[hsnVal] = index;
                        setFieldValidation(hsn, true);
                    }
                }
            }
        });
    }

    if (currentStep === 4) {
        const nonItemsContainer = document.getElementById('non-items-container');
        if (nonItemsContainer) {
            const nonItemCards = nonItemsContainer.querySelectorAll('.non-item-card');
            nonItemCards.forEach((card, index) => {
                const desc = card.querySelector('.non-item-field.description input') as HTMLInputElement;
                const price = card.querySelector('.non-item-field.price input') as HTMLInputElement;
                const rate = card.querySelector('.non-item-field.rate input') as HTMLInputElement;

                if (desc) {
                    if (!desc.value.trim()) {
                        setFieldValidation(desc, false, `Required.`);
                    } else {
                        setFieldValidation(desc, true);
                    }
                }

                if (price) {
                    if (!price.value || parseFloat(price.value) <= 0) {
                        setFieldValidation(price, false, `Required.`);
                    } else {
                        setFieldValidation(price, true);
                    }
                }

                if (rate) {
                    if (!rate.value.trim()) {
                        setFieldValidation(rate, false, `Required.`);
                    } else {
                        setFieldValidation(rate, true);
                    }
                }
            });
        }
    }

    if (!stepValid && firstInvalidElement) {
        firstInvalidElement.focus();
        return false;
    }

    return true;
};

// Add input sanitization and constraints for phone field
document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('buyer-phone');
    if (phoneInput) {
        // Ensure numeric keyboard on mobile and maxlength
        phoneInput.setAttribute('inputmode', 'numeric');
        phoneInput.setAttribute('maxlength', '10');
        phoneInput.setAttribute('pattern', '[0-9]{10}');

        phoneInput.addEventListener('input', () => {
            // Strip non-digits and limit to 10 characters
            const cleaned = phoneInput.value.replace(/\D/g, '').slice(0, 10);
            if (phoneInput.value !== cleaned) phoneInput.value = cleaned;
        });
    }

    const emailInput = document.getElementById('buyer-email');
    if (emailInput) {
        // Limit length and basic cleanup
        emailInput.setAttribute('maxlength', '254');
        emailInput.addEventListener('input', () => {
            // Trim spaces and remove internal whitespace
            const cleaned = emailInput.value.trim().replace(/\s+/g, '');
            if (emailInput.value !== cleaned) emailInput.value = cleaned;
        });
    }
});

// Expose the function to be called from other scripts
document.addEventListener('DOMContentLoaded', () => {
    // Decimals are now allowed for quantity inputs, so global blocking is removed
    document.body.addEventListener('change', function (e) {
        if (e.target && e.target.matches('.item_name')) {
            autofillStockItem(e.target);
        }
    });

    // --- Dynamic Validation Feedback ---
    document.body.addEventListener('input', function (e) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
            if (target.classList.contains('border-red-500')) {
                target.classList.remove('border-red-500', 'focus:ring-red-500');
                target.classList.add('border-gray-300', 'focus:ring-purple-500');
                const errorP = target.parentElement?.querySelector('.inline-error');
                if (errorP) errorP.remove();
            }
        }
    });
});
