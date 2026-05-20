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

    // Fetch and render function exposed to window for forms to call
    (window as any).fetchSuppliers = async () => {
        try {
            const search = searchInput?.value || '';
            const type = typeFilter?.value || '';
            const status = statusFilter?.value || '';

            const suppliers = await supplierApi.fetchSuppliers(search, type, status);
            supplierTable.render(suppliers);
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

    // Event Listeners
    if (addBtn) addBtn.onclick = () => supplierForms.openAddModal();
    if (closeModal) closeModal.onclick = () => supplierForms.closeModal();
    if (cancelBtn) cancelBtn.onclick = () => supplierForms.closeModal();

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

