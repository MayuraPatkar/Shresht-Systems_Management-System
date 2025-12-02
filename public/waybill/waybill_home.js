// Sidebar navigation active state and navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function () {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
    });
});

// Sidebar navigation routing (IDs must match HTML)
document.getElementById('dashboard').addEventListener('click', () => {
    window.location = '/dashboard';
    sessionStorage.setItem('currentTab', 'dashboard');
})

document.getElementById('quotation').addEventListener('click', () => {
    window.location = '/quotation';
    sessionStorage.setItem('currentTab', 'quotation');
})

document.getElementById('purchase-bill').addEventListener('click', () => {
    window.location = '/purchaseorder';
    sessionStorage.setItem('currentTab', 'purchaseorder');
})

document.getElementById('wayBill').addEventListener('click', () => {
    window.location = '/wayBill';
    sessionStorage.setItem('currentTab', 'wayBill');
})

document.getElementById('invoice').addEventListener('click', () => {
    window.location = '/invoice';
    sessionStorage.setItem('currentTab', 'invoice');
})

document.getElementById('service').addEventListener('click', () => {
    window.location = '/service';
    sessionStorage.setItem('currentTab', 'service');
})

document.getElementById('stock').addEventListener('click', () => {
    window.location = '/stock';
    sessionStorage.setItem('currentTab', 'stock');
})

document.getElementById('comms').addEventListener('click', () => {
    window.location = '/comms';
    sessionStorage.setItem('currentTab', 'comms');
})

document.getElementById('calculations').addEventListener('click', () => {
    window.location = '/calculations';
    sessionStorage.setItem('currentTab', 'calculations');
})

document.getElementById('settings').addEventListener('click', () => {
    window.location = '/settings';
    sessionStorage.setItem('currentTab', 'settings');
})

document.getElementById('home-btn').addEventListener('click', () => {
    window.location = '/wayBill';
    sessionStorage.setItem('currentTab', 'wayBill');
})

// Main content references
const wayBillsListDiv = document.querySelector(".records");

// Filter state
let allWayBills = [];
let currentFilters = {
    dateFilter: 'all',
    sortBy: 'date-desc',
    customStartDate: null,
    customEndDate: null
};

const WAYBILL_SHORTCUT_GROUPS = [
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
            { label: 'New Waybill', keys: ['Ctrl', 'N'] },
            { label: 'Save Waybill', keys: ['Ctrl', 'S'] },
            { label: 'View Preview', keys: ['Ctrl', 'P'] },
            { label: 'Print', keys: ['Ctrl', 'Shift', 'P'] },
            { label: 'Add Item', keys: ['Ctrl', 'I'] },
            { label: 'Go Home', keys: ['Ctrl', 'H'] },
            { label: 'Focus Search', keys: ['Ctrl', 'F'] }
        ]
    }
];

let shortcutsModalRef = null;

const isMac = navigator.userAgent.toLowerCase().includes('mac');

// Header buttons
document.addEventListener("DOMContentLoaded", () => {
    loadRecentWayBills();
    document.getElementById('new-waybill-btn').addEventListener('click', showNewWayBillForm);
    const wbSearchInput = document.getElementById('search-input');
    wbSearchInput.addEventListener('keydown', function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSearch();
        }
    });
    // Real-time search while typing
    wbSearchInput.addEventListener('input', debounce(() => {
        handleSearch();
    }, 300));
    document.getElementById('view-preview').addEventListener('click', () => {
        changeStep(totalSteps);
        generatePreview();
    });
    document.getElementById('view-preview').style.display = 'none';

    // Keyboard shortcuts modal handlers
    const shortcutsModal = document.getElementById('shortcuts-modal');
    const shortcutsBtn = document.getElementById('shortcuts-btn');
    const closeShortcutsBtn = document.getElementById('close-shortcuts');

    shortcutsBtn.addEventListener('click', () => {
        shortcutsModal.classList.remove('hidden');
    });

    closeShortcutsBtn.addEventListener('click', () => {
        shortcutsModal.classList.add('hidden');
    });

    // Close modal when clicking outside
    shortcutsModal.addEventListener('click', (e) => {
        if (e.target === shortcutsModal) {
            shortcutsModal.classList.add('hidden');
        }
    });

    initShortcutsModal();
    initWayBillFilters();
    document.addEventListener('keydown', handleQuotationKeyboardShortcuts, true);
});

