// Service Form - Multi-step form handling
// Note: currentStep is declared in globalScript.js
const totalSteps = 4;

document.addEventListener("DOMContentLoaded", () => {
    // NOTE: Navigation buttons (prev-btn, next-btn) are already handled by globalScript.js
    // NOTE: Add item buttons (add-item-btn, add-non-item-btn) are also handled by globalScript.js
    // We don't add duplicate listeners here to avoid conflicts

    // Override the global changeStep to add service-specific logic
    if (typeof window.originalChangeStep === 'undefined' && typeof changeStep === 'function') {
        window.originalChangeStep = changeStep;
        window.changeStep = function (step) {
            // Validate before moving forward
            if (step > currentStep) {
                if (!validateStep(currentStep)) {
                    return;
                }
            }

            // Call original changeStep
            window.originalChangeStep(step);

            // Service-specific: Generate preview on step 4
            if (step === 4 && typeof generatePreview === 'function') {
                generatePreview();
            }
        };
    }

    // Set current date as default
    const dateInput = document.getElementById('date');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Save, Print, and PDF buttons
    document.getElementById("save-btn")?.addEventListener("click", handleSave);
    document.getElementById("print-btn")?.addEventListener("click", handlePrint);
    document.getElementById("save-pdf-btn")?.addEventListener("click", handleSavePDF);
});

// Get ID for preview generation
async function getId() {
    try {
        const response = await fetch("/service/generate-id");
        if (!response.ok) throw new Error("Failed to fetch service id");

        const data = await response.json();
        document.getElementById('service-id').value = data.service_id;
    } catch (error) {
        console.error("Error fetching service id:", error);
        window.electronAPI?.showAlert1("Failed to fetch service id. Please try again later.");
    }
}

// Note: Navigation functions (nextStep, prevStep, updateStepIndicator) are handled by globalScript.js
// We override changeStep above to add validation and preview generation

// Validate step
function validateStep(step) {
    if (step === 1) {
        const invoiceId = document.getElementById('invoice-id').value;
        const date = document.getElementById('date').value;

        if (!invoiceId) {
            window.electronAPI?.showAlert1("Please open an invoice first to create a service entry");
            return false;
        }

        if (!date) {
            window.electronAPI?.showAlert1("Please select a service date");
            return false;
        }
    }
    if (step === 2) {
        const itemsTable = document.querySelector('#items-table tbody');
        // Validate existing items if any are present
        if (itemsTable && itemsTable.rows.length > 0) {
            for (const [index, row] of Array.from(itemsTable.rows).entries()) {
                const desc = row.querySelector('td:nth-child(2) input');
                const qty = row.querySelector('td:nth-child(4) input');
                const price = row.querySelector('td:nth-child(5) input');
                if (!desc || !desc.value.trim()) {
                    window.electronAPI?.showAlert1(`Item #${index + 1}: Description is required.`);
                    desc?.focus();
                    return false;
                }
                if (!qty || Number(qty.value) <= 0) {
                    window.electronAPI?.showAlert1(`Item #${index + 1}: Quantity must be greater than 0.`);
                    qty?.focus();
                    return false;
                }
                if (!price || Number(price.value) < 0) {
                    window.electronAPI?.showAlert1(`Item #${index + 1}: Unit Price must be provided.`);
                    price?.focus();
                    return false;
                }
            }
        }
    }
    return true;
}

// Expose a function used by globalScript.js for validation hook
window.validateCurrentStep = async function () {
    return validateStep(currentStep);
};

// Reset form
function resetForm() {
    document.getElementById('service-form').reset();
    document.getElementById('service-id').value = '';
    document.getElementById('invoice-id').value = '';
    document.getElementById('project-name').value = '';
    document.getElementById('name').value = '';
    document.getElementById('address').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('email').value = '';
    document.getElementById('service-stage').value = '0';
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    document.getElementById('question-yes').checked = true;

    // Reset is-editing flag
    const isEditingField = document.getElementById('is-editing');
    if (isEditingField) isEditingField.value = 'false';

    // Clear items and non-items containers AND tables
    const itemsContainer = document.getElementById("items-container");
    const nonItemsContainer = document.getElementById("non-items-container");
    const itemsTable = document.getElementById("items-table")?.getElementsByTagName("tbody")[0];
    const nonItemsTable = document.getElementById("non-items-table")?.getElementsByTagName("tbody")[0];

    if (itemsContainer) itemsContainer.innerHTML = '';
    if (nonItemsContainer) nonItemsContainer.innerHTML = '';
    if (itemsTable) itemsTable.innerHTML = '';
    if (nonItemsTable) nonItemsTable.innerHTML = '';

    // Clear preview
    const previewContent = document.getElementById('preview-content');
    if (previewContent) previewContent.innerHTML = '';

    // Reset all steps
    for (let i = 1; i <= totalSteps; i++) {
        const stepEl = document.getElementById(`step-${i}`);
        if (stepEl) stepEl.classList.remove('active');
    }
    const step1 = document.getElementById('step-1');
    if (step1) step1.classList.add('active');

    // Reset currentStep and update UI
    currentStep = 1;

    // Update navigation buttons and indicator (use global function from globalScript.js)
    if (typeof updateNavigation === 'function') {
        updateNavigation();
    }
    const stepIndicator = document.getElementById('step-indicator');
    if (stepIndicator) {
        stepIndicator.textContent = `Step 1 of ${totalSteps}`;
    }
}

