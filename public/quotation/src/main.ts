// @ts-nocheck
/**
 * Quotation Module - Main Entry Point
 * Handles: initial load, search, filters, navigation, and keyboard shortcuts.
 * Card/table rendering → quotationTable.ts
 * Form/edit/clone logic → quotationForms.ts
 * View/preview rendering → quotationView.ts
 */

const quotationListDiv = document.querySelector(".records") as HTMLElement;

// Filter state
let allQuotations: any[] = [];
let currentFilters = {
    dateFilter: 'all',
    sortBy: 'date-desc',
    customStartDate: null as string | null,
    customEndDate: null as string | null
};

const QUOTATION_SHORTCUT_GROUPS = [
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
            { label: 'New Quotation', keys: ['Ctrl', 'N'] },
            { label: 'Save Quotation', keys: ['Ctrl', 'S'] },
            { label: 'View Preview', keys: ['Ctrl', 'P'] },
            { label: 'Print', keys: ['Ctrl', 'Shift', 'P'] },
            { label: 'Add Item', keys: ['Ctrl', 'I'] },
            { label: 'Delete Item', keys: ['Ctrl', 'Delete'] },
            { label: 'Go Home', keys: ['Ctrl', 'H'] },
            { label: 'Focus Search', keys: ['Ctrl', 'F'] }
        ]
    }
];

let shortcutsModalRef: HTMLElement | null = null;

const isMac = navigator.userAgent.toLowerCase().includes('mac');

document.addEventListener("DOMContentLoaded", () => {
    loadRecentQuotations();

    document.getElementById('new-quotation')!.addEventListener('click', showNewQuotationForm);

    // Attach search: Enter key and real-time input (debounced)
    const qSearchInput = document.getElementById('search-input') as HTMLInputElement;
    qSearchInput.addEventListener('keydown', function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSearch();
        }
    });
    // Real-time search while typing (300ms debounce)
    qSearchInput.addEventListener('input', debounce(() => {
        handleSearch();
    }, 300));

    initShortcutsModal();
    initQuotationFilters();

    const dateInput = document.getElementById('quotation-date') as HTMLInputElement;

    if (dateInput) {
        dateInput.addEventListener('change', function () {
            this.blur();
        });

        dateInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.blur();
            }
        });
    }

    document.addEventListener('keydown', handleQuotationKeyboardShortcuts, true);
});

// ====== Data Loading ======

