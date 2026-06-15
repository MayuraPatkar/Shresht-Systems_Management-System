// @ts-nocheck

let allQuotations: any[] = [];
let archivedQuotations: any[] = [];
let currentFilters = {
    dateFilter: 'all',
    sortBy: 'date-desc',
    status: 'all',
    customStartDate: null as string | null,
    customEndDate: null as string | null
};

// Apply filters to quotations
function applyQuotationFilters() {
    // 1. Update counts on status tabs based on allQuotations
    updateTabCounts();

    let source = [];
    if (currentFilters.status === 'archived') {
        source = [...archivedQuotations];
    } else {
        source = [...allQuotations];
        if (currentFilters.status && currentFilters.status !== 'all') {
            source = source.filter(q => (q.quotation_status || 'Draft') === currentFilters.status);
        }
    }
    const filtered = applyFilters(source, {
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

    // 2. Update active filters info bar dynamically
    updateActiveFiltersBar();
}

// Update counts badge inside status filter tabs
function updateTabCounts() {
    const statusTabs = document.querySelectorAll('#status-tabs-container .filter-tab');
    if (!statusTabs.length) return;

    const counts: Record<string, number> = {
        all: allQuotations.length,
        Draft: 0,
        Sent: 0,
        Approved: 0,
        Converted: 0,
        Rejected: 0,
        archived: archivedQuotations.length
    };

    allQuotations.forEach(q => {
        const status = q.quotation_status || 'Draft';
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
            ? 'tab-count-badge ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-600 transition-colors duration-150'
            : 'tab-count-badge ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-500 transition-colors duration-150';
        badge.textContent = count.toString();
    });
}

// Generate dynamic filter badges and highlight filter button
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
                    if (typeof (window as any).handleSearch === 'function') {
                        (window as any).handleSearch();
                    }
                }
            }
        });
    }

    // Date Filter
    if (currentFilters.dateFilter !== 'all') {
        let dateLabel = currentFilters.dateFilter;
        if (currentFilters.dateFilter === 'custom' && currentFilters.customStartDate && currentFilters.customEndDate) {
            dateLabel = `${formatDateIndian(currentFilters.customStartDate)} to ${formatDateIndian(currentFilters.customEndDate)}`;
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
                const dateSelect = document.getElementById('date-filter') as HTMLSelectElement | null;
                if (dateSelect) dateSelect.value = 'all';
                applyQuotationFilters();
            }
        });
    }

    // Sort Filter
    if (currentFilters.sortBy !== 'date-desc') {
        const sortLabels: Record<string, string> = {
            'date-asc': 'Oldest First',
            'amount-desc': 'Amount: High-Low',
            'amount-asc': 'Amount: Low-High',
            'name-asc': 'Name A-Z'
        };
        activeBadges.push({
            label: `Sort: ${sortLabels[currentFilters.sortBy] || currentFilters.sortBy}`,
            clearFn: () => {
                currentFilters.sortBy = 'date-desc';
                const sortSelect = document.getElementById('sort-filter') as HTMLSelectElement | null;
                if (sortSelect) sortSelect.value = 'date-desc';
                applyQuotationFilters();
            }
        });
    }

    // Status Filter (if status is not 'all')
    if (currentFilters.status !== 'all') {
        activeBadges.push({
            label: `Status: ${currentFilters.status}`,
            clearFn: () => {
                currentFilters.status = 'all';
                const statusSelect = document.getElementById('status-filter') as HTMLSelectElement | null;
                if (statusSelect) statusSelect.value = 'all';
                const statusTabs = document.querySelectorAll('#status-tabs-container .filter-tab');
                statusTabs.forEach(t => {
                    if (t.getAttribute('data-status') === 'all') {
                        t.classList.add('active');
                    } else {
                        t.classList.remove('active');
                    }
                });
                applyQuotationFilters();
            }
        });
    }

    // Style the filter button (highlight if filters excluding status are applied)
    const filterBtn = document.getElementById('filter-btn');
    const hasActiveFilters = currentFilters.dateFilter !== 'all' || currentFilters.sortBy !== 'date-desc';
    if (filterBtn) {
        if (hasActiveFilters) {
            filterBtn.className = 'bg-purple-600 text-white border border-purple-600 px-3 py-2 rounded-lg transition-all duration-150 flex items-center justify-center flex-shrink-0 active:scale-95 cursor-pointer shadow-md shadow-purple-100';
        } else {
            filterBtn.className = 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg transition-all duration-150 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-purple-500/20 active:scale-95 cursor-pointer';
        }
    }

    if (activeBadges.length > 0) {
        infoBar.classList.remove('hidden');
        activeBadges.forEach(badgeData => {
            const badge = document.createElement('span');
            badge.className = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 shadow-sm transition-all duration-150';
            badge.innerHTML = `
                <span>${badgeData.label}</span>
                <button class="text-purple-400 hover:text-purple-700 ml-0.5 focus:outline-none cursor-pointer text-[10px]" title="Remove filter">
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

// Helper to trigger sorting from header column clicks
function triggerHeaderSort(sortBy: string) {
    currentFilters.sortBy = sortBy;
    const sortSelect = document.getElementById('sort-filter') as HTMLSelectElement | null;
    if (sortSelect) {
        sortSelect.value = sortBy;
    }
    applyQuotationFilters();
}

// Initialize filter event listeners
function initQuotationFilters() {
    const filterBtn = document.getElementById('filter-btn') as HTMLButtonElement;
    const filterPopover = document.getElementById('filter-popover') as HTMLElement;
    const dateFilter = document.getElementById('date-filter') as HTMLSelectElement;
    const statusFilter = document.getElementById('status-filter') as HTMLSelectElement;
    const sortFilter = document.getElementById('sort-filter') as HTMLSelectElement;
    const clearFiltersBtn = document.getElementById('clear-filters-btn') as HTMLButtonElement;
    const applyFiltersBtn = document.getElementById('apply-filters-btn') as HTMLButtonElement;
    const clearAllShortcut = document.getElementById('clear-all-filters-shortcut') as HTMLButtonElement;

    const statusTabs = document.querySelectorAll('#status-tabs-container .filter-tab');
    statusTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            statusTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const status = (tab as HTMLElement).dataset.status || 'all';
            currentFilters.status = status;

            if (statusFilter) {
                statusFilter.value = status;
            }

            applyQuotationFilters();
        });
    });

    // Toggle filter popover with smart boundary-check
    if (filterBtn && filterPopover) {
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = filterBtn.getBoundingClientRect();
            const popoverWidth = 340; 
            
            filterPopover.style.top = `${rect.bottom + 8}px`;
            
            let leftPos = rect.left;
            if (leftPos + popoverWidth > window.innerWidth) {
                leftPos = rect.right - popoverWidth;
            }
            if (leftPos < 16) {
                leftPos = 16;
            }
            
            filterPopover.style.left = `${leftPos}px`;
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
            if (statusFilter) {
                currentFilters.status = statusFilter.value;
                statusTabs.forEach(t => {
                    if (t.getAttribute('data-status') === statusFilter.value) {
                        t.classList.add('active');
                    } else {
                        t.classList.remove('active');
                    }
                });
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
                status: 'all',
                customStartDate: null,
                customEndDate: null
            };
            if (dateFilter) dateFilter.value = 'all';
            if (statusFilter) statusFilter.value = 'all';
            if (sortFilter) sortFilter.value = 'date-desc';
            
            statusTabs.forEach(t => {
                if (t.getAttribute('data-status') === 'all') {
                    t.classList.add('active');
                } else {
                    t.classList.remove('active');
                }
            });

            applyQuotationFilters();
            if (filterPopover) filterPopover.classList.add('hidden');
        });
    }

    // Clear All active filters info bar shortcut
    if (clearAllShortcut) {
        clearAllShortcut.addEventListener('click', () => {
            currentFilters = {
                dateFilter: 'all',
                sortBy: 'date-desc',
                status: 'all',
                customStartDate: null,
                customEndDate: null
            };
            if (dateFilter) dateFilter.value = 'all';
            if (statusFilter) statusFilter.value = 'all';
            if (sortFilter) sortFilter.value = 'date-desc';
            
            const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
            if (searchInput) searchInput.value = '';

            statusTabs.forEach(t => {
                if (t.getAttribute('data-status') === 'all') {
                    t.classList.add('active');
                } else {
                    t.classList.remove('active');
                }
            });

            applyQuotationFilters();
        });
    }
}

// Expose filters utilities globally
(window as any).updateActiveFiltersBar = updateActiveFiltersBar;
(window as any).triggerHeaderSort = triggerHeaderSort;