// Collect form data
function collectFormData() {
    const itemsTable = document.getElementById("items-table")?.getElementsByTagName("tbody")[0];
    const nonItemsTable = document.querySelector('#non-items-table tbody');

    // Collect items
    const items = [];
    if (itemsTable && itemsTable.rows) {
        for (const row of itemsTable.rows) {
            const description = row.cells[1]?.querySelector("input")?.value;
            const hsnSac = row.cells[2]?.querySelector("input")?.value;
            const qty = parseFloat(row.cells[3]?.querySelector("input")?.value || "0");
            const unitPrice = parseFloat(row.cells[4]?.querySelector("input")?.value || "0");
            const rate = parseFloat(row.cells[5]?.querySelector("input")?.value || "0");

            if (description) {
                items.push({
                    description,
                    HSN_SAC: hsnSac,
                    quantity: qty,
                    unit_price: unitPrice,
                    rate
                });
            }
        }
    }

    // Collect non-items
    const non_items = [];
    if (nonItemsTable && nonItemsTable.rows) {
        for (const row of nonItemsTable.rows) {
            const description = row.querySelector('input[placeholder="Item Description"]')?.value;
            const price = parseFloat(row.querySelector('input[placeholder="Price"]')?.value || "0");
            const rate = parseFloat(row.querySelector('input[placeholder="Rate"]')?.value || "0");

            if (description) {
                non_items.push({
                    description,
                    price,
                    rate
                });
            }
        }
    }

    // Calculate totals
    let total_amount_no_tax = 0;
    let total_tax = 0;

    // Calculate items totals
    for (const item of items) {
        const taxableValue = item.quantity * item.unit_price;
        total_amount_no_tax += taxableValue;

        if (item.rate > 0) {
            const taxValue = (taxableValue * item.rate) / 100;
            total_tax += taxValue;
        }
    }

    // Calculate non-items totals
    for (const item of non_items) {
        total_amount_no_tax += item.price;

        if (item.rate > 0) {
            const taxValue = (item.price * item.rate) / 100;
            total_tax += taxValue;
        }
    }

    const total_amount_with_tax = total_amount_no_tax + total_tax;
    const currentStage = parseInt(document.getElementById("service-stage")?.value || 0);
    const serviceId = document.getElementById("service-id").value;

    // If editing (service_id starts with SRV-), don't increment stage
    // Use explicit hidden field is-editing to determine editing state
    const isEditingFlag = document.getElementById('is-editing')?.value === 'true';
    const isEditing = isEditingFlag;
    const finalStage = isEditing ? currentStage : (currentStage + 1);

    return {
        service_id: serviceId,
        invoice_id: document.getElementById("invoice-id").value,
        name: document.getElementById("name").value,
        address: document.getElementById("address").value,
        phone: document.getElementById("phone").value,
        email: document.getElementById("email").value || '',
        project_name: document.getElementById("project-name").value,
        date: document.getElementById("date")?.value || new Date().toISOString().slice(0, 10),
        service_stage: finalStage,
        items,
        non_items,
        total_amount_no_tax,
        total_tax,
        total_amount_with_tax,
        fee_amount: total_amount_with_tax,
        service_date: document.getElementById("date")?.value || new Date().toISOString().slice(0, 10),
        notes: `Service stage ${finalStage} completed on ${new Date(document.getElementById("date")?.value || new Date()).toLocaleDateString('en-IN')}`
    };
}

// Update next service status
async function updateNextService(invoiceId, nextService) {
    try {
        const response = await fetch("/service/update-nextService", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invoice_id: invoiceId, next_service: nextService }),
        });

        if (!response.ok) {
            console.error("Failed to update next service status");
        }
    } catch (error) {
        console.error("Error updating next service:", error);
    }
}

// Send to server
async function sendToServer(data) {
    try {
        // Check hidden is-editing flag to determine if this is an update or create
        const isEditingFlag = document.getElementById('is-editing')?.value === 'true';
        const endpoint = isEditingFlag ? "/service/update-service" : "/service/save-service";
        const method = isEditingFlag ? "PUT" : "POST";

        const response = await fetch(endpoint, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (response.ok) {
            return { success: true, message: result.message };
        } else {
            return { success: false, message: result.error || "Failed to save service." };
        }
    } catch (error) {
        console.error("Error:", error);
        return { success: false, message: "Failed to connect to server." };
    }
}

// Save button handler
async function handleSave() {
    const serviceData = collectFormData();
    const result = await sendToServer(serviceData);
    if (result.success) {
        // Handle next service question
        const nextServiceAnswer = document.querySelector('input[name="question"]:checked')?.value || 'yes';
        await updateNextService(document.getElementById('invoice-id').value, nextServiceAnswer);

        window.electronAPI?.showAlert1("Service saved successfully.");
        setTimeout(() => {
            showHome();
        }, 1500);
    } else {
        window.electronAPI?.showAlert1(result.message || "Failed to save service.");
    }
}

// Print button handler
async function handlePrint() {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const serviceData = collectFormData();
        await sendToServer(serviceData);
        const invoiceId = document.getElementById('invoice-id').value;
        const serviceRef = `${invoiceId}-S${serviceData.service_stage || 0}`;
        const name = `Service-${serviceRef}`;
        window.electronAPI.handlePrintEvent(previewContent, "print", name);
    } else {
        window.electronAPI?.showAlert1("Print functionality is not available.");
    }
}

