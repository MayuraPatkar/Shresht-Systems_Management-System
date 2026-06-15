// @ts-nocheck
(function () {
    (window as any).showDeletedItems = false;
    (window as any).statusFilter = '';

    const initializeMain = () => {
        // Only run main list logic if we are on the list view
        const recordsTbody = document.getElementById('purchase-order-tbody');
        if (!recordsTbody) return;

        // Initialize filters
        if ((window as any).initPurchaseOrderFilters) {
            (window as any).initPurchaseOrderFilters();
        }

        // Initialize keyboard shortcuts
        if ((window as any).initPurchaseOrderShortcutsModal) {
            (window as any).initPurchaseOrderShortcutsModal();
        }

        // Load recent purchase orders
        loadRecentPurchaseOrders();

        // New Purchase Order button
        const newBtn = document.getElementById('new-purchase');
        if (newBtn) {
            newBtn.addEventListener('click', showNewPurchaseForm);
        }

        // Archived button toggle
        const archivedBtn = document.getElementById('archived-purchase-orders-btn');
        if (archivedBtn) {
            archivedBtn.onclick = () => {
                if ((window as any).statusFilter === 'archived') {
                    (window as any).statusFilter = '';
                } else {
                    (window as any).statusFilter = 'archived';
                }
                loadRecentPurchaseOrders();
            };
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
                const guardNavigation = (window as any).guardPurchaseOrderNavigation;
                if (typeof guardNavigation === 'function' && guardNavigation('/purchaseorder')) {
                    return;
                }
                sessionStorage.removeItem('currentTab-status');
                window.location.href = '/purchaseorder';
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const icon = refreshBtn.querySelector('i');
                if (icon) icon.classList.add('animate-spin');
                loadRecentPurchaseOrders().finally(() => {
                    setTimeout(() => {
                        if (icon) icon.classList.remove('animate-spin');
                    }, 500);
                });
            });
        }

        // Trash button toggle
        const showDeletedBtn = document.getElementById('showDeletedBtn');
        if (showDeletedBtn) {
            showDeletedBtn.addEventListener('click', () => {
                (window as any).showDeletedItems = !(window as any).showDeletedItems;
                updateTrashButton();
                if (typeof (window as any).updateHeaderVisibility === 'function') {
                    (window as any).updateHeaderVisibility();
                }
                loadRecentPurchaseOrders();
            });
        }

        // Bulk Restore and Delete buttons
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
                const filteredData = (window as any).currentFilteredPurchaseOrders || (window as any).allPurchaseOrders || [];
                if (filteredData.length === 0) {
                    showToast('No purchase orders to restore.', 'error');
                    return;
                }

                const query = searchInput ? searchInput.value.trim() : '';
                const isFiltered = query !== '';
                const message = `Are you sure you want to restore all ${filteredData.length} ${isFiltered ? 'filtered ' : ''}purchase orders?`;

                confirmAction(message, async () => {
                    try {
                        await (window as any).purchaseOrderApi.bulkRestorePurchaseOrders(filteredData.map((po: any) => po.purchase_order_no));
                        showToast('Purchase orders restored successfully!');
                        loadRecentPurchaseOrders();
                    } catch (err) {
                        showToast('Failed to bulk restore purchase orders.', 'error');
                    }
                });
            };
        }

        if (bulkDeleteBtn) {
            bulkDeleteBtn.onclick = () => {
                const filteredData = (window as any).currentFilteredPurchaseOrders || (window as any).allPurchaseOrders || [];
                if (filteredData.length === 0) {
                    showToast('No purchase orders to delete.', 'error');
                    return;
                }

                const query = searchInput ? searchInput.value.trim() : '';
                const isFiltered = query !== '';
                const message = `Are you sure you want to PERMANENTLY delete all ${filteredData.length} ${isFiltered ? 'filtered ' : ''}purchase orders? This cannot be undone.`;

                confirmAction(message, async () => {
                    try {
                        await (window as any).purchaseOrderApi.bulkHardDeletePurchaseOrders(filteredData.map((po: any) => po.purchase_order_no));
                        showToast('Purchase orders permanently deleted!');
                        loadRecentPurchaseOrders();
                    } catch (err) {
                        showToast('Failed to bulk delete purchase orders.', 'error');
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
            const showDeletedBtn = document.getElementById('showDeletedBtn');
            const archivedBtn = document.getElementById('archived-purchase-orders-btn');
            const newPurchaseBtn = document.getElementById('new-purchase');
            const bulkRestoreBtn = document.getElementById('bulk-restore-btn');
            const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

            const viewEditBtn = document.getElementById('view-edit-btn');
            const viewSaveBtn = document.getElementById('view-save-btn');
            const viewCancelBtn = document.getElementById('view-cancel-btn');

            if (isFormActive) {
                // Creation mode
                if (searchFilterContainer) searchFilterContainer.style.display = 'none';
                if (refreshBtn) refreshBtn.style.display = 'none';
                if (showDeletedBtn) showDeletedBtn.style.display = 'none';
                if (archivedBtn) archivedBtn.style.display = 'none';
                if (newPurchaseBtn) newPurchaseBtn.style.display = 'none';
                if (homeBtn) homeBtn.style.display = 'flex';
                
                if (viewEditBtn) viewEditBtn.style.display = 'none';
                if (viewSaveBtn) viewSaveBtn.style.display = 'none';
                if (viewCancelBtn) viewCancelBtn.style.display = 'none';

                if (bulkRestoreBtn) {
                    bulkRestoreBtn.style.display = 'none';
                    bulkRestoreBtn.classList.add('hidden');
                }
                if (bulkDeleteBtn) {
                    bulkDeleteBtn.style.display = 'none';
                    bulkDeleteBtn.classList.add('hidden');
                }
            } else if (isViewActive) {
                // View mode
                if (searchFilterContainer) searchFilterContainer.style.display = 'none';
                if (refreshBtn) refreshBtn.style.display = 'none';
                if (showDeletedBtn) showDeletedBtn.style.display = 'none';
                if (archivedBtn) archivedBtn.style.display = 'none';

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
                } else {
                    if (newPurchaseBtn) newPurchaseBtn.style.display = 'flex';
                    if (homeBtn) homeBtn.style.display = 'flex';
                    if (viewEditBtn) viewEditBtn.style.display = 'flex';
                    if (viewSaveBtn) viewSaveBtn.style.display = 'none';
                    if (viewCancelBtn) viewCancelBtn.style.display = 'none';
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
        if (viewId && (window as any).viewPurchaseOrder) {
            (window as any).viewPurchaseOrder(viewId);
            // Clean up URL without reloading
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMain);
    } else {
        initializeMain();
    }

    async function loadRecentPurchaseOrders() {
        try {
            if ((window as any).purchaseOrderApi) {
                const status = (window as any).statusFilter || '';
                const deleted = !!(window as any).showDeletedItems;
                const data = await (window as any).purchaseOrderApi.fetchRecentPurchaseOrders(status, deleted);
                if ((window as any).allPurchaseOrders) {
                    (window as any).allPurchaseOrders = data.purchaseOrders;
                }
                
                if ((window as any).applyPurchaseOrderFilters) {
                    (window as any).applyPurchaseOrderFilters();
                } else if ((window as any).purchaseOrderTable) {
                    (window as any).purchaseOrderTable.renderPurchaseOrders(data.purchaseOrders);
                }

                updateArchivedCount();
                updateArchivedButtonVisuals();

                if (typeof (window as any).updateBulkButtonLabels === 'function') {
                    (window as any).updateBulkButtonLabels();
                }
            } else {
                console.error("PurchaseOrder API not loaded");
            }
        } catch (error) {
            console.error("Error fetching recent purchase orders:", error);
            showToast("Failed to load purchase orders", "error");
        }
    }

    const updateArchivedCount = async () => {
        try {
            const archived = await (window as any).purchaseOrderApi.fetchRecentPurchaseOrders('archived', false);
            const countBadge = document.getElementById('archived-count-badge');
            if (countBadge) {
                countBadge.textContent = (archived.purchaseOrders || archived).length.toString();
            }
        } catch (err) {
            console.error('Failed to update archived count:', err);
        }
    };
    (window as any).updateArchivedCount = updateArchivedCount;

    function updateArchivedButtonVisuals() {
        const archivedBtn = document.getElementById('archived-purchase-orders-btn') as HTMLButtonElement | null;
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
        window.location.href = '/purchaseorder/form';
    }

    async function handleSearch(query: string) {
        if (!query.trim()) {
            loadRecentPurchaseOrders();
            return;
        }

        try {
            const status = (window as any).statusFilter || '';
            const deleted = !!(window as any).showDeletedItems;
            let url = `/purchaseOrder/search/${encodeURIComponent(query)}?`;
            if (status) url += `status=${encodeURIComponent(status)}&`;
            if (deleted) url += `deleted=true&`;

            const response = await fetch(url);
            if (!response.ok) {
                if ((window as any).purchaseOrderTable) {
                    (window as any).purchaseOrderTable.renderPurchaseOrders([]);
                }
                return;
            }

            const data = await response.json();
            const results = data.purchaseOrder || [];
            if ((window as any).purchaseOrderTable) {
                (window as any).purchaseOrderTable.renderPurchaseOrders(results);
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

    (window as any).handlePurchaseOrderRestoreFromTrash = (id: string) => {
        confirmAction(`Are you sure you want to restore purchase order "${id}" from trash?`, async () => {
            try {
                await (window as any).purchaseOrderApi.restorePurchaseOrderFromTrash(id);
                showToast('Purchase order restored successfully');
                await loadRecentPurchaseOrders();
            } catch (error) {
                showToast('Failed to restore purchase order', 'error');
            }
        });
    };

    (window as any).handlePurchaseOrderRestoreFromArchive = (id: string) => {
        confirmAction(`Are you sure you want to restore purchase order "${id}"?`, async () => {
            try {
                await (window as any).purchaseOrderApi.restorePurchaseOrder(id);
                showToast('Purchase order restored successfully');
                if (document.getElementById('view')?.style.display === 'block') {
                    window.location.href = '/purchaseorder';
                } else {
                    await loadRecentPurchaseOrders();
                }
            } catch (error) {
                showToast('Failed to restore purchase order', 'error');
            }
        });
    };

    (window as any).handlePurchaseOrderArchive = (id: string) => {
        confirmAction(`Are you sure you want to archive purchase order "${id}"?`, async () => {
            try {
                await (window as any).purchaseOrderApi.archivePurchaseOrder(id);
                showToast('Purchase order archived successfully');
                if (document.getElementById('view')?.style.display === 'block') {
                    window.location.href = '/purchaseorder';
                } else {
                    await loadRecentPurchaseOrders();
                }
            } catch (error) {
                showToast('Failed to archive purchase order', 'error');
            }
        });
    };

    (window as any).handlePurchaseOrderHardDelete = (id: string) => {
        confirmAction(`Are you sure you want to permanently delete purchase order "${id}"? This cannot be undone.`, async () => {
            try {
                await (window as any).purchaseOrderApi.hardDeletePurchaseOrder(id);
                showToast('Purchase order permanently deleted');
                if (document.getElementById('view')?.style.display === 'block') {
                    window.location.href = '/purchaseorder';
                } else {
                    await loadRecentPurchaseOrders();
                }
            } catch (error) {
                showToast('Failed to permanently delete purchase order', 'error');
            }
        });
    };

    // Assign to window for global access if needed
    (window as any).loadRecentPurchaseOrders = loadRecentPurchaseOrders;
})();
