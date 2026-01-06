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
    window.location = '/waybill';
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
    sessionStorage.removeItem('currentTab-status');
    window.location = '/waybill';
    sessionStorage.setItem('currentTab', 'waybill');
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
            { label: 'Delete Item', keys: ['Ctrl', 'Delete'] },
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

function isExistingDocument() {
    const status = sessionStorage.getItem('currentTab-status');
    return status === 'update' || status === 'clone';
}

function isPreviewStepActive() {
    if (typeof window.currentStep === 'undefined' || typeof window.totalSteps === 'undefined') {
        return false;
    }
    return window.currentStep === window.totalSteps;
}

async function runOnPreviewStep(callback) {
    if (typeof callback !== 'function') {
        return;
    }

    if (!isFormActive()) {
        return;
    }

    // If already on preview step, just generate preview and run callback
    if (isPreviewStepActive()) {
        if (typeof generatePreview === 'function') {
            await generatePreview();
        }
        callback();
        return;
    }

    // Navigate step-by-step using the Next button to trigger validation at each step
    const navigateToPreview = async () => {
        const nextBtn = document.getElementById('next-btn');
        if (!nextBtn) {
            return;
        }

        // Store current step to detect if navigation was blocked by validation
        const stepBefore = typeof window.currentStep !== 'undefined' ? window.currentStep : 0;

        // Click next button (this triggers validation)
        nextBtn.click();

        // Wait a bit for validation and step change to process
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if step actually changed (validation passed)
        const stepAfter = typeof window.currentStep !== 'undefined' ? window.currentStep : 0;

        if (stepAfter === stepBefore) {
            // Step didn't change - validation failed, stop navigation
            return;
        }

        // If we reached the preview step, generate preview and run callback
        if (isPreviewStepActive()) {
            if (typeof generatePreview === 'function') {
                await generatePreview();
            }
            callback();
            return;
        }

        // Continue navigating to next steps
        await navigateToPreview();
    };

    await navigateToPreview();
}

function isItemsStepActive() {
    if (typeof window.currentStep === 'undefined') {
        return false;
    }
    return window.currentStep === 5;
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
                    // For new documents, only allow save on preview step
                    // For existing documents, allow save from any step
                    if (isExistingDocument() || isPreviewStepActive()) {
                        event.preventDefault();
                        event.stopPropagation();
                        runOnPreviewStep(() => saveBtn.click());
                    }
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

    if (event.key === 'Enter') {
        if (isHomeScreenActive()) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if (isFormActive()) {
            const nextBtn = document.getElementById('next-btn');
            if (nextBtn && !nextBtn.disabled) {
                event.preventDefault();
                event.stopPropagation();
                nextBtn.click();
            }
            return;
        }
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
    const filterBtn = document.getElementById('filter-btn');
    const filterPopover = document.getElementById('filter-popover');
    const dateFilter = document.getElementById('date-filter');
    const sortFilter = document.getElementById('sort-filter');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');

    // Toggle filter popover
    if (filterBtn && filterPopover) {
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = filterBtn.getBoundingClientRect();
            filterPopover.style.top = `${rect.bottom + 8}px`;
            filterPopover.style.left = `${rect.left}px`;
            filterPopover.classList.toggle('hidden');
        });

        // Close popover when clicking outside
        document.addEventListener('click', (e) => {
            if (!filterPopover.contains(e.target) && e.target !== filterBtn) {
                filterPopover.classList.add('hidden');
            }
        });
    }

    // Handle date filter custom option
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
            }
        });
    }

    // Apply filters button
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            if (dateFilter && dateFilter.value !== 'custom') {
                currentFilters.dateFilter = dateFilter.value;
                currentFilters.customStartDate = null;
                currentFilters.customEndDate = null;
            }
            if (sortFilter) currentFilters.sortBy = sortFilter.value;
            applyWayBillFilters();
            if (filterPopover) filterPopover.classList.add('hidden');
        });
    }

    // Clear filters button
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
            if (filterPopover) filterPopover.classList.add('hidden');
        });
    }
}

// Render way bills in the list
function renderWayBills(wayBills) {
    wayBillsListDiv.innerHTML = "";
    if (!wayBills || wayBills.length === 0) {
        wayBillsListDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                <div class="text-blue-500 text-5xl mb-4">
                    <i class="fas fa-route"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">No Waybills Found</h2>
                <p class="text-gray-600">Start creating waybills for your deliveries</p>
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
            <div class="w-1.5 bg-gradient-to-b from-blue-500 to-cyan-600 rounded-l-lg"></div>
            <div class="relative p-5 flex-1">
            <!-- Top Row: Header with Title & Actions -->
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-200">
                        <i class="fas fa-route text-lg text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 truncate" title="${wayBill.project_name}">${wayBill.project_name}</h3>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="flex items-center gap-2">
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
            
            <!-- ID & Date Row -->
            <div class="flex items-center gap-2 mb-3">
                <span class="text-sm font-bold text-gray-800 cursor-pointer hover:text-blue-600 copy-text transition-colors" title="Click to copy ID">
                    ${wayBill.waybill_id}
                    <i class="fas fa-copy text-xs ml-1 opacity-50"></i>
                </span>
                <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                <span class="text-xs text-gray-500">
                    <i class="fas fa-calendar-alt mr-1"></i>${formattedDate}
                </span>
            </div>
            
            <!-- Bottom Row: Customer & Destination -->
            <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-user text-blue-600 text-xs"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-gray-800 truncate" title="${wayBill.customer_name}">${wayBill.customer_name}</p>
                        <p class="text-xs text-gray-500 truncate" title="${wayBill.customer_address}">${wayBill.customer_address}</p>
                    </div>
                </div>
                
                <div class="flex-shrink-0 ml-4 flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-map-marker-alt text-orange-600 text-xs"></i>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Destination</p>
                        <p class="text-base font-bold text-blue-600" title="${wayBill.place_supply}">${wayBill.place_supply}</p>
                    </div>
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
        sessionStorage.setItem('currentTab-status', 'update');
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
    sessionStorage.setItem('currentTab-status', 'new');
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

            // Hide view preview button for new waybills (only available in update mode)
            const viewPreviewBtn = document.getElementById('view-preview');
            if (viewPreviewBtn) viewPreviewBtn.style.display = 'none';
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
        `<div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
            <div class="text-yellow-500 text-5xl mb-4"><i class="fas fa-search"></i></div>
            <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Results Found</h2>
            <p class="text-gray-500">No way bills match your search</p>
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
