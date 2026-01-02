// Service Home - List and Search functionality with Tab Management
const pendingServicesDiv = document.getElementById("pending-services-content");
const serviceHistoryDiv = document.getElementById("service-history-content");

// Filter state
let allPendingServices = [];
let allServiceHistory = [];
let currentFilters = {
    dateFilter: 'all',
    sortBy: 'date-desc',
    customStartDate: null,
    customEndDate: null
};

// Keyboard shortcuts configuration
const SERVICE_SHORTCUT_GROUPS = [
    {
        title: 'Navigation',
        icon: 'fas fa-arrows-alt text-blue-600',
        items: [
            { label: 'Next Step', keys: ['Enter'] },
            { label: 'Previous Step', keys: ['Backspace'] },
            { label: 'Exit/Cancel', keys: ['Esc'] }
        ]
    },
    {
        title: 'Actions',
        icon: 'fas fa-bolt text-yellow-600',
        items: [
            { label: 'Save Service', keys: ['Ctrl', 'S'] },
            { label: 'Print', keys: ['Ctrl', 'Shift', 'P'] },
            { label: 'Add Item', keys: ['Ctrl', 'I'] },
            { label: 'Delete Item', keys: ['Ctrl', 'Delete'] },
            { label: 'Go Home', keys: ['Ctrl', 'H'] },
            { label: 'Focus Search', keys: ['Ctrl', 'F'] }
        ]
    }
];

let shortcutsModalRef = null;
const isMac = navigator.userAgent.toLowerCase().includes('mac');

// Global toast notification function
function showToast(message) {
    let toast = document.getElementById('global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-toast';
        toast.style.cssText = 'display:none;position:fixed;bottom:20px;right:20px;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:9999;';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 2000);
}

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

    // Search functionality: Enter key + debounced real-time input
    const svcSearchInput = document.getElementById('search-input');
    svcSearchInput?.addEventListener('keydown', (event) => {
        if (event.key === "Enter") {
            handleSearch();
        }
    });
    svcSearchInput?.addEventListener('input', debounce(() => {
        handleSearch();
    }, 300));

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

    // Initialize keyboard shortcuts
    initShortcutsModal();
    initServiceFilters();
    document.addEventListener('keydown', handleServiceKeyboardShortcuts, true);

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
    const s = Number(stage) || 0;
    const index = Math.max(0, s - 1);
    const displayStage = s > 0 ? s : 1;
    return stages[index] || `${displayStage}th Service`;
}

