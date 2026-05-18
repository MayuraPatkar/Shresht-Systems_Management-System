/**
 * Stock filtering, searching, sorting, and dropdown management.
 */

// ─── Category Filter Population ──────────────────────────────────────────────

function populateCategoryFilters(data: StockItem[]): void {
    const cats = new Set<string>();
    data.forEach(i => {
        const c = i.category;
        if (c) cats.add(c);
    });
    const printCat = document.getElementById('printCategoryFilter') as HTMLSelectElement | null;
    const categoryDropdown = document.getElementById('categoryFilterDropdown');
    if (printCat) {
        printCat.innerHTML = '<option value="all">All Categories</option>' + Array.from(cats).map(c => `<option value="${c}">${c}</option>`).join('');
    }
    if (categoryDropdown) {
        categoryDropdown.innerHTML = '<a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 bg-gray-100 font-semibold" data-type-filter="all">All Categories</a>' + Array.from(cats).map(c => `<a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" data-type-filter="${c}">${c}</a>`).join('');
    }
}

// ─── Dropdown Functionality ──────────────────────────────────────────────────

function setupDropdown(buttonId: string, dropdownId: string): void {
    const button = document.getElementById(buttonId);
    const dropdown = document.getElementById(dropdownId);

    if (button && dropdown) {
        button.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            // Close all other dropdowns
            document.querySelectorAll('.dropdown-menu').forEach(d => {
                if (d !== dropdown) d.classList.add('hidden');
            });
            dropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.add('hidden');
        });

        dropdown.addEventListener('click', (e: Event) => {
            e.stopPropagation();
        });
    }
}

// Setup all dropdowns
setupDropdown('typeFilterBtn', 'typeFilterDropdown');
setupDropdown('categoryFilterBtn', 'categoryFilterDropdown');
setupDropdown('filterBtn', 'filterDropdown');

// ─── Filter Logic ────────────────────────────────────────────────────────────

function applyFilters(): void {
    const typeFilter = document.querySelector('#typeFilterDropdown .bg-gray-100')?.getAttribute('data-type-filter') || 'all';
    const categoryFilter = document.querySelector('#categoryFilterDropdown .bg-gray-100')?.getAttribute('data-type-filter') || 'all';
    const statusFilter = document.querySelector('#filterDropdown .bg-gray-100')?.getAttribute('data-filter') || 'all';
    const searchTerm = (document.getElementById('search-input') as HTMLInputElement | null)?.value.toLowerCase().trim() || '';

    let filteredData = currentStockData.filter(item => {
        const isDeleted = (item.deletion && item.deletion.is_deleted === true) || (item as any).is_deleted === true;
        return window.showDeletedItems ? isDeleted : !isDeleted;
    });

    // Apply Search
    if (searchTerm) {
        filteredData = filteredData.filter(item => {
            const name = (item.item_name || '').toLowerCase();
            const brand = (item.brand || '').toLowerCase();
            const category = (item.category || '').toLowerCase();
            const hsn = (item.hsn_sac || '').toLowerCase();

            return name.includes(searchTerm) ||
                brand.includes(searchTerm) ||
                category.includes(searchTerm) ||
                hsn.includes(searchTerm);
        });
    }

    // Apply Type
    if (typeFilter !== 'all') {
        filteredData = filteredData.filter(item => item.item_type === typeFilter);
    }

    // Apply Category
    if (categoryFilter !== 'all') {
        filteredData = filteredData.filter(item => item.category === categoryFilter);
    }

    // Apply Status
    if (statusFilter !== 'all') {
        filteredData = filteredData.filter(item => {
            const quantity = Number(item.stock_quantity) || 0;
            const minQuantity = Number(item.min_stock_quantity) || 0;
            const isActive = item.is_active !== false;

            if (statusFilter === 'Inactive') return !isActive;
            if (statusFilter === 'In Stock') return isActive && quantity >= minQuantity;
            if (statusFilter === 'Low Stock') return isActive && quantity > 0 && quantity < minQuantity;
            if (statusFilter === 'Out of Stock') return isActive && quantity === 0;
            return true;
        });
    }

    renderStockTable(filteredData);
    (window as any).filteredStockData = filteredData;
    updateBulkButtonLabels(searchTerm, typeFilter, categoryFilter, statusFilter);
    updateFilterButtonLabels(typeFilter, categoryFilter, statusFilter);
}

function updateFilterButtonLabels(type: string, category: string, status: string): void {
    const typeBtnSpan = document.querySelector('#typeFilterBtn span');
    const categoryBtnSpan = document.querySelector('#categoryFilterBtn span');
    const statusBtnSpan = document.querySelector('#filterBtn span');

    if (typeBtnSpan) typeBtnSpan.textContent = type === 'all' ? 'Type' : `Type: ${type}`;
    if (categoryBtnSpan) categoryBtnSpan.textContent = category === 'all' ? 'Category' : `Category: ${category}`;
    if (statusBtnSpan) statusBtnSpan.textContent = status === 'all' ? 'Filter' : `Status: ${status}`;
}

