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
let isArchiveMode = false;
let trashedQuotationsCount = 0;

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
    updateArchivedCount();

    // Dynamically toggle Header elements visibility based on active section
    const homeSection = document.getElementById('home');
    const newSection = document.getElementById('new');
    const viewSection = document.getElementById('view');
    const homeBtn = document.getElementById('home-btn');

    const updateHeaderVisibility = () => {
        const isHomeVisible = homeSection ? window.getComputedStyle(homeSection).display !== 'none' : true;
        const isFormActive = newSection ? window.getComputedStyle(newSection).display !== 'none' : false;
        const isViewActive = viewSection ? window.getComputedStyle(viewSection).display !== 'none' : false;

        const searchWrapper = document.getElementById('search-wrapper');
        const refreshBtn = document.getElementById('refresh-btn');
        const trashBtn = document.getElementById('showDeletedBtn');
        const archivedBtn = document.getElementById('archived-quotations-btn');
        const closeTrashBtn = document.getElementById('close-trash-btn');
        const restoreAllBtn = document.getElementById('trash-restore-all-btn');
        const deleteAllBtn = document.getElementById('trash-delete-all-btn');
        const newQuotationBtn = document.getElementById('new-quotation');
        const viewPreviewBtn = document.getElementById('view-preview');
        const editBtn = document.getElementById('editQuotationBtnView');
        const duplicateBtn = document.getElementById('duplicateQuotationBtnView');

        if (isFormActive) {
            // Creation/edit/clone mode: hide search, filter, refresh, trash, restore-all, delete-all, new-quotation. Show home and view-preview.
            if (searchWrapper) searchWrapper.style.display = 'none';
            if (refreshBtn) refreshBtn.style.display = 'none';
            if (trashBtn) trashBtn.style.display = 'none';
            if (archivedBtn) archivedBtn.style.display = 'none';
            if (closeTrashBtn) closeTrashBtn.style.display = 'none';
            if (restoreAllBtn) restoreAllBtn.style.display = 'none';
            if (deleteAllBtn) deleteAllBtn.style.display = 'none';
            if (newQuotationBtn) newQuotationBtn.style.display = 'none';
            if (viewPreviewBtn) viewPreviewBtn.style.display = 'flex';
            if (homeBtn) homeBtn.style.display = 'flex';
            if (editBtn) editBtn.style.display = 'none';
            if (duplicateBtn) duplicateBtn.style.display = 'none';
        } else if (isViewActive) {
            // View mode: hide search, filter, refresh, trash, restore-all, delete-all, view-preview. Show home, new-quotation.
            if (searchWrapper) searchWrapper.style.display = 'none';
            if (refreshBtn) refreshBtn.style.display = 'none';
            if (trashBtn) trashBtn.style.display = 'none';
            if (archivedBtn) archivedBtn.style.display = 'none';
            if (closeTrashBtn) closeTrashBtn.style.display = 'none';
            if (restoreAllBtn) restoreAllBtn.style.display = 'none';
            if (deleteAllBtn) deleteAllBtn.style.display = 'none';
            if (newQuotationBtn) newQuotationBtn.style.display = 'flex';
            if (viewPreviewBtn) viewPreviewBtn.style.display = 'none';
            if (homeBtn) homeBtn.style.display = 'flex';
            if (editBtn) editBtn.style.display = 'flex';
            if (duplicateBtn) duplicateBtn.style.display = 'flex';
        } else {
            // Home/List/Trash mode
            if (searchWrapper) searchWrapper.style.display = 'flex';
            if (refreshBtn) refreshBtn.style.display = 'flex';
            if (homeBtn) homeBtn.style.display = isHomeVisible ? 'none' : 'flex';
            if (viewPreviewBtn) viewPreviewBtn.style.display = 'none';
            if (editBtn) editBtn.style.display = 'none';
            if (duplicateBtn) duplicateBtn.style.display = 'none';

            if (isTrashMode) {
                if (newQuotationBtn) newQuotationBtn.style.display = 'none';
                if (trashBtn) trashBtn.style.display = 'none';
                if (archivedBtn) archivedBtn.style.display = 'none';
                if (closeTrashBtn) closeTrashBtn.style.display = '';
                if (restoreAllBtn) restoreAllBtn.style.display = 'flex';
                if (deleteAllBtn) deleteAllBtn.style.display = 'flex';
            } else {
                if (newQuotationBtn) newQuotationBtn.style.display = 'flex';
                if (trashBtn) trashBtn.style.display = 'flex';
                if (archivedBtn) archivedBtn.style.display = 'flex';
                if (closeTrashBtn) closeTrashBtn.style.display = 'none';
                if (restoreAllBtn) restoreAllBtn.style.display = 'none';
                if (deleteAllBtn) deleteAllBtn.style.display = 'none';
            }
        }
    };

    if (homeSection && homeBtn) {
        const observer = new MutationObserver(updateHeaderVisibility);
        observer.observe(homeSection, { attributes: true, attributeFilter: ['style'] });
        if (newSection) {
            observer.observe(newSection, { attributes: true, attributeFilter: ['style'] });
        }
        if (viewSection) {
            observer.observe(viewSection, { attributes: true, attributeFilter: ['style'] });
        }
        (window as any).updateHeaderVisibility = updateHeaderVisibility;
        updateHeaderVisibility();
    }

    document.getElementById('new-quotation')!.addEventListener('click', () => {
        sessionStorage.setItem('currentTab-status', 'new');
        window.location.href = '/quotation/form';
    });

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
    const trashBtn = document.getElementById('showDeletedBtn') as HTMLButtonElement;
    if (trashBtn) {
        trashBtn.addEventListener('click', () => {
            enterTrashMode();
        });
    }

    const archivedBtn = document.getElementById('archived-quotations-btn') as HTMLButtonElement;
    if (archivedBtn) {
        archivedBtn.addEventListener('click', () => {
            isTrashMode = false;
            isArchiveMode = !isArchiveMode;
            updateArchivedButtonVisuals();
            updateHeaderVisibility();
            loadRecentQuotations();
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
            if (trashedQuotationsCount === 0) {
                (window as any).electronAPI.showAlert1('No items to restore.');
                return;
            }
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
            if (trashedQuotationsCount === 0) {
                (window as any).electronAPI.showAlert1('No items to delete.');
                return;
            }
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
    (window as any).isTrashMode = true;
    isArchiveMode = false;
    updateArchivedButtonVisuals();

    if (typeof (window as any).updateHeaderVisibility === 'function') {
        (window as any).updateHeaderVisibility();
    }

    (window as any).quotationTable?.updateTableHeader(true);
    loadTrashQuotations();
}

function exitTrashMode() {
    isTrashMode = false;
    (window as any).isTrashMode = false;

    if (typeof (window as any).updateHeaderVisibility === 'function') {
        (window as any).updateHeaderVisibility();
    }

    (window as any).quotationTable?.updateTableHeader(false);
    loadRecentQuotations();
}


async function loadTrashQuotations() {
    const mobileContainer = document.getElementById("quotation-cards-mobile") as HTMLElement;
    try {
        const response = await fetch('/quotation/trash');
        if (!response.ok) throw new Error('Failed to fetch trashed quotations');

        const data = await response.json();
        const trashed = (data.quotation || []);
        trashedQuotationsCount = trashed.length;

        if (!quotationListDiv) return;
        quotationListDiv.innerHTML = '';
        if (mobileContainer) mobileContainer.innerHTML = '';

        (window as any).quotationTable?.updateTableHeader(true);

        if (trashed.length === 0) {
            quotationListDiv.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-10 bg-white">
                        <div class="flex flex-col items-center justify-center w-full text-center py-4 fade-in select-none mx-auto">
                            <div class="text-rose-500 text-6xl mb-4">
                                <i class="fas fa-trash-alt"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">Trash is Empty</h2>
                            <p class="text-gray-500 text-xs">No deleted quotations found</p>
                        </div>
                    </td>
                </tr>
            `;
            if (mobileContainer) {
                mobileContainer.innerHTML = `
                    <div class="text-center py-10 bg-white rounded-xl border border-slate-200 p-6">
                        <i class="fas fa-trash-alt text-3xl text-rose-500 mb-2"></i>
                        <p class="text-sm font-bold text-slate-700">Trash is Empty</p>
                    </div>`;
            }
            return;
        }

        trashed.forEach((quotation: any) => {
            const card = (window as any).quotationTable?.createTrashCard(quotation);
            if (card) quotationListDiv.appendChild(card);
        });

        if (mobileContainer) {
            mobileContainer.innerHTML = trashed.map((q: any) => {
                const formattedDate = q.quotation_date ? formatDateIndian(q.quotation_date) : '-';
                const quotationId = q.quotation_no || q.quotation_id || 'N/A';
                const customerName = q.customer_snapshot?.name || q.customer_name || '-';
                const totalAmountTax = q.totals?.grand_total || q.total_amount_tax || 0;
                const status = q.quotation_status || 'Draft';
                const deletedAt = q.deletion?.deleted_at
                    ? formatDateIndian(q.deletion.deleted_at)
                    : (q.deleted_at ? formatDateIndian(q.deleted_at) : '-');

                return `
                <div class="bg-white rounded-xl p-4 border border-red-200 shadow-sm flex flex-col gap-2.5 opacity-90">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold text-slate-450 uppercase tracking-wider">${formattedDate}</span>
                        <span class="text-xs text-red-500 font-medium"><i class="fas fa-trash mr-1"></i>Deleted on ${deletedAt}</span>
                    </div>
                    <div class="flex items-center justify-between mt-0.5">
                        <div>
                            <p class="text-sm font-bold text-slate-800 truncate max-w-[180px]">${q.project_name || '-'}</p>
                            <p class="text-xs text-slate-500 font-medium mt-0.5">${customerName}</p>
                        </div>
                        <p class="text-sm font-extrabold text-red-500">₹${formatIndian(totalAmountTax, 2)}</p>
                    </div>
                    <div class="bg-slate-50 rounded-lg p-2 flex items-center justify-between text-xs text-slate-600 border border-slate-100">
                        <span class="font-bold text-slate-400">${quotationId}</span>
                    </div>
                </div>`;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading trash:', error);
        trashedQuotationsCount = 0;
        if (quotationListDiv) {
            quotationListDiv.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-16 text-center text-slate-450 bg-white">
                        <div class="flex flex-col items-center justify-center py-16 fade-in select-none">
                            <div class="bg-red-100 rounded-full p-8 mb-4">
                                <i class="fas fa-exclamation-triangle text-red-500 text-6xl"></i>
                            </div>
                            <h2 class="text-2xl font-semibold text-gray-700 mb-2">Failed to Load Trash</h2>
                            <p class="text-gray-500">Please try again</p>
                        </div>
                    </td>
                </tr>
            `;
        }
        if (mobileContainer) {
            mobileContainer.innerHTML = `
                <div class="text-center py-10 bg-white rounded-xl border border-red-200 p-6 text-red-500 font-medium">
                    <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                    <p class="text-sm">Failed to Load Trash</p>
                </div>`;
        }
    }
}



// ====== Data Loading ======

// Load recent quotations from the server
async function loadRecentQuotations() {
    try {
        const response = await fetch(`/quotation/recent-quotations${isArchiveMode ? '?status=archived' : ''}`);
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
        updateArchivedCount();
    } catch (error) {
        console.error("Error loading quotations:", error);
        quotationListDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 fade-in select-none">
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

async function updateArchivedCount() {
    try {
        const response = await fetch('/quotation/recent-quotations?status=archived');
        if (!response.ok) return;
        const data = await response.json();
        const badge = document.getElementById('archived-count-badge');
        if (badge) badge.textContent = String((data.quotation || []).length);
    } catch (error) {
        console.error('Failed to update archived quotation count:', error);
    }
}

function updateArchivedButtonVisuals() {
    const archivedBtn = document.getElementById('archived-quotations-btn');
    if (!archivedBtn) return;
    const icon = archivedBtn.querySelector('i');
    if (isArchiveMode) {
        archivedBtn.classList.remove('bg-gray-200', 'text-gray-700', 'border-slate-200', 'hover:bg-slate-50');
        archivedBtn.classList.add('bg-amber-500', 'text-white', 'border-amber-500', 'hover:bg-amber-600');
        if (icon) icon.className = 'fas fa-box-open text-white';
    } else {
        archivedBtn.classList.remove('bg-amber-500', 'text-white', 'border-amber-500', 'hover:bg-amber-600');
        archivedBtn.classList.add('bg-gray-200', 'text-gray-700', 'border-slate-200', 'hover:bg-slate-50');
        if (icon) icon.className = 'fas fa-archive text-slate-400';
    }
}

async function archiveQuotation(quotationId: string) {
    await (window as any).quotationApi.archiveQuotation(quotationId);
    showToast(`Quotation ${quotationId} archived`);
    await loadRecentQuotations();
}

async function restoreQuotationFromArchive(quotationId: string) {
    await (window as any).quotationApi.restoreQuotationFromArchive(quotationId);
    showToast(`Quotation ${quotationId} restored`);
    await loadRecentQuotations();
}

(window as any).archiveQuotation = archiveQuotation;
(window as any).restoreQuotationFromArchive = restoreQuotationFromArchive;
(window as any).loadRecentQuotations = loadRecentQuotations;

// ====== Filters ======

// Filters logic extracted to quotationFilters.ts

// ====== Navigation ======

document.getElementById('home-btn')!.addEventListener('click', () => {
    // Guard navigation if form has unsaved changes
    const guardNavigation = (window as any).guardQuotationNavigation;
    if (typeof guardNavigation === 'function' && guardNavigation('/quotation')) {
        return; // Modal shown, navigation deferred
    }

    sessionStorage.removeItem('currentTab-status');
    const trashBtn = document.getElementById('showDeletedBtn');
    if (trashBtn) trashBtn.style.display = '';
    (window as any).location = '/quotation';
});

// Show the new quotation form
function showNewQuotationForm() {
    sessionStorage.setItem('currentTab-status', 'new');
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.style.display = 'none';
    showNewDocumentForm({
        homeId: 'home',
        formId: 'new',
        newButtonId: 'new-quotation',
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

    // Clear previous items and add 1 default empty item row
    const itemsContainer = document.getElementById("items-container");
    const nonItemsContainer = document.getElementById("non-items-container");
    const specificationsContainer = document.getElementById("specifications-container");
    const itemsTableBody = document.querySelector("#items-table tbody");
    const nonItemsTableBody = document.querySelector("#non-items-table tbody");
    const itemsSpecificationsTableBody = document.querySelector("#items-specifications-table tbody");

    if (itemsContainer) itemsContainer.innerHTML = "";
    if (nonItemsContainer) nonItemsContainer.innerHTML = "";
    if (specificationsContainer) specificationsContainer.innerHTML = "";
    if (itemsTableBody) itemsTableBody.innerHTML = "";
    if (nonItemsTableBody) nonItemsTableBody.innerHTML = "";
    if (itemsSpecificationsTableBody) itemsSpecificationsTableBody.innerHTML = "";

    if (typeof (window as any).addItem === 'function') {
        (window as any).addItem();
    }

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
        // Hide Print, Save as PDF, and Trash buttons for new/edit mode
        const printBtn = document.getElementById('print-btn') as HTMLButtonElement;
        const savePdfBtn = document.getElementById('save-pdf-btn') as HTMLButtonElement;
        const viewPreviewBtn = document.getElementById('view-preview') as HTMLButtonElement;
        const trashBtnEl = document.getElementById('showDeletedBtn') as HTMLButtonElement;

        if (printBtn) printBtn.style.display = 'none';
        if (savePdfBtn) savePdfBtn.style.display = 'none';
        if (viewPreviewBtn) viewPreviewBtn.style.display = 'none';
        if (trashBtnEl) trashBtnEl.style.display = 'none';
    }, 100);
}

// ====== Search ======

// Handle search functionality
async function handleSearch() {
    const query = (document.getElementById('search-input') as HTMLInputElement).value.trim();
    
    if (typeof (window as any).updateActiveFiltersBar === 'function') {
        (window as any).updateActiveFiltersBar();
    }

    if (!query) {
        await loadRecentQuotations();
        return;
    }

    if (isArchiveMode) {
        const matches = allQuotations.filter((quotation: any) =>
            [quotation.quotation_id, quotation.project_name, quotation.customer_snapshot?.name, quotation.quotation_status]
                .some(value => String(value || '').toLowerCase().includes(query.toLowerCase()))
        );
        (window as any).quotationTable?.renderQuotations(matches);
        return;
    }

    const cardRenderer = window.quotationTable ? window.quotationTable.createQuotationCard.bind(window.quotationTable) : null;
    
    if (cardRenderer) {
        await searchDocuments('quotation', query, quotationListDiv, cardRenderer,
            `<div class="flex flex-col items-center justify-center w-full text-center py-4 fade-in select-none mx-auto" style="min-height: 300px;">
                <div class="text-yellow-500 text-6xl mb-4"><i class="fas fa-search"></i></div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">No Results Found</h2>
                <p class="text-gray-500 text-xs">No quotations match your search</p>
            </div>`);
    }

    if (typeof (window as any).updateActiveFiltersBar === 'function') {
        (window as any).updateActiveFiltersBar();
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
