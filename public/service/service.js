const serviceRecordsDiv = document.querySelector(".records");
const totalSteps = 2;
let currentStep = 1;

document.addEventListener("DOMContentLoaded", () => {
    loadService();

    if (serviceRecordsDiv) {
        serviceRecordsDiv.addEventListener("click", handleServiceListClick);
    }

    // Search functionality
    document.getElementById('search-input')?.addEventListener('keydown', (event) => {
        if (event.key === "Enter") {
            handleSearch();
        }
    });

    // Navigation buttons
    document.getElementById('home-btn')?.addEventListener('click', showHome);
    document.getElementById('prev-btn')?.addEventListener('click', prevStep);
    document.getElementById('next-btn')?.addEventListener('click', nextStep);

    // Shortcuts modal
    document.getElementById('shortcuts-btn')?.addEventListener('click', () => {
        document.getElementById('shortcuts-modal').classList.remove('hidden');
    });
    document.getElementById('close-shortcuts')?.addEventListener('click', () => {
        document.getElementById('shortcuts-modal').classList.add('hidden');
    });

    // Click outside modal to close
    document.getElementById('shortcuts-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'shortcuts-modal') {
            document.getElementById('shortcuts-modal').classList.add('hidden');
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Set current date as default
    const dateInput = document.getElementById('date');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
});

// Get ID for preview generation
function getId() {
    generatePreview();
}

function getId(){
    generatePreview()
}

// Create service card
function createServiceDiv(service) {
    const div = document.createElement("div");
    div.className = "service-card bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all";
    
    const serviceDate = service.service_date ? new Date(service.service_date).toLocaleDateString() : 'N/A';
    const feeAmount = service.fee_amount ? `₹${parseFloat(service.fee_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A';
    
    div.innerHTML = `
        <div class="flex items-start justify-between">
            <div class="flex items-center gap-4 flex-1">
                <div class="bg-blue-100 rounded-full p-3">
                    <i class="fas fa-wrench text-blue-600 text-xl"></i>
                </div>
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <h3 class="text-lg font-semibold text-gray-800">${service.project_name || 'Unnamed Project'}</h3>
                        <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">#${service.invoice_id}${service.service_stage + 1}</span>
                    </div>
                    <div class="space-y-1">
                        <p class="text-sm text-gray-600">
                            <i class="fas fa-user text-gray-400 mr-1"></i>
                            ${service.customer_name || 'N/A'}
                        </p>
                        <p class="text-sm text-gray-600">
                            <i class="fas fa-map-marker-alt text-gray-400 mr-1"></i>
                            ${service.customer_address || 'N/A'}
                        </p>
                        <div class="flex gap-4 mt-2">
                            <p class="text-sm text-gray-600">
                                <i class="fas fa-calendar text-gray-400 mr-1"></i>
                                ${serviceDate}
                            </p>
                            <p class="text-sm text-gray-600">
                                <i class="fas fa-rupee-sign text-gray-400 mr-1"></i>
                                ${feeAmount}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <button class="open-service bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors" data-id="${service.invoice_id}">
                <i class="fas fa-folder-open"></i>
                Open
            </button>
        </div>
    `;
    return div;
}

// Load service data
async function loadService() {
    try {
        const response = await fetch("/service/get-service");
        if (!response.ok) throw new Error("Failed to fetch services.");

        const services = await response.json();

        const serviceListDiv = document.querySelector(".records");
        if (!serviceListDiv) {
            console.error("Service list container not found.");
            return;
        }

        serviceListDiv.innerHTML = "";

        if (!services.projects || services.projects.length === 0) {
            serviceListDiv.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-12">
                    <i class="fas fa-wrench text-gray-300 text-6xl mb-4"></i>
                    <h2 class="text-xl font-semibold text-gray-600 mb-2">No services available</h2>
                    <p class="text-gray-500">Services will appear here once created</p>
                </div>
            `;
            return;
        }

        services.projects.forEach(service => serviceListDiv.appendChild(createServiceDiv(service)));
    } catch (error) {
        console.error("Error loading services:", error);
        window.electronAPI?.showAlert1("Failed to connect to server.");
    }
}