// These variables and functions are now in waybill_form.js to avoid duplication
// currentStep, totalSteps, updateNavigation, and navigation event listeners moved to form file

function initShortcutsModal() {
    shortcutsModalRef = document.getElementById('shortcuts-modal');
    const shortcutsBtn = document.getElementById('shortcuts-btn');
    const closeBtn = document.getElementById('close-shortcuts');
    const contentContainer = document.getElementById('shortcuts-content');

    if (!shortcutsModalRef || !shortcutsBtn || !closeBtn || !contentContainer) {
        return;
    }

    contentContainer.innerHTML = WAYBILL_SHORTCUT_GROUPS.map(renderShortcutSection).join('');

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
    return currentStep === 5;
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

    return false;
}

function triggerPrintAction() {
    const formPrintBtn = document.getElementById('print-btn');
    if (formPrintBtn && isFormActive()) {
        runOnPreviewStep(() => formPrintBtn.click());
        return true;
    }

    const viewPrintBtn = document.getElementById('printProject');
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

function handleQuotationKeyboardShortcuts(event) {
    const keyLower = event.key.toLowerCase();
    const isModifierPressed = event.ctrlKey || event.metaKey;
    const homeButton = document.getElementById('home-btn');

    if (!shortcutsModalRef) {
        shortcutsModalRef = document.getElementById('shortcuts-modal');
    }

    if (!event.altKey && isModifierPressed) {
        switch (keyLower) {
            case 'n': {
                const newBtn = document.getElementById('new-waybill-btn');
                if (newBtn && window.getComputedStyle(newBtn).display !== 'none') {
                    event.preventDefault();
                    event.stopPropagation();
                    newBtn.click();
                }
                break;
            }
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
                } else {
                    const previewBtn = document.getElementById('view-preview');
                    if (previewBtn && window.getComputedStyle(previewBtn).display !== 'none') {
                        event.preventDefault();
                        event.stopPropagation();
                        previewBtn.click();
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

// Load recent way bills from the server
async function loadRecentWayBills() {
    try {
        const response = await fetch(`/wayBill/recent-way-bills`);
        if (!response.ok) {
            wayBillsListDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 fade-in">
                    <div class="bg-gray-100 rounded-full p-8 mb-4">
                        <i class="fas fa-inbox text-gray-400 text-6xl"></i>
                    </div>
                    <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Waybills Found</h2>
                    <p class="text-gray-500 mb-6">Get started by creating your first way bill</p>
                    <button id="new-waybill-btn-2"" 
                        class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium">
                        <i class="fas fa-plus"></i>
                        Create Way Bill
                    </button>
                </div>
            `;
            return;
        }
        const data = await response.json();
        allWayBills = data.wayBill || [];
        applyWayBillFilters();
    } catch (error) {
        console.error("Error loading way bills:", error);
        wayBillsListDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 fade-in">
                <div class="bg-red-100 rounded-full p-8 mb-4">
                    <i class="fas fa-exclamation-triangle text-red-500 text-6xl"></i>
                </div>
                <h2 class="text-2xl font-semibold text-gray-700 mb-2">Failed to Load Way Bills</h2>
                <p class="text-gray-500 mb-6">Please try again later</p>
                <button onclick="loadRecentWayBills()" 
                    class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium">
                    <i class="fas fa-redo"></i>
                    Retry
                </button>
            </div>
        `;
    }
}

// Apply filters to waybills
function applyWayBillFilters() {
    const filtered = applyFilters(allWayBills, {
        dateFilter: currentFilters.dateFilter,
        sortBy: currentFilters.sortBy,
        dateField: 'createdAt',
        nameField: 'project_name',
        customStartDate: currentFilters.customStartDate,
        customEndDate: currentFilters.customEndDate
    });
    renderWayBills(filtered);
}

// Initialize filter event listeners
function initWayBillFilters() {
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
                    applyWayBillFilters();
                });
            } else {
                currentFilters.dateFilter = value;
                currentFilters.customStartDate = null;
                currentFilters.customEndDate = null;
                applyWayBillFilters();
            }
        });
    }

    if (sortFilter) {
        sortFilter.addEventListener('change', (e) => {
            currentFilters.sortBy = e.target.value;
            applyWayBillFilters();
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
            applyWayBillFilters();
        });
    }
}

