// @ts-nocheck
/**
 * Quotation Module - Main Entry Point
 * Handles: initial load, search, filters, navigation, and keyboard shortcuts.
 * Card/table rendering → quotationTable.ts
 * Form/edit/clone logic → quotationForms.ts
 * View/preview rendering → quotationView.ts
 */

const quotationListDiv = document.querySelector(".records") as HTMLElement;

// Filter state is now managed in src/utils/quotationFilters.ts
// Shortcuts state is now managed in src/utils/keyboardShortcuts.ts



// ====== Trash Mode State ======
let isTrashMode = false;

// ====== Refresh Button Animation Helper ======
function triggerRefreshAnimation(btn: HTMLButtonElement) {
    btn.classList.remove('spinning');
    // Force reflow to restart animation
    void btn.offsetWidth;
    btn.classList.add('spinning');
    setTimeout(() => btn.classList.remove('spinning'), 650);
}

document.addEventListener("DOMContentLoaded", () => {
    loadRecentQuotations();

    document.getElementById('new-quotation')!.addEventListener('click', showNewQuotationForm);

    // ====== Refresh Button (universal — refreshes trash or normal depending on mode) ======
    const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            triggerRefreshAnimation(refreshBtn);
            if (isTrashMode) {
                loadTrashQuotations();
            } else {
                loadRecentQuotations();
            }
        });
    }

    // ====== Trash Button ======
    const trashBtn = document.getElementById('trash-btn') as HTMLButtonElement;
    if (trashBtn) {
        trashBtn.addEventListener('click', () => {
            enterTrashMode();
        });
    }

    const closeTrashBtn = document.getElementById('close-trash-btn') as HTMLButtonElement;
    if (closeTrashBtn) {
        closeTrashBtn.addEventListener('click', () => {
            exitTrashMode();
        });
    }

    const restoreAllBtn = document.getElementById('trash-restore-all-btn') as HTMLButtonElement;
    if (restoreAllBtn) {
        restoreAllBtn.addEventListener('click', async () => {
            if (!(window as any).electronAPI) return;
            (window as any).electronAPI.showAlert2('Restore ALL deleted quotations?');
            (window as any).electronAPI.receiveAlertResponse(async (response: string) => {
                if (response === 'Yes') {
                    try {
                        const res = await fetch('/quotation/trash/restore-all', { method: 'POST' });
                        const data = await res.json();
                        showToast(data.message || 'All quotations restored');
                        exitTrashMode();
                    } catch (e) {
                        (window as any).electronAPI?.showAlert1('Failed to restore all quotations.');
                    }
                }
            });
        });
    }

    const deleteAllBtn = document.getElementById('trash-delete-all-btn') as HTMLButtonElement;
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', async () => {
            if (!(window as any).electronAPI) return;
            (window as any).electronAPI.showAlert2('Permanently DELETE ALL trashed quotations? This cannot be undone.');
            (window as any).electronAPI.receiveAlertResponse(async (response: string) => {
                if (response === 'Yes') {
                    try {
                        const res = await fetch('/quotation/trash', { method: 'DELETE' });
                        const data = await res.json();
                        showToast(data.message || 'All trashed quotations deleted');
                        loadTrashQuotations();
                    } catch (e) {
                        (window as any).electronAPI?.showAlert1('Failed to delete all trashed quotations.');
                    }
                }
            });
        });
    }

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

// ====== Trash Mode Helpers ======

function enterTrashMode() {
    isTrashMode = true;

    const trashToolbar = document.getElementById('trash-toolbar');
    const newQuotationBtn = document.getElementById('new-quotation');
    const trashBtn = document.getElementById('trash-btn');
    const closeTrashBtn = document.getElementById('close-trash-btn');
    const mainContent = document.getElementById('main-content');

    // Show sub-toolbar band
    if (trashToolbar) trashToolbar.style.display = 'block';
    // Push main content down to make room for sub-toolbar
    if (mainContent) mainContent.style.paddingTop = 'calc(6rem + 2.75rem)';
    // Hide normal header buttons (refresh stays visible — it works universally)
    if (newQuotationBtn) newQuotationBtn.style.display = 'none';
    if (trashBtn) trashBtn.style.display = 'none';
    // Show Close Trash button in header
    if (closeTrashBtn) closeTrashBtn.style.display = '';

    loadTrashQuotations();
}