// Load recent quotations from the server
async function loadRecentQuotations() {
    try {
        const response = await fetch(`/quotation/recent-quotations`);
        if (!response.ok) {
            throw new Error("Failed to fetch quotations");
        }

        const data = await response.json();
        allQuotations = data.quotation || [];
        applyQuotationFilters();
    } catch (error) {
        console.error("Error loading quotations:", error);
        quotationListDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 fade-in">
                <div class="bg-red-100 rounded-full p-8 mb-4">
                    <i class="fas fa-exclamation-triangle text-red-500 text-6xl"></i>
                </div>
                <h2 class="text-2xl font-semibold text-gray-700 mb-2">Failed to Load Quotations</h2>
                <p class="text-gray-500 mb-6">Please try again later</p>
                <button onclick="loadRecentQuotations()" 
                    class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium">
                    <i class="fas fa-redo"></i>
                    Retry
                </button>
            </div>
        `;
    }
}

// ====== Filters ======

// Apply filters to quotations
function applyQuotationFilters() {
    const filtered = applyFilters(allQuotations, {
        dateFilter: currentFilters.dateFilter,
        sortBy: currentFilters.sortBy,
        dateField: 'quotation_date',
        amountField: 'total_amount_tax',
        nameField: 'project_name',
        customStartDate: currentFilters.customStartDate,
        customEndDate: currentFilters.customEndDate
    });
    if (window.quotationTable) {
        window.quotationTable.renderQuotations(filtered);
    }
}

// Initialize filter event listeners
function initQuotationFilters() {
    const filterBtn = document.getElementById('filter-btn') as HTMLButtonElement;
    const filterPopover = document.getElementById('filter-popover') as HTMLElement;
    const dateFilter = document.getElementById('date-filter') as HTMLSelectElement;
    const sortFilter = document.getElementById('sort-filter') as HTMLSelectElement;
    const clearFiltersBtn = document.getElementById('clear-filters-btn') as HTMLButtonElement;
    const applyFiltersBtn = document.getElementById('apply-filters-btn') as HTMLButtonElement;

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
            if (!filterPopover.contains(e.target as Node) && e.target !== filterBtn) {
                filterPopover.classList.add('hidden');
            }
        });
    }

    // Handle date filter custom option
    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            const value = (e.target as HTMLSelectElement).value;
            if (value === 'custom') {
                showCustomDateModal((startDate: string, endDate: string) => {
                    currentFilters.dateFilter = 'custom';
                    currentFilters.customStartDate = startDate;
                    currentFilters.customEndDate = endDate;
                    applyQuotationFilters();
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
            applyQuotationFilters();
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
            applyQuotationFilters();
            if (filterPopover) filterPopover.classList.add('hidden');
        });
    }
}

// ====== Navigation ======

document.getElementById('home-btn')!.addEventListener('click', () => {
    sessionStorage.removeItem('currentTab-status');
    (window as any).location = '/quotation';
});

// Show the new quotation form
function showNewQuotationForm() {
    sessionStorage.setItem('currentTab-status', 'new');
    showNewDocumentForm({
        homeId: 'home',
        formId: 'new',
        newButtonId: 'new-quotation',
        previewButtonId: 'view-preview',
        viewId: 'view',
        stepIndicatorId: 'step-indicator',
        currentStep: typeof currentStep !== 'undefined' ? currentStep : undefined,
        totalSteps: typeof totalSteps !== 'undefined' ? totalSteps : undefined
    });

    // Set default date to today
    const dateInput = document.getElementById('quotation-date') as HTMLInputElement;
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // Focus on the Quotation ID field and hide Print/PDF buttons for new quotations
    setTimeout(() => {
        const idInput = document.getElementById('id') as HTMLInputElement;
        if (idInput) {
            idInput.readOnly = false;
            idInput.style.backgroundColor = ''; // Reset to default
            idInput.value = ''; // Clear any previous value
            idInput.focus();
        }
        // Reset custom ID flag (it's in quotationForms.ts scope)
        if (typeof isCustomId !== 'undefined') {
            (window as any).isCustomId = false;
        }
        // Hide Print and Save as PDF buttons for new quotations
        const printBtn = document.getElementById('print-btn') as HTMLButtonElement;
        const savePdfBtn = document.getElementById('save-pdf-btn') as HTMLButtonElement;
        const viewPreviewBtn = document.getElementById('view-preview') as HTMLButtonElement;

        if (printBtn) printBtn.style.display = 'none';
        if (savePdfBtn) savePdfBtn.style.display = 'none';
        if (viewPreviewBtn) viewPreviewBtn.style.display = 'none';
    }, 100);
}

// ====== Search ======

// Handle search functionality
async function handleSearch() {
    const query = (document.getElementById('search-input') as HTMLInputElement).value.trim();
    if (!query) {
        await loadRecentQuotations();
        return;
    }

    const cardRenderer = window.quotationTable ? window.quotationTable.createQuotationCard.bind(window.quotationTable) : null;
    
    if (cardRenderer) {
        await searchDocuments('quotation', query, quotationListDiv, cardRenderer,
            `<div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                <div class="text-yellow-500 text-5xl mb-4"><i class="fas fa-search"></i></div>
                <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Results Found</h2>
                <p class="text-gray-500">No quotations match your search</p>
            </div>`);
    }
}

// ====== Global Toast ======

function showToast(message: string) {
    const existingToast = document.getElementById('global-toast');
    if (existingToast) {
        existingToast.remove();
    }
    const toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.textContent = message;
    toast.style.cssText = 'display:none;position:fixed;bottom:20px;right:20px;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:9999;';
    document.body.appendChild(toast);
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
        toast.remove();
    }, 2000);
}

// ====== Shortcuts Modal ======

function initShortcutsModal() {
    shortcutsModalRef = document.getElementById('shortcuts-modal');
    const shortcutsBtn = document.getElementById('shortcuts-btn');
    const closeBtn = document.getElementById('close-shortcuts');
    const contentContainer = document.getElementById('shortcuts-content');

    if (!shortcutsModalRef || !shortcutsBtn || !closeBtn || !contentContainer) {
        return;
    }

    contentContainer.innerHTML = QUOTATION_SHORTCUT_GROUPS.map(renderShortcutSection).join('');

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

function renderShortcutSection(section: any) {
    return `
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
}

function renderShortcutRow(item: any) {
    return `
        <div class="shortcut-row">
            <span class="text-gray-700">${item.label}</span>
            ${renderShortcutKeys(item.keys)}
        </div>
    `;
}

function renderShortcutKeys(keys: string[]) {
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

// ====== Keyboard Shortcuts ======

function isSectionVisible(sectionId: string): boolean {
    const el = document.getElementById(sectionId);
    if (!el) return false;
    return window.getComputedStyle(el).display !== 'none';
}

function isFormActive(): boolean {
    return isSectionVisible('new');
}

function isExistingDocument(): boolean {
    const status = sessionStorage.getItem('currentTab-status');
    return status === 'update' || status === 'clone';
}

function isPreviewStepActive(): boolean {
    if (typeof currentStep === 'undefined' || typeof totalSteps === 'undefined') {
        return false;
    }
    return currentStep === totalSteps;
}

async function runOnPreviewStep(callback: () => void) {
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
        const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
        if (!nextBtn) {
            return;
        }

        // Store current step to detect if navigation was blocked by validation
        const stepBefore = typeof currentStep !== 'undefined' ? currentStep : 0;

        // Click next button (this triggers validation)
        nextBtn.click();

        // Wait a bit for validation and step change to process
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if step actually changed (validation passed)
        const stepAfter = typeof currentStep !== 'undefined' ? currentStep : 0;

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

function isItemsStepActive(): boolean {
    if (typeof currentStep === 'undefined') {
        return false;
    }
    return currentStep === 3;
}

function isHomeScreenActive(): boolean {
    const homeSectionVisible = isSectionVisible('home');
    return homeSectionVisible && !isFormActive() && !isSectionVisible('view');
}

function triggerAddEntry(): boolean {
    if (!isFormActive()) {
        return false;
    }

    const itemsBtn = document.getElementById('add-item-btn') as HTMLButtonElement;
    if (itemsBtn && isItemsStepActive()) {
        itemsBtn.click();
        return true;
    }

    const nonItemBtn = document.getElementById('add-non-item-btn') as HTMLButtonElement;
    if (nonItemBtn && typeof currentStep !== 'undefined' && currentStep === 4) {
        nonItemBtn.click();
        return true;
    }

    return false;
}

function triggerPrintAction(): boolean {
    const formPrintBtn = document.getElementById('print-btn') as HTMLButtonElement;
    // Only trigger print if button exists, form is active, AND button is visible
    if (formPrintBtn && isFormActive() && window.getComputedStyle(formPrintBtn).display !== 'none') {
        runOnPreviewStep(() => formPrintBtn.click());
        return true;
    }

    const viewPrintBtn = document.getElementById('printProject') as HTMLButtonElement;
    if (viewPrintBtn && isSectionVisible('view')) {
        viewPrintBtn.click();
        return true;
    }

    return false;
}

function isTypingContext(): boolean {
    const active = document.activeElement;
    if (!active) return false;
    const tagName = active.tagName;
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable || tagName === 'SELECT';
}

function handleQuotationKeyboardShortcuts(event: KeyboardEvent) {
    const keyLower = event.key.toLowerCase();
    const isModifierPressed = event.ctrlKey || event.metaKey;
    const homeButton = document.getElementById('home-btn');

    if (!shortcutsModalRef) {
        shortcutsModalRef = document.getElementById('shortcuts-modal');
    }

    if (!event.altKey && isModifierPressed) {
        switch (keyLower) {
            case 'n': {
                const newBtn = document.getElementById('new-quotation') as HTMLButtonElement;
                if (newBtn && window.getComputedStyle(newBtn).display !== 'none') {
                    event.preventDefault();
                    event.stopPropagation();
                    newBtn.click();
                }
                break;
            }
            case 's': {
                const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
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
                    const previewBtn = document.getElementById('view-preview') as HTMLButtonElement;
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
                const searchInput = document.getElementById('search-input') as HTMLInputElement;
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
            (window as any).location = '/dashboard';
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
            const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
            if (nextBtn && !nextBtn.disabled) {
                event.preventDefault();
                event.stopPropagation();
                nextBtn.click();
            }
            return;
        }
    }

    if (event.key === 'Backspace' && isFormActive()) {
        const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
        if (prevBtn && !prevBtn.disabled) {
            event.preventDefault();
            event.stopPropagation();
            prevBtn.click();
        }
    }
}