// Service Home - List and Search functionality
const serviceRecordsDiv = document.querySelector(".records");

// Note: currentStep and totalSteps are declared in globalScript.js and used here

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

    // Home button
    document.getElementById('home-btn')?.addEventListener('click', showHome);

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
});

// Create service card
function createServiceDiv(service) {
    const div = document.createElement("div");
    div.className = "group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-400 overflow-hidden fade-in";
    
    // Calculate service due date by adding service_month to invoice_date or createdAt
    let serviceDate = 'N/A';
    if (service.service_month && (service.invoice_date || service.createdAt)) {
        const baseDate = new Date(service.invoice_date || service.createdAt);
        const serviceDueDate = new Date(baseDate);
        serviceDueDate.setMonth(serviceDueDate.getMonth() + service.service_month);
        serviceDate = serviceDueDate.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    const feeAmount = service.fee_amount ? `₹${parseFloat(service.fee_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A';
    
    div.innerHTML = `
        <!-- Left Border Accent -->
        <div class="flex">
            <div class="w-1.5 bg-gradient-to-b from-blue-500 to-cyan-600"></div>
            
            <div class="flex-1 p-6">
                <!-- Main Content Row -->
                <div class="flex items-center justify-between gap-6">
                    
                    <!-- Left Section: Icon + Project Info -->
                    <div class="flex items-center gap-4 flex-1 min-w-0">
                        <div class="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md flex-shrink-0">
                            <i class="fas fa-wrench text-2xl text-white"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <h3 class="text-lg font-bold text-gray-900 truncate">${service.project_name || 'Unnamed Project'}</h3>
                                <span class="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-700">
                                    #${service.invoice_id}-S${service.service_stage + 1}
                                </span>
                            </div>
                            <p class="text-sm text-gray-600">${service.customer_name || 'N/A'}</p>
                        </div>
                    </div>

                    <!-- Middle Section: Address -->
                    <div class="flex items-center gap-3 flex-1 min-w-0 px-6 border-l border-r border-gray-200">
                        <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-map-marker-alt text-blue-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Address</p>
                            <p class="text-sm font-semibold text-gray-900 truncate">${service.customer_address || 'N/A'}</p>
                        </div>
                    </div>

                    <!-- Date Section -->
                    <div class="flex items-center gap-3 px-6 border-r border-gray-200">
                        <div class="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-calendar-check text-orange-600"></i>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Service Due</p>
                            <p class="text-sm font-bold text-gray-900">${serviceDate}</p>
                        </div>
                    </div>

                    <!-- Actions Section -->
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <button class="open-service px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400 font-medium" data-id="${service.invoice_id}" title="Open Service">
                            <i class="fas fa-folder-open mr-2"></i>Open
                        </button>
                    </div>
                </div>
            </div>
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
                <div class="bg-white rounded-lg shadow-md p-12 text-center border-2 border-dashed border-gray-300">
                    <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                        <i class="fas fa-wrench text-4xl text-blue-500"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">No Services Found</h2>
                    <p class="text-gray-600">Services will appear here once created</p>
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
                <div class="bg-white rounded-lg shadow-md p-12 text-center border-2 border-dashed border-gray-300">
                    <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                        <i class="fas fa-search text-4xl text-yellow-500"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">No Results Found</h2>
                    <p class="text-gray-600">No services found for "${query}"</p>
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
        document.getElementById('invoice-id').value = service.invoice_id || '';
        document.getElementById('project-name').value = service.project_name || '';
        document.getElementById('name').value = service.customer_name || '';
        document.getElementById('address').value = service.customer_address || '';
        document.getElementById('phone').value = service.customer_phone || '';
        document.getElementById('email').value = service.customer_email || '';
        document.getElementById('service-stage').value = service.service_stage || 0;

        // Generate service ID for this new service entry
        await getId();

        showNew();
        
        // Reset to step 1 and update UI (use global changeStep from globalScript.js)
        if (typeof changeStep === 'function') {
            changeStep(1);
        }

    } catch (error) {
        console.error("Error fetching service:", error);
        window.electronAPI?.showAlert1("Failed to fetch service. Please try again later.");
    }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(event) {
    // Don't trigger if user is typing in an input or if modal is open
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    // Close modal with Escape
    const modal = document.getElementById('shortcuts-modal');
    if (!modal.classList.contains('hidden') && event.key === 'Escape') {
        modal.classList.add('hidden');
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
        if (document.getElementById('new').style.display === 'block' && currentStep === 4) {
            document.getElementById('save-btn').click();
        }
    }

    // Ctrl/Cmd + Shift + P - Print
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        if (document.getElementById('new').style.display === 'block' && currentStep === 4) {
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
        if (event.key === 'ArrowRight' || (event.key === 'Enter' && event.target.tagName !== 'INPUT')) {
            event.preventDefault();
            nextStep();
        } else if (event.key === 'ArrowLeft' || (event.key === 'Backspace' && event.target.tagName !== 'INPUT')) {
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
    
    // Update UI using global changeStep
    if (typeof changeStep === 'function') {
        changeStep(1);
    }
}