// Toggle scrollbar based on content
function toggleScrollbar(hasContent) {
    const main = document.querySelector('main');
    if (main) {
        main.style.overflowY = hasContent ? 'auto' : 'hidden';
    }
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
    return parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
            
            <div class="flex-1 p-6 min-w-0">
                <!-- Main Content Row -->
                <div class="flex items-center">
                    
                    <!-- Left Section: Icon + Project Info -->
                    <div class="flex items-center gap-4 min-w-0" style="flex: 1 1 350px; max-width: 450px;">
                        <div class="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md flex-shrink-0">
                            <i class="fas fa-wrench text-2xl text-white"></i>
                        </div>
                        <div class="flex-1 min-w-0 overflow-hidden">
                            <div class="flex items-center gap-2 mb-1">
                                <h3 class="text-lg font-bold text-gray-900 truncate" title="${service.project_name || 'Unnamed Project'}">${service.project_name || 'Unnamed Project'}</h3>
                                <span class="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 flex-shrink-0">
                                    Pending
                                </span>
                            </div>
                            <div class="flex items-center gap-2 overflow-hidden">
                                <p class="text-sm text-gray-600 cursor-pointer hover:text-blue-600 copy-text transition-colors inline-flex items-center gap-1 flex-shrink-0" title="Click to copy Invoice ID">
                                    <i class="fas fa-hashtag text-xs"></i>
                                    <span>${service.invoice_id}-S${service.service_stage + 1}</span>
                                    <i class="fas fa-copy text-xs ml-1"></i>
                                </p>
                                <span class="text-gray-300 flex-shrink-0">|</span>
                                <p class="text-xs text-gray-500 truncate" title="${service.customer_name || 'N/A'}">${service.customer_name || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Middle Section: Address -->
                    <div class="flex items-center gap-3 min-w-0 px-6 border-l border-r border-gray-200" style="flex: 1 1 300px; max-width: 400px;">
                        <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-map-marker-alt text-blue-600"></i>
                        </div>
                        <div class="flex-1 min-w-0 overflow-hidden">
                            <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Address</p>
                            <p class="text-sm font-semibold text-gray-900 truncate" title="${service.customer_address || 'N/A'}">${service.customer_address || 'N/A'}</p>
                        </div>
                    </div>

                    <!-- Date Section -->
                    <div class="flex items-center gap-3 px-6 border-r border-gray-200 flex-shrink-0" style="width: 200px;">
                        <div class="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-calendar-check text-orange-600"></i>
                        </div>
                        <div class="flex-1 min-w-0 overflow-hidden">
                            <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Service Due</p>
                            <p class="text-sm font-bold text-gray-900 truncate" title="${serviceDate}">${serviceDate}</p>
                        </div>
                    </div>

                    <!-- Actions Section -->
                    <div class="flex items-center gap-2 flex-shrink-0 ml-auto">
                        <button class="open-service px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400 font-medium" data-id="${service.invoice_id}" title="Open Service">
                            <i class="fas fa-folder-open mr-2"></i>Open
                        </button>
                        <button class="close-service px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-200 hover:border-red-400 font-medium" data-id="${service.invoice_id}" title="Close Service">
                            <i class="fas fa-times-circle mr-2"></i>Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add copy ID functionality
    const copyElement = div.querySelector('.copy-text');
    if (copyElement) {
        copyElement.addEventListener('click', async () => {
            try {
                const idText = `${service.invoice_id}-S${service.service_stage + 1}`;
                await navigator.clipboard.writeText(idText);
                showToast('ID Copied to Clipboard!');
            } catch (err) {
                console.error('Copy failed', err);
            }
        });
    }
    
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
    const len = stageBadgeColors.length;
    const idx = Math.max(0, ((((Number(service.service_stage) || 0) - 1) % len) + len) % len);
    const badgeColor = stageBadgeColors[idx];

    // Payment Status Logic
    const totalPaid = service.total_paid_amount || 0;
    const totalAmount = service.total_amount_with_tax || 0;
    const dueAmount = totalAmount - totalPaid;
    let isPaid = totalPaid >= totalAmount && totalAmount > 0;
    let isPartial = totalPaid > 0 && !isPaid;
    let paymentStatus = isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid';
    let statusBadgeColor = isPaid ? 'bg-green-100 text-green-700' : isPartial ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
    
    // Calculate payment percentage for progress bar
    let percentPaid = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : (totalPaid > 0 ? 100 : 0);
    percentPaid = Math.max(0, Math.min(percentPaid, 100));

    div.innerHTML = `
        <!-- Left Border Accent -->
        <div class="flex">
            <div class="w-1.5 bg-gradient-to-b ${isPaid ? 'from-green-500 to-emerald-600' : isPartial ? 'from-yellow-500 to-amber-500' : 'from-orange-500 to-red-500'}"></div>
            
            <div class="flex-1 p-6 min-w-0">
                <!-- Main Content Row -->
                <div class="flex items-center">
                    
                    <!-- Left Section: Icon + Service Info -->
                    <div class="flex items-center gap-4 min-w-0" style="flex: 1 1 350px; max-width: 450px;">
                        <div class="w-14 h-14 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md flex-shrink-0">
                            <i class="fas fa-check-circle text-2xl text-white"></i>
                        </div>
                        <div class="flex-1 min-w-0 overflow-hidden">
                            <div class="flex items-center gap-2 mb-1">
                                <h3 class="text-lg font-bold text-gray-900 truncate" title="${service.project_name || 'N/A'}">${service.project_name || 'N/A'}</h3>
                                <span class="px-2 py-0.5 rounded-md text-xs font-semibold ${badgeColor} flex-shrink-0">
                                    ${getServiceStageLabel(service.service_stage)}
                                </span>
                            </div>
                            <div class="flex items-center gap-2 overflow-hidden">
                                <p class="text-sm text-gray-600 cursor-pointer hover:text-blue-600 copy-text transition-colors inline-flex items-center gap-1 flex-shrink-0" title="Click to copy Service ID">
                                    <i class="fas fa-hashtag text-xs"></i>
                                    <span>${service.service_id}</span>
                                    <i class="fas fa-copy text-xs ml-1"></i>
                                </p>
                                <span class="text-gray-300 flex-shrink-0">|</span>
                                <p class="text-xs text-gray-500 inline-flex items-center gap-1 flex-shrink-0">
                                    <i class="fas fa-calendar text-xs"></i>
                                    ${serviceDate}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Middle Section: Invoice & Customer Info -->
                    <div class="flex items-center gap-3 min-w-0 px-6 border-l border-r border-gray-200" style="flex: 1 1 300px; max-width: 400px;">
                        <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-file-invoice text-blue-600"></i>
                        </div>
                        <div class="flex-1 min-w-0 overflow-hidden">
                            <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Invoice</p>
                            <p class="text-sm font-semibold text-gray-900 truncate" title="${service.invoice_id}">${service.invoice_id}</p>
                            <p class="text-xs text-gray-600 truncate" title="${service.customer_name || 'N/A'}">${service.customer_name || 'N/A'}</p>
                        </div>
                    </div>

                    <!-- Amount Section -->
                    <div class="flex items-center px-4 border-r border-gray-200 flex-shrink-0">
                        <div class="rounded-lg p-3 w-[280px]" style="background: ${isPaid ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : isPartial ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)'}; border: 1px solid ${isPaid ? '#a7f3d0' : isPartial ? '#fcd34d' : '#fecaca'};">
                            <!-- Total Row -->
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-xs font-medium text-gray-600 uppercase tracking-wide">Total</span>
                                <span class="text-base font-bold" style="color: ${isPaid ? '#059669' : '#dc2626'};">₹${grandTotal}</span>
                            </div>
                            <!-- Progress Bar -->
                            <div class="w-full h-1.5 rounded-full mb-2" style="background-color: ${dueAmount > 0 ? '#fecaca' : '#bbf7d0'};">
                                <div class="h-1.5 rounded-full" style="width: ${percentPaid}%; background: linear-gradient(90deg, #22c55e, #16a34a);"></div>
                            </div>
                            <!-- Due/Paid Row -->
                            <div class="flex items-center justify-between">
                                ${isPaid ? `
                                <span class="text-xs font-medium" style="color: #059669;"><i class="fas fa-check-circle mr-1"></i>Fully Paid</span>
                                <span class="text-base font-bold" style="color: #059669;">₹${formatIndianCurrency(totalPaid)}</span>
                                ` : `
                                <span class="text-xs font-medium uppercase tracking-wide" style="color: #dc2626;">Balance Due</span>
                                <span class="text-base font-bold" style="color: #dc2626;">₹${formatIndianCurrency(Math.max(0, dueAmount))}</span>
                                `}
                            </div>
                        </div>
                    </div>

                    <!-- Actions Section -->
                    <div class="flex items-center gap-2 flex-shrink-0 ml-auto">
                        <button class="view-service px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400" data-id="${service.service_id}" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="edit-service px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all border border-purple-200 hover:border-purple-400" data-id="${service.service_id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="payment-service px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all border border-green-200 hover:border-green-400" data-id="${service.service_id}" title="Payment">
                            <i class="fas fa-credit-card"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add copy ID functionality
    const copyElement = div.querySelector('.copy-text');
    if (copyElement) {
        copyElement.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(service.service_id);
                showToast('ID Copied to Clipboard!');
            } catch (err) {
                console.error('Copy failed', err);
            }
        });
    }
    
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

        allPendingServices = services.projects || [];
        applyServiceFilters('pending');
    } catch (error) {
        console.error("Error loading services:", error);
        const serviceListDiv = pendingServicesDiv;
        if (serviceListDiv) {
            serviceListDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 fade-in">
                    <div class="bg-red-100 rounded-full p-8 mb-4">
                        <i class="fas fa-exclamation-triangle text-red-500 text-6xl"></i>
                    </div>
                    <h2 class="text-2xl font-semibold text-gray-700 mb-2">Failed to Load Pending Services</h2>
                    <p class="text-gray-500 mb-6">Please try again later</p>
                    <button onclick="loadPendingServices()" 
                        class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium">
                        <i class="fas fa-redo"></i>
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

// Load service history (completed service records)
async function loadServiceHistory() {
    try {
        const response = await fetch("/service/recent-services");
        if (!response.ok) throw new Error("Failed to fetch service history.");

        const data = await response.json();
        allServiceHistory = data.services || [];

        const serviceListDiv = serviceHistoryDiv;
        if (!serviceListDiv) {
            console.error("Service history container not found.");
            return;
        }

        applyServiceFilters('history');
    } catch (error) {
        console.error("Error loading service history:", error);
        const serviceListDiv = serviceHistoryDiv;
        if (serviceListDiv) {
            serviceListDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 fade-in">
                    <div class="bg-red-100 rounded-full p-8 mb-4">
                        <i class="fas fa-exclamation-triangle text-red-500 text-6xl"></i>
                    </div>
                    <h2 class="text-2xl font-semibold text-gray-700 mb-2">Failed to Load Service History</h2>
                    <p class="text-gray-500 mb-6">Please try again later</p>
                    <button onclick="loadServiceHistory()" 
                        class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium">
                        <i class="fas fa-redo"></i>
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

// Apply filters to services
function applyServiceFilters(tabType = null) {
    const activeTab = tabType || sessionStorage.getItem('serviceActiveTab') || 'pending';

    if (activeTab === 'pending') {
        const filtered = applyFilters(allPendingServices, {
            dateFilter: currentFilters.dateFilter,
            sortBy: currentFilters.sortBy,
            dateField: 'createdAt',
            nameField: 'project_name',
            customStartDate: currentFilters.customStartDate,
            customEndDate: currentFilters.customEndDate
        });
        renderPendingServices(filtered);
    } else if (activeTab === 'history') {
        const filtered = applyFilters(allServiceHistory, {
            dateFilter: currentFilters.dateFilter,
            sortBy: currentFilters.sortBy,
            dateField: 'service_date',
            amountField: 'total_amount_with_tax',
            nameField: 'project_name',
            customStartDate: currentFilters.customStartDate,
            customEndDate: currentFilters.customEndDate
        });
        renderServiceHistory(filtered);
    }
}

// Render pending services
function renderPendingServices(services) {
    const serviceListDiv = pendingServicesDiv;
    if (!serviceListDiv) return;

    serviceListDiv.innerHTML = "";

    if (!services || services.length === 0) {
        serviceListDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 fade-in">
                <div class="text-blue-500 text-5xl mb-4"><i class="fas fa-clock"></i></div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">No Pending Services</h2>
                <p class="text-gray-600">Invoices due for service will appear here</p>
            </div>
        `;
        toggleScrollbar(false);
        return;
    }

    services.forEach(service => serviceListDiv.appendChild(createPendingServiceDiv(service)));
    toggleScrollbar(true);
}

