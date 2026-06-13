/**
 * Customer Module Main Entry Point
 */

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('customer-search') as HTMLInputElement;
    const typeFilter = document.getElementById('type-filter') as HTMLSelectElement;
    const statusFilter = document.getElementById('status-filter') as HTMLSelectElement;
    const resetBtn = document.getElementById('reset-filters');
    const addBtn = document.getElementById('add-customer-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const archivedBtn = document.getElementById('archived-customers-btn') as HTMLButtonElement | null;
    const filterBtn = document.getElementById('filter-btn');
    const filterPopover = document.getElementById('filter-popover');
    const closeFilter = document.getElementById('close-filter');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const closeModal = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-btn');

    // Update Archived Customers count function
    const updateArchivedCount = async () => {
        try {
            const archived = await customerApi.fetchCustomers('', '', 'archived');
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
        if (!archivedBtn || !statusFilter) return;

        const icon = archivedBtn.querySelector('i');
        const badge = document.getElementById('archived-count-badge');

        if (statusFilter.value === 'archived') {
            // Set glowing amber active visual styles
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
            // Restore default neutral button styles
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
        const query = searchInput ? searchInput.value.trim() : '';
        if (query) {
            activeBadges.push({
                label: `Search: "${query}"`,
                clearFn: () => {
                    if (searchInput) {
                        searchInput.value = '';
                        (window as any).fetchCustomers();
                    }
                }
            });
        }

        // Customer Type
        const typeValue = typeFilter ? typeFilter.value : '';
        if (typeValue) {
            activeBadges.push({
                label: `Type: ${typeValue}`,
                clearFn: () => {
                    if (typeFilter) {
                        typeFilter.value = '';
                        (window as any).fetchCustomers();
                    }
                }
            });
        }

        // Status
        const statusValue = statusFilter ? statusFilter.value : '';
        if (statusValue) {
            const statusLabels: Record<string, string> = {
                active: 'Active',
                inactive: 'Inactive',
                archived: 'Archived'
            };
            activeBadges.push({
                label: `Status: ${statusLabels[statusValue] || statusValue}`,
                clearFn: () => {
                    if (statusFilter) {
                        statusFilter.value = '';
                        (window as any).fetchCustomers();
                    }
                }
            });
        }

        // Style the filter button (highlight if filters are applied)
        const hasActiveFilters = !!typeValue || !!statusValue;
        if (filterBtn) {
            if (hasActiveFilters) {
                filterBtn.className = 'bg-blue-600 text-white border border-blue-600 px-3 py-2 rounded-lg transition-all duration-150 flex items-center justify-center flex-shrink-0 active:scale-95 cursor-pointer shadow-md shadow-blue-100';
            } else {
                filterBtn.className = 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg transition-all duration-150 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95 cursor-pointer';
            }
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

    const updateTabCounts = (search: string, type: string, status: string, isDeleted: boolean, currentFetched: any[]) => {
        let activeInactivePromise;
        let archivedPromise;

        if (status === '') {
            activeInactivePromise = Promise.resolve(currentFetched);
            archivedPromise = customerApi.fetchCustomers(search, type, 'archived', isDeleted);
        } else if (status === 'archived') {
            activeInactivePromise = customerApi.fetchCustomers(search, type, '', isDeleted);
            archivedPromise = Promise.resolve(currentFetched);
        } else {
            activeInactivePromise = customerApi.fetchCustomers(search, type, '', isDeleted);
            archivedPromise = customerApi.fetchCustomers(search, type, 'archived', isDeleted);
        }

        Promise.all([activeInactivePromise, archivedPromise])
            .then(([activeInactive, archived]) => {
                const counts: Record<string, number> = {
                    '': activeInactive.length,
                    'active': activeInactive.filter((c: any) => c.is_active === true).length,
                    'inactive': activeInactive.filter((c: any) => c.is_active !== true).length,
                    'archived': archived.length
                };

                const statusTabs = document.querySelectorAll('.filter-tab');
                statusTabs.forEach(tab => {
                    const tabStatus = tab.getAttribute('data-status') || '';
                    const count = counts[tabStatus] || 0;
                    
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
            })
            .catch(err => console.error('Failed to update tab counts:', err));
    };

    // Fetch and render function exposed to window for forms to call
    (window as any).fetchCustomers = async () => {
        try {
            const search = searchInput?.value || '';
            const type = typeFilter?.value || '';
            const status = statusFilter?.value || '';
            const isDeleted = !!(window as any).showDeletedItems;

            // Update active state of filter tabs
            const statusTabs = document.querySelectorAll('.filter-tab');
            statusTabs.forEach(tab => {
                if (tab.getAttribute('data-status') === status) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });

            const customers = await customerApi.fetchCustomers(search, type, status, isDeleted);
            (window as any).currentCustomers = customers || [];
            customerTable.render(customers);
            updateArchivedCount();
            updateArchivedButtonVisuals();
            updateBulkButtonLabels();
            updateActiveFiltersBar();
            updateTabCounts(search, type, status, isDeleted, customers);
        } catch (error) {
            showAlert('Failed to load customers');
        }
    };

    // Delete handler exposed to window for table cards to call
    (window as any).handleDelete = (id: string, name: string) => {
        showConfirm(`Are you sure you want to delete customer "${name}"?`, async (response) => {
            if (response === 'Yes') {
                try {
                    await customerApi.deleteCustomer(id);
                    showAlert('Customer deleted successfully');
                    (window as any).fetchCustomers();
                } catch (error) {
                    showAlert('Failed to delete customer');
                }
            }
        });
    };

    // Restore from trash handler
    (window as any).handleRestoreFromTrash = (id: string, name: string) => {
        showConfirm(`Are you sure you want to restore "${name}" from trash?`, async (response) => {
            if (response === 'Yes') {
                try {
                    await customerApi.restoreCustomerFromTrash(id);
                    showAlert('Customer restored successfully');
                    (window as any).fetchCustomers();
                } catch (error) {
                    showAlert('Failed to restore customer');
                }
            }
        });
    };

    // Permanent delete handler
    (window as any).handleHardDelete = (id: string, name: string) => {
        showConfirm(`Are you sure you want to PERMANENTLY delete customer "${name}"? This cannot be undone.`, async (response) => {
            if (response === 'Yes') {
                try {
                    await customerApi.hardDeleteCustomer(id);
                    showAlert('Customer permanently deleted');
                    (window as any).fetchCustomers();
                } catch (error) {
                    showAlert('Failed to permanently delete customer');
                }
            }
        });
    };

    // Event Listeners
    if (addBtn) addBtn.onclick = () => customerForms.openAddModal();
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            const icon = refreshBtn.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            (window as any).fetchCustomers();
            setTimeout(() => {
                if (icon) icon.classList.remove('fa-spin');
            }, 600);
        };
    }
    if (closeModal) closeModal.onclick = () => customerForms.closeModal();
    if (cancelBtn) cancelBtn.onclick = () => customerForms.closeModal();

    if (archivedBtn && statusFilter) {
        archivedBtn.onclick = () => {
            if (statusFilter.value === 'archived') {
                statusFilter.value = '';
            } else {
                statusFilter.value = 'archived';
            }
            (window as any).fetchCustomers();
        };
    }

    // Register status filter tab click handlers
    const statusTabs = document.querySelectorAll('.filter-tab');
    statusTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            statusTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const status = tab.getAttribute('data-status') || '';
            if (statusFilter) {
                statusFilter.value = status;
            }
            (window as any).fetchCustomers();
        });
    });

    if (resetBtn) {
        resetBtn.onclick = () => {
            if (searchInput) searchInput.value = '';
            if (typeFilter) typeFilter.value = '';
            if (statusFilter) statusFilter.value = '';
            (window as any).fetchCustomers();
            filterPopover?.classList.add('hidden');
        };
    }

    if (filterBtn && filterPopover) {
        filterBtn.onclick = (e) => {
            e.stopPropagation();
            const rect = filterBtn.getBoundingClientRect();
            const popoverWidth = 320; // w-80 is 320px
            
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
        };
    }

    if (closeFilter) closeFilter.onclick = () => filterPopover?.classList.add('hidden');
    if (applyFiltersBtn) {
        applyFiltersBtn.onclick = () => {
            (window as any).fetchCustomers();
            filterPopover?.classList.add('hidden');
        };
    }

    const clearAllShortcut = document.getElementById('clear-all-filters-shortcut') as HTMLButtonElement;
    if (clearAllShortcut) {
        clearAllShortcut.onclick = () => {
            if (searchInput) searchInput.value = '';
            if (typeFilter) typeFilter.value = '';
            if (statusFilter) statusFilter.value = '';
            (window as any).fetchCustomers();
        };
    }

    document.addEventListener('click', (e) => {
        if (filterPopover && !filterPopover.contains(e.target as Node) && e.target !== filterBtn) {
            filterPopover.classList.add('hidden');
        }
    });

    if (filterPopover) filterPopover.onclick = (e) => e.stopPropagation();

    const showDeletedBtn = document.getElementById('showDeletedBtn');
    const bulkRestoreBtn = document.getElementById('bulk-restore-btn');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

    if (showDeletedBtn) {
        showDeletedBtn.onclick = () => {
            (window as any).showDeletedItems = !(window as any).showDeletedItems;
            
            if ((window as any).showDeletedItems) {
                showDeletedBtn.classList.remove('bg-gray-200', 'text-gray-700');
                showDeletedBtn.classList.add('bg-red-100', 'text-red-700', 'ring-2', 'ring-red-500');
                showDeletedBtn.innerHTML = '<i class="fas fa-trash-restore"></i> Close Trash';
                showDeletedBtn.title = 'Close Trash';

                if (addBtn) addBtn.classList.add('hidden');
                if (archivedBtn) archivedBtn.classList.add('hidden');
                if (bulkRestoreBtn) {
                    bulkRestoreBtn.classList.remove('hidden');
                    bulkRestoreBtn.classList.add('flex');
                }
                if (bulkDeleteBtn) {
                    bulkDeleteBtn.classList.remove('hidden');
                    bulkDeleteBtn.classList.add('flex');
                }
            } else {
                showDeletedBtn.classList.add('bg-gray-200', 'text-gray-700');
                showDeletedBtn.classList.remove('bg-red-100', 'text-red-700', 'ring-2', 'ring-red-500');
                showDeletedBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                showDeletedBtn.title = 'View Trash';

                if (addBtn) addBtn.classList.remove('hidden');
                if (archivedBtn) archivedBtn.classList.remove('hidden');
                if (bulkRestoreBtn) {
                    bulkRestoreBtn.classList.add('hidden');
                    bulkRestoreBtn.classList.remove('flex');
                }
                if (bulkDeleteBtn) {
                    bulkDeleteBtn.classList.add('hidden');
                    bulkDeleteBtn.classList.remove('flex');
                }
            }
            (window as any).fetchCustomers();
        };
    }

    function updateBulkButtonLabels() {
        const search = searchInput?.value || '';
        const type = typeFilter?.value || '';
        const status = statusFilter?.value || '';
        const isFiltered = search !== '' || type !== '' || status !== '';
        
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

    if (bulkRestoreBtn) {
        bulkRestoreBtn.onclick = () => {
            const filteredData = (window as any).currentCustomers || [];
            if (filteredData.length === 0) {
                showAlert('No customers to restore.');
                return;
            }

            const search = searchInput?.value || '';
            const type = typeFilter?.value || '';
            const status = statusFilter?.value || '';
            const isFiltered = search !== '' || type !== '' || status !== '';
            const message = `Are you sure you want to restore all ${filteredData.length} ${isFiltered ? 'filtered ' : ''}customers?`;

            showConfirm(message, async (response) => {
                if (response === 'Yes') {
                    try {
                        await customerApi.bulkRestoreCustomers(filteredData.map((c: any) => c._id));
                        showAlert('Customers restored successfully!');
                        (window as any).fetchCustomers();
                    } catch (err) {
                        showAlert('Failed to bulk restore customers.');
                    }
                }
            });
        };
    }

    if (bulkDeleteBtn) {
        bulkDeleteBtn.onclick = () => {
            const filteredData = (window as any).currentCustomers || [];
            if (filteredData.length === 0) {
                showAlert('No customers to delete.');
                return;
            }

            const search = searchInput?.value || '';
            const type = typeFilter?.value || '';
            const status = statusFilter?.value || '';
            const isFiltered = search !== '' || type !== '' || status !== '';
            const message = `Are you sure you want to PERMANENTLY delete all ${filteredData.length} ${isFiltered ? 'filtered ' : ''}customers? This cannot be undone.`;

            showConfirm(message, async (response) => {
                if (response === 'Yes') {
                    try {
                        await customerApi.bulkHardDeleteCustomers(filteredData.map((c: any) => c._id));
                        showAlert('Customers permanently deleted!');
                        (window as any).fetchCustomers();
                    } catch (err) {
                        showAlert('Failed to bulk delete customers.');
                    }
                }
            });
        };
    }

    let debounceTimer: any;
    if (searchInput) {
        searchInput.oninput = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => (window as any).fetchCustomers(), 300);
        };
    }

    // Initial load
    (window as any).fetchCustomers();

    // Check for "new" parameter in URL to auto-open modal
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('new') === '1') {
        customerForms.openAddModal();
    }
});

// ====== Global Toast ======
(window as any).showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const existingToast = document.getElementById('global-toast');
    if (existingToast) {
        existingToast.remove();
    }
    const toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm shadow-xl transition-all duration-350';
    
    if (type === 'error') {
        toast.style.background = '#ef4444';
        toast.innerHTML = `<i class="fas fa-exclamation-circle text-base"></i><span>${message}</span>`;
    } else {
        toast.style.background = '#10b981';
        toast.innerHTML = `<i class="fas fa-check-circle text-base"></i><span>${message}</span>`;
    }

    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    
    document.body.appendChild(toast);

    // Trigger reflow
    toast.offsetHeight;

    // Animate in
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2000);
};
