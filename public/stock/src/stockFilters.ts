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

    let filteredData = currentStockData;

    if (typeFilter !== 'all') {
        filteredData = filteredData.filter(item => item.item_type === typeFilter);
    }

    if (categoryFilter !== 'all') {
        filteredData = filteredData.filter(item => item.category === categoryFilter);
    }

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
}

// Setup filter click handlers
function setupFilterHandlers(dropdownId: string): void {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'A') {
                e.preventDefault();

                // Remove active state from all items in this dropdown
                dropdown.querySelectorAll('a').forEach(link => {
                    link.classList.remove('bg-gray-100', 'font-semibold');
                });

                // Add active state to clicked item
                target.classList.add('bg-gray-100', 'font-semibold');

                // Apply filters
                applyFilters();

                // Hide dropdown
                dropdown.classList.add('hidden');
            }
        });
    }
}

setupFilterHandlers('typeFilterDropdown');
setupFilterHandlers('categoryFilterDropdown');
setupFilterHandlers('filterDropdown');

// ─── Search Functionality ────────────────────────────────────────────────────

const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
if (searchInput) {
    searchInput.addEventListener('input', (e: Event) => {
        const searchTerm = (e.target as HTMLInputElement).value.toLowerCase().trim();

        if (!searchTerm) {
            // If search is cleared, show all items (with current filters applied)
            applyFilters();
            return;
        }

        const filteredData = currentStockData.filter(item => {
            const name = (item.item_name || '').toLowerCase();
            const brand = (item.brand || '').toLowerCase();
            const category = (item.category || '').toLowerCase();
            const hsn = (item.hsn_sac || '').toLowerCase();

            return name.includes(searchTerm) ||
                brand.includes(searchTerm) ||
                category.includes(searchTerm) ||
                hsn.includes(searchTerm);
        });

        renderStockTable(filteredData);
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

        fetchStockData();
        showSuccessMessage('Stock data refreshed!');
    });
}

// ─── Low Stock Items Button ──────────────────────────────────────────────────

const lowStockBtn = document.getElementById('lowStockBtn');
if (lowStockBtn) {
    lowStockBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/stock/all');
            if (!res.ok) throw new Error('Failed');
            const data: StockItem[] = await res.json();
            const lowStockItems = (data || []).filter(i => {
                const qty = Number(i.stock_quantity) || 0;
                const minQty = Number(i.min_stock_quantity) || 0;
                return qty < minQty || qty === 0;
            });
            renderStockTable(lowStockItems);

            // Update filter dropdown to show "Low Stock" as active
            const filterDropdown = document.getElementById('filterDropdown');
            if (filterDropdown) {
                filterDropdown.querySelectorAll('a').forEach(link => {
                    link.classList.remove('bg-gray-100', 'font-semibold');
                    if (link.getAttribute('data-filter') === 'Low Stock') {
                        link.classList.add('bg-gray-100', 'font-semibold');
                    }
                });
            }
        } catch (err) {
            console.error(err);
            showErrorMessage('Failed to filter low stock items.');
        }
    });
}

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