// Render service history
function renderServiceHistory(services) {
    const serviceListDiv = serviceHistoryDiv;
    if (!serviceListDiv) return;

    serviceListDiv.innerHTML = "";

    if (services.length === 0) {
        serviceListDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 fade-in">
                <div class="text-green-500 text-5xl mb-4"><i class="fas fa-history"></i></div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">No Service History</h2>
                <p class="text-gray-600">Completed services will appear here</p>
            </div>
        `;
        toggleScrollbar(false);
        return;
    }

    services.forEach(service => serviceListDiv.appendChild(createServiceHistoryDiv(service)));
    toggleScrollbar(true);
}

// Initialize filter event listeners
function initServiceFilters() {
    const dateFilter = document.getElementById('date-filter');
    const sortFilter = document.getElementById('sort-filter');
    const clearFiltersBtn = document.getElementById('clear-filters');

    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === 'custom') {
                showCustomDateModal((startDate, endDate) => {
                    currentFilters.dateFilter = 'custom';
                    currentFilters.customStartDate = startDate;
                    currentFilters.customEndDate = endDate;
                    applyServiceFilters();
                });
            } else {
                currentFilters.dateFilter = value;
                currentFilters.customStartDate = null;
                currentFilters.customEndDate = null;
                applyServiceFilters();
            }
        });
    }

    if (sortFilter) {
        sortFilter.addEventListener('change', (e) => {
            currentFilters.sortBy = e.target.value;
            applyServiceFilters();
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            currentFilters = {
                dateFilter: 'all',
                sortBy: 'date-desc',
                customStartDate: null,
                customEndDate: null
            };
            if (dateFilter) dateFilter.value = 'all';
            if (sortFilter) sortFilter.value = 'date-desc';
            applyServiceFilters();
        });
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
        // If query cleared, reload lists based on active tab/filter
        if (filter === 'pending') {
            await loadPendingServices();
            return;
        }
        if (filter === 'history') {
            await loadServiceHistory();
            return;
        }
        // default: reload both
        await loadPendingServices();
        await loadServiceHistory();
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
            <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Results Found</h2>
                <p class="text-gray-500">No pending services found for "${query}"</p>
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
            <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Results Found</h2>
                <p class="text-gray-500">No service history found for "${query}"</p>
            </div>
        `;
        return;
    }

    results.forEach(service => serviceHistoryDiv.appendChild(createServiceHistoryDiv(service)));
}

// Handle click events on the service list
async function handleServiceListClick(event) {
    // Handle clicks on child elements (like icons)
    const target = event.target.closest('button') || event.target;
    const serviceId = target.getAttribute("data-id");

    if (!serviceId) return;

    if (target.classList.contains("open-service")) {
        await openService(serviceId);
    } else if (target.classList.contains("close-service")) {
        await closeService(serviceId);
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
    } else if (target.classList.contains("payment-service")) {
        openPaymentModal(serviceId);
    }
}

// Payment Modal Logic
let currentPaymentServiceId = null;

async function openPaymentModal(serviceId) {
    currentPaymentServiceId = serviceId;
    
    // Find service in loaded history
    const service = allServiceHistory.find(s => s.service_id === serviceId);
    
    if (!service) {
        window.electronAPI.showAlert1('Service not found.');
        return;
    }

    const total = service.total_amount_with_tax || 0;
    const paid = service.total_paid_amount || 0;
    const due = total - paid;

    if (due <= 0) {
        window.electronAPI.showAlert1('No outstanding due for this service.');
        return;
    }

    // Show Modal
    const modal = document.getElementById('payment-container');
    modal.style.display = 'flex';
    
    // Update UI
    document.getElementById('payment-due-amount').textContent = `₹${formatIndianCurrency(due)}`;
    document.getElementById('paid-amount').value = '';
    document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('payment-mode').value = 'Cash';
    document.getElementById('cash-location').value = '';
    
    // Handle payment mode change
    const paymentModeSelect = document.getElementById('payment-mode');
    const extraDetailsDiv = document.getElementById('extra-payment-details');
    const extraDetailsLabel = extraDetailsDiv.querySelector('label');
    const extraDetailsInput = document.getElementById('cash-location');

    // Reset event listener to avoid duplicates
    const newPaymentModeSelect = paymentModeSelect.cloneNode(true);
    paymentModeSelect.parentNode.replaceChild(newPaymentModeSelect, paymentModeSelect);
    
    newPaymentModeSelect.addEventListener('change', function() {
        const mode = this.value;
        if (mode === 'Cash') {
            extraDetailsDiv.style.display = 'block';
            extraDetailsLabel.innerHTML = '<i class="fas fa-map-marker-alt text-gray-500 mr-1"></i>Cash Location';
            extraDetailsInput.placeholder = 'Enter cash location';
        } else if (mode === 'Cheque' || mode === 'Bank Transfer' || mode === 'UPI') {
            extraDetailsDiv.style.display = 'block';
            extraDetailsLabel.innerHTML = '<i class="fas fa-info-circle text-gray-500 mr-1"></i>Reference Number';
            extraDetailsInput.placeholder = 'Enter reference number';
        } else {
            extraDetailsDiv.style.display = 'none';
        }
    });
    
    // Trigger change event to set initial state
    newPaymentModeSelect.dispatchEvent(new Event('change'));

    // Focus on the first input field
    setTimeout(() => {
        const firstInput = document.getElementById('paid-amount');
        if (firstInput) {
            firstInput.focus();
        }
    }, 100);
}