// Search functionality
async function handleSearch() {
    const queryInput = document.getElementById("search-input");
    const serviceListDiv = document.querySelector(".records");

    if (!queryInput || !serviceListDiv) {
        console.error("Search input or service list container not found.");
        return;
    }

    const query = queryInput.value.trim();
    if (!query) {
        window.electronAPI?.showAlert1("Please enter a search query");
        return;
    }

    try {
        const response = await fetch(`/service/search/${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();
        const services = data.service || [];

        serviceListDiv.innerHTML = "";

        if (services.length === 0) {
            serviceListDiv.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-12">
                    <i class="fas fa-search text-gray-300 text-6xl mb-4"></i>
                    <h2 class="text-xl font-semibold text-gray-600 mb-2">No results found</h2>
                    <p class="text-gray-500">No services found for "${query}"</p>
                </div>
            `;
            return;
        }

        services.forEach(service => serviceListDiv.appendChild(createServiceDiv(service)));
    } catch (error) {
        console.error("Error fetching service:", error);
        window.electronAPI?.showAlert1("Failed to fetch service. Please try again later.");
    }
}

// Handle click events on the service list
async function handleServiceListClick(event) {
    const target = event.target;
    const serviceId = target.getAttribute("data-id");

    if (!serviceId) return;

    if (target.classList.contains("open-service")) {
        await openService(serviceId);
    }
}