// Save PDF button handler
async function handleSavePDF() {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const serviceData = collectFormData();
        await sendToServer(serviceData);
        const invoiceId = document.getElementById('invoice-id').value;
        const serviceRef = `${invoiceId}-S${serviceData.service_stage || 0}`;
        const name = `Service-${serviceRef}`;
        window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
    } else {
        window.electronAPI?.showAlert1("Print functionality is not available.");
    }
}

// Populate form with existing service data for editing
function populateFormWithServiceData(service) {
    // Set hidden fields
    document.getElementById('service-id').value = service.service_id || '';
    document.getElementById('service-stage').value = service.service_stage || 0;

    // Set is-editing flag to true
    const isEditingField = document.getElementById('is-editing');
    if (isEditingField) isEditingField.value = 'true';

    // Set basic fields
    document.getElementById('invoice-id').value = service.invoice_id || '';
    document.getElementById('date').value = service.service_date ? service.service_date.split('T')[0] : '';

    // If invoice details are available, populate customer info
    if (service.invoice_details) {
        const invoice = service.invoice_details;
        document.getElementById('project-name').value = invoice.project_name || '';
        document.getElementById('name').value = invoice.customer_name || '';
        document.getElementById('address').value = invoice.customer_address || '';
        document.getElementById('phone').value = invoice.customer_phone || '';
        document.getElementById('email').value = invoice.customer_email || '';
    }

    // Populate items using addItem() function from globalScript.js
    if (service.items && service.items.length > 0) {
        service.items.forEach((item, index) => {
            // Add item row using global function
            if (typeof addItem === 'function') {
                addItem();

                // Get the last added card and table row
                const itemsContainer = document.getElementById("items-container");
                const itemsTable = document.getElementById("items-table")?.getElementsByTagName("tbody")[0];

                if (itemsContainer && itemsTable) {
                    const cards = itemsContainer.querySelectorAll('.item-card');
                    const rows = itemsTable.querySelectorAll('tr');
                    const lastCard = cards[cards.length - 1];
                    const lastRow = rows[rows.length - 1];

                    if (lastCard && lastRow) {
                        // Populate card inputs
                        const cardInputs = lastCard.querySelectorAll('input');
                        cardInputs[0].value = item.description || ''; // description
                        cardInputs[1].value = item.HSN_SAC || '';      // HSN/SAC
                        cardInputs[2].value = item.quantity || 0;      // quantity
                        cardInputs[3].value = item.unit_price || 0;    // unit_price
                        cardInputs[4].value = item.rate || 0;          // rate

                        // Populate table inputs (they should sync automatically)
                        const tableInputs = lastRow.querySelectorAll('input');
                        tableInputs[0].value = item.description || '';
                        tableInputs[1].value = item.HSN_SAC || '';
                        tableInputs[2].value = item.quantity || 0;
                        tableInputs[3].value = item.unit_price || 0;
                        tableInputs[4].value = item.rate || 0;
                    }
                }
            }
        });
    }

    // Populate non-items using addNonItem() function from globalScript.js
    if (service.non_items && service.non_items.length > 0) {
        service.non_items.forEach((item, index) => {
            // Add non-item row using global function
            if (typeof addNonItem === 'function') {
                addNonItem();

                // Get the last added card and table row
                const nonItemsContainer = document.getElementById("non-items-container");
                const nonItemsTable = document.querySelector('#non-items-table tbody');

                if (nonItemsContainer && nonItemsTable) {
                    const cards = nonItemsContainer.querySelectorAll('.non-item-card');
                    const rows = nonItemsTable.querySelectorAll('tr');
                    const lastCard = cards[cards.length - 1];
                    const lastRow = rows[rows.length - 1];

                    if (lastCard && lastRow) {
                        // Populate card inputs
                        const cardInputs = lastCard.querySelectorAll('input');
                        cardInputs[0].value = item.description || ''; // description
                        cardInputs[1].value = item.price || 0;        // price
                        cardInputs[2].value = item.rate || 0;         // rate

                        // Populate table inputs
                        const tableInputs = lastRow.querySelectorAll('input');
                        tableInputs[0].value = item.description || '';
                        tableInputs[1].value = item.price || 0;
                        tableInputs[2].value = item.rate || 0;
                    }
                }
            }
        });
    }
}

// Make populateFormWithServiceData globally available
window.populateFormWithServiceData = populateFormWithServiceData;
