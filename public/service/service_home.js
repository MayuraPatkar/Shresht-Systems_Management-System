// Service Home - List and Search functionality with Tab Management
const pendingServicesDiv = document.getElementById("pending-services-content");
const serviceHistoryDiv = document.getElementById("service-history-content");

// Note: currentStep and totalSteps are declared in globalScript.js and used here

document.addEventListener("DOMContentLoaded", () => {
    // Restore active tab from sessionStorage or default to pending
    const savedTab = sessionStorage.getItem('serviceActiveTab') || 'pending';
    const savedFilter = sessionStorage.getItem('serviceSearchFilter') || 'all';
    
    // Set filter dropdown value
    const filterDropdown = document.getElementById('search-filter');
    if (filterDropdown) {
        filterDropdown.value = savedFilter;
    }
    
    // Initialize tab
    switchTab(savedTab);

    // Tab button event listeners
    document.getElementById('tab-pending-services')?.addEventListener('click', () => switchTab('pending'));
    document.getElementById('tab-service-history')?.addEventListener('click', () => switchTab('history'));

    // Event delegation for both tabs
    if (pendingServicesDiv) {
        pendingServicesDiv.addEventListener("click", handleServiceListClick);
    }
    if (serviceHistoryDiv) {
        serviceHistoryDiv.addEventListener("click", handleServiceListClick);
    }

    // Search functionality
    document.getElementById('search-input')?.addEventListener('keydown', (event) => {
        if (event.key === "Enter") {
            handleSearch();
        }
    });
    
    // Filter dropdown change
    document.getElementById('search-filter')?.addEventListener('change', (event) => {
        sessionStorage.setItem('serviceSearchFilter', event.target.value);
        const searchInput = document.getElementById('search-input');
        if (searchInput && searchInput.value.trim()) {
            handleSearch();
        }
    });

    // Home button
    document.getElementById('home-btn')?.addEventListener('click', showHome);
    
    // Check for URL params for cross-module navigation
    const urlParams = new URLSearchParams(window.location.search);
    const historyInvoiceId = urlParams.get('history');
    if (historyInvoiceId) {
        switchTab('history');
        // Delay to ensure DOM is ready
        setTimeout(() => {
            if (typeof viewServiceHistory === 'function') {
                viewServiceHistory(historyInvoiceId);
            }
        }, 500);
    }

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

// Helper: Get descriptive service stage label
function getServiceStageLabel(stage) {
    const stages = [
        '1st Service',
        '2nd Service', 
        '3rd Service',
        '4th Service',
        '5th Service',
        '6th Service',
        '7th Service',
        '8th Service',
        '9th Service',
        '10th Service'
    ];
    return stages[stage - 1] || `${stage}th Service`;
}

// Helper: Format date to Indian format
function formatDateIndian(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Helper: Format currency in Indian style
function formatIndianCurrency(amount) {
    if (!amount && amount !== 0) return 'N/A';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Tab switching function
function switchTab(tabName) {
    const pendingTab = document.getElementById('tab-pending-services');
    const historyTab = document.getElementById('tab-service-history');
    const pendingContent = document.getElementById('pending-services-content');
    const historyContent = document.getElementById('service-history-content');
    
    // Save to sessionStorage
    sessionStorage.setItem('serviceActiveTab', tabName);
    
    if (tabName === 'pending') {
        // Update tab buttons
        pendingTab.className = 'flex-1 px-6 py-4 text-center font-semibold text-blue-600 bg-blue-50 border-b-2 border-blue-600 transition-all';
        historyTab.className = 'flex-1 px-6 py-4 text-center font-semibold text-gray-600 hover:bg-gray-50 transition-all';
        
        // Show/hide content
        pendingContent.style.display = 'grid';
        historyContent.style.display = 'none';
        
        // Load pending services
        loadPendingServices();
    } else if (tabName === 'history') {
        // Update tab buttons
        pendingTab.className = 'flex-1 px-6 py-4 text-center font-semibold text-gray-600 hover:bg-gray-50 transition-all';
        historyTab.className = 'flex-1 px-6 py-4 text-center font-semibold text-blue-600 bg-blue-50 border-b-2 border-blue-600 transition-all';
        
        // Show/hide content
        pendingContent.style.display = 'none';
        historyContent.style.display = 'grid';
        
        // Load service history
        loadServiceHistory();
    }
}

// Create pending service card (for invoices awaiting service)
function createPendingServiceDiv(service) {
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

// Create service history card (for completed service records)
function createServiceHistoryDiv(service) {
    const div = document.createElement("div");
    div.className = "group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-400 overflow-hidden fade-in";
    
    const serviceDate = formatDateIndian(service.service_date);
    const grandTotal = formatIndianCurrency(service.total_amount_with_tax);
    const stageBadgeColors = [
        'bg-blue-100 text-blue-700',
        'bg-green-100 text-green-700',
        'bg-purple-100 text-purple-700',
        'bg-orange-100 text-orange-700',
        'bg-teal-100 text-teal-700'
    ];
    const badgeColor = stageBadgeColors[(service.service_stage - 1) % stageBadgeColors.length];
    
    div.innerHTML = `
        <div class="flex">
            <div class="w-1.5 bg-gradient-to-b from-green-500 to-emerald-600"></div>
            
            <div class="flex-1 p-6">
                <div class="flex items-center justify-between gap-6">
                    
                    <!-- Left Section: Icon + Service Info -->
                    <div class="flex items-center gap-4 flex-1 min-w-0">
                        <div class="w-14 h-14 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md flex-shrink-0">
                            <i class="fas fa-check-circle text-2xl text-white"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <h3 class="text-lg font-bold text-gray-900 truncate">${service.project_name || 'N/A'}</h3>
                                <span class="px-2 py-0.5 rounded-md text-xs font-semibold ${badgeColor}">
                                    ${getServiceStageLabel(service.service_stage)}
                                </span>
                            </div>
                            <p class="text-sm text-gray-600">${service.customer_name || 'N/A'}</p>
                            <p class="text-xs text-gray-500 mt-1">
                                <i class="fas fa-hashtag"></i> ${service.service_id}
                            </p>
                        </div>
                    </div>

                    <!-- Middle Section: Invoice Info -->
                    <div class="flex items-center gap-3 flex-1 min-w-0 px-6 border-l border-r border-gray-200">
                        <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-file-invoice text-blue-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Invoice</p>
                            <p class="text-sm font-semibold text-gray-900">${service.invoice_id}</p>
                        </div>
                    </div>

                    <!-- Date & Amount Section -->
                    <div class="flex items-center gap-6 px-6 border-r border-gray-200">
                        <div class="flex items-center gap-2">
                            <div class="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-calendar text-orange-600"></i>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Date</p>
                                <p class="text-sm font-bold text-gray-900">${serviceDate}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-rupee-sign text-green-600"></i>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Amount</p>
                                <p class="text-sm font-bold text-gray-900">${grandTotal}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Actions Section -->
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <button class="view-service px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400" data-id="${service.service_id}" title="View Service">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="edit-service px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all border border-green-200 hover:border-green-400" data-id="${service.service_id}" title="Edit Service">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-service px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-200 hover:border-red-400" data-id="${service.service_id}" title="Delete Service">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="print-service px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all border border-purple-200 hover:border-purple-400" data-id="${service.service_id}" title="Print Service">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    return div;
}

// Load pending services (invoices awaiting service)
async function loadPendingServices() {
    try {
        const response = await fetch("/service/get-service");
        if (!response.ok) throw new Error("Failed to fetch services.");

        const services = await response.json();

        const serviceListDiv = pendingServicesDiv;
        if (!serviceListDiv) {
            console.error("Service list container not found.");
            return;
        }

        serviceListDiv.innerHTML = "";

        if (!services.projects || services.projects.length === 0) {
            serviceListDiv.innerHTML = `
                <div class="bg-white rounded-lg shadow-md p-12 text-center border-2 border-dashed border-gray-300">
                    <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                        <i class="fas fa-clock text-4xl text-blue-500"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">No Pending Services</h2>
                    <p class="text-gray-600">Invoices due for service will appear here</p>
                </div>
            `;
            return;
        }

        services.projects.forEach(service => serviceListDiv.appendChild(createPendingServiceDiv(service)));
    } catch (error) {
        console.error("Error loading services:", error);
        window.electronAPI?.showAlert1("Failed to connect to server.");
    }
}

// Load service history (completed service records)
async function loadServiceHistory() {
    try {
        const response = await fetch("/service/recent-services");
        if (!response.ok) throw new Error("Failed to fetch service history.");

        const data = await response.json();
        const services = data.services || [];

        const serviceListDiv = serviceHistoryDiv;
        if (!serviceListDiv) {
            console.error("Service history container not found.");
            return;
        }

        serviceListDiv.innerHTML = "";

        if (services.length === 0) {
            serviceListDiv.innerHTML = `
                <div class="bg-white rounded-lg shadow-md p-12 text-center border-2 border-dashed border-gray-300">
                    <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                        <i class="fas fa-history text-4xl text-green-500"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">No Service History</h2>
                    <p class="text-gray-600">Completed services will appear here</p>
                </div>
            `;
            return;
        }

        services.forEach(service => serviceListDiv.appendChild(createServiceHistoryDiv(service)));
    } catch (error) {
        console.error("Error loading service history:", error);
        window.electronAPI?.showAlert1("Failed to load service history.");
    }
}

// Search functionality with filter support
async function handleSearch() {
    const queryInput = document.getElementById("search-input");
    const filterDropdown = document.getElementById("search-filter");
    const filter = filterDropdown ? filterDropdown.value : 'all';

    if (!queryInput) {
        console.error("Search input not found.");
        return;
    }

    const query = queryInput.value.trim();
    if (!query) {
        window.electronAPI?.showAlert1("Please enter a search query");
        return;
    }

    try {
        let pendingResults = [];
        let historyResults = [];

        // Search based on filter
        if (filter === 'all' || filter === 'pending') {
            const pendingResponse = await fetch(`/service/search/${encodeURIComponent(query)}`);
            if (pendingResponse.ok) {
                const data = await pendingResponse.json();
                pendingResults = data.service || [];
            }
        }

        if (filter === 'all' || filter === 'history') {
            const historyResponse = await fetch(`/service/search-services/${encodeURIComponent(query)}`);
            if (historyResponse.ok) {
                const data = await historyResponse.json();
                historyResults = data.services || [];
            }
        }

        // Display results in appropriate tabs
        if (filter === 'pending') {
            displayPendingSearchResults(pendingResults, query);
        } else if (filter === 'history') {
            displayHistorySearchResults(historyResults, query);
        } else {
            // Display in both tabs
            displayPendingSearchResults(pendingResults, query);
            displayHistorySearchResults(historyResults, query);
        }
    } catch (error) {
        console.error("Error fetching service:", error);
        window.electronAPI?.showAlert1("Failed to fetch service. Please try again later.");
    }
}

// Display pending search results
function displayPendingSearchResults(results, query) {
    if (!pendingServicesDiv) return;
    
    pendingServicesDiv.innerHTML = "";
    
    if (results.length === 0) {
        pendingServicesDiv.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-12 text-center border-2 border-dashed border-gray-300">
                <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                    <i class="fas fa-search text-4xl text-yellow-500"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">No Pending Services Found</h2>
                <p class="text-gray-600">No pending services found for "${query}"</p>
            </div>
        `;
        return;
    }
    
    results.forEach(service => pendingServicesDiv.appendChild(createPendingServiceDiv(service)));
}

// Display history search results
function displayHistorySearchResults(results, query) {
    if (!serviceHistoryDiv) return;
    
    serviceHistoryDiv.innerHTML = "";
    
    if (results.length === 0) {
        serviceHistoryDiv.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-12 text-center border-2 border-dashed border-gray-300">
                <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                    <i class="fas fa-search text-4xl text-yellow-500"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">No Service History Found</h2>
                <p class="text-gray-600">No service history found for "${query}"</p>
            </div>
        `;
        return;
    }
    
    results.forEach(service => serviceHistoryDiv.appendChild(createServiceHistoryDiv(service)));
}

// Handle click events on the service list
async function handleServiceListClick(event) {
    const target = event.target;
    const serviceId = target.getAttribute("data-id");

    if (!serviceId) return;

    if (target.classList.contains("open-service")) {
        await openService(serviceId);
    } else if (target.classList.contains("view-service")) {
        if (typeof viewService === 'function') {
            await viewService(serviceId);
        }
    } else if (target.classList.contains("edit-service")) {
        await editService(serviceId);
    } else if (target.classList.contains("delete-service")) {
        await deleteService(serviceId);
    } else if (target.classList.contains("print-service")) {
        if (typeof viewService === 'function') {
            await viewService(serviceId);
            setTimeout(() => {
                document.getElementById('print-service-btn')?.click();
            }, 500);
        }
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

    // Escape - Close view/form and return to home
    if (event.key === 'Escape') {
        event.preventDefault();
        const viewSection = document.getElementById('view');
        const newSection = document.getElementById('new');
        if (viewSection?.style.display === 'block' || newSection?.style.display === 'block') {
            showHome();
        }
    }
}

// Delete service with cascading effect
async function deleteService(serviceId) {
    if (typeof showConfirm !== 'function') {
        if (!confirm('Delete this service record? This will decrement the invoice service stage.')) {
            return;
        }
    } else {
        showConfirm('Delete this service record? This will decrement the invoice service stage.', async (response) => {
            if (response !== 'Yes') return;
            
            await performDelete();
        });
        return;
    }
    
    await performDelete();
    
    async function performDelete() {
        try {
            const response = await fetch(`/service/${serviceId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete service');
            }
            
            const data = await response.json();
            
            if (typeof showAlert === 'function') {
                showAlert(data.message || 'Service deleted successfully');
            } else {
                window.electronAPI?.showAlert1(data.message || 'Service deleted successfully');
            }
            
            // Reload service history
            loadServiceHistory();
        } catch (error) {
            console.error('Error deleting service:', error);
            window.electronAPI?.showAlert1('Failed to delete service. Please try again.');
        }
    }
}

// Edit service
async function editService(serviceId) {
    try {
        const response = await fetch(`/service/${serviceId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch service');
        }
        
        const data = await response.json();
        const service = data.service;
        
        // Populate form with service data
        if (typeof populateFormWithServiceData === 'function') {
            populateFormWithServiceData(service);
            showNew();
        } else {
            console.error('populateFormWithServiceData function not found');
            window.electronAPI?.showAlert1('Edit functionality not available');
        }
    } catch (error) {
        console.error('Error fetching service for edit:', error);
        window.electronAPI?.showAlert1('Failed to load service for editing.');
    }
}

// Show/Hide sections
function showHome() {
    document.getElementById('home').style.display = 'block';
    document.getElementById('new').style.display = 'none';
    document.getElementById('view').style.display = 'none';
    currentStep = 1;
    resetForm();
    
    // Restore active tab and reload data
    const activeTab = sessionStorage.getItem('serviceActiveTab') || 'pending';
    switchTab(activeTab);
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
