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
        sessionStorage.removeItem('currentTab-status');
        window.location.href = '/ewaybill';
        sessionStorage.setItem('currentTab', 'ewaybill');
    });

    // Main content references
    const wayBillsListDiv = document.querySelector(".records") as HTMLElement;

    // Filter state
    let allWayBills: EWayBill[] = [];
    (window as any).statusFilter = '';
    (window as any).showDeletedItems = false;
    let currentFilteredEWayBills: EWayBill[] = [];
    let currentFilters = {
        dateFilter: 'all',
        sortBy: 'date-desc',
        customStartDate: null as string | null,
        customEndDate: null as string | null
    };

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
                { label: 'Previous Step', keys: ['Backspace'] },
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
                { label: 'Focus Search', keys: ['Ctrl', 'F'] }
            ]
        }
    ];

    let shortcutsModalRef: HTMLElement | null = null;
    const isMac = navigator.userAgent.toLowerCase().includes('mac');

    // Header buttons
    document.addEventListener("DOMContentLoaded", () => {
        loadRecentWayBills();
        document.getElementById('new-waybill-btn')?.addEventListener('click', showNewWayBillFormHandler);
        
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
        const homeButton = document.getElementById('home-btn') as HTMLButtonElement | null;

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

        if ((window as any).statusFilter === 'archived') {
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
            const status = (window as any).statusFilter || '';
            const deleted = !!(window as any).showDeletedItems;
            allWayBills = await ewaybillApi.fetchRecentEWayBills(status, deleted);
            applyWayBillFilters();
            updateArchivedCount();
            updateArchivedButtonVisuals();
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

    // Apply filters to waybills
    function applyWayBillFilters() {
        const filtered = applyFilters(allWayBills, {
            dateFilter: currentFilters.dateFilter,
            sortBy: currentFilters.sortBy,
            dateField: 'createdAt',
            nameField: 'ewaybill_no',
            customStartDate: currentFilters.customStartDate,
            customEndDate: currentFilters.customEndDate
        });
        currentFilteredEWayBills = filtered;
        renderWayBills(filtered);
    }

    // Initialize filter event listeners
    function initWayBillFilters() {
        const filterBtn = document.getElementById('filter-btn') as HTMLButtonElement | null;
        const filterPopover = document.getElementById('filter-popover') as HTMLDivElement | null;
        const dateFilter = document.getElementById('date-filter') as HTMLSelectElement | null;
        const sortFilter = document.getElementById('sort-filter') as HTMLSelectElement | null;
        const clearFiltersBtn = document.getElementById('clear-filters-btn') as HTMLButtonElement | null;
        const applyFiltersBtn = document.getElementById('apply-filters-btn') as HTMLButtonElement | null;

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
                const target = e.target as Node | null;
                if (target && !filterPopover.contains(target) && e.target !== filterBtn) {
                    filterPopover.classList.add('hidden');
                }
            });
        }

        // Handle date filter custom option
        if (dateFilter) {
            dateFilter.addEventListener('change', (e: Event) => {
                const selectEl = e.target as HTMLSelectElement;
                const value = selectEl.value;
                if (value === 'custom') {
                    showCustomDateModal((startDate: string, endDate: string) => {
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
    function renderWayBills(wayBills: EWayBill[]) {
        if (!wayBillsListDiv) return;
        wayBillsListDiv.innerHTML = "";

        const isTrash = !!(window as any).showDeletedItems;
        const isArchivedView = !isTrash && (window as any).statusFilter === 'archived';

        if (!wayBills || wayBills.length === 0) {
            const wbSearchInput = document.getElementById('search-input') as HTMLInputElement | null;
            const hasSearch = wbSearchInput && wbSearchInput.value.trim() !== '';

            if (isTrash) {
                wayBillsListDiv.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                        <div class="text-rose-500 text-5xl mb-4">
                            <i class="fas fa-trash-alt"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">Trash is Empty</h2>
                        <p class="text-gray-600">No soft-deleted e-way bills found</p>
                    </div>
                `;
            } else if (isArchivedView) {
                wayBillsListDiv.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                        <div class="text-amber-500 text-5xl mb-4">
                            <i class="fas fa-archive"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">No Archived E-Way Bills</h2>
                        <p class="text-gray-600">E-way bills you archive will show up here</p>
                    </div>
                `;
            } else if (hasSearch) {
                wayBillsListDiv.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                        <div class="text-yellow-500 text-5xl mb-4">
                            <i class="fas fa-search"></i>
                        </div>
                        <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Results Found</h2>
                        <p class="text-gray-500">No e-way bills match your search</p>
                    </div>
                `;
            } else {
                wayBillsListDiv.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                        <div class="text-blue-500 text-5xl mb-4">
                            <i class="fas fa-route"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">No E-Way Bills Found</h2>
                        <p class="text-gray-600">Start creating e-way bills for your deliveries</p>
                    </div>
                `;
            }
            return;
        }
        wayBills.forEach(wayBill => {
            const wayBillDiv = createWayBillCard(wayBill);
            wayBillsListDiv.appendChild(wayBillDiv);
        });
    }

    // Create a way bill card element
    function createWayBillCard(wayBill: EWayBill): HTMLElement {
        const wayBillDiv = document.createElement("div");
        
        const isTrash = !!(window as any).showDeletedItems;
        const isArchived = !isTrash && wayBill.is_archived;
        
        let cardBgClass = "bg-white border-gray-200 hover:border-blue-400";
        let borderAccentClass = "bg-gradient-to-b from-blue-500 to-cyan-600";
        if (isTrash) {
            cardBgClass = "bg-rose-50/50 border-rose-200 hover:border-rose-300";
            borderAccentClass = "bg-rose-500";
        } else if (isArchived) {
            cardBgClass = "bg-amber-50/30 border-amber-200 hover:border-amber-300";
            borderAccentClass = "bg-amber-500";
        }
        
        wayBillDiv.className = `group rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border overflow-hidden fade-in ${cardBgClass}`;

        // Format the date for display using unified function (DD/MM/YYYY)
        const dateToFormat = wayBill.ewaybill_generated_at || wayBill.createdAt;
        const formattedDate = dateToFormat ? (typeof (window as any).formatDateDisplay === 'function' ? (window as any).formatDateDisplay(dateToFormat) : '-') : '-';

        // Get transport details from nested object
        const transport: TransportDetails = wayBill.transport || { mode: '' };
        const displayId = wayBill.ewaybill_no || wayBill._id || '-';
        
        type StatusType = 'Draft' | 'Generated' | 'Cancelled' | 'Expired';
        const statusClassMap: Record<StatusType, string> = {
            'Draft': 'bg-yellow-100 text-yellow-800',
            'Generated': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-100 text-red-800',
            'Expired': 'bg-gray-100 text-gray-800'
        };
        const statusBadgeClass = statusClassMap[wayBill.ewaybill_status as StatusType] || 'bg-gray-100 text-gray-800';

        // Truncate addresses for display
        const fromAddressStr = typeof wayBill.from_address === 'object' ? JSON.stringify(wayBill.from_address) : String(wayBill.from_address || '-');
        const toAddressStr = typeof wayBill.to_address === 'object' ? JSON.stringify(wayBill.to_address) : String(wayBill.to_address || '-');
        const fromAddressShort = fromAddressStr.split('\n')[0].substring(0, 50);
        const toAddressShort = toAddressStr.split('\n')[0].substring(0, 50);

        wayBillDiv.innerHTML = `
            <!-- Left Border Accent -->
            <div class="flex">
                <div class="w-1.5 ${borderAccentClass} rounded-l-lg"></div>
                <div class="relative p-5 flex-1">
                <!-- Top Row: Header with Title & Actions -->
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-200">
                            <i class="fas fa-route text-lg text-white"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-gray-900 truncate" title="E-Way Bill">${displayId !== '-' ? displayId : 'E-Way Bill'}</h3>
                            <span class="inline-block px-2 py-0.5 text-xs font-medium rounded ${statusBadgeClass}">${wayBill.ewaybill_status || 'Draft'}</span>
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="flex items-center gap-2">
                        ${isTrash || isArchived ? `
                            <button class="action-btn restore-card-btn px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg flex items-center gap-1.5 transition-all text-xs font-semibold tracking-wider hover:border-emerald-300 active:scale-95 cursor-pointer" title="Restore">
                                <i class="fas ${isTrash ? 'fa-trash-restore' : 'fa-box-open'}"></i> Restore
                            </button>
                            <button class="action-btn hard-delete-card-btn px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg flex items-center gap-1.5 transition-all text-xs font-semibold tracking-wider hover:border-rose-300 active:scale-95 cursor-pointer" title="Delete Forever">
                                <i class="fas fa-trash-alt"></i> Delete Forever
                            </button>
                        ` : `
                            <button class="action-btn view-btn px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 hover:border-blue-400" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit-btn px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all border border-purple-200 hover:border-purple-400" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn archive-btn px-4 py-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-all border border-amber-200 hover:border-amber-400" title="Archive">
                                <i class="fas fa-archive"></i>
                            </button>
                            <button class="action-btn delete-btn px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-200 hover:border-red-400" title="Delete">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        `}
                    </div>
                </div>
                
                <!-- Date & Transport Row -->
                <div class="flex items-center gap-2 mb-3">
                    <span class="text-xs text-gray-500">
                        <i class="fas fa-calendar-alt mr-1"></i>${formattedDate}
                    </span>
                    ${transport.vehicle_number ? `
                    <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                    <span class="text-xs text-gray-500">
                        <i class="fas fa-truck mr-1"></i>${transport.vehicle_number}
                    </span>
                    ` : ''}
                    ${wayBill.total_invoice_value ? `
                    <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                    <span class="text-sm font-bold text-green-600">₹ ${typeof formatIndian === 'function' ? formatIndian(wayBill.total_invoice_value, 2) : wayBill.total_invoice_value}</span>
                    ` : ''}
                </div>
                
                <!-- Bottom Row: From/To Addresses -->
                <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-warehouse text-green-600 text-xs"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="text-xs text-gray-500 uppercase tracking-wider">From</p>
                            <p class="text-sm font-medium text-gray-800 truncate" title="${wayBill.from_address || '-'}">${fromAddressShort}</p>
                        </div>
                    </div>
                    
                    <div class="flex-shrink-0 mx-2">
                        <i class="fas fa-arrow-right text-gray-400"></i>
                    </div>
                    
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <div class="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-map-marker-alt text-orange-600 text-xs"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="text-xs text-gray-500 uppercase tracking-wider">To</p>
                            <p class="text-sm font-medium text-gray-800 truncate" title="${wayBill.to_address || '-'}">${toAddressShort}</p>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        `;

        // Use MongoDB _id for all operations
        const wayBillMongoId = wayBill._id || '';

        if (isTrash || isArchived) {
            const restoreBtn = wayBillDiv.querySelector('.restore-card-btn') as HTMLButtonElement;
            const hardDeleteBtn = wayBillDiv.querySelector('.hard-delete-card-btn') as HTMLButtonElement;

            restoreBtn.addEventListener('click', async () => {
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

            hardDeleteBtn.addEventListener('click', () => {
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
                } else {
                    if (confirm(message)) {
                        (async () => {
                            try {
                                await (window as any).ewaybillApi.hardDeleteEWayBill(wayBillMongoId);
                                loadRecentWayBills();
                            } catch (err) {
                                console.error('Hard delete failed:', err);
                            }
                        })();
                    }
                }
            });
        } else {
            const viewBtn = wayBillDiv.querySelector('.view-btn') as HTMLButtonElement;
            const editBtn = wayBillDiv.querySelector('.edit-btn') as HTMLButtonElement;
            const archiveBtn = wayBillDiv.querySelector('.archive-btn') as HTMLButtonElement;
            const deleteBtn = wayBillDiv.querySelector('.delete-btn') as HTMLButtonElement;

            viewBtn.addEventListener('click', () => {
                if (typeof (window as any).viewWayBill === 'function') {
                    (window as any).viewWayBill(wayBillMongoId);
                }
            });

            editBtn.addEventListener('click', () => {
                sessionStorage.setItem('currentTab-status', 'update');
                if (typeof (window as any).openWayBill === 'function') {
                    (window as any).openWayBill(wayBillMongoId);
                }
            });

            archiveBtn.addEventListener('click', async () => {
                try {
                    await (window as any).ewaybillApi.archiveEWayBill(wayBillMongoId);
                    loadRecentWayBills();
                } catch (err) {
                    console.error('Archive failed:', err);
                }
            });

            deleteBtn.addEventListener('click', () => {
                const message = 'Are you sure you want to delete this e-way bill?';
                if (electronAPI?.showAlert2) {
                    electronAPI.showAlert2(message);
                    electronAPI.receiveAlertResponse(async (response: string) => {
                        if (response === "Yes") {
                            try {
                                await (window as any).ewaybillApi.deleteEWayBill(wayBillMongoId);
                                loadRecentWayBills();
                            } catch (err) {
                                console.error('Delete failed:', err);
                            }
                        }
                    });
                } else {
                    if (confirm(message)) {
                        (async () => {
                            try {
                                await (window as any).ewaybillApi.deleteEWayBill(wayBillMongoId);
                                loadRecentWayBills();
                            } catch (err) {
                                console.error('Delete failed:', err);
                            }
                        })();
                    }
                }
            });
        }

        return wayBillDiv;
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

    // Handle search functionality
    async function handleSearch() {
        const wbSearchInput = document.getElementById('search-input') as HTMLInputElement | null;
        const query = wbSearchInput ? wbSearchInput.value.trim() : '';
        if (!query) {
            await loadRecentWayBills();
            return;
        }

        await searchDocuments('eWayBill', query, wayBillsListDiv, createWayBillCard,
            `<div class="flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                <div class="text-yellow-500 text-5xl mb-4"><i class="fas fa-search"></i></div>
                <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Results Found</h2>
                <p class="text-gray-500">No e-way bills match your search</p>
            </div>`);
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