// Close Payment Modal
document.getElementById('close-payment-modal')?.addEventListener('click', () => {
    document.getElementById('payment-container').style.display = 'none';
});

// Save Payment
document.getElementById('payment-btn')?.addEventListener('click', async () => {
    const paymentBtn = document.getElementById('payment-btn');

    // Prevent double submission
    if (paymentBtn.disabled) return;

    const paidAmountInput = document.getElementById('paid-amount');
    const paidAmount = parseFloat(paidAmountInput?.value) || 0;
    const paymentDate = document.getElementById('payment-date').value;
    const paymentMode = document.getElementById('payment-mode').value;

    // Re-fetch service to get the latest due amount
    let dueAmount = null;
    try {
        const serviceResp = await fetch(`/service/${currentPaymentServiceId}`);
        if (serviceResp.ok) {
            const data = await serviceResp.json();
            const service = data.service;
            const totalAmount = service.total_amount_with_tax || 0;
            const paidSoFar = service.total_paid_amount || 0;
            dueAmount = Number((totalAmount - paidSoFar).toFixed(2));
        }
    } catch (err) {
        console.error('Error fetching service for validation:', err);
    }

    // Basic validations
    if (!currentPaymentServiceId) {
        window.electronAPI.showAlert1('Service not selected for payment.');
        return;
    }

    if (!paymentDate) {
        window.electronAPI.showAlert1('Please select a payment date.');
        return;
    }

    const today = new Date();
    const enteredDate = new Date(paymentDate + 'T00:00:00');
    if (isNaN(enteredDate.getTime())) {
        window.electronAPI.showAlert1('Invalid payment date.');
        return;
    }
    if (enteredDate > today) {
        window.electronAPI.showAlert1('Payment date cannot be in the future.');
        return;
    }

    if (!paymentMode) {
        window.electronAPI.showAlert1('Please select a payment method.');
        return;
    }

    if (paidAmount <= 0 || isNaN(paidAmount)) {
        window.electronAPI.showAlert1('Please enter a valid paid amount greater than 0.');
        paidAmountInput?.focus();
        return;
    }

    if (dueAmount !== null && paidAmount > dueAmount) {
        window.electronAPI.showAlert1(`Paid amount cannot exceed due amount (₹ ${formatIndianCurrency(dueAmount)}).`);
        paidAmountInput?.focus();
        return;
    }

    // Extra info validations based on payment method
    let extraInfo = '';
    if (paymentMode === 'Cash') {
        extraInfo = document.getElementById('cash-location')?.value || '';
        if (!extraInfo.trim()) {
            window.electronAPI.showAlert1('Please enter cash location.');
            return;
        }
    } else if (paymentMode === 'UPI') {
        extraInfo = document.getElementById('cash-location')?.value || '';
        if (!extraInfo.trim()) {
            window.electronAPI.showAlert1('Please enter UPI transaction ID.');
            return;
        }
    } else if (paymentMode === 'Cheque') {
        extraInfo = document.getElementById('cash-location')?.value || '';
        if (!extraInfo.trim()) {
            window.electronAPI.showAlert1('Please enter cheque number.');
            return;
        }
    } else if (paymentMode === 'Bank Transfer') {
        extraInfo = document.getElementById('cash-location')?.value || '';
        if (!extraInfo.trim()) {
            window.electronAPI.showAlert1('Please enter bank details.');
            return;
        }
    }

    const data = {
        serviceId: currentPaymentServiceId,
        paidAmount: paidAmount,
        paymentDate: paymentDate,
        paymentMode: paymentMode,
        paymentExtra: extraInfo,
    };

    // Disable button while processing
    paymentBtn.disabled = true;
    const originalBtnText = paymentBtn.innerHTML;
    paymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const response = await fetch('/service/save-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            window.electronAPI.showAlert1(`Error: ${result.message || "Unknown error occurred."}`);
            paymentBtn.disabled = false;
            paymentBtn.innerHTML = originalBtnText;
        } else {
            window.electronAPI.showAlert1("Payment saved successfully!");
            document.getElementById('paid-amount').value = '';
            // Reset payment date to today
            const paymentDateEl = document.getElementById('payment-date');
            if (paymentDateEl) paymentDateEl.value = new Date().toISOString().split('T')[0];
            document.getElementById('payment-mode').value = 'Cash';
            document.getElementById('cash-location').value = '';

            // Re-enable payment button for next payment
            paymentBtn.disabled = false;
            paymentBtn.innerHTML = originalBtnText;

            // Close modal after short delay
            setTimeout(() => {
                document.getElementById('payment-container').style.display = 'none';
                // Reload service history
                loadServiceHistory();
            }, 500);
        }
    } catch (error) {
        console.error("Error saving payment:", error);
        window.electronAPI.showAlert1("An error occurred while saving payment.");
        paymentBtn.disabled = false;
        paymentBtn.innerHTML = originalBtnText;
    }
});

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
async function closeService(invoiceId) {
    window.electronAPI.showAlert2('Are you sure you want to close this service? This will set service month to 0.');
    if (window.electronAPI) {
        window.electronAPI.receiveAlertResponse(async (response) => {
            if (response !== "Yes") return;

            try {
                const closeResponse = await fetch(`/invoice/close-service/${invoiceId}`, {
                    method: 'POST'
                });

                if (!closeResponse.ok) {
                    throw new Error('Failed to close service');
                }

                const data = await closeResponse.json();
                window.electronAPI.showAlert1(data.message || 'Service closed successfully');
                
                // Reload pending services to reflect the change
                loadPendingServices();
            } catch (error) {
                console.error('Error closing service:', error);
                window.electronAPI.showAlert1('Failed to close service. Please try again.');
            }
        });
    }
}

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

