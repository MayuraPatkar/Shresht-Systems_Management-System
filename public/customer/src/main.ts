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
    const filterBtn = document.getElementById('filter-btn');
    const filterPopover = document.getElementById('filter-popover');
    const closeFilter = document.getElementById('close-filter');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const closeModal = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-btn');

    // Fetch and render function exposed to window for forms to call
    (window as any).fetchCustomers = async () => {
        try {
            const search = searchInput?.value || '';
            const type = typeFilter?.value || '';
            const status = statusFilter?.value || '';

            const customers = await customerApi.fetchCustomers(search, type, status);
            customerTable.render(customers);
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
            filterPopover.style.top = `${rect.bottom + 10}px`;
            filterPopover.style.left = `${rect.right - filterPopover.offsetWidth}px`;
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
