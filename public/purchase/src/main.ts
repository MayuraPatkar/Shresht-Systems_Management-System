// @ts-nocheck
(function () {
    (window as any).showDeletedItems = false;
    (window as any).statusFilter = '';

    const initializeMain = () => {
        // Only run main list logic if we are on the list view
        const purchaseTbody = document.getElementById('purchase-tbody');
        if (!purchaseTbody) return;

        // Initialize filters
        if ((window as any).initPurchaseFilters) {
            (window as any).initPurchaseFilters();
        }

        // Initialize keyboard shortcuts
        if ((window as any).initPurchaseShortcutsModal) {
            (window as any).initPurchaseShortcutsModal();
        }

        // Load recent purchases
        loadRecentPurchases();

        // New Purchase button
        const newBtn = document.getElementById('new-purchase');
        if (newBtn) {
            newBtn.addEventListener('click', () => {
                sessionStorage.removeItem('currentTab-status');
                window.location.href = '/purchase/form';
            });
        }

        // Search functionality
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        if (searchInput) {
            let searchTimeout: any;
            searchInput.addEventListener('input', (e) => {
                const query = (e.target as HTMLInputElement).value;
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => handleSearch(query), 300);
            });
        }

        // Home button
        const homeBtn = document.getElementById('home-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                const guardNavigation = (window as any).guardPurchaseNavigation;
                if (typeof guardNavigation === 'function' && guardNavigation('/purchase')) {
                    return;
                }
                sessionStorage.removeItem('currentTab-status');
                window.location.href = '/purchase';
            });
        }

        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const icon = refreshBtn.querySelector('i');
                if (icon) icon.classList.add('animate-spin');
                loadRecentPurchases().finally(() => {
                    setTimeout(() => {
                        if (icon) icon.classList.remove('animate-spin');
                    }, 500);
                });
            });
        }

        const archivedBtn = document.getElementById('archived-purchases-btn');
        if (archivedBtn) {
            archivedBtn.addEventListener('click', () => {
                (window as any).showDeletedItems = false;
                (window as any).statusFilter =
                    (window as any).statusFilter === 'archived' ? '' : 'archived';
                resetTrashButton();
                loadRecentPurchases();
            });
        }

        const showDeletedBtn = document.getElementById('showDeletedBtn');
        if (showDeletedBtn) {
            showDeletedBtn.addEventListener('click', () => {
                (window as any).showDeletedItems = !(window as any).showDeletedItems;
                (window as any).statusFilter = '';
                updateTrashButton();
                if (typeof (window as any).updateHeaderVisibility === 'function') {
                    (window as any).updateHeaderVisibility();
                }
                loadRecentPurchases();
            });
        }

        const bulkRestoreBtn = document.getElementById('bulk-restore-btn');
        const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

        function updateBulkButtonLabels() {
            const query = searchInput ? searchInput.value.trim() : '';
            const isFiltered = query !== '';
            
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
                const filteredData = (window as any).currentFilteredPurchases || (window as any).allPurchases || [];
                if (filteredData.length === 0) {
                    showToast('No purchases to restore.', 'error');
                    return;
                }

                const query = searchInput ? searchInput.value.trim() : '';
                const isFiltered = query !== '';
                const message = `Are you sure you want to restore all ${filteredData.length} ${isFiltered ? 'filtered ' : ''}purchases?`;

                confirmAction(message, async () => {
                    try {
                        await (window as any).purchaseApi.bulkRestorePurchases(filteredData.map((p: any) => p.purchase_no));
                        showToast('Purchases restored successfully!');
                        loadRecentPurchases();
                    } catch (err) {
                        showToast('Failed to bulk restore purchases.', 'error');
                    }
                });
            };
        }

        if (bulkDeleteBtn) {
            bulkDeleteBtn.onclick = () => {
                const filteredData = (window as any).currentFilteredPurchases || (window as any).allPurchases || [];
                if (filteredData.length === 0) {
                    showToast('No purchases to delete.', 'error');
                    return;
                }

                const query = searchInput ? searchInput.value.trim() : '';
                const isFiltered = query !== '';
                const message = `Are you sure you want to PERMANENTLY delete all ${filteredData.length} ${isFiltered ? 'filtered ' : ''}purchases? This cannot be undone.`;

                confirmAction(message, async () => {
                    try {
                        await (window as any).purchaseApi.bulkHardDeletePurchases(filteredData.map((p: any) => p.purchase_no));
                        showToast('Purchases permanently deleted!');
                        loadRecentPurchases();
                    } catch (err) {
                        showToast('Failed to bulk delete purchases.', 'error');
                    }
                });
            };
        }

        // Dynamically toggle Header elements visibility based on active section
        const homeSection = document.getElementById('home');
        const newSection = document.getElementById('new');
        const viewSection = document.getElementById('view');

        const updateHeaderVisibility = () => {
            const isHomeVisible = homeSection ? window.getComputedStyle(homeSection).display !== 'none' : true;
            const isFormActive = newSection ? window.getComputedStyle(newSection).display !== 'none' : false;
            const isViewActive = viewSection ? window.getComputedStyle(viewSection).display !== 'none' : false;

            const searchFilterContainer = document.getElementById('search-filter-container');
            const refreshBtn = document.getElementById('refresh-btn');
            const archivedBtn = document.getElementById('archived-purchases-btn');
            const showDeletedBtn = document.getElementById('showDeletedBtn');
            const newPurchaseBtn = document.getElementById('new-purchase');
            const bulkRestoreBtn = document.getElementById('bulk-restore-btn');
            const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
            
            const viewEditBtn = document.getElementById('view-edit-btn');
            const viewSaveBtn = document.getElementById('view-save-btn');
            const viewCancelBtn = document.getElementById('view-cancel-btn');
            const viewPaymentBtn = document.getElementById('view-payment-btn');

            if (isFormActive) {
                // Creation mode: hide search, filter, archived, trash, refresh, new-purchase. Show home.
                if (searchFilterContainer) searchFilterContainer.style.display = 'none';
                if (refreshBtn) refreshBtn.style.display = 'none';
                if (archivedBtn) archivedBtn.style.display = 'none';
                if (showDeletedBtn) showDeletedBtn.style.display = 'none';
                if (newPurchaseBtn) newPurchaseBtn.style.display = 'none';
                if (homeBtn) homeBtn.style.display = 'flex';
                
                if (viewEditBtn) viewEditBtn.style.display = 'none';
                if (viewSaveBtn) viewSaveBtn.style.display = 'none';
                if (viewCancelBtn) viewCancelBtn.style.display = 'none';
                if (viewPaymentBtn) viewPaymentBtn.style.display = 'none';

                if (bulkRestoreBtn) {
                    bulkRestoreBtn.style.display = 'none';
                    bulkRestoreBtn.classList.add('hidden');
                }
                if (bulkDeleteBtn) {
                    bulkDeleteBtn.style.display = 'none';
                    bulkDeleteBtn.classList.add('hidden');
                }
            } else if (isViewActive) {
                // View mode: hide search, filter, archived, trash.
                if (searchFilterContainer) searchFilterContainer.style.display = 'none';
                if (refreshBtn) refreshBtn.style.display = 'none';
                if (archivedBtn) archivedBtn.style.display = 'none';
                if (showDeletedBtn) showDeletedBtn.style.display = 'none';

                if (bulkRestoreBtn) {
                    bulkRestoreBtn.style.display = 'none';
                    bulkRestoreBtn.classList.add('hidden');
                }
                if (bulkDeleteBtn) {
                    bulkDeleteBtn.style.display = 'none';
                    bulkDeleteBtn.classList.add('hidden');
                }

                const isEditing = !!(window as any).isEditingInline;
                if (isEditing) {
                    if (newPurchaseBtn) newPurchaseBtn.style.display = 'none';
                    if (homeBtn) homeBtn.style.display = 'none';
                    if (viewEditBtn) viewEditBtn.style.display = 'none';
                    if (viewSaveBtn) viewSaveBtn.style.display = 'flex';
                    if (viewCancelBtn) viewCancelBtn.style.display = 'flex';
                    if (viewPaymentBtn) viewPaymentBtn.style.display = 'none';
                } else {
                    if (newPurchaseBtn) newPurchaseBtn.style.display = 'flex';
                    if (homeBtn) homeBtn.style.display = 'flex';
                    if (viewEditBtn) viewEditBtn.style.display = 'flex';
                    if (viewSaveBtn) viewSaveBtn.style.display = 'none';
                    if (viewCancelBtn) viewCancelBtn.style.display = 'none';
                    if (viewPaymentBtn) viewPaymentBtn.style.display = 'flex';
                }
            } else {
                // Dashboard management mode
                if (searchFilterContainer) searchFilterContainer.style.display = 'flex';
                if (refreshBtn) refreshBtn.style.display = 'flex';
                if (showDeletedBtn) showDeletedBtn.style.display = 'flex';
                if (homeBtn) homeBtn.style.display = isHomeVisible ? 'none' : 'flex';
                
                if (viewEditBtn) viewEditBtn.style.display = 'none';
                if (viewSaveBtn) viewSaveBtn.style.display = 'none';
                if (viewCancelBtn) viewCancelBtn.style.display = 'none';
                if (viewPaymentBtn) viewPaymentBtn.style.display = 'none';

                // Contextual elements based on Trash mode
                const isTrashOpen = !!(window as any).showDeletedItems;
                if (isTrashOpen) {
                    if (archivedBtn) archivedBtn.style.display = 'none';
                    if (newPurchaseBtn) newPurchaseBtn.style.display = 'none';
                    if (bulkRestoreBtn) {
                        bulkRestoreBtn.style.display = 'flex';
                        bulkRestoreBtn.classList.remove('hidden');
                    }
                    if (bulkDeleteBtn) {
                        bulkDeleteBtn.style.display = 'flex';
                        bulkDeleteBtn.classList.remove('hidden');
                    }
                } else {
                    if (archivedBtn) archivedBtn.style.display = 'flex';
                    if (newPurchaseBtn) newPurchaseBtn.style.display = 'flex';
                    if (bulkRestoreBtn) {
                        bulkRestoreBtn.style.display = 'none';
                        bulkRestoreBtn.classList.add('hidden');
                    }
                    if (bulkDeleteBtn) {
                        bulkDeleteBtn.style.display = 'none';
                        bulkDeleteBtn.classList.add('hidden');
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

        // Handle URL parameters for cross-module navigation
        const urlParams = new URLSearchParams(window.location.search);
        const viewId = urlParams.get('view');
        if (viewId) {
            window.location.href = `/purchase/details?id=${viewId}`;
            return;
        }
        const isNew = urlParams.get('new');
        if (isNew === '1' || isNew === 'true') {
            window.location.href = '/purchase/form';
            return;
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMain);
    } else {
        initializeMain();
    }

    async function loadRecentPurchases() {
        try {
            if ((window as any).purchaseApi) {
                const status = (window as any).statusFilter || '';
                const deleted = !!(window as any).showDeletedItems;
                const data = await (window as any).purchaseApi.fetchRecentPurchases(status, deleted);
                if ((window as any).allPurchases) {
                    (window as any).allPurchases = data.purchases;
                }
                
                if ((window as any).applyPurchaseFilters) {
                    (window as any).applyPurchaseFilters();
                } else if ((window as any).purchaseTable) {
                    (window as any).purchaseTable.renderPurchases(data.purchases);
                }

                updateArchivedButtonVisuals();
                await updateArchivedCount();
                if (typeof (window as any).updateBulkButtonLabels === 'function') {
                    (window as any).updateBulkButtonLabels();
                }
            } else {
                console.error("Purchase API not loaded");
            }
        } catch (error) {
            console.error("Error fetching recent purchases:", error);
            showToast("Failed to load purchases", "error");
        }
    }

    async function updateArchivedCount() {
        try {
            const data = await (window as any).purchaseApi.fetchRecentPurchases('archived', false);
            const badge = document.getElementById('archived-count-badge');
            if (badge) badge.textContent = String((data.purchases || []).length);
        } catch (error) {
            console.error('Failed to update archived purchase count:', error);
        }
    }

    function updateArchivedButtonVisuals() {
        const archivedBtn = document.getElementById('archived-purchases-btn');
        if (!archivedBtn) return;

        const icon = archivedBtn.querySelector('i');
        const badge = document.getElementById('archived-count-badge');
        if ((window as any).statusFilter === 'archived') {
            archivedBtn.classList.remove('bg-gray-200', 'text-gray-700', 'border-slate-200', 'hover:bg-slate-50');
            archivedBtn.classList.add('bg-amber-500', 'text-white', 'border-amber-500', 'hover:bg-amber-600');
            if (icon) icon.className = 'fas fa-box-open text-white';
            if (badge) badge.className = 'ml-1 px-1.5 py-0.5 bg-white/20 text-white rounded-md text-[10px] font-bold';
        } else {
            archivedBtn.classList.remove('bg-amber-500', 'text-white', 'border-amber-500', 'hover:bg-amber-600');
            archivedBtn.classList.add('bg-gray-200', 'text-gray-700', 'border-slate-200', 'hover:bg-slate-50');
            if (icon) icon.className = 'fas fa-archive text-slate-400';
            if (badge) badge.className = 'ml-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold';
        }
    }

    function resetTrashButton() {
        (window as any).showDeletedItems = false;
        updateTrashButton();
        if (typeof (window as any).updateHeaderVisibility === 'function') {
            (window as any).updateHeaderVisibility();
        }
    }

    function updateTrashButton() {
        const showDeletedBtn = document.getElementById('showDeletedBtn');
        if (!showDeletedBtn) return;

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
    }

    function showNewPurchaseForm() {
        sessionStorage.removeItem('currentTab-status');
        if (typeof (window as any).markPurchaseFormClean === 'function') {
            (window as any).markPurchaseFormClean();
        }

        if (typeof (window as any).updateHeaderVisibility === 'function') {
            (window as any).updateHeaderVisibility();
        }

        if ((window as any).showNewDocumentForm) {
            (window as any).showNewDocumentForm({
                homeId: 'home',
                formId: 'new',
                newButtonId: 'new-purchase',
                viewId: 'view'
            });
        } else {
            const home = document.getElementById('home');
            const newSection = document.getElementById('new');
            const viewSection = document.getElementById('view');
            
            if (home) home.style.display = 'none';
            if (newSection) newSection.style.display = 'block';
            if (viewSection) viewSection.style.display = 'none';
        }

        if (typeof (window as any).changeStep === 'function') {
            (window as any).changeStep(1);
        }

        // Reset the form
        const form = document.getElementById('purchase') as HTMLFormElement | null;
        if (form) {
            form.reset();
        }
        
        // Reset hidden supplier ID and search input
        const supplierIdInput = document.getElementById('supplier-id') as HTMLInputElement | null;
        if (supplierIdInput) supplierIdInput.value = '';
        const supplierSearchInput = document.getElementById('supplier-search-input') as HTMLInputElement | null;
        if (supplierSearchInput) supplierSearchInput.value = '';

        // Clear items containers
        const itemsContainer = document.getElementById("items-container");
        const itemsTableBody = document.querySelector("#items-table tbody");
        if (itemsContainer) itemsContainer.innerHTML = "";
        if (itemsTableBody) itemsTableBody.innerHTML = "";

        // Re-render Supplier profile card to show "No Supplier Selected"
        if (typeof (window as any).renderSupplierProfileCard === 'function') {
            (window as any).renderSupplierProfileCard();
        }

        // Set default date to today
        const dateInput = document.getElementById('purchase-date') as HTMLInputElement;
        if (dateInput) {
            dateInput.value = (window as any).getTodayForInput ? 
                (window as any).getTodayForInput() : 
                new Date().toISOString().split('T')[0];
        }

        // Pre-fill initial row with defaults if necessary
        const tableBody = document.querySelector("#items-table tbody");
        if (tableBody && tableBody.children.length === 0 && (window as any).addPurchaseItem) {
            (window as any).addPurchaseItem();
        }

        // Focus on the first field after the form is visible
        setTimeout(() => {
            const firstInput = document.getElementById('purchase-invoice-id') as HTMLInputElement;
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    async function handleSearch(query: string) {
        if (!query.trim()) {
            loadRecentPurchases();
            return;
        }

        try {
            const status = (window as any).statusFilter || '';
            const deleted = !!(window as any).showDeletedItems;
            let url = `/purchase/search/${encodeURIComponent(query)}?`;
            if (status) url += `status=${encodeURIComponent(status)}&`;
            if (deleted) url += `deleted=true&`;

            const response = await fetch(url);
            if (!response.ok) {
                if ((window as any).purchaseTable) {
                    (window as any).purchaseTable.renderPurchases([]);
                }
                return;
            }

            const data = await response.json();
            const results = data.purchase || data.purchases || [];
            if ((window as any).purchaseTable) {
                (window as any).purchaseTable.renderPurchases(results);
            }
        } catch (error) {
            console.error("Search failed:", error);
            showToast("Search failed. Please try again.", "error");
        }
    }

    function showToast(message: string, type = 'info') {
        if ((window as any).electronAPI) {
            if (type === 'error') {
                (window as any).electronAPI.showAlert1(message);
            } else {
                (window as any).electronAPI.showAlert2(message);
            }
        } else {
            alert(message);
        }
    }

    function confirmAction(message: string, action: () => Promise<void>) {
        const showConfirm = (window as any).showConfirm;
        if (showConfirm) {
            showConfirm(message, async (response: string) => {
                if (response === 'Yes') await action();
            });
        } else if (window.confirm(message)) {
            action();
        }
    }

    (window as any).handlePurchaseRestoreFromArchive = (id: string) => {
        confirmAction(`Are you sure you want to restore purchase "${id}"?`, async () => {
            try {
                await (window as any).purchaseApi.restorePurchase(id);
                showToast('Purchase restored successfully');
                await loadRecentPurchases();
            } catch (error) {
                showToast('Failed to restore purchase', 'error');
            }
        });
    };

    (window as any).handlePurchaseRestoreFromTrash = (id: string) => {
        confirmAction(`Are you sure you want to restore purchase "${id}" from trash?`, async () => {
            try {
                await (window as any).purchaseApi.restorePurchaseFromTrash(id);
                showToast('Purchase restored successfully');
                await loadRecentPurchases();
            } catch (error) {
                showToast('Failed to restore purchase', 'error');
            }
        });
    };

    (window as any).handlePurchaseHardDelete = (id: string) => {
        confirmAction(`Are you sure you want to permanently delete purchase "${id}"? This cannot be undone.`, async () => {
            try {
                await (window as any).purchaseApi.hardDeletePurchase(id);
                showToast('Purchase permanently deleted');
                await loadRecentPurchases();
            } catch (error) {
                showToast('Failed to permanently delete purchase', 'error');
            }
        });
    };

    // Assign to window for global access
    (window as any).loadRecentPurchases = loadRecentPurchases;
})();
