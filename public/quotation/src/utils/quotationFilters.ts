// @ts-nocheck

let allQuotations: any[] = [];
let currentFilters = {
    dateFilter: 'all',
    sortBy: 'date-desc',
    customStartDate: null as string | null,
    customEndDate: null as string | null
};

// Apply filters to quotations
function applyQuotationFilters() {
    const filtered = applyFilters(allQuotations, {
        dateFilter: currentFilters.dateFilter,
        sortBy: currentFilters.sortBy,
        dateField: 'quotation_date',
        amountField: 'total_amount_tax',
        nameField: 'project_name',
        customStartDate: currentFilters.customStartDate,
        customEndDate: currentFilters.customEndDate
    });
    if (window.quotationTable) {
        window.quotationTable.renderQuotations(filtered);
    }
}

// Initialize filter event listeners
function initQuotationFilters() {
    const filterBtn = document.getElementById('filter-btn') as HTMLButtonElement;
    const filterPopover = document.getElementById('filter-popover') as HTMLElement;
    const dateFilter = document.getElementById('date-filter') as HTMLSelectElement;
    const sortFilter = document.getElementById('sort-filter') as HTMLSelectElement;
    const clearFiltersBtn = document.getElementById('clear-filters-btn') as HTMLButtonElement;
    const applyFiltersBtn = document.getElementById('apply-filters-btn') as HTMLButtonElement;

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
            if (!filterPopover.contains(e.target as Node) && e.target !== filterBtn) {
                filterPopover.classList.add('hidden');
            }
        });
    }

    // Handle date filter custom option
    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            const value = (e.target as HTMLSelectElement).value;
            if (value === 'custom') {
                showCustomDateModal((startDate: string, endDate: string) => {
                    currentFilters.dateFilter = 'custom';
                    currentFilters.customStartDate = startDate;
                    currentFilters.customEndDate = endDate;
                    applyQuotationFilters();
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
            applyQuotationFilters();
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
            applyQuotationFilters();
            if (filterPopover) filterPopover.classList.add('hidden');
        });
    }
}