// Render way bills in the list
function renderWayBills(wayBills) {
    wayBillsListDiv.innerHTML = "";
    if (!wayBills || wayBills.length === 0) {
        wayBillsListDiv.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-12 text-center border-2 border-dashed border-gray-300">
                <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                    <i class="fas fa-route text-4xl text-blue-500"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">No Waybills Found</h2>
                <p class="text-gray-600 mb-6">Start creating waybills for your deliveries</p>
                <button onclick="document.getElementById('new-waybill-btn').click()" class="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg font-semibold">
                    <i class="fas fa-plus mr-2"></i>Create First Waybill
                </button>
            </div>
        `;
        return;
    }
    wayBills.forEach(wayBill => {
        const wayBillDiv = createWayBillCard(wayBill);
        wayBillsListDiv.appendChild(wayBillDiv);
    });
}

// Create a way bill card element
function createWayBillCard(wayBill) {
    const wayBillDiv = document.createElement("div");
    wayBillDiv.className = "group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-400 overflow-hidden fade-in";
    
    // Format the date for display
    const dateToFormat = wayBill.waybill_date || wayBill.createdAt;
    let formattedDate = '-';
    if (dateToFormat) {
        try {
            const dateObj = new Date(dateToFormat);
            if (!isNaN(dateObj.getTime())) {
                const day = String(dateObj.getDate()).padStart(2, '0');
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const year = dateObj.getFullYear();
                formattedDate = `${day}/${month}/${year}`;
            }
        } catch (e) {
            formattedDate = '-';
        }
    }
    
    wayBillDiv.innerHTML = `
        <!-- Left Border Accent -->
        <div class="flex">
            <div class="w-1.5 bg-gradient-to-b from-blue-500 to-cyan-600"></div>
            
            <div class="flex-1 p-6">
                <!-- Main Content Row -->
                <div class="flex items-center justify-between gap-6">
                    
                    <!-- Left Section: Icon + Project Info -->
                    <div class="flex items-center gap-4 flex-1 min-w-0">
                        <div class="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md flex-shrink-0">
                            <i class="fas fa-route text-2xl text-white"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-lg font-bold text-gray-900 mb-1 truncate">${wayBill.project_name}</h3>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-600 cursor-pointer hover:text-blue-600 copy-text transition-colors inline-flex items-center gap-1" title="Click to copy ID">
                                    <i class="fas fa-hashtag text-xs"></i>
                                    <span>${wayBill.waybill_id}</span>
                                    <i class="fas fa-copy text-xs ml-1"></i>
                                </p>
                                <span class="text-gray-300">|</span>
                                <p class="text-xs text-gray-500 inline-flex items-center gap-1">
                                    <i class="fas fa-calendar-alt text-xs"></i>
                                    ${formattedDate}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Middle Section: Customer Info -->
                    <div class="flex items-center gap-3 flex-1 min-w-0 px-6 border-l border-r border-gray-200">
                        <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-user text-blue-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Customer</p>
                            <p class="text-sm font-semibold text-gray-900 truncate">${wayBill.customer_name}</p>
                            <p class="text-xs text-gray-600 truncate">${wayBill.customer_address}</p>
                        </div>
                    </div>

                    <!-- Destination Section -->
                    <div class="flex items-center gap-3 px-6 border-r border-gray-200">
                        <div class="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-map-marker-alt text-orange-600"></i>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Destination</p>
                            <p class="text-sm font-bold text-gray-900">${wayBill.place_supply}</p>
                        </div>
                    </div>

                    <!-- Actions Section -->
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <button class="action-btn view-btn px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit-btn px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all border border-purple-200 hover:border-purple-400" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-200 hover:border-red-400" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const copyElement = wayBillDiv.querySelector('.copy-text');
    const viewBtn = wayBillDiv.querySelector('.view-btn');
    const editBtn = wayBillDiv.querySelector('.edit-btn');
    const deleteBtn = wayBillDiv.querySelector('.delete-btn');

    // Copy ID functionality
    copyElement.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(wayBill.waybill_id);
            const toast = document.createElement('div');
            toast.textContent = 'ID Copied to Clipboard!';
            toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:9999;';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        } catch (err) {
            console.error('Copy failed', err);
        }
    });

    // Action button handlers
    viewBtn.addEventListener('click', () => {
        viewWayBill(wayBill.waybill_id);
    });

    editBtn.addEventListener('click', () => {
        openWayBill(wayBill.waybill_id);
    });

    deleteBtn.addEventListener('click', () => {
        window.electronAPI.showAlert2('Are you sure you want to delete this way bill?');
        if (window.electronAPI) {
            window.electronAPI.receiveAlertResponse((response) => {
                if (response === "Yes") {
                    deleteWayBill(wayBill.waybill_id);
                }
            });
        }
    });

    return wayBillDiv;
}

