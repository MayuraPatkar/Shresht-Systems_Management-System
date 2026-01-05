const purchaseOrderListDiv = document.querySelector(".records");

// Filter state
let allPurchaseOrders = [];
let currentFilters = {
    dateFilter: 'all',
    sortBy: 'date-desc',
    customStartDate: null,
    customEndDate: null
};

const PURCHASEORDER_SHORTCUT_GROUPS = [
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
            { label: 'New Purchase', keys: ['Ctrl', 'N'] },
            { label: 'Save Purchase', keys: ['Ctrl', 'S'] },
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

document.addEventListener("DOMContentLoaded", () => {
    loadRecentPurchaseOrders();
    document.getElementById('new-purchase').addEventListener('click', showNewPurchaseForm);
    document.getElementById('home-btn')?.addEventListener('click', () => {
        window.location = '/purchaseorder';
    });
    const poSearchInput = document.getElementById('search-input');
    poSearchInput.addEventListener('keydown', function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSearch();
        }
    });
    // Real-time search while typing (debounced)
    poSearchInput.addEventListener('input', debounce(() => {
        handleSearch();
    }, 300));

    initShortcutsModal();
    initPurchaseOrderFilters();
    document.addEventListener('keydown', handleQuotationKeyboardShortcuts, true);

    // Check for URL params for cross-module navigation (from Dashboard Recent Activity)
    const urlParams = new URLSearchParams(window.location.search);
    const viewPurchaseOrderId = urlParams.get('view');
    if (viewPurchaseOrderId) {
        // Delay to ensure DOM is ready
        setTimeout(() => {
            if (typeof viewPurchaseOrder === 'function') {
                viewPurchaseOrder(viewPurchaseOrderId);
            }
        }, 300);
    }
});

// Load recent purchase orders from the server
async function loadRecentPurchaseOrders() {
    try {
        const response = await fetch(`/purchaseOrder/recent-purchase-orders`);
        if (!response.ok) {
            purchaseOrderListDiv.innerHTML = "<div class='flex flex-col items-center justify-center py-12 fade-in' style='min-height: calc(100vh - 11rem);'><div class='text-purple-500 text-5xl mb-4'><i class='fas fa-shopping-cart'></i></div><p class='text-gray-500 text-lg'>No Purchase Orders Found.</p></div>";
            return;
        }

        const data = await response.json();
        allPurchaseOrders = data.purchaseOrder || [];
        applyPurchaseOrderFilters();
    } catch (error) {
        console.error("Error loading purchase orders:", error);
        purchaseOrderListDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 fade-in">
                <div class="bg-red-100 rounded-full p-8 mb-4">
                    <i class="fas fa-exclamation-triangle text-red-500 text-6xl"></i>
                </div>
                <h2 class="text-2xl font-semibold text-gray-700 mb-2">Failed to Load Purchase Orders</h2>
                <p class="text-gray-500 mb-6">Please try again later</p>
                <button onclick="loadRecentPurchaseOrders()" 
                    class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium">
                    <i class="fas fa-redo"></i>
                    Retry
                </button>
            </div>
        `;
    }
}

// Apply filters to purchase orders
function applyPurchaseOrderFilters() {
    const filtered = applyFilters(allPurchaseOrders, {
        dateFilter: currentFilters.dateFilter,
        sortBy: currentFilters.sortBy,
        dateField: 'createdAt',
        amountField: 'total_amount',
        nameField: 'supplier_name',
        customStartDate: currentFilters.customStartDate,
        customEndDate: currentFilters.customEndDate
    });
    renderPurchaseOrders(filtered);
}

// Initialize filter event listeners
function initPurchaseOrderFilters() {
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
                    applyPurchaseOrderFilters();
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
            applyPurchaseOrderFilters();
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
            applyPurchaseOrderFilters();
            if (filterPopover) filterPopover.classList.add('hidden');
        });
    }
}

// Render purchase orders in the list
function renderPurchaseOrders(purchaseOrders) {
    purchaseOrderListDiv.innerHTML = "";
    if (!purchaseOrders || purchaseOrders.length === 0) {
        purchaseOrderListDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                <div class="text-purple-500 text-5xl mb-4">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">No Purchase Orders Found</h2>
                <p class="text-gray-600">Start creating purchase orders for your suppliers</p>
            </div>
        `;
        return;
    }
    purchaseOrders.forEach(purchaseOrder => {
        const purchaseOrderDiv = createPurchaseOrderDiv(purchaseOrder);
        purchaseOrderListDiv.appendChild(purchaseOrderDiv);
    });
}