// Open a service form
async function openService(serviceId) {
    try {
        const response = await fetch(`/invoice/${serviceId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch service");
        }

        const data = await response.json();
        const service = data.invoice;

        // Fill form fields (IDs match HTML)
        document.getElementById('service-id').value = service.invoice_id || '';
        document.getElementById('invoice-id').value = service.invoice_id || '';
        document.getElementById('project-name').value = service.project_name || '';
        document.getElementById('name').value = service.customer_name || '';
        document.getElementById('address').value = service.customer_address || '';
        document.getElementById('phone').value = service.customer_phone || '';
        document.getElementById('service-stage').value = service.service_stage || '';

        showNew();
        updateStepIndicator();

    } catch (error) {
        console.error("Error fetching service:", error);
        window.electronAPI?.showAlert1("Failed to fetch service. Please try again later.");
    }
}

// Show/Hide sections
function showHome() {
    document.getElementById('home').style.display = 'block';
    document.getElementById('new').style.display = 'none';
    currentStep = 1;
    resetForm();
    loadService();
}

function showNew() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('new').style.display = 'block';
    currentStep = 1;
    updateStepIndicator();
}

// Step navigation
function nextStep() {
    if (currentStep < totalSteps) {
        // Validate current step before proceeding
        if (!validateStep(currentStep)) {
            return;
        }

        document.getElementById(`step-${currentStep}`).classList.remove('active');
        currentStep++;
        document.getElementById(`step-${currentStep}`).classList.add('active');
        updateStepIndicator();
        
        // Generate preview on step 2
        if (currentStep === 2) {
            generatePreview();
        }
    }
}

function prevStep() {
    if (currentStep > 1) {
        document.getElementById(`step-${currentStep}`).classList.remove('active');
        currentStep--;
        document.getElementById(`step-${currentStep}`).classList.add('active');
        updateStepIndicator();
    }
}

function updateStepIndicator() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const indicator = document.getElementById('step-indicator');

    indicator.textContent = `Step ${currentStep} of ${totalSteps}`;
    
    prevBtn.disabled = currentStep === 1;
    nextBtn.style.display = currentStep === totalSteps ? 'none' : 'flex';
}

// Validate step
function validateStep(step) {
    if (step === 1) {
        const payment = document.getElementById('payment').value;
        const date = document.getElementById('date').value;

        if (!payment || parseFloat(payment) <= 0) {
            window.electronAPI?.showAlert1("Please enter a valid payment amount");
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
    document.getElementById('payment').value = '';
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    document.getElementById('question-yes').checked = true;
    
    // Reset all steps
    for (let i = 1; i <= totalSteps; i++) {
        document.getElementById(`step-${i}`).classList.remove('active');
    }
    document.getElementById('step-1').classList.add('active');
}

// Keyboard shortcuts
function handleKeyboardShortcuts(event) {
    // Don't trigger if user is typing in an input
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    // Ctrl/Cmd + H - Go Home
    if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
        event.preventDefault();
        showHome();
    }

    // Ctrl/Cmd + S - Save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (document.getElementById('new').style.display === 'block' && currentStep === 2) {
            document.getElementById('save-btn').click();
        }
    }

    // Ctrl/Cmd + Shift + P - Print
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        if (document.getElementById('new').style.display === 'block' && currentStep === 2) {
            document.getElementById('print-btn').click();
        }
    }

    // Ctrl/Cmd + F - Focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        document.getElementById('search-input')?.focus();
    }

    // Arrow keys for navigation (only in form)
    if (document.getElementById('new').style.display === 'block') {
        if (event.key === 'ArrowRight' || event.key === 'Enter') {
            event.preventDefault();
            nextStep();
        } else if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
            event.preventDefault();
            prevStep();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            showHome();
        }
    }

    // ? - Show shortcuts
    if (event.key === '?') {
        event.preventDefault();
        document.getElementById('shortcuts-modal').classList.remove('hidden');
    }
}

// Generate the preview
function generatePreview() {
    const serviceId = document.getElementById('service-id').value;
    const name = document.getElementById("name").value || "";
    const address = document.getElementById("address").value || "";
    const phone = document.getElementById("phone").value || "";
    const payment = document.getElementById("payment").value || "";

    document.getElementById("preview-content").innerHTML = `
    <div class="preview-container">
        <div class="header">
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

        <div class="title">Service #${serviceId}</div>
        <div class="first-section">
            <div class="buyer-details">
                <p><strong>To:</strong>
                ${name}<br>
                ${address}</br>
                ${phone}
                </p>
            </div>
            <div class="info-section">
                <p><strong>Project Name:</strong> ${document.getElementById("project-name").value}</p>
                <p><strong>Date:</strong> ${document.getElementById("date").value || new Date().toLocaleDateString()}</p>
            </div>
        </div>
        <div class="third-section">
        <div class="totals-section" style="text-align: right;">
            Total: ${payment}
        </div>
        </div>
        <p><strong>Total Amount in Words:</strong> <span id="totalInWords">${numberToWords(payment)} Only</span></p>
        <div class="signature">
            <p>For SHRESHT SYSTEMS</p>
            <div class="signature-space"></div>
            <p><strong>Authorized Signatory</strong></p>
        </div>
        <footer>
            <p>This is a computer-generated purchase order</p>
        </footer>
    </div>`;
}

// Print and Save as PDF
document.getElementById("print-btn").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const serviceData = collectFormData();
        sendToServer(serviceData, true);
        window.electronAPI.handlePrintEvent(previewContent, "print");
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

document.getElementById("save-pdf-btn").addEventListener("click", () => {
    const previewContent = document.getElementById("preview-content").innerHTML;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        const serviceData = collectFormData();
        sendToServer(serviceData, true);
        let name = `Service`;
        window.electronAPI.handlePrintEvent(previewContent, "savePDF", name);
    } else {
        window.electronAPI.showAlert1("Print functionality is not available.");
    }
});

// Save button
document.getElementById("save-btn").addEventListener("click", async () => {
    const serviceData = collectFormData();
    const ok = await sendToServer(serviceData);
    if (ok) {
        window.electronAPI?.showAlert1("Service saved successfully.");
        setTimeout(() => {
            showHome();
        }, 1500);
    } else {
        window.electronAPI?.showAlert1("Failed to save service.");
    }
});

// Send to server
async function sendToServer(data) {
    try {
        const response = await fetch("/service/save-service", {
            method: "POST",
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
        window.electronAPI.showAlert1("Failed to connect to server.");
        return false;
    }
}

// Collect form data
function collectFormData() {
    return {
        service_id: document.getElementById("service-id").value,
        invoice_id: document.getElementById("invoice-id").value,
        fee_amount: document.getElementById("payment")?.value || null,
        service_date: document.getElementById("date")?.value || new Date().toISOString().slice(0, 10),
        service_stage: Number(document.getElementById("service-stage")?.value) || 1
    };
}