// Delete a way bill
async function deleteWayBill(wayBillId) {
    await deleteDocument('wayBill', wayBillId, 'Way Bill', loadRecentWayBills);
}

// Show the new way bill form
function showNewWayBillForm() {
    showNewDocumentForm({
        homeId: 'home',
        formId: 'new',
        newButtonId: 'new-waybill-btn',
        previewButtonId: 'view-preview',
        viewId: 'view',
        stepIndicatorId: 'step-indicator',
        currentStep: 1,
        totalSteps: 6,
        additionalSetup: () => {
            // Reset form
            document.getElementById('waybill-form').reset();
            
            // Clear items table
            const itemsTableBody = document.querySelector("#items-table tbody");
            if (itemsTableBody) {
                itemsTableBody.innerHTML = "";
            }
            
            // Clear items container
            const itemsContainer = document.getElementById("items-container");
            if (itemsContainer) {
                itemsContainer.innerHTML = "";
            }
            
            // Reset to step 1 (use window.changeStep from waybill_form.js)
            if (typeof window.changeStep === 'function') {
                window.changeStep(1);
            } else {
                document.querySelectorAll('.steps').forEach(step => step.classList.remove('active'));
                document.getElementById('step-1').classList.add('active');
            }
            // Set default waybill date if the date input exists and is empty
            const waybillDateInput = document.getElementById('waybill-date');
            if (waybillDateInput && !waybillDateInput.value) {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                waybillDateInput.value = `${yyyy}-${mm}-${dd}`;
            }
        }
    });
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) {
        await loadRecentWayBills();
        return;
    }

    await searchDocuments('wayBill', query, wayBillsListDiv, createWayBillCard, 
        `<div class="flex flex-col items-center justify-center py-16 fade-in">
            <div class="bg-yellow-100 rounded-full p-8 mb-4">
                <i class="fas fa-search text-yellow-500 text-6xl"></i>
            </div>
            <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Results Found</h2>
            <p class="text-gray-500 mb-2">No way bills match your search</p>
            <button onclick="document.getElementById('search-input').value=''; loadRecentWayBills();" 
                class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium mt-4">
                <i class="fas fa-list"></i>
                Show All Way Bills
            </button>
        </div>`);
}

// Auto-open new form or view based on URL parameters
document.addEventListener('DOMContentLoaded', () => {
    const searchParams = new URLSearchParams(window.location.search);
    const isNewQuery = searchParams.has('new');
    const viewId = searchParams.get('view') || searchParams.get('id');

    // Auto-open new form if ?new=1 parameter is present
    if (isNewQuery) {
        sessionStorage.setItem('currentTab', 'wayBill');
        setTimeout(() => {
            const newBtn = document.getElementById('new-waybill-btn');
            if (newBtn) {
                newBtn.click();
            }
        }, 100);
    }

    // Auto-open view if ?view=<id> parameter is present
    if (viewId && typeof window.viewWayBill === 'function') {
        sessionStorage.setItem('currentTab', 'wayBill');
        setTimeout(() => {
            window.viewWayBill(viewId);
        }, 100);
    }
});