// ==================== Keyboard Shortcuts ====================

function initShortcutsModal() {
    shortcutsModalRef = document.getElementById('shortcuts-modal');
    const shortcutsBtn = document.getElementById('shortcuts-btn');
    const closeBtn = document.getElementById('close-shortcuts');
    const contentContainer = document.getElementById('shortcuts-content');

    if (!shortcutsModalRef || !shortcutsBtn || !closeBtn || !contentContainer) {
        return;
    }

    contentContainer.innerHTML = SERVICE_SHORTCUT_GROUPS.map(renderShortcutSection).join('');

    shortcutsBtn.addEventListener('click', () => {
        showShortcutsModal();
    });

    closeBtn.addEventListener('click', () => {
        hideShortcutsModal();
    });

    shortcutsModalRef.addEventListener('click', (event) => {
        if (event.target === shortcutsModalRef) {
            hideShortcutsModal();
        }
    });
}

function renderShortcutSection(section) {
    const sectionHeader = `
        <div class="shortcuts-section">
            <h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <i class="${section.icon}"></i>
                ${section.title}
            </h3>
            <div class="space-y-2">
                ${section.items.map(renderShortcutRow).join('')}
            </div>
        </div>
    `;
    return sectionHeader;
}

function renderShortcutRow(item) {
    return `
        <div class="shortcut-row">
            <span class="text-gray-700">${item.label}</span>
            ${renderShortcutKeys(item.keys)}
        </div>
    `;
}

