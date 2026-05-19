/**
 * Supplier Module Main Entry Point
 */

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('supplier-search') as HTMLInputElement;
    const typeFilter = document.getElementById('type-filter') as HTMLSelectElement;
    const statusFilter = document.getElementById('status-filter') as HTMLSelectElement;
    const resetBtn = document.getElementById('reset-filters');
    const addBtn = document.getElementById('add-supplier-btn');
    const filterBtn = document.getElementById('filter-btn');
    const filterPopover = document.getElementById('filter-popover');
    const closeFilter = document.getElementById('close-filter');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const closeModal = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-btn');

    const archivedBtn = document.getElementById('archived-suppliers-btn') as HTMLButtonElement | null;

    // Update Archived Suppliers count function
    const updateArchivedCount = async () => {
        try {
            const archived = await supplierApi.fetchSuppliers('', '', 'archived');
            const countBadge = document.getElementById('archived-count-badge');
            if (countBadge) {
                countBadge.textContent = archived.length.toString();
            }
        } catch (err) {
            console.error('Failed to update archived count:', err);
        }
    };
    (window as any).updateArchivedCount = updateArchivedCount;

    // Fetch and render function exposed to window for forms to call
    (window as any).fetchSuppliers = async () => {
        try {
            const search = searchInput?.value || '';
            const type = typeFilter?.value || '';
            const status = statusFilter?.value || '';

            const suppliers = await supplierApi.fetchSuppliers(search, type, status);
            supplierTable.render(suppliers);
            updateArchivedCount();
            updateArchivedButtonVisuals();
        } catch (error) {
            showAlert('Failed to load suppliers');
        }
    };

    // Delete handler exposed to window for table cards to call
    (window as any).handleDelete = (id: string, name: string) => {
        showConfirm(`Are you sure you want to delete supplier "${name}"?`, async (response) => {
            if (response === 'Yes') {
                try {
                    await supplierApi.deleteSupplier(id);
                    showAlert('Supplier deleted successfully');
                    (window as any).fetchSuppliers();
                } catch (error) {
                    showAlert('Failed to delete supplier');
                }
            }
        });
    };

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

    // Event Listeners
    if (addBtn) addBtn.onclick = () => supplierForms.openAddModal();
    if (closeModal) closeModal.onclick = () => supplierForms.closeModal();
    if (cancelBtn) cancelBtn.onclick = () => supplierForms.closeModal();

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.classList.add('fa-spin');
                setTimeout(() => icon.classList.remove('fa-spin'), 600);
            }
            (window as any).fetchSuppliers();
        };
    }

    if (archivedBtn && statusFilter) {
        archivedBtn.onclick = () => {
            if (statusFilter.value === 'archived') {
                statusFilter.value = '';
            } else {
                statusFilter.value = 'archived';
            }
            (window as any).fetchSuppliers();
        };
    }

    if (resetBtn) {
        resetBtn.onclick = () => {
            if (searchInput) searchInput.value = '';
            if (typeFilter) typeFilter.value = '';
            if (statusFilter) statusFilter.value = '';
            (window as any).fetchSuppliers();
            filterPopover?.classList.add('hidden');
        };
    }

    if (filterBtn && filterPopover) {
        filterBtn.onclick = (e) => {
            e.stopPropagation();
            const rect = filterBtn.getBoundingClientRect();
            filterPopover.style.top = `${rect.bottom + 10}px`;
            filterPopover.style.left = `${rect.right - filterPopover.offsetWidth}px`;
            filterPopover.classList.toggle('hidden');
        };
    }

    if (closeFilter) closeFilter.onclick = () => filterPopover?.classList.add('hidden');
    if (applyFiltersBtn) {
        applyFiltersBtn.onclick = () => {
            (window as any).fetchSuppliers();
            filterPopover?.classList.add('hidden');
        };
    }

    document.addEventListener('click', (e) => {
        if (filterPopover && !filterPopover.contains(e.target as Node) && e.target !== filterBtn) {
            filterPopover.classList.add('hidden');
        }
    });

    if (filterPopover) filterPopover.onclick = (e) => e.stopPropagation();

    let debounceTimer: any;
    if (searchInput) {
        searchInput.oninput = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => (window as any).fetchSuppliers(), 300);
        };
    }

    // Initial load
    (window as any).fetchSuppliers();

    // Check for "new" parameter in URL to auto-open modal
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('new') === '1') {
        supplierForms.openAddModal();
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
