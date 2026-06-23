/**
 * E-Way Bill Module Main Entry Point
 */

(function () {
    // Local references to global helpers to avoid compile-time collisions
    const debounce = (window as any).debounce;
    const applyFilters = (window as any).applyFilters;
    const showCustomDateModal = (window as any).showCustomDateModal;
    const formatIndian = (window as any).formatIndian;
    const deleteDocument = (window as any).deleteDocument;
    const searchDocuments = (window as any).searchDocuments;
    const showNewDocumentForm = (window as any).showNewDocumentForm;
    const electronAPI = (window as any).electronAPI;

    // Home button handler - keep this one as it's specific to this page
    document.getElementById('home-btn')?.addEventListener('click', () => {
        const guardNavigation = (window as any).guardWayBillNavigation;
        if (typeof guardNavigation === 'function' && guardNavigation('/ewaybill')) {
            return;
        }
        sessionStorage.removeItem('currentTab-status');
        window.location.href = '/ewaybill';
        sessionStorage.setItem('currentTab', 'ewaybill');
    });

    // Main content references
    const wayBillsListDiv = document.querySelector(".records") as HTMLElement;

    // Filter state
    let allWayBills: EWayBill[] = [];
    let archivedWayBills: EWayBill[] = [];
    (window as any).statusFilter = '';
    (window as any).showDeletedItems = false;
    let currentFilteredEWayBills: EWayBill[] = [];
    let paginationManager: any = null;
    let currentFilters = {
        dateFilter: 'all',
        sortBy: 'date-desc',
        status: 'all',
        customStartDate: null as string | null,
        customEndDate: null as string | null
    };
    (window as any).currentFilters = currentFilters;

    interface ShortcutItem {
        label: string;
        keys: string[];
    }

    interface ShortcutGroup {
        title: string;
        icon: string;
        items: ShortcutItem[];
    }

    const WAYBILL_SHORTCUT_GROUPS: ShortcutGroup[] = [
        {
            title: 'Navigation',
            icon: 'fas fa-arrows-alt text-blue-600',
            items: [
                { label: 'Next Step', keys: ['Enter'] },
                { label: 'Previous Step', keys: ['Alt', 'Backspace'] },
                { label: 'Exit/Cancel', keys: ['Esc'] }
            ]
        },
        {
            title: 'Actions',
            icon: 'fas fa-bolt text-yellow-600',
            items: [
                { label: 'New E-Way Bill', keys: ['Ctrl', 'N'] },
                { label: 'Save E-Way Bill', keys: ['Ctrl', 'S'] },
                { label: 'View Preview', keys: ['Ctrl', 'P'] },
                { label: 'Print', keys: ['Ctrl', 'Shift', 'P'] },
                { label: 'Add Item', keys: ['Ctrl', 'I'] },
                { label: 'Delete Item', keys: ['Ctrl', 'Delete'] },
                { label: 'Go Home', keys: ['Ctrl', 'H'] },
                { label: 'Focus Search', keys: ['Ctrl', 'F'] },
                { label: 'Toggle Trash View', keys: ['Ctrl', 'Shift', 'T'] }
            ]
        }
    ];

    let shortcutsModalRef: HTMLElement | null = null;
    const isMac = navigator.userAgent.toLowerCase().includes('mac');

    document.addEventListener("DOMContentLoaded", () => {
        if (document.getElementById('home')) {
            loadRecentWayBills();
        }
        document.getElementById('new-waybill-btn')?.addEventListener('click', () => {
            sessionStorage.setItem('currentTab-status', 'new');
            if (!document.getElementById('new')) {
                window.location.href = '/ewaybill/form';
            } else {
                showNewWayBillFormHandler();
            }
        });
        
        const wbSearchInput = document.getElementById('search-input') as HTMLInputElement | null;
        if (wbSearchInput) {
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
        }

        const archivedBtn = document.getElementById('archived-ewaybills-btn');
        if (archivedBtn) {
            archivedBtn.onclick = () => {
                if ((window as any).statusFilter === 'archived') {
                    (window as any).statusFilter = '';
                } else {
                    (window as any).statusFilter = 'archived';
                }
                loadRecentWayBills();
            };
        }

        const showDeletedBtn = document.getElementById('showDeletedBtn');
        if (showDeletedBtn) {
            showDeletedBtn.onclick = () => {
                (window as any).showDeletedItems = !(window as any).showDeletedItems;
                
                if ((window as any).showDeletedItems) {
                    showDeletedBtn.classList.remove('bg-gray-200', 'text-gray-700', 'w-10', 'justify-center');
                    showDeletedBtn.classList.add('bg-red-100', 'text-red-700', 'ring-2', 'ring-red-500', 'px-4', 'gap-2');
                    showDeletedBtn.innerHTML = '<i class="fas fa-trash-restore"></i> Close Trash';
                    showDeletedBtn.title = 'Close Trash';
                } else {
                    showDeletedBtn.classList.add('bg-gray-200', 'text-gray-700', 'w-10', 'justify-center');
                    showDeletedBtn.classList.remove('bg-red-100', 'text-red-700', 'ring-2', 'ring-red-500', 'px-4', 'gap-2');
                    showDeletedBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                    showDeletedBtn.title = 'View Trash';
                }
                if (typeof (window as any).updateHeaderVisibility === 'function') {
                    (window as any).updateHeaderVisibility();
                }
                loadRecentWayBills();
            };
        }

        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const icon = refreshBtn.querySelector('i');
                if (icon) icon.classList.add('animate-spin');
                loadRecentWayBills().finally(() => {
                    setTimeout(() => {
                        if (icon) icon.classList.remove('animate-spin');
                    }, 500);
                });
            });
        }

        const bulkRestoreBtn = document.getElementById('bulk-restore-btn');
        const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

        function updateBulkButtonLabels() {
            const query = wbSearchInput ? wbSearchInput.value.trim() : '';
            const isFiltered = query !== '' ||
                               currentFilters.dateFilter !== 'all' ||
                               currentFilters.sortBy !== 'date-desc';
            
            if (bulkRestoreBtn) {
                const span = bulkRestoreBtn.querySelector('span');
                if (span) {
                    span.textContent = isFiltered ? 'Restore All Filtered' : 'Restore All';
                }
            }
            if (bulkDeleteBtn) {
                const span = bulkDeleteBtn.querySelector('span');
                if (span) {
                    span.textContent = isFiltered ? 'Delete All Filtered' : 'Delete All';
                }
            }
        }
        (window as any).updateBulkButtonLabels = updateBulkButtonLabels;

        if (bulkRestoreBtn) {
            bulkRestoreBtn.onclick = () => {
                const filteredData = currentFilteredEWayBills || [];
                if (filteredData.length === 0) {
                    if (electronAPI?.showAlert1) {
                        electronAPI.showAlert1('No e-way bills to restore.');
                    } else {
                        alert('No e-way bills to restore.');
                    }
                    return;
                }

                const query = wbSearchInput ? wbSearchInput.value.trim() : '';
                const isFiltered = query !== '' ||
                                   currentFilters.dateFilter !== 'all' ||
                                   currentFilters.sortBy !== 'date-desc';
                const message = `Are you sure you want to restore all ${filteredData.length} ${isFiltered ? 'filtered ' : ''}e-way bills?`;

                if (electronAPI?.showAlert2) {
                    electronAPI.showAlert2(message);
                    electronAPI.receiveAlertResponse(async (response: string) => {
                        if (response === 'Yes') {
                            try {
                                const ids = filteredData.map(w => w._id).filter(Boolean) as string[];
                                await (window as any).ewaybillApi.bulkRestoreEWayBills(ids);
                                loadRecentWayBills();
                            } catch (err) {
                                console.error('Bulk restore failed:', err);
                            }
                        }
                    });
                } else {
                    if (confirm(message)) {
                        (async () => {
                            try {
                                const ids = filteredData.map(w => w._id).filter(Boolean) as string[];
                                await (window as any).ewaybillApi.bulkRestoreEWayBills(ids);
                                loadRecentWayBills();
                            } catch (err) {
                                console.error('Bulk restore failed:', err);
                            }
                        })();
                    }
                }
            };
        }

        if (bulkDeleteBtn) {
            bulkDeleteBtn.onclick = () => {
                const filteredData = currentFilteredEWayBills || [];
                if (filteredData.length === 0) {
                    if (electronAPI?.showAlert1) {
                        electronAPI.showAlert1('No e-way bills to delete.');
                    } else {
                        alert('No e-way bills to delete.');
                    }
                    return;
                }

                const query = wbSearchInput ? wbSearchInput.value.trim() : '';
                const isFiltered = query !== '' ||
                                   currentFilters.dateFilter !== 'all' ||
                                   currentFilters.sortBy !== 'date-desc';
                const message = `Are you sure you want to permanently delete all ${filteredData.length} ${isFiltered ? 'filtered ' : ''}e-way bills? This action cannot be undone.`;

                if (electronAPI?.showAlert2) {
                    electronAPI.showAlert2(message);
                    electronAPI.receiveAlertResponse(async (response: string) => {
                        if (response === 'Yes') {
                            try {
                                const ids = filteredData.map(w => w._id).filter(Boolean) as string[];
                                await (window as any).ewaybillApi.bulkHardDeleteEWayBills(ids);
                                loadRecentWayBills();
                            } catch (err) {
                                console.error('Bulk delete failed:', err);
                            }
                        }
                    });
                } else {
                    if (confirm(message)) {
                        (async () => {
                            try {
                                const ids = filteredData.map(w => w._id).filter(Boolean) as string[];
                                await (window as any).ewaybillApi.bulkHardDeleteEWayBills(ids);
                                loadRecentWayBills();
                            } catch (err) {
                                console.error('Bulk delete failed:', err);
                            }
                        })();
                    }
                }
            };
        }

        document.getElementById('view-preview')?.addEventListener('click', async () => {
            // Navigate step-by-step to trigger validation at each step
            const navigateToPreview = async () => {
                // If already on preview step, just generate preview
                if ((window as any).currentStep === (window as any).totalSteps) {
                    if (typeof (window as any).generatePreview === 'function') {
                        await (window as any).generatePreview();
                    }
                    return;
                }

                const nextBtn = document.getElementById('next-btn') as HTMLButtonElement | null;
                if (!nextBtn) return;

                const stepBefore = (window as any).currentStep;
                nextBtn.click();

                // Wait for validation and step change
                await new Promise(resolve => setTimeout(resolve, 100));

                // If step didn't change, validation failed - stop
                if ((window as any).currentStep === stepBefore) return;

                // If reached preview, generate it
                if ((window as any).currentStep === (window as any).totalSteps) {
                    if (typeof (window as any).generatePreview === 'function') {
                        await (window as any).generatePreview();
                    }
                    return;
                }

                // Continue to next step
                await navigateToPreview();
            };

            await navigateToPreview();
        });

        const viewPreviewBtn = document.getElementById('view-preview');
        if (viewPreviewBtn) viewPreviewBtn.style.display = 'none';

        // Header Visibility Observer Setup
        const homeSection = document.getElementById('home');
        const newSection = document.getElementById('new');
        const viewSection = document.getElementById('view');
        const homeBtn = document.getElementById('home-btn');

        const updateHeaderVisibility = () => {
            const isHomeVisible = homeSection ? window.getComputedStyle(homeSection).display !== 'none' : true;
            const isFormActive = newSection ? window.getComputedStyle(newSection).display !== 'none' : false;
            const isViewActive = viewSection ? window.getComputedStyle(viewSection).display !== 'none' : false;

            const searchWrapper = document.getElementById('search-wrapper');
            const rBtn = document.getElementById('refresh-btn');
            const aBtn = document.getElementById('archived-ewaybills-btn');
            const sDelBtn = document.getElementById('showDeletedBtn');
            const vPrevBtn = document.getElementById('view-preview');
            const newWbBtn = document.getElementById('new-waybill-btn');
            const bRestoreBtn = document.getElementById('bulk-restore-btn');
            const bDeleteBtn = document.getElementById('bulk-delete-btn');

            if (isFormActive) {
                if (searchWrapper) searchWrapper.style.display = 'none';
                if (rBtn) rBtn.style.display = 'none';
                if (aBtn) aBtn.style.display = 'none';
                if (sDelBtn) sDelBtn.style.display = 'none';
                if (vPrevBtn) vPrevBtn.style.display = 'none';
                if (newWbBtn) newWbBtn.style.display = 'none';
                if (homeBtn) homeBtn.style.display = 'flex';
                if (bRestoreBtn) {
                    bRestoreBtn.style.display = 'none';
                    bRestoreBtn.classList.add('hidden');
                }
                if (bDeleteBtn) {
                    bDeleteBtn.style.display = 'none';
                    bDeleteBtn.classList.add('hidden');
                }
            } else if (isViewActive) {
                if (searchWrapper) searchWrapper.style.display = 'none';
                if (rBtn) rBtn.style.display = 'none';
                if (aBtn) aBtn.style.display = 'none';
                if (sDelBtn) sDelBtn.style.display = 'none';
                if (vPrevBtn) vPrevBtn.style.display = 'none';
                if (newWbBtn) newWbBtn.style.display = 'flex';
                if (homeBtn) homeBtn.style.display = 'flex';
                if (bRestoreBtn) {
                    bRestoreBtn.style.display = 'none';
                    bRestoreBtn.classList.add('hidden');
                }
                if (bDeleteBtn) {
                    bDeleteBtn.style.display = 'none';
                    bDeleteBtn.classList.add('hidden');
                }
            } else {
                if (searchWrapper) searchWrapper.style.display = 'flex';
                if (rBtn) rBtn.style.display = 'flex';
                if (sDelBtn) sDelBtn.style.display = 'flex';
                if (homeBtn) homeBtn.style.display = isHomeVisible ? 'none' : 'flex';
                if (vPrevBtn) vPrevBtn.style.display = 'none';

                const isTrashOpen = !!(window as any).showDeletedItems;
                if (isTrashOpen) {
                    if (aBtn) aBtn.style.display = 'none';
                    if (newWbBtn) newWbBtn.style.display = 'none';
                    if (bRestoreBtn) {
                        bRestoreBtn.style.display = 'flex';
                        bRestoreBtn.classList.remove('hidden');
                    }
                    if (bDeleteBtn) {
                        bDeleteBtn.style.display = 'flex';
                        bDeleteBtn.classList.remove('hidden');
                    }
                } else {
                    if (aBtn) aBtn.style.display = 'flex';
                    if (newWbBtn) newWbBtn.style.display = 'flex';
                    if (bRestoreBtn) {
                        bRestoreBtn.style.display = 'none';
                        bRestoreBtn.classList.add('hidden');
                    }
                    if (bDeleteBtn) {
                        bDeleteBtn.style.display = 'none';
                        bDeleteBtn.classList.add('hidden');
                    }
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

        initShortcutsModal();
        initWayBillFilters();
        document.addEventListener('keydown', handleEWayBillKeyboardShortcuts, true);
    });

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

    function renderShortcutSection(section: ShortcutGroup): string {
        const sectionHeader = `
            <div class="shortcuts-section">
                <h3 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <i class="${section.icon}"></i>
                    ${section.title}
                </h3>
                <div class="space-y-1">
                    ${section.items.map(renderShortcutRow).join('')}
                </div>
            </div>
        `;
        return sectionHeader;
    }

    function renderShortcutRow(item: ShortcutItem): string {
        return `
            <div class="shortcut-row">
                <span class="text-xs font-semibold text-slate-600">${item.label}</span>
                ${renderShortcutKeys(item.keys)}
            </div>
        `;
    }

    function renderShortcutKeys(keys: string[]): string {
        const keyCaps = keys.map((key, index) => {
            const displayKey = key === 'Ctrl' && isMac ? 'Cmd' : key;
            const separator = index > 0 ? '<span class="text-slate-300 font-medium">+</span>' : '';
            return `${separator}<kbd>${displayKey}</kbd>`;
        }).join('');
        return `<div class="shortcut-keys">${keyCaps}</div>`;
    }

    function showShortcutsModal() {
        if (!shortcutsModalRef) return;
        shortcutsModalRef.classList.remove('hidden');
        shortcutsModalRef.offsetHeight;
        shortcutsModalRef.classList.remove('opacity-0');
    }

    function hideShortcutsModal() {
        if (!shortcutsModalRef) return;
        shortcutsModalRef.classList.add('opacity-0');
        setTimeout(() => {
            shortcutsModalRef?.classList.add('hidden');
        }, 200);
    }

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
        if (typeof (window as any).currentStep === 'undefined' || typeof (window as any).totalSteps === 'undefined') {
            return false;
        }
        return (window as any).currentStep === (window as any).totalSteps;
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
            if (typeof (window as any).generatePreview === 'function') {
                await (window as any).generatePreview();
            }
            callback();
            return;
        }

        // Navigate step-by-step using the Next button to trigger validation at each step
        const navigateToPreview = async () => {
            const nextBtn = document.getElementById('next-btn') as HTMLButtonElement | null;
            if (!nextBtn) {
                return;
            }

            // Store current step to detect if navigation was blocked by validation
            const stepBefore = typeof (window as any).currentStep !== 'undefined' ? (window as any).currentStep : 0;

            // Click next button (this triggers validation)
            nextBtn.click();

            // Wait a bit for validation and step change to process
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if step actually changed (validation passed)
            const stepAfter = typeof (window as any).currentStep !== 'undefined' ? (window as any).currentStep : 0;

            if (stepAfter === stepBefore) {
                // Step didn't change - validation failed, stop navigation
                return;
            }

            // If we reached the preview step, generate preview and run callback
            if (isPreviewStepActive()) {
                if (typeof (window as any).generatePreview === 'function') {
                    await (window as any).generatePreview();
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
        if (typeof (window as any).currentStep === 'undefined') {
            return false;
        }
        return (window as any).currentStep === 5;
    }

    function isHomeScreenActive(): boolean {
        const homeSectionVisible = isSectionVisible('home');
        return homeSectionVisible && !isFormActive() && !isSectionVisible('view');
    }

    function triggerAddEntry(): boolean {
        if (!isFormActive()) {
            return false;
        }

        const itemsBtn = document.getElementById('add-item-btn') as HTMLButtonElement | null;
        if (itemsBtn && isItemsStepActive()) {
            itemsBtn.click();
            return true;
        }

        return false;
    }

    function triggerPrintAction(): boolean {
        const formPrintBtn = document.getElementById('print-btn') as HTMLButtonElement | null;
        if (formPrintBtn && isFormActive()) {
            runOnPreviewStep(() => formPrintBtn.click());
            return true;
        }

        const viewPrintBtn = document.getElementById('printProject') as HTMLButtonElement | null;
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
        return tagName === 'INPUT' || tagName === 'TEXTAREA' || (active as any).isContentEditable || tagName === 'SELECT';
    }

    function handleEWayBillKeyboardShortcuts(event: KeyboardEvent) {
        const keyLower = event.key.toLowerCase();
        const isModifierPressed = event.ctrlKey || event.metaKey;
        const isShiftPressed = event.shiftKey;
        const homeButton = document.getElementById('home-btn') as HTMLButtonElement | null;

        if (isModifierPressed && isShiftPressed && keyLower === 't') {
            const trashBtn = document.getElementById('showDeletedBtn');
            if (trashBtn && window.getComputedStyle(trashBtn).display !== 'none') {
                event.preventDefault();
                event.stopPropagation();
                trashBtn.click();
            }
            return;
        }

        if (!shortcutsModalRef) {
            shortcutsModalRef = document.getElementById('shortcuts-modal');
        }

        if (!event.altKey && isModifierPressed) {
            switch (keyLower) {
                case 'n': {
                    const newBtn = document.getElementById('new-waybill-btn') as HTMLButtonElement | null;
                    if (newBtn && window.getComputedStyle(newBtn).display !== 'none') {
                        event.preventDefault();
                        event.stopPropagation();
                        newBtn.click();
                    }
                    break;
                }
                case 's': {
                    const saveBtn = document.getElementById('save-btn') as HTMLButtonElement | null;
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
                        const previewBtn = document.getElementById('view-preview') as HTMLButtonElement | null;
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
                    const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
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

        // Handle Alt + Backspace previous step shortcut (works even inside typing context)
        if (event.altKey && event.key === 'Backspace' && isFormActive()) {
            const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement | null;
            if (prevBtn && !prevBtn.disabled) {
                event.preventDefault();
                event.stopPropagation();
                prevBtn.click();
                return;
            }
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

            // If unsaved changes modal is open, let it handle Escape
            if (typeof (window as any).isUnsavedChangesModalOpen === 'function' && (window as any).isUnsavedChangesModalOpen()) {
                return; // Handled by unsavedChanges.ts capture-phase listener
            }

            // If form is active and dirty, show unsaved changes modal instead of navigating
            if (isFormActive()) {
                const guardNavigation = (window as any).guardWayBillNavigation;
                if (typeof guardNavigation === 'function' && guardNavigation('/ewaybill')) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
            }

            if (isHomeScreenActive()) {
                event.preventDefault();
                event.stopPropagation();
                window.location.href = '/dashboard';
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
                const nextBtn = document.getElementById('next-btn') as HTMLButtonElement | null;
                if (nextBtn && !nextBtn.disabled) {
                    event.preventDefault();
                    event.stopPropagation();
                    nextBtn.click();
                }
                return;
            }
        }

        if (event.key === 'Backspace' && isFormActive()) {
            const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement | null;
            if (prevBtn && !prevBtn.disabled) {
                event.preventDefault();
                event.stopPropagation();
                prevBtn.click();
            }
        }
    }

    const updateArchivedCount = async () => {
        try {
            const archived = await (window as any).ewaybillApi.fetchRecentEWayBills('archived', false);
            const countBadge = document.getElementById('archived-count-badge');
            if (countBadge) {
                countBadge.textContent = archived.length.toString();
            }
        } catch (err) {
            console.error('Failed to update archived count:', err);
        }
    };
    (window as any).updateArchivedCount = updateArchivedCount;

    function updateArchivedButtonVisuals() {
        const archivedBtn = document.getElementById('archived-ewaybills-btn') as HTMLButtonElement | null;
        if (!archivedBtn) return;

        const icon = archivedBtn.querySelector('i');
        const badge = document.getElementById('archived-count-badge');

        if (currentFilters.status === 'archived') {
            archivedBtn.classList.remove('bg-gray-200', 'text-gray-700', 'border-slate-200', 'hover:bg-slate-50');
            archivedBtn.classList.add('bg-amber-500', 'text-white', 'border-amber-500', 'ring-2', 'ring-amber-500/20', 'shadow-md', 'shadow-amber-500/10', 'hover:bg-amber-600');
            
            if (icon) {
                icon.className = 'fas fa-box-open text-white';
            }
            if (badge) {
                badge.classList.remove('bg-slate-100', 'text-slate-600');
                badge.classList.add('bg-white', 'text-amber-600', 'font-extrabold');
            }
        } else {
            archivedBtn.classList.remove('bg-amber-500', 'text-white', 'border-amber-500', 'ring-2', 'ring-amber-500/20', 'shadow-md', 'shadow-amber-500/10', 'hover:bg-amber-600');
            archivedBtn.classList.add('bg-gray-200', 'text-gray-700', 'border-slate-200', 'hover:bg-slate-50');

            if (icon) {
                icon.className = 'fas fa-archive text-slate-400';
            }
            if (badge) {
                badge.classList.remove('bg-white', 'text-amber-600', 'font-extrabold');
                badge.classList.add('bg-slate-100', 'text-slate-600');
            }
        }
    }

    // Load recent way bills from the server
    async function loadRecentWayBills() {
        const ewaybillApi = (window as any).ewaybillApi;
        try {
            const deleted = !!(window as any).showDeletedItems;
            const [waybills, archived] = await Promise.all([
                ewaybillApi.fetchRecentEWayBills('', deleted),
                ewaybillApi.fetchRecentEWayBills('archived', deleted)
            ]);
            allWayBills = waybills || [];
            archivedWayBills = archived || [];
            applyWayBillFilters();
            const updateBulkLabels = (window as any).updateBulkButtonLabels;
            if (typeof updateBulkLabels === 'function') {
                updateBulkLabels();
            }
        } catch (error) {
            console.error("Error loading e-way bills:", error);
            wayBillsListDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 fade-in">
                    <div class="bg-red-100 rounded-full p-8 mb-4">
                        <i class="fas fa-exclamation-triangle text-red-500 text-6xl"></i>
                    </div>
                    <h2 class="text-2xl font-semibold text-gray-700 mb-2">Failed to Load E-Way Bills</h2>
                    <p class="text-gray-500 mb-6">Please try again later</p>
                    <button id="retry-btn"
                        class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium">
                        <i class="fas fa-redo"></i>
                        Retry
                    </button>
                </div>
            `;
            document.getElementById('retry-btn')?.addEventListener('click', () => {
                loadRecentWayBills();
            });
        }
    }
    (window as any).loadRecentWayBills = loadRecentWayBills;

    const formatAddress = (address: any): string => {
        if (!address) return '-';
        if (typeof address === 'string') {
            const trimmed = address.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                try {
                    address = JSON.parse(trimmed);
                } catch (e) {
                }
            }
        }
        if (address && typeof address === 'object') {
            const parts = [address.line1, address.line2, address.city, address.state, address.pincode, address.country];
            return parts.filter(Boolean).map(p => String(p).trim()).join(', ');
        }
        return String(address || '-');
    };

    function updateWayBillTabCounts() {
        const statusTabs = document.querySelectorAll('#status-tabs-container .filter-tab');
        if (!statusTabs.length) return;

        const counts: Record<string, number> = {
            all: allWayBills.length,
            Draft: 0,
            Generated: 0,
            Cancelled: 0,
            Expired: 0,
            archived: archivedWayBills.length
        };

        allWayBills.forEach(wb => {
            const status = wb.ewaybill_status || 'Draft';
            if (status in counts) {
                counts[status]++;
            }
        });

        statusTabs.forEach(tab => {
            const status = (tab as HTMLElement).dataset.status || 'all';
            const count = counts[status] || 0;
            
            let badge = tab.querySelector('.tab-count-badge');
            if (!badge) {
                badge = document.createElement('span');
                tab.appendChild(badge);
            }
            badge.className = tab.classList.contains('active')
                ? 'tab-count-badge ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-600 transition-colors duration-150'
                : 'tab-count-badge ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-500 transition-colors duration-150';
            badge.textContent = count.toString();
        });
    }

    function updateWayBillTableHeader(isTrash: boolean) {
        const headerRow = document.getElementById('table-header-row');
        if (!headerRow) return;

        if (isTrash) {
            headerRow.innerHTML = `
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider col-date">Date</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider col-ewaybill-no">E-Way Bill No</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider col-invoice-id">Invoice ID</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider col-customer">Customer</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider col-deleted-date">Deleted Date</th>
                <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider col-status">Status</th>
                <th class="px-4 py-3 text-right text-xs font-semibold tracking-wider col-total">Total Value</th>
                <th class="px-4 py-3 text-right text-xs font-semibold tracking-wider col-actions">Actions</th>
            `;
        } else {
            const sortBy = currentFilters.sortBy || 'date-desc';
            
            const dateIcon = sortBy === 'date-desc' ? '<i class="fas fa-chevron-down ml-1.5 text-blue-600"></i>' :
                             sortBy === 'date-asc' ? '<i class="fas fa-chevron-up ml-1.5 text-blue-600"></i>' :
                             '<i class="fas fa-sort ml-1.5 opacity-30 group-hover:opacity-60 transition-opacity"></i>';

            headerRow.innerHTML = `
                <th id="th-date" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-100 hover:text-blue-600 select-none transition-all duration-150 group col-date">
                    <span class="flex items-center">Date ${dateIcon}</span>
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider col-ewaybill-no">E-Way Bill No</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider col-invoice-id">Invoice ID</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider col-customer">Customer</th>
                <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider col-status">Status</th>
                <th class="px-4 py-3 text-right text-xs font-semibold tracking-wider col-total">Total Value</th>
            `;
            // Attach event listeners
            const thDate = document.getElementById('th-date');
            if (thDate) {
                thDate.onclick = () => {
                    const nextSort = sortBy === 'date-desc' ? 'date-asc' : 'date-desc';
                    currentFilters.sortBy = nextSort;
                    const sortFilter = document.getElementById('sort-filter') as HTMLInputElement | null;
                    if (sortFilter) {
                        sortFilter.value = nextSort;
                    }
                    const sortDropdown = document.getElementById('sortFilterDropdown');
                    if (sortDropdown) {
                        sortDropdown.querySelectorAll('a').forEach(a => {
                            a.classList.remove('bg-gray-100', 'font-semibold');
                            if (a.getAttribute('data-sort-filter') === nextSort) {
                                a.classList.add('bg-gray-100', 'font-semibold');
                            }
                        });
                    }
                    applyWayBillFilters();
                };
            }
        }
    }

    // Apply filters to waybills
    function applyWayBillFilters() {
        updateWayBillTabCounts();
        updateActiveFiltersBar();

        let source = currentFilters.status === 'archived' ? [...archivedWayBills] : [...allWayBills];
        if (currentFilters.status && currentFilters.status !== 'all' && currentFilters.status !== 'archived') {
            source = source.filter(wb => (wb.ewaybill_status || 'Draft') === currentFilters.status);
        }

        const filtered = applyFilters(source, {
            dateFilter: currentFilters.dateFilter,
            sortBy: currentFilters.sortBy,
            dateField: 'createdAt',
            nameField: 'ewaybill_no',
            customStartDate: currentFilters.customStartDate,
            customEndDate: currentFilters.customEndDate
        });

        // Highlight filter button if any filters are applied
        const isFilterActive = currentFilters.dateFilter !== 'all' ||
                               currentFilters.sortBy !== 'date-desc';
        const filterBtn = document.getElementById('filter-btn');
        if (filterBtn) {
            if (isFilterActive) {
                filterBtn.className = "bg-blue-50 text-blue-600 border border-blue-300 px-3 py-2 rounded-lg transition-all duration-150 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95 cursor-pointer shadow-sm";
            } else {
                filterBtn.className = "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg transition-all duration-150 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95 cursor-pointer";
            }
        }

        currentFilteredEWayBills = filtered;
        renderWayBills(filtered);
    }

    function updateActiveFiltersBar() {
        const infoBar = document.getElementById('active-filters-info-bar');
        const badgesContainer = document.getElementById('active-filters-badges');
        if (!infoBar || !badgesContainer) return;

        // Preserve only the header label span
        const label = badgesContainer.querySelector('span');
        badgesContainer.innerHTML = '';
        if (label) badgesContainer.appendChild(label);

        const activeBadges: { label: string, clearFn: () => void }[] = [];

        // Search Query
        const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
        const query = searchInput ? searchInput.value.trim() : '';
        if (query) {
            activeBadges.push({
                label: `Search: "${query}"`,
                clearFn: () => {
                    if (searchInput) {
                        searchInput.value = '';
                        searchInput.dispatchEvent(new Event('input'));
                    }
                }
            });
        }

        // Status Filter
        if (currentFilters.status && currentFilters.status !== 'all') {
            const statusLabels: Record<string, string> = {
                'Draft': 'Draft',
                'Generated': 'Generated',
                'Cancelled': 'Cancelled'
            };
            activeBadges.push({
                label: `Status: ${statusLabels[currentFilters.status] || currentFilters.status}`,
                clearFn: () => {
                    currentFilters.status = 'all';
                    const statusTabs = document.querySelectorAll('#status-tabs-container .filter-tab');
                    statusTabs.forEach(t => {
                        if ((t as HTMLElement).dataset.status === 'all') {
                            t.classList.add('active');
                        } else {
                            t.classList.remove('active');
                        }
                    });
                    applyWayBillFilters();
                }
            });
        }

        // Date Filter
        if (currentFilters.dateFilter !== 'all') {
            let dateLabel = currentFilters.dateFilter;
            if (currentFilters.dateFilter === 'custom' && currentFilters.customStartDate && currentFilters.customEndDate) {
                dateLabel = `${currentFilters.customStartDate} to ${currentFilters.customEndDate}`;
            } else {
                const dateLabels: Record<string, string> = {
                    today: 'Today',
                    week: 'This Week',
                    month: 'This Month'
                };
                dateLabel = dateLabels[currentFilters.dateFilter] || currentFilters.dateFilter;
            }
            activeBadges.push({
                label: `Date: ${dateLabel}`,
                clearFn: () => {
                    currentFilters.dateFilter = 'all';
                    currentFilters.customStartDate = null;
                    currentFilters.customEndDate = null;
                    const dateSelect = document.getElementById('date-filter') as HTMLInputElement | null;
                    if (dateSelect) dateSelect.value = 'all';
                    const dateDropdown = document.getElementById('dateFilterDropdown');
                    if (dateDropdown) {
                        dateDropdown.querySelectorAll('a').forEach((a, i) => {
                            a.classList.remove('bg-gray-100', 'font-semibold');
                            if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                        });
                    }
                    applyWayBillFilters();
                }
            });
        }

        // Sort Filter
        if (currentFilters.sortBy !== 'date-desc') {
            const sortLabels: Record<string, string> = {
                'date-asc': 'Oldest First',
                'status-asc': 'Status A-Z'
            };
            activeBadges.push({
                label: `Sort: ${sortLabels[currentFilters.sortBy] || currentFilters.sortBy}`,
                clearFn: () => {
                    currentFilters.sortBy = 'date-desc';
                    const sortSelect = document.getElementById('sort-filter') as HTMLInputElement | null;
                    if (sortSelect) sortSelect.value = 'date-desc';
                    const sortDropdown = document.getElementById('sortFilterDropdown');
                    if (sortDropdown) {
                        sortDropdown.querySelectorAll('a').forEach((a, i) => {
                            a.classList.remove('bg-gray-100', 'font-semibold');
                            if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                        });
                    }
                    applyWayBillFilters();
                }
            });
        }

        if (activeBadges.length > 0) {
            infoBar.classList.remove('hidden');
            activeBadges.forEach(badgeData => {
                const badge = document.createElement('span');
                badge.className = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 shadow-sm transition-all duration-150';
                badge.innerHTML = `
                    <span>${badgeData.label}</span>
                    <button class="text-blue-400 hover:text-blue-700 ml-0.5 focus:outline-none cursor-pointer text-[10px]" title="Remove filter">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                badge.querySelector('button')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    badgeData.clearFn();
                });
                badgesContainer.appendChild(badge);
            });
        } else {
            infoBar.classList.add('hidden');
        }
    }

    // Initialize filter event listeners
    function initWayBillFilters() {
        const filterBtn = document.getElementById('filter-btn') as HTMLButtonElement | null;
        const filterPopover = document.getElementById('filter-popover') as HTMLDivElement | null;
        const dateFilter = document.getElementById('date-filter') as HTMLInputElement | null;
        const sortFilter = document.getElementById('sort-filter') as HTMLInputElement | null;
        const clearFiltersBtn = document.getElementById('clear-filters-btn') as HTMLButtonElement | null;
        const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
        const clearAllShortcut = document.getElementById('clear-all-filters-shortcut') as HTMLButtonElement | null;

        const dateDropdown = document.getElementById('dateFilterDropdown');
        const sortDropdown = document.getElementById('sortFilterDropdown');

        // Toggle filter popover
        if (filterBtn && filterPopover) {
            filterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const rect = filterBtn.getBoundingClientRect();
                const popoverWidth = 280; // width is 280px
                
                filterPopover.style.top = `${rect.bottom + 8}px`;
                
                let leftPos = rect.right - popoverWidth;
                if (leftPos + popoverWidth > window.innerWidth - 16) {
                    leftPos = window.innerWidth - popoverWidth - 16;
                }
                if (leftPos < 16) {
                    leftPos = 16;
                }
                
                filterPopover.style.left = `${leftPos}px`;
                filterPopover.classList.toggle('hidden');
            });

            // Close popover when clicking outside
            document.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (target && !filterPopover.contains(target) && e.target !== filterBtn && !target.closest('#custom-date-modal')) {
                    filterPopover.classList.add('hidden');
                }
            });
        }

        // Hook search input change to update badges
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                updateActiveFiltersBar();
            });
        }

        // Handle date filter custom options & clicks
        if (dateDropdown && dateFilter) {
            dateDropdown.addEventListener('click', (e: Event) => {
                const target = e.target as HTMLElement;
                const link = target.closest('a');
                if (!link) return;

                e.preventDefault();

                const value = link.getAttribute('data-date-filter') || 'all';
                if (value === 'custom') {
                    showCustomDateModal((startDate: string, endDate: string) => {
                        dateDropdown.querySelectorAll('a').forEach(a => a.classList.remove('bg-gray-100', 'font-semibold'));
                        link.classList.add('bg-gray-100', 'font-semibold');

                        currentFilters.dateFilter = 'custom';
                        currentFilters.customStartDate = startDate;
                        currentFilters.customEndDate = endDate;
                        dateFilter.value = 'custom';
                        applyWayBillFilters();
                    });
                } else {
                    dateDropdown.querySelectorAll('a').forEach(a => a.classList.remove('bg-gray-100', 'font-semibold'));
                    link.classList.add('bg-gray-100', 'font-semibold');

                    currentFilters.dateFilter = value;
                    currentFilters.customStartDate = null;
                    currentFilters.customEndDate = null;
                    dateFilter.value = value;
                    applyWayBillFilters();
                }
            });
        }

        // Handle sort filter clicks
        if (sortDropdown && sortFilter) {
            sortDropdown.addEventListener('click', (e: Event) => {
                const target = e.target as HTMLElement;
                const link = target.closest('a');
                if (!link) return;

                e.preventDefault();

                sortDropdown.querySelectorAll('a').forEach(a => a.classList.remove('bg-gray-100', 'font-semibold'));
                link.classList.add('bg-gray-100', 'font-semibold');

                const value = link.getAttribute('data-sort-filter') || 'date-desc';
                currentFilters.sortBy = value;
                sortFilter.value = value;
                applyWayBillFilters();
            });
        }

        // Clear All shortcut button
        if (clearAllShortcut) {
            clearAllShortcut.addEventListener('click', () => {
                currentFilters = {
                    dateFilter: 'all',
                    sortBy: 'date-desc',
                    status: 'all',
                    customStartDate: null,
                    customEndDate: null
                };
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.dispatchEvent(new Event('input'));
                }
                if (dateFilter) dateFilter.value = 'all';
                if (sortFilter) sortFilter.value = 'date-desc';

                if (dateDropdown) {
                    dateDropdown.querySelectorAll('a').forEach((a, i) => {
                        a.classList.remove('bg-gray-100', 'font-semibold');
                        if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                    });
                }
                if (sortDropdown) {
                    sortDropdown.querySelectorAll('a').forEach((a, i) => {
                        a.classList.remove('bg-gray-100', 'font-semibold');
                        if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                    });
                }
                
                // Reset status tabs
                const statusTabs = document.querySelectorAll('#status-tabs-container .filter-tab');
                statusTabs.forEach(t => {
                    if ((t as HTMLElement).dataset.status === 'all') {
                        t.classList.add('active');
                    } else {
                        t.classList.remove('active');
                    }
                });

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
                    status: 'all',
                    customStartDate: null,
                    customEndDate: null
                };
                if (dateFilter) dateFilter.value = 'all';
                if (sortFilter) sortFilter.value = 'date-desc';

                if (dateDropdown) {
                    dateDropdown.querySelectorAll('a').forEach((a, i) => {
                        a.classList.remove('bg-gray-100', 'font-semibold');
                        if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                    });
                }
                if (sortDropdown) {
                    sortDropdown.querySelectorAll('a').forEach((a, i) => {
                        a.classList.remove('bg-gray-100', 'font-semibold');
                        if (i === 0) a.classList.add('bg-gray-100', 'font-semibold');
                    });
                }
                
                // Reset status tabs
                const statusTabs = document.querySelectorAll('#status-tabs-container .filter-tab');
                statusTabs.forEach(t => {
                    if ((t as HTMLElement).dataset.status === 'all') {
                        t.classList.add('active');
                    } else {
                        t.classList.remove('active');
                    }
                });

                applyWayBillFilters();
                if (filterPopover) filterPopover.classList.add('hidden');
            });
        }

        // Status Tabs click events
        const statusTabs = document.querySelectorAll('#status-tabs-container .filter-tab');
        statusTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                statusTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilters.status = (tab as HTMLElement).dataset.status || 'all';
                applyWayBillFilters();
            });
        });
    }

    // Render way bills in the list
    function renderWayBills(wayBills: EWayBill[]) {
        if (!paginationManager) {
            paginationManager = new (window as any).TablePaginationManager(
                "ewaybill-tbody",
                (paginatedData: EWayBill[]) => renderPage(paginatedData),
                25
            );
        }
        paginationManager.setData(wayBills);
    }

    function renderPage(wayBills: EWayBill[]) {
        const isTrash = !!(window as any).showDeletedItems;
        const isArchivedView = !isTrash && currentFilters.status === 'archived';

        const tbody = document.getElementById("ewaybill-tbody");
        const mobileContainer = document.getElementById("ewaybill-cards-mobile");
        if (!tbody) return;

        tbody.innerHTML = "";
        if (mobileContainer) mobileContainer.innerHTML = "";

        // Always update the table header
        updateWayBillTableHeader(isTrash);

        if (!wayBills || wayBills.length === 0) {
            let emptyHtml = "";
            if (isTrash) {
                emptyHtml = `
                    <div class="w-full h-full min-h-[320px] flex flex-col items-center justify-center text-center py-4 fade-in select-none">
                        <div class="text-rose-500 text-5xl mb-4">
                            <i class="fas fa-trash-alt"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">Trash is Empty</h2>
                        <p class="text-gray-500 text-xs">No soft-deleted e-way bills found</p>
                    </div>
                `;
            } else if (isArchivedView) {
                emptyHtml = `
                    <div class="w-full h-full min-h-[320px] flex flex-col items-center justify-center text-center py-4 fade-in select-none">
                        <div class="text-amber-500 text-5xl mb-4">
                            <i class="fas fa-archive"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">No Archived E-Way Bills</h2>
                        <p class="text-gray-500 text-xs">E-way bills you archive will show up here</p>
                    </div>
                `;
            } else {
                const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
                const hasSearch = searchInput && searchInput.value.trim() !== '';
                if (hasSearch) {
                    emptyHtml = `
                        <div class="w-full h-full min-h-[320px] flex flex-col items-center justify-center text-center py-4 fade-in select-none">
                            <div class="text-yellow-500 text-5xl mb-4">
                                <i class="fas fa-search"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">No Results Found</h2>
                            <p class="text-gray-500 text-xs">No e-way bills match your search</p>
                        </div>
                    `;
                } else {
                    emptyHtml = `
                        <div class="w-full h-full min-h-[320px] flex flex-col items-center justify-center text-center py-4 fade-in select-none">
                            <div class="text-blue-500 text-5xl mb-4">
                                <i class="fas fa-route"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">No E-Way Bills Found</h2>
                            <p class="text-gray-500 text-xs">Start creating e-way bills for your deliveries</p>
                        </div>
                    `;
                }
            }
 
            tbody.innerHTML = `
                <tr>
                    <td colspan="100" class="w-full justify-center px-4 py-10 bg-white text-slate-400 text-center align-middle h-full">
                        ${emptyHtml}
                    </td>
                </tr>
            `;

            if (mobileContainer) {
                mobileContainer.innerHTML = `
                    <div class="text-center py-10 bg-white rounded-xl border border-slate-200 p-6">
                        <i class="fas fa-route text-3xl text-blue-500 mb-2"></i>
                        <p class="text-sm font-bold text-slate-700">No E-Way Bills Found</p>
                    </div>
                `;
            }

            return;
        }

        wayBills.forEach(wayBill => {
            const row = createWayBillRow(wayBill, isTrash);
            tbody.appendChild(row);
        });

        // Mobile list rendering
        if (mobileContainer) {
            mobileContainer.innerHTML = wayBills.map(wayBill => {
                type StatusType = 'Draft' | 'Generated' | 'Cancelled' | 'Expired';
                const statusClassMap: Record<StatusType, string> = {
                    'Draft': 'bg-yellow-100 text-yellow-800',
                    'Generated': 'bg-green-100 text-green-800',
                    'Cancelled': 'bg-red-100 text-red-800',
                    'Expired': 'bg-gray-100 text-gray-800'
                };
                const statusBadgeClass = statusClassMap[wayBill.ewaybill_status as StatusType] || 'bg-gray-100 text-gray-800';

                const displayId = wayBill.ewaybill_no || wayBill._id || '-';
                const dateToFormat = wayBill.ewaybill_generated_at || wayBill.createdAt;
                const formattedDate = dateToFormat ? (typeof (window as any).formatDateDisplay === 'function' ? (window as any).formatDateDisplay(dateToFormat) : '-') : '-';
                
                let customerName = '-';
                if (wayBill.to_address) {
                    if (typeof wayBill.to_address === 'string') {
                        customerName = wayBill.to_address.split('\n')[0] || '-';
                    } else if (typeof wayBill.to_address === 'object') {
                        const addrObj = wayBill.to_address as any;
                        customerName = addrObj.line1 || '-';
                    }
                }
                const customerNameShort = customerName.substring(0, 35);
                const total = wayBill.total_invoice_value || 0;

                return `
                    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative cursor-pointer" onclick="viewWayBill('${wayBill._id}')">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-bold text-slate-800">${displayId}</span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass}">${wayBill.ewaybill_status || 'Draft'}</span>
                        </div>
                        <p class="text-xs text-slate-600 mb-2 truncate" title="${customerName}">${customerNameShort}</p>
                        <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            <span class="text-slate-400">${formattedDate}</span>
                            <span class="font-bold text-slate-900">₹${formatIndian(total, 2)}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Create a way bill row element
    function createWayBillRow(wayBill: EWayBill, isTrash: boolean): HTMLTableRowElement {
        const row = document.createElement("tr");
        const isArchived = !isTrash && wayBill.is_archived;

        row.className = "border-b border-slate-100 hover:bg-slate-50 transition-all duration-150 group cursor-pointer text-xs";
        if (isTrash) {
            row.classList.add("bg-rose-50/10");
        } else if (isArchived) {
            row.classList.add("opacity-80");
        }

        const dateToFormat = wayBill.ewaybill_generated_at || wayBill.createdAt;
        const formattedDate = dateToFormat ? (typeof (window as any).formatDateDisplay === 'function' ? (window as any).formatDateDisplay(dateToFormat) : '-') : '-';

        const transport: TransportDetails = wayBill.transport || { mode: '' };
        const displayId = wayBill.ewaybill_no || wayBill._id || '-';
        const invoiceId = typeof wayBill.invoice_id === 'object' && wayBill.invoice_id ? (wayBill.invoice_id.invoice_id || wayBill.invoice_id.invoice_no || '-') : (wayBill.invoice_id || '-');
        const toAddressStr = formatAddress(wayBill.to_address);
        const toAddressShort = toAddressStr.substring(0, 50);
        const transMode = transport.mode || '-';

        type StatusType = 'Draft' | 'Generated' | 'Cancelled' | 'Expired';
        const statusClassMap: Record<StatusType, string> = {
            'Draft': 'bg-yellow-100 text-yellow-800',
            'Generated': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-100 text-red-800',
            'Expired': 'bg-gray-100 text-gray-800'
        };
        const statusBadgeClass = statusClassMap[wayBill.ewaybill_status as StatusType] || 'bg-gray-100 text-gray-800';

        const total = wayBill.total_invoice_value || 0;

        let customerName = '-';
        if (wayBill.to_address) {
            const addrStr = formatAddress(wayBill.to_address);
            // The to_address formatting usually starts with the customer name, but let's parse the first line before a comma or newline if it's stored in a structured way.
            if (typeof wayBill.to_address === 'string') {
                customerName = wayBill.to_address.split('\n')[0] || '-';
            } else if (typeof wayBill.to_address === 'object') {
                // If it is an address object, we can see if it has line1
                const addrObj = wayBill.to_address as any;
                customerName = addrObj.line1 || '-';
            }
        }
        
        const customerNameShort = customerName.substring(0, 35);

        if (isTrash) {
            const deletedAt = wayBill.deletion?.deleted_at
                ? (typeof (window as any).formatDateDisplay === 'function' ? (window as any).formatDateDisplay(wayBill.deletion.deleted_at) : wayBill.deletion.deleted_at)
                : '-';

            row.innerHTML = `
                <td class="px-4 py-3 text-slate-850 font-medium whitespace-nowrap text-xs text-left col-date">${formattedDate}</td>
                <td class="px-4 py-3 text-slate-600 font-bold whitespace-nowrap text-xs text-left col-ewaybill-no">${displayId}</td>
                <td class="px-4 py-3 text-slate-850 font-medium whitespace-nowrap text-xs text-left col-invoice-id">${invoiceId}</td>
                <td class="px-4 py-3 text-slate-700 text-xs truncate text-left col-customer" title="${customerName}">${customerNameShort}</td>
                <td class="px-4 py-3 text-red-500 font-medium whitespace-nowrap text-xs text-left col-deleted-date">
                    <i class="fas fa-trash mr-1 text-[10px]"></i> ${deletedAt}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-center col-status">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass}">${wayBill.ewaybill_status || 'Draft'}</span>
                </td>
                <td class="px-4 py-3 text-right font-bold text-xs whitespace-nowrap text-slate-900 col-total">
                    ₹${formatIndian(total, 2)}
                </td>
                <td class="px-4 py-2 text-right whitespace-nowrap col-actions">
                    <div class="flex items-center justify-end gap-1.5 w-full">
                        <button class="action-btn restore-card-btn px-2.5 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 border border-green-200 hover:border-green-400 font-semibold text-xs flex items-center gap-1" title="Restore">
                            <i class="fas fa-trash-restore text-[10px]"></i> Restore
                        </button>
                        <button class="action-btn hard-delete-card-btn px-2.5 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 border border-red-200 hover:border-red-400 font-semibold text-xs flex items-center gap-1" title="Permanently Delete">
                            <i class="fas fa-trash-alt text-[10px]"></i> Delete
                        </button>
                    </div>
                </td>
            `;
        } else {
            row.innerHTML = `
                <td class="px-4 py-3 text-slate-850 font-medium whitespace-nowrap text-xs text-left col-date">${formattedDate}</td>
                <td class="px-4 py-3 text-slate-850 font-bold whitespace-nowrap text-xs text-left col-ewaybill-no">
                    <span class="cursor-pointer hover:text-blue-600 copy-text transition-colors" title="Click to copy ID">
                        ${displayId}
                        <i class="fas fa-copy text-[10px] ml-1 opacity-50"></i>
                    </span>
                </td>
                <td class="px-4 py-3 text-slate-850 font-medium whitespace-nowrap text-xs text-left col-invoice-id">${invoiceId}</td>
                <td class="px-4 py-3 text-xs truncate text-left col-customer" title="${customerName}">${customerNameShort}</td>
                <td class="px-4 py-3 whitespace-nowrap text-center col-status">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass}">${wayBill.ewaybill_status || 'Draft'}</span>
                </td>
                <td class="px-4 py-3 text-right font-bold text-xs whitespace-nowrap text-slate-900 col-total">
                    ₹${formatIndian(total, 2)}
                </td>
            `;
        }

        const copyElement = row.querySelector('.copy-text') as HTMLElement;
        const restoreCardBtn = row.querySelector('.restore-card-btn') as HTMLElement;
        const hardDeleteCardBtn = row.querySelector('.hard-delete-card-btn') as HTMLElement;

        const wayBillMongoId = wayBill._id || '';

        if (restoreCardBtn) {
            restoreCardBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    if (isTrash) {
                        await (window as any).ewaybillApi.restoreEWayBillFromTrash(wayBillMongoId);
                    } else {
                        await (window as any).ewaybillApi.restoreEWayBill(wayBillMongoId);
                    }
                    loadRecentWayBills();
                } catch (err) {
                    console.error('Restore failed:', err);
                }
            });
        }

        if (hardDeleteCardBtn) {
            hardDeleteCardBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const message = 'Are you sure you want to permanently delete this e-way bill? This action cannot be undone.';
                if (electronAPI?.showAlert2) {
                    electronAPI.showAlert2(message);
                    electronAPI.receiveAlertResponse(async (response: string) => {
                        if (response === "Yes") {
                            try {
                                await (window as any).ewaybillApi.hardDeleteEWayBill(wayBillMongoId);
                                loadRecentWayBills();
                            } catch (err) {
                                console.error('Hard delete failed:', err);
                            }
                        }
                    });
                }
            });
        }

        if (copyElement) {
            copyElement.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    await navigator.clipboard.writeText(displayId);
                    if (typeof (window as any).showToast === 'function') {
                        (window as any).showToast('ID Copied to Clipboard!');
                    }
                } catch (err) {
                    console.error('Copy failed', err);
                }
            });
        }

        row.addEventListener('click', () => {
            if (typeof (window as any).viewWayBill === 'function') {
                (window as any).viewWayBill(wayBillMongoId);
            }
        });

        return row;
    }

    // Delete an e-way bill
    async function deleteWayBillHandler(wayBillId: string) {
        const ewaybillApi = (window as any).ewaybillApi;
        try {
            await ewaybillApi.deleteEWayBill(wayBillId);
            loadRecentWayBills();
        } catch (err) {
            console.error('Delete ewaybill failed:', err);
            if (typeof electronAPI !== 'undefined' && electronAPI.showAlert1) {
                electronAPI.showAlert1('Failed to delete e-way bill.');
            } else {
                alert('Failed to delete e-way bill.');
            }
        }
    }

    // Show the new way bill form
    function showNewWayBillFormHandler() {
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
                const form = document.getElementById('waybill-form') as HTMLFormElement | null;
                if (form) form.reset();

                // Clear items table
                const itemsTableBody = document.querySelector("#items-table tbody") as HTMLTableSectionElement | null;
                if (itemsTableBody) {
                    itemsTableBody.innerHTML = "";
                }

                // Clear items container
                const itemsContainer = document.getElementById("items-container");
                if (itemsContainer) {
                    itemsContainer.innerHTML = "";
                }

                // Reset to step 1
                if (typeof (window as any).changeStep === 'function') {
                    (window as any).changeStep(1);
                } else {
                    document.querySelectorAll('.steps').forEach(step => step.classList.remove('active'));
                    const step1 = document.getElementById('step-1');
                    if (step1) step1.classList.add('active');
                }
                // Set default waybill date if the date input exists and is empty
                const waybillDateInput = document.getElementById('waybill-date') as HTMLInputElement | null;
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
    (window as any).showNewWayBillForm = showNewWayBillFormHandler;

    // Handle search functionality
    async function handleSearch() {
        const wbSearchInput = document.getElementById('search-input') as HTMLInputElement | null;
        const query = wbSearchInput ? wbSearchInput.value.trim() : '';
        if (!query) {
            await loadRecentWayBills();
            return;
        }

        try {
            const status = currentFilters.status === 'archived' ? 'archived' : '';
            const deleted = !!(window as any).showDeletedItems;
            let url = `/eWayBill/search/${encodeURIComponent(query)}?`;
            if (status) url += `status=${encodeURIComponent(status)}&`;
            if (deleted) url += `deleted=true&`;

            const response = await fetch(url);
            if (!response.ok) {
                if (currentFilters.status === 'archived') {
                    archivedWayBills = [];
                } else {
                    allWayBills = [];
                }
                applyWayBillFilters();
                const noResultsMessage = `No e-way bills match your search`;
                const messageHtml = `<div class="flex flex-col items-center justify-center w-full text-center py-4 fade-in select-none mx-auto" style="min-height: 300px;">
                            <div class="text-yellow-500 text-5xl mb-4">
                                <i class="fas fa-search"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">No Results Found</h2>
                            <p class="text-gray-500 text-xs">${noResultsMessage}</p>
                       </div>`;
                wayBillsListDiv.innerHTML = `<tr><td colspan="100" class="px-4 py-12 bg-white text-slate-400 text-center align-middle h-full">${messageHtml}</td></tr>`;
                return;
            }

            const data = await response.json();
            const docs = data.eWayBills || data.eWayBill || [];
            if (currentFilters.status === 'archived') {
                archivedWayBills = docs;
            } else {
                allWayBills = docs;
            }
            applyWayBillFilters();
        } catch (error) {
            console.error("Search failed:", error);
        }
    }

    // Auto-open new form or view based on URL parameters
    document.addEventListener('DOMContentLoaded', () => {
        const searchParams = new URLSearchParams(window.location.search);
        const isNewQuery = searchParams.has('new');
        const viewId = searchParams.get('view') || searchParams.get('id');

        // Auto-open new form if ?new=1 parameter is present
        if (isNewQuery) {
            sessionStorage.setItem('currentTab', 'eWayBill');
            setTimeout(() => {
                const newBtn = document.getElementById('new-waybill-btn') as HTMLButtonElement | null;
                if (newBtn) {
                    newBtn.click();
                }
            }, 100);
        }

        // Auto-open view if ?view=<id> parameter is present
        if (viewId && typeof (window as any).viewWayBill === 'function') {
            sessionStorage.setItem('currentTab', 'eWayBill');
            setTimeout(() => {
                (window as any).viewWayBill(viewId);
            }, 100);
        }
    });
})();