function renderShortcutKeys(keys) {
    const keyCaps = keys.map((key, index) => {
        const displayKey = key === 'Ctrl' && isMac ? 'Cmd' : key;
        const separator = index > 0 ? '<span>+</span>' : '';
        return `${separator}<kbd>${displayKey}</kbd>`;
    }).join('');
    return `<div class="shortcut-keys">${keyCaps}</div>`;
}

function showShortcutsModal() {
    if (!shortcutsModalRef) return;
    shortcutsModalRef.classList.remove('hidden');
}

function hideShortcutsModal() {
    if (!shortcutsModalRef) return;
    shortcutsModalRef.classList.add('hidden');
}

function isSectionVisible(sectionId) {
    const el = document.getElementById(sectionId);
    if (!el) return false;
    return window.getComputedStyle(el).display !== 'none';
}

function isFormActive() {
    return isSectionVisible('new');
}

function isPreviewStepActive() {
    if (typeof currentStep === 'undefined' || typeof totalSteps === 'undefined') {
        return false;
    }
    return currentStep === totalSteps;
}

function runOnPreviewStep(callback) {
    if (typeof callback !== 'function') {
        return;
    }

    if (!isFormActive()) {
        return;
    }

    const switchToPreview = () => {
        if (typeof changeStep === 'function' && typeof totalSteps !== 'undefined') {
            changeStep(totalSteps);
        }
        if (typeof generatePreview === 'function') {
            generatePreview();
        }
    };

    if (!isPreviewStepActive()) {
        switchToPreview();
    } else if (typeof generatePreview === 'function') {
        generatePreview();
    }

    setTimeout(() => {
        callback();
    }, 0);
}

function isItemsStepActive() {
    if (typeof currentStep === 'undefined') {
        return false;
    }
    return currentStep === 2; // Step 2 is items for service
}

function isHomeScreenActive() {
    const homeSectionVisible = isSectionVisible('home');
    return homeSectionVisible && !isFormActive() && !isSectionVisible('view');
}

function triggerAddEntry() {
    if (!isFormActive()) {
        return false;
    }

    const itemsBtn = document.getElementById('add-item-btn');
    if (itemsBtn && isItemsStepActive()) {
        itemsBtn.click();
        return true;
    }

    const nonItemBtn = document.getElementById('add-non-item-btn');
    if (nonItemBtn && typeof currentStep !== 'undefined' && currentStep === 3) {
        nonItemBtn.click();
        return true;
    }

    return false;
}

function triggerPrintAction() {
    const formPrintBtn = document.getElementById('print-btn');
    if (formPrintBtn && isFormActive()) {
        runOnPreviewStep(() => formPrintBtn.click());
        return true;
    }

    const viewPrintBtn = document.getElementById('printService');
    if (viewPrintBtn && isSectionVisible('view')) {
        viewPrintBtn.click();
        return true;
    }

    return false;
}

function isTypingContext() {
    const active = document.activeElement;
    if (!active) return false;
    const tagName = active.tagName;
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || active.isContentEditable || tagName === 'SELECT';
}

function handleServiceKeyboardShortcuts(event) {
    const keyLower = event.key.toLowerCase();
    const isModifierPressed = event.ctrlKey || event.metaKey;
    const homeButton = document.getElementById('home-btn');

    // Payment Modal Handling
    const paymentContainer = document.getElementById('payment-container');
    const isPaymentOpen = paymentContainer && paymentContainer.style.display !== 'none';

    if (isPaymentOpen) {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            document.getElementById('close-payment-modal')?.click();
            return;
        }

        if (event.key === 'Enter') {
            // Allow default behavior for buttons (like close button)
            if (document.activeElement.tagName === 'BUTTON') {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            document.getElementById('payment-btn')?.click();
            return;
        }

        if (event.key === 'Tab') {
            const focusableElements = paymentContainer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusableElements.length > 0) {
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (event.shiftKey) {
                    if (document.activeElement === firstElement) {
                        event.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        event.preventDefault();
                        firstElement.focus();
                    }
                }
            }
            return;
        }

        // Block application shortcuts (Ctrl/Cmd/Alt) while modal is open
        if (isModifierPressed || event.altKey) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        return; // Allow other keys (typing)
    }

    if (!shortcutsModalRef) {
        shortcutsModalRef = document.getElementById('shortcuts-modal');
    }

    if (!event.altKey && isModifierPressed) {
        switch (keyLower) {
            case 's': {
                const saveBtn = document.getElementById('save-btn');
                if (saveBtn && isFormActive()) {
                    event.preventDefault();
                    event.stopPropagation();
                    runOnPreviewStep(() => saveBtn.click());
                }
                break;
            }
            case 'p': {
                const isShift = event.shiftKey;
                if (isShift) {
                    if (triggerPrintAction()) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }
                break;
            }
            case 'i': {
                if (triggerAddEntry()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                break;
            }
            case 'h': {
                if (homeButton) {
                    event.preventDefault();
                    event.stopPropagation();
                    homeButton.click();
                    setTimeout(() => {
                        window.location.reload();
                    }, 150);
                }
                break;
            }
            case 'f': {
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    event.preventDefault();
                    event.stopPropagation();
                    searchInput.focus();
                    searchInput.select();
                }
                break;
            }
            default:
                break;
        }
        return;
    }

    if (event.altKey) {
        return;
    }

    if (event.key === 'Escape') {
        if (shortcutsModalRef && !shortcutsModalRef.classList.contains('hidden')) {
            event.preventDefault();
            event.stopPropagation();
            hideShortcutsModal();
            return;
        }

        if (isHomeScreenActive()) {
            event.preventDefault();
            event.stopPropagation();
            window.location = '/dashboard';
            return;
        }

        event.stopPropagation();
        return;
    }

    if (event.key === '?' && !isTypingContext()) {
        event.preventDefault();
        event.stopPropagation();
        showShortcutsModal();
        return;
    }

    if (isTypingContext()) {
        return;
    }

    if (event.key === 'Enter' && isFormActive()) {
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn && !nextBtn.disabled) {
            event.preventDefault();
            event.stopPropagation();
            nextBtn.click();
        }
        return;
    }

    if (event.key === 'Backspace' && isFormActive()) {
        const prevBtn = document.getElementById('prev-btn');
        if (prevBtn && !prevBtn.disabled) {
            event.preventDefault();
            event.stopPropagation();
            prevBtn.click();
        }
    }
}