// Create a purchase order div element
function createPurchaseOrderDiv(purchaseOrder) {
    const purchaseOrderDiv = document.createElement("div");
    purchaseOrderDiv.className = "group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-purple-400 overflow-hidden fade-in";

    // Format the date for display
    const dateToFormat = purchaseOrder.purchase_date || purchaseOrder.createdAt;
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

    purchaseOrderDiv.innerHTML = `
        <!-- Left Border Accent -->
        <div class="flex">
            <div class="w-1.5 bg-gradient-to-b from-green-500 to-emerald-600 rounded-l-lg"></div>
            <div class="relative p-5 flex-1">
            <!-- Top Row: Header with Title & Actions -->
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-200">
                        <i class="fas fa-shopping-cart text-lg text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 truncate" title="${purchaseOrder.supplier_name}">${purchaseOrder.supplier_name}</h3>
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
                <span class="text-sm font-bold text-gray-800 cursor-pointer hover:text-green-600 copy-text transition-colors" title="Click to copy ID">
                    ${purchaseOrder.purchase_order_id}
                    <i class="fas fa-copy text-xs ml-1 opacity-50"></i>
                </span>
                <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                <span class="text-xs text-gray-500">
                    <i class="fas fa-calendar-alt mr-1"></i>${formattedDate}
                </span>
            </div>
            
            <!-- Bottom Row: Address & Amount -->
            <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-map-marker-alt text-blue-600 text-xs"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-gray-800 truncate" title="${purchaseOrder.supplier_address}">${purchaseOrder.supplier_address}</p>
                    </div>
                </div>
                
                <div class="flex-shrink-0 ml-4 text-right">
                    <p class="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Total</p>
                    <p class="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">₹${formatIndian(purchaseOrder.total_amount, 2)}</p>
                </div>
            </div>
        </div>
        </div>
    `;

    const copyElement = purchaseOrderDiv.querySelector('.copy-text');
    const viewBtn = purchaseOrderDiv.querySelector('.view-btn');
    const editBtn = purchaseOrderDiv.querySelector('.edit-btn');
    const deleteBtn = purchaseOrderDiv.querySelector('.delete-btn');

    // Copy ID functionality
    copyElement.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(purchaseOrder.purchase_order_id);
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
        viewPurchaseOrder(purchaseOrder.purchase_order_id);
    });

    editBtn.addEventListener('click', () => {
        openPurchaseOrder(purchaseOrder.purchase_order_id);
    });

    deleteBtn.addEventListener('click', () => {
        window.electronAPI.showAlert2('Are you sure you want to delete this purchase order?');
        if (window.electronAPI) {
            window.electronAPI.receiveAlertResponse((response) => {
                if (response === "Yes") {
                    deletePurchaseOrder(purchaseOrder.purchase_order_id);
                }
            });
        }
    });

    return purchaseOrderDiv;
}

// Delete a purchase order
async function deletePurchaseOrder(purchaseOrderId) {
    await deleteDocument('purchaseOrder', purchaseOrderId, 'Purchase Order', loadRecentPurchaseOrders);
}

// Show the new purchase order form
function showNewPurchaseForm() {
    showNewDocumentForm({
        homeId: 'home',
        formId: 'new',
        newButtonId: 'new-purchase'
    });
    // Set default purchase date to today when opening new purchase order form
    const purchaseDateInput = document.getElementById('purchase-date');
    if (purchaseDateInput && !purchaseDateInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        purchaseDateInput.value = `${yyyy}-${mm}-${dd}`;
    }
}

// Handle search functionality
async function handleSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) {
        await loadRecentPurchaseOrders();
        return;
    }

    await searchDocuments('purchaseOrder', query, purchaseOrderListDiv, createPurchaseOrderDiv,
        `<div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
            <div class="text-yellow-500 text-5xl mb-4"><i class="fas fa-search"></i></div>
            <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Results Found</h2>
            <p class="text-gray-500">No purchase orders match your search</p>
        </div>`);
}

// NOTE: formatDate has been moved to public/js/shared/utils.js
// It is now available globally via window.formatDate

function initShortcutsModal() {
    shortcutsModalRef = document.getElementById('shortcuts-modal');
    const shortcutsBtn = document.getElementById('shortcuts-btn');
    const closeBtn = document.getElementById('close-shortcuts');
    const contentContainer = document.getElementById('shortcuts-content');

    if (!shortcutsModalRef || !shortcutsBtn || !closeBtn || !contentContainer) {
        return;
    }

    contentContainer.innerHTML = PURCHASEORDER_SHORTCUT_GROUPS.map(renderShortcutSection).join('');

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
    return currentStep === 2;
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

    const viewPrintBtn = document.getElementById('print-project');
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
                const newBtn = document.getElementById('new-purchase');
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