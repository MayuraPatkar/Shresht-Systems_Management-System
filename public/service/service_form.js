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
        window.changeStep = function(step) {
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
    return true;
}

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
    const isEditing = serviceId && serviceId.startsWith('SRV-');
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
        // Determine if this is an update or create based on whether service_id exists and is valid
        const isUpdate = data.service_id && data.service_id.startsWith('SRV-');
        const endpoint = isUpdate ? "/service/update-service" : "/service/save-service";
        const method = isUpdate ? "PUT" : "POST";
        
        const response = await fetch(endpoint, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (response.ok) {
            return true;
        } else {
            window.electronAPI?.showAlert1("Failed to save service.");
            return false;
        }
    } catch (error) {
        console.error("Error:", error);
        window.electronAPI?.showAlert1("Failed to connect to server.");
        return false;
    }
}

// Save button handler
async function handleSave() {
    const serviceData = collectFormData();
    const ok = await sendToServer(serviceData);
    if (ok) {
        // Handle next service question
        const nextServiceAnswer = document.querySelector('input[name="question"]:checked')?.value || 'yes';
        await updateNextService(document.getElementById('invoice-id').value, nextServiceAnswer);
        
        window.electronAPI?.showAlert1("Service saved successfully.");
        setTimeout(() => {
            showHome();
        }, 1500);
    } else {
        window.electronAPI?.showAlert1("Failed to save service.");
    }
}

// Print button handler
async function handlePrint() {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const serviceData = collectFormData();
        await sendToServer(serviceData);
        const serviceRef = `${document.getElementById('invoice-id').value}-S${parseInt(document.getElementById('service-stage').value || 0) + 1}`;
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
        const serviceRef = `${document.getElementById('invoice-id').value}-S${parseInt(document.getElementById('service-stage').value || 0) + 1}`;
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
    
    // Populate items table
    const itemsTable = document.getElementById("items-table")?.getElementsByTagName("tbody")[0];
    if (itemsTable && service.items && service.items.length > 0) {
        // Clear existing rows
        itemsTable.innerHTML = '';
        
        service.items.forEach(item => {
            const row = itemsTable.insertRow();
            row.innerHTML = `
                <td class="border border-gray-300 px-4 py-2">
                    <button type="button" class="delete-row-btn text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
                <td class="border border-gray-300 px-4 py-2">
                    <input type="text" placeholder="Item Description" value="${item.description || ''}" class="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                </td>
                <td class="border border-gray-300 px-4 py-2">
                    <input type="text" placeholder="HSN/SAC Code" value="${item.HSN_SAC || ''}" class="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                </td>
                <td class="border border-gray-300 px-4 py-2">
                    <input type="number" placeholder="Quantity" value="${item.quantity || 0}" class="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                </td>
                <td class="border border-gray-300 px-4 py-2">
                    <input type="number" placeholder="Unit Price" value="${item.unit_price || 0}" step="0.01" class="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                </td>
                <td class="border border-gray-300 px-4 py-2">
                    <input type="number" placeholder="Tax Rate %" value="${item.rate || 0}" step="0.01" class="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                </td>
            `;
            
            // Add delete functionality
            row.querySelector('.delete-row-btn').addEventListener('click', function() {
                this.closest('tr').remove();
            });
        });
    }
    
    // Populate non-items table
    const nonItemsTable = document.querySelector('#non-items-table tbody');
    if (nonItemsTable && service.non_items && service.non_items.length > 0) {
        // Clear existing rows
        nonItemsTable.innerHTML = '';
        
        service.non_items.forEach(item => {
            const row = nonItemsTable.insertRow();
            row.innerHTML = `
                <td class="border border-gray-300 px-4 py-2">
                    <button type="button" class="delete-non-item-row-btn text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
                <td class="border border-gray-300 px-4 py-2">
                    <input type="text" placeholder="Item Description" value="${item.description || ''}" class="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                </td>
                <td class="border border-gray-300 px-4 py-2">
                    <input type="number" placeholder="Price" value="${item.price || 0}" step="0.01" class="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                </td>
                <td class="border border-gray-300 px-4 py-2">
                    <input type="number" placeholder="Rate" value="${item.rate || 0}" step="0.01" class="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                </td>
            `;
            
            // Add delete functionality
            row.querySelector('.delete-non-item-row-btn').addEventListener('click', function() {
                this.closest('tr').remove();
            });
        });
    }
}

// Make populateFormWithServiceData globally available
window.populateFormWithServiceData = populateFormWithServiceData;