function updateBulkButtonLabels(search: string, type: string, category: string, status: string): void {
    const isFiltered = search !== '' || type !== 'all' || category !== 'all' || status !== 'all';
    const restoreBtn = document.getElementById('bulkRestoreBtn');
    const deleteBtn = document.getElementById('bulkDeleteBtn');

    if (restoreBtn) {
        restoreBtn.querySelector('span')!.textContent = isFiltered ? 'Restore All Filtered' : 'Restore All';
    }
    if (deleteBtn) {
        deleteBtn.querySelector('span')!.textContent = isFiltered ? 'Delete All Filtered' : 'Delete All';
    }
}

// Setup filter click handlers
function setupFilterHandlers(dropdownId: string): void {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');
            if (!link) return;

            e.preventDefault();

            // Update active state
            dropdown.querySelectorAll('a').forEach(a => a.classList.remove('bg-gray-100', 'font-semibold'));
            link.classList.add('bg-gray-100', 'font-semibold');

            applyFilters();
        });
    }
}

setupFilterHandlers('typeFilterDropdown');
setupFilterHandlers('categoryFilterDropdown');
setupFilterHandlers('filterDropdown');

// ─── Search Functionality ────────────────────────────────────────────────────

const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
if (searchInput) {
    searchInput.addEventListener('input', () => {
        applyFilters();
    });
}

// ─── Refresh Functionality ───────────────────────────────────────────────────

const refreshBtn = document.getElementById('refreshBtn');
if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
        // Reset all filters to "All"
        const typeDropdown = document.getElementById('typeFilterDropdown');
        const categoryDropdown = document.getElementById('categoryFilterDropdown');
        const filterDropdown = document.getElementById('filterDropdown');

        [typeDropdown, categoryDropdown, filterDropdown].forEach(dropdown => {
            if (dropdown) {
                dropdown.querySelectorAll('a').forEach((link, index) => {
                    link.classList.remove('bg-gray-100', 'font-semibold');
                    if (index === 0) {
                        link.classList.add('bg-gray-100', 'font-semibold');
                    }
                });
            }
        });

        // Clear search bar
        const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
        if (searchInput) searchInput.value = '';

        fetchStockData();
        showSuccessMessage('Stock data refreshed!');
    });
}

// ─── Print Functionality ─────────────────────────────────────────────────────

// ─── Sorting Functionality ───────────────────────────────────────────────────

let currentSort: SortState = { field: null, direction: 'asc' };

function setupSorting(): void {
    const sortableHeaders = document.querySelectorAll('th[data-sort]');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.getAttribute('data-sort')!;
            const direction: 'asc' | 'desc' = currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc';

            currentSort = { field, direction };

            // Update header icons
            sortableHeaders.forEach(h => {
                const icon = h.querySelector('i');
                if (icon) icon.className = 'fas fa-sort ml-1';
            });

            const currentIcon = header.querySelector('i');
            if (currentIcon) currentIcon.className = `fas fa-sort-${direction === 'asc' ? 'up' : 'down'} ml-1`;

            // Sort and re-render
            const sortedData = sortData(currentStockData, field, direction);
            renderStockTable(sortedData);
        });
    });
}

function sortData(data: StockItem[], field: string, direction: 'asc' | 'desc'): StockItem[] {
    return [...data].sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;

        switch (field) {
            case 'name':
                aVal = (a.item_name || '').toLowerCase();
                bVal = (b.item_name || '').toLowerCase();
                break;
            case 'price':
                aVal = parseFloat(String(a.purchase_price)) || 0;
                bVal = parseFloat(String(b.purchase_price)) || 0;
                break;
            case 'quantity':
                aVal = Number(a.stock_quantity) || 0;
                bVal = Number(b.stock_quantity) || 0;
                break;
            case 'gst':
                aVal = parseFloat(String(a.gst_rate)) || 0;
                bVal = parseFloat(String(b.gst_rate)) || 0;
                break;
            case 'status':
                const getStatusPriority = (item: StockItem): number => {
                    const isActive = item.is_active !== false;
                    if (!isActive) return -2; // Inactive
                    const quantity = Number(item.stock_quantity) || 0;
                    const minQuantity = Number(item.min_stock_quantity) || 0;
                    if (quantity < 0) return -1; // Negative Stock
                    if (quantity === 0) return 0; // Out of Stock
                    if (quantity < minQuantity) return 1; // Low Stock
                    return 2; // In Stock
                };
                aVal = getStatusPriority(a);
                bVal = getStatusPriority(b);
                break;
            default:
                return 0;
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}
