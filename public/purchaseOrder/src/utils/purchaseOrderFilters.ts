// @ts-nocheck
(function () {
    let allPurchaseOrders: any[] = [];
    let currentFilters = {
        dateFilter: 'all',
        sortBy: 'date-desc',
        customStartDate: null as string | null,
        customEndDate: null as string | null
    };

    // Apply filters to purchase orders
    function applyPurchaseOrderFilters() {
        const sourceList = (window as any).statusFilter === 'archived'
            ? ((window as any).archivedPurchaseOrders || [])
            : ((window as any).allPurchaseOrders || []);
            
        const filtered = (window as any).applyFilters(sourceList, {
            dateFilter: currentFilters.dateFilter,
            sortBy: currentFilters.sortBy,
            dateField: 'purchase_date',
            amountField: 'totals.grand_total',
            nameField: 'supplier_snapshot.name',
            customStartDate: currentFilters.customStartDate,
            customEndDate: currentFilters.customEndDate
        });
        
        // Save current filtered items globally so bulk actions can target them
        (window as any).currentFilteredPurchaseOrders = filtered;

        // Highlight filter button if any filters are applied
        const isFilterActive = currentFilters.dateFilter !== 'all' || currentFilters.sortBy !== 'date-desc';
        const filterBtn = document.getElementById('filter-btn');
        if (filterBtn) {
            if (isFilterActive) {
                filterBtn.className = "bg-blue-50 text-blue-600 border border-blue-300 px-3 py-2 rounded-lg transition-all duration-150 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95 cursor-pointer shadow-sm";
            } else {
                filterBtn.className = "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg transition-all duration-150 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95 cursor-pointer";
            }
        }
        
        if ((window as any).purchaseOrderTable) {
            (window as any).purchaseOrderTable.renderPurchaseOrders(filtered);
        }

        updateActiveFiltersBar();
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
                    const dateSelect = document.getElementById('date-filter') as HTMLSelectElement | null;
                    if (dateSelect) dateSelect.value = 'all';
                    applyPurchaseOrderFilters();
                }
            });
        }

        // Sort Filter
        if (currentFilters.sortBy !== 'date-desc') {
            const sortLabels: Record<string, string> = {
                'date-asc': 'Oldest First',
                'amount-desc': 'Amount: High-Low',
                'amount-asc': 'Amount: Low-High',
                'name-asc': 'Supplier A-Z'
            };
            activeBadges.push({
                label: `Sort: ${sortLabels[currentFilters.sortBy] || currentFilters.sortBy}`,
                clearFn: () => {
                    currentFilters.sortBy = 'date-desc';
                    const sortSelect = document.getElementById('sort-filter') as HTMLSelectElement | null;
                    if (sortSelect) sortSelect.value = 'date-desc';
                    applyPurchaseOrderFilters();
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
    function initPurchaseOrderFilters() {
        const filterBtn = document.getElementById('filter-btn') as HTMLButtonElement;
        const filterPopover = document.getElementById('filter-popover') as HTMLElement;
        const dateFilter = document.getElementById('date-filter') as HTMLSelectElement;
        const sortFilter = document.getElementById('sort-filter') as HTMLSelectElement;
        const clearFiltersBtn = document.getElementById('clear-filters-btn') as HTMLButtonElement;
        const applyFiltersBtn = document.getElementById('apply-filters-btn') as HTMLButtonElement;
        const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
        const clearAllShortcut = document.getElementById('clear-all-filters-shortcut') as HTMLButtonElement;

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
                if (!filterPopover.contains(e.target as Node) && e.target !== filterBtn) {
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

        // Clear All shortcut button
        if (clearAllShortcut) {
            clearAllShortcut.addEventListener('click', () => {
                currentFilters = {
                    dateFilter: 'all',
                    sortBy: 'date-desc',
                    customStartDate: null,
                    customEndDate: null
                };
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.dispatchEvent(new Event('input'));
                }
                if (dateFilter) dateFilter.value = 'all';
                if (sortFilter) sortFilter.value = 'date-desc';
                applyPurchaseOrderFilters();
            });
        }

        // Handle date filter custom option
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                const value = (e.target as HTMLSelectElement).value;
                if (value === 'custom') {
                    (window as any).showCustomDateModal((startDate: string, endDate: string) => {
                        currentFilters.dateFilter = 'custom';
                        currentFilters.customStartDate = startDate;
                        currentFilters.customEndDate = endDate;
                        applyPurchaseOrderFilters();
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
                applyPurchaseOrderFilters();
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
                applyPurchaseOrderFilters();
                if (filterPopover) filterPopover.classList.add('hidden');
            });
        }
    }
    
    (window as any).currentFilters = currentFilters;
    (window as any).allPurchaseOrders = allPurchaseOrders;
    (window as any).applyPurchaseOrderFilters = applyPurchaseOrderFilters;
    (window as any).initPurchaseOrderFilters = initPurchaseOrderFilters;
})();