function exitTrashMode() {
    isTrashMode = false;

    const trashToolbar = document.getElementById('trash-toolbar');
    const newQuotationBtn = document.getElementById('new-quotation');
    const trashBtn = document.getElementById('trash-btn');
    const closeTrashBtn = document.getElementById('close-trash-btn');
    const mainContent = document.getElementById('main-content');

    // Hide sub-toolbar band
    if (trashToolbar) trashToolbar.style.display = 'none';
    // Reset main content padding
    if (mainContent) mainContent.style.paddingTop = '';
    // Restore normal header buttons
    if (newQuotationBtn) newQuotationBtn.style.display = '';
    if (trashBtn) trashBtn.style.display = '';
    // Hide Close Trash button
    if (closeTrashBtn) closeTrashBtn.style.display = 'none';

    loadRecentQuotations();
}


async function loadTrashQuotations() {
    try {
        const response = await fetch('/quotation/trash');
        if (!response.ok) throw new Error('Failed to fetch trashed quotations');

        const data = await response.json();
        const trashed = (data.quotation || []);

        if (!quotationListDiv) return;
        quotationListDiv.innerHTML = '';

        if (trashed.length === 0) {
            quotationListDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                    <div class="text-green-500 text-5xl mb-4">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">Trash is Empty</h2>
                    <p class="text-gray-600">No deleted quotations found</p>
                </div>
            `;
            return;
        }

        trashed.forEach((quotation: any) => {
            const card = (window as any).quotationTable?.createTrashCard(quotation);
            if (card) quotationListDiv.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading trash:', error);
        if (quotationListDiv) {
            quotationListDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 fade-in">
                    <div class="bg-red-100 rounded-full p-8 mb-4">
                        <i class="fas fa-exclamation-triangle text-red-500 text-6xl"></i>
                    </div>
                    <h2 class="text-2xl font-semibold text-gray-700 mb-2">Failed to Load Trash</h2>
                    <p class="text-gray-500">Please try again</p>
                </div>
            `;
        }
    }
}



// ====== Data Loading ======

// Load recent quotations from the server
async function loadRecentQuotations() {
    try {
        const response = await fetch(`/quotation/recent-quotations`);
        if (!response.ok) {
            throw new Error("Failed to fetch quotations");
        }

        const data = await response.json();
        
        // Map backend schema to expected structure for filtering/sorting
        allQuotations = (data.quotation || []).map((q: any) => ({
            ...q,
            total_amount_tax: q.totals?.grand_total || q.total_amount_tax || 0,
            quotation_id: q.quotation_no || q.quotation_id
        }));
        
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

// Filters logic extracted to quotationFilters.ts

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

    const validTillInput = document.getElementById('valid-till') as HTMLInputElement;
    if (validTillInput) {
        const validTill = new Date();
        validTill.setDate(validTill.getDate() + 30);
        const yyyy = validTill.getFullYear();
        const mm = String(validTill.getMonth() + 1).padStart(2, '0');
        const dd = String(validTill.getDate()).padStart(2, '0');
        validTillInput.value = `${yyyy}-${mm}-${dd}`;
    }

    const statusInput = document.getElementById('quotation-status') as HTMLSelectElement;
    if (statusInput) statusInput.value = 'Draft';

    // Focus on the Project Name field and hide Print/PDF buttons for new quotations
    setTimeout(() => {
        const idInput = document.getElementById('id') as HTMLInputElement;
        if (idInput) {
            idInput.value = ''; // Clear any previous value
        }
        const projectNameInput = document.getElementById('project-name') as HTMLInputElement;
        if (projectNameInput) {
            projectNameInput.focus();
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

// Keyboard Shortcuts logic extracted to keyboardShortcuts.ts
