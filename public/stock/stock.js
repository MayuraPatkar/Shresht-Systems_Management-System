// Global variables
let currentStockData = [];

function showModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('hidden');
}

function hideModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('hidden');
}

// NOTE: formatIndian has been moved to public/js/shared/utils.js
// It is now available globally via window.formatIndian

// Fetch and render
async function fetchStockData() {
    try {
        showLoading(true);
        const response = await fetch('/stock/getStock');
        if (!response.ok) throw new Error('Failed to fetch stock data');
        const stockData = await response.json();
        currentStockData = stockData || [];
        renderStockTable(currentStockData);
        populateCategoryFilters(currentStockData);
        showLoading(false);
    } catch (err) {
        console.error('Error fetching stock data:', err);
        showLoading(false);
        showEmpty(true);
        if (window.electronAPI && window.electronAPI.showAlert1) {
            window.electronAPI.showAlert1('Error fetching stock data. Please try again.');
        } else {
            alert('Error fetching stock data. Please try again.');
        }
    }
}

function showLoading(show) {
    const loadingRow = document.getElementById('loading-row');
    const emptyRow = document.getElementById('empty-row');
    if (loadingRow) {
        loadingRow.classList.toggle('hidden', !show);
    }
    if (emptyRow && show) {
        emptyRow.classList.add('hidden');
    }
}

function showEmpty(show) {
    const emptyRow = document.getElementById('empty-row');
    const loadingRow = document.getElementById('loading-row');
    if (emptyRow) {
        emptyRow.classList.toggle('hidden', !show);
    }
    if (loadingRow && show) {
        loadingRow.classList.add('hidden');
    }
}

function normalizeField(item, fieldAlternatives) {
    for (const f of fieldAlternatives) {
        if (item[f] !== undefined) return item[f];
    }
    return '';
}

function renderStockTable(data) {
    const tbody = document.querySelector('#stock-table tbody');
    if (!tbody) return;

    // Clear existing rows but keep loading/empty rows
    const existingRows = tbody.querySelectorAll('tr:not(#loading-row):not(#empty-row)');
    existingRows.forEach(row => row.remove());

    showLoading(false);
    showEmpty(false);

    if (!data || data.length === 0) {
        showEmpty(true);
        return;
    }

    data.forEach(item => {
        const id = normalizeField(item, ['_id', 'id']);
        const name = normalizeField(item, ['item_name', 'itemName']);
        const HSN = normalizeField(item, ['HSN_SAC', 'hsnCode', 'HSN']);
        const company = normalizeField(item, ['company']);
        const unitPrice = normalizeField(item, ['unit_price', 'unitPrice']);
        const quantity = Number(normalizeField(item, ['quantity', 'qty'])) || 0;
        const GST = normalizeField(item, ['GST', 'gstRate']) || 0;
        const minQuantity = Number(normalizeField(item, ['min_quantity', 'minQuantity'])) || 0;
        const category = normalizeField(item, ['category']);
        const type = normalizeField(item, ['type']);

        const row = document.createElement('tr');
        row.classList.add('table-row', 'fade-in');
        if (quantity < minQuantity) row.classList.add('low-stock');
        if (quantity <= 0) row.classList.add('out-of-stock');

        const actionsCell = document.createElement('td');

        // Build actions select
        const select = document.createElement('select');
        select.className = 'btn border rounded p-1';
        const defaultOpt = document.createElement('option');
        defaultOpt.disabled = true;
        defaultOpt.selected = true;
        defaultOpt.textContent = 'Actions';
        select.appendChild(defaultOpt);
        ['add', 'remove', 'edit', 'details', 'delete'].forEach(action => {
            const opt = document.createElement('option');
            opt.value = action;
            opt.textContent = action.charAt(0).toUpperCase() + action.slice(1);
            select.appendChild(opt);
        });

        select.addEventListener('change', async () => {
            const action = select.value;
            if (action === 'add' || action === 'remove') {
                showQuantityModal(action, id, name);
            } else if (action === 'edit') {
                openEditModal({ id, name, HSN, company, unitPrice, quantity, GST, minQuantity, category, type, specifications: normalizeField(item, ['specification', 'specifications']) });
            } else if (action === 'details') {
                openDetailsModal({ id, name, HSN, company, unitPrice, quantity, GST, minQuantity, category, type, specifications: normalizeField(item, ['specifications', 'details']) });
            } else if (action === 'delete') {
                window.electronAPI.showAlert2(`Are you sure you want to delete "${name}"? This action cannot be undone.`);
                if (window.electronAPI) {
                    window.electronAPI.receiveAlertResponse(async (response) => {
                        if (response === "Yes") {
                            try {
                                const res = await fetch('/stock/deleteItem', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ itemId: id })
                                });
                                if (!res.ok) throw new Error('Failed to delete item');
                                await fetchStockData();
                                window.electronAPI.showAlert1('Stock item deleted successfully!');
                            } catch (err) {
                                console.error(err);
                                if (window.electronAPI && window.electronAPI.showAlert1) {
                                    window.electronAPI.showAlert1('Failed to delete item.');
                                } else {
                                    alert('Failed to delete item.');
                                }
                            }
                        }
                    });
                }
            }
            select.selectedIndex = 0;
        });

        actionsCell.className = 'p-4 text-center';
        actionsCell.appendChild(select);

        // Determine status and badge
        let status = 'In Stock';
        let statusClass = 'bg-green-100 text-green-800 flex items-center';

        if (quantity === 0) {
            status = 'Out of Stock';
            statusClass = 'bg-red-100 text-red-800';
        } else if (quantity < minQuantity) {
            status = 'Low Stock';
            statusClass = 'bg-orange-100 text-orange-800';
        }

        row.innerHTML = `
            <td class="p-4">
                <div>
                    <div class="font-medium text-gray-900">${escapeHtml(name)}</div>
                    <div class="text-sm text-gray-500">${escapeHtml(company)} • ${escapeHtml(category)}</div>
                </div>
            </td>
            <td class="p-4 text-right">₹ ${escapeHtml(formatIndian(unitPrice))}</td>
            <td class="p-4 text-right">${escapeHtml(formatIndian(quantity))}</td>
            <td class="p-4 text-right">${escapeHtml(GST)}%</td>
            <td class="p-4" style="width:120px; text-align:center;">
                <span class="inline-flex text-center px-2.5 py-0.5 rounded-full text-s font-medium ${statusClass}">
                    ${status}
                </span>
            </td>
        `;
        row.appendChild(actionsCell);
        tbody.appendChild(row);
    });
}

function escapeHtml(value) {
    if (value === undefined || value === null) return '';
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function populateCategoryFilters(data) {
    const cats = new Set();
    data.forEach(i => {
        const c = normalizeField(i, ['category']);
        if (c) cats.add(c);
    });
    const printCat = document.getElementById('printCategoryFilter');
    const categoryDropdown = document.getElementById('categoryFilterDropdown');
    if (printCat) {
        printCat.innerHTML = '<option value="all">All Categories</option>' + Array.from(cats).map(c => `<option value="${c}">${c}</option>`).join('');
    }
    if (categoryDropdown) {
        categoryDropdown.innerHTML = '<a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 bg-gray-100 font-semibold" data-type-filter="all">All Categories</a>' + Array.from(cats).map(c => `<a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" data-type-filter="${c}">${c}</a>`).join('');
    }
}

// New stock item form handling
const newStockForm = document.getElementById('newStockForm');
if (newStockForm) {
    newStockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const itemName = document.getElementById('itemName').value.trim();
        const HSN_SAC = document.getElementById('hsnCode').value.trim();
        const company = document.getElementById('company').value.trim();
        const category = document.getElementById('category').value.trim();
        const type = document.getElementById('type').value.trim();
        const unitPrice = parseFloat(document.getElementById('unitPrice').value);
        const quantity = parseInt(document.getElementById('quantity').value, 10);
        const GST = parseFloat(document.getElementById('gstRate').value);
        const minQuantity = parseInt(document.getElementById('minQuantity').value, 10);
        const specifications = document.getElementById('specifications').value.trim();

        if (!itemName || !HSN_SAC || !company || !category || !type) {
            showErrorMessage('Please fill all required text fields.');
            return;
        }

        if (isNaN(unitPrice) || unitPrice <= 0) {
            showErrorMessage('Please enter a valid unit price.');
            return;
        }

        if (isNaN(quantity) || quantity < 0) {
            showErrorMessage('Please enter a valid quantity.');
            return;
        }

        if (isNaN(GST) || GST < 0) {
            showErrorMessage('Please enter a valid GST rate.');
            return;
        }

        if (isNaN(minQuantity) || minQuantity < 0) {
            showErrorMessage('Please enter a valid minimum quantity.');
            return;
        }

        try {
            const res = await fetch('/stock/addItem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemName, HSN_SAC, company, category, type, unitPrice, quantity, GST, minQuantity, specifications })
            });
            if (!res.ok) throw new Error('Failed to add item');
            await fetchStockData();
            hideModal('newStockModal');
            newStockForm.reset();
            showSuccessMessage('Stock item added successfully!');
        } catch (err) {
            console.error(err);
            showErrorMessage('Failed to add item.');
        }
    });
}

// Edit modal wiring
function openEditModal(item) {
    showModal('editStockModal');
    document.getElementById('editItemName').value = item.name || '';
    document.getElementById('editHsnCode').value = item.HSN || '';
    document.getElementById('editCompany').value = item.company || '';
    document.getElementById('editCategory').value = item.category || '';
    document.getElementById('editType').value = item.type || 'material';
    document.getElementById('editUnitPrice').value = item.unitPrice || '';
    document.getElementById('editQuantity').value = item.quantity || '';
    document.getElementById('editGstRate').value = item.GST || '';
    document.getElementById('editMinQuantity').value = item.minQuantity || '5';
    document.getElementById('editSpecifications').value = item.specifications || '';

    // store id on modal element for submit
    document.getElementById('editStockModal').setAttribute('data-item-id', item.id);
}

const editForm = document.getElementById('editStockForm');
if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const modal = document.getElementById('editStockModal');
        const itemId = modal.getAttribute('data-item-id');
        const itemName = document.getElementById('editItemName').value.trim();
        const HSN_SAC = document.getElementById('editHsnCode').value.trim();
        const company = document.getElementById('editCompany').value.trim();
        const category = document.getElementById('editCategory').value.trim();
        const type = document.getElementById('editType').value.trim();
        const unitPrice = parseFloat(document.getElementById('editUnitPrice').value);
        const quantity = parseInt(document.getElementById('editQuantity').value, 10);
        const GST = parseFloat(document.getElementById('editGstRate').value);
        const minQuantity = parseInt(document.getElementById('editMinQuantity').value, 10);
        const specifications = document.getElementById('editSpecifications').value.trim();

        if (!itemId) return;

        if (!itemName || !HSN_SAC || !company || !category || !type) {
            showErrorMessage('Please fill all required text fields.');
            return;
        }

        if (isNaN(unitPrice) || unitPrice <= 0) {
            showErrorMessage('Please enter a valid unit price.');
            return;
        }

        if (isNaN(quantity) || quantity < 0) {
            showErrorMessage('Please enter a valid quantity.');
            return;
        }

        if (isNaN(GST) || GST < 0) {
            showErrorMessage('Please enter a valid GST rate.');
            return;
        }

        if (isNaN(minQuantity) || minQuantity < 0) {
            showErrorMessage('Please enter a valid minimum quantity.');
            return;
        }

        try {
            const res = await fetch('/stock/editItem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, itemName, HSN_SAC, company, category, type, unitPrice, quantity, GST, minQuantity, specifications })
            });
            if (!res.ok) throw new Error('Failed to edit item');
            await fetchStockData();
            hideModal('editStockModal');
            showSuccessMessage('Stock item updated successfully!');
        } catch (err) {
            console.error(err);
            showErrorMessage('Failed to update item.');
        }
    });
}

function openDetailsModal(item) {
    showModal('itemDetailsModal');
    document.getElementById('detailsItemName').textContent = item.name || '';
    document.getElementById('detailsMinQuantity').textContent = item.minQuantity || '0';
    document.getElementById('detailsUnitPrice').textContent = item.unitPrice ? `₹ ${formatIndian(item.unitPrice)}` : '';
    document.getElementById('detailsQuantity').textContent = item.quantity || '0';
    document.getElementById('detailsGstRate').textContent = item.GST ? `${item.GST}%` : '0%';
    // document.getElementById('detailsMargin').textContent = item.margin ? `${item.margin}%` : '0%';
    document.getElementById('detailsHsn').textContent = item.HSN || '';
    document.getElementById('detailsCompany').textContent = item.company || '';
    document.getElementById('detailsCategory').textContent = item.category || '';
    document.getElementById('detailsType').textContent = item.type || '';
    document.getElementById('detailsSpecifications').textContent = item.specifications || '';
}

// Quantity Modal functionality
let quantityModalData = { action: '', itemId: '', itemName: '' };

function showQuantityModal(action, itemId, itemName) {
    quantityModalData = { action, itemId, itemName };

    const title = document.getElementById('quantityModalTitle');
    const text = document.getElementById('quantityModalText');
    const confirmText = document.getElementById('confirmQuantityText');
    const input = document.getElementById('quantityModalInput');

    title.textContent = action === 'add' ? 'Add Quantity' : 'Remove Quantity';
    text.textContent = `How much quantity do you want to ${action} ${action === 'add' ? 'to' : 'from'} "${itemName}"?`;
    confirmText.textContent = action === 'add' ? 'Add' : 'Remove';
    input.value = '1';

    showModal('quantityModal');
    input.focus();
}

// Quantity modal event listeners
document.getElementById('closeQuantityModalBtn')?.addEventListener('click', () => hideModal('quantityModal'));
document.getElementById('cancelQuantityBtn')?.addEventListener('click', () => hideModal('quantityModal'));

document.getElementById('decreaseQuantityBtn')?.addEventListener('click', () => {
    const input = document.getElementById('quantityModalInput');
    const currentValue = parseInt(input.value) || 1;
    if (currentValue > 1) {
        input.value = currentValue - 1;
    }
});

document.getElementById('increaseQuantityBtn')?.addEventListener('click', () => {
    const input = document.getElementById('quantityModalInput');
    const currentValue = parseInt(input.value) || 1;
    input.value = currentValue + 1;
});

document.getElementById('confirmQuantityBtn')?.addEventListener('click', async () => {
    const quantity = parseInt(document.getElementById('quantityModalInput').value);
    if (isNaN(quantity) || quantity <= 0) {
        if (window.electronAPI && window.electronAPI.showAlert1) {
            window.electronAPI.showAlert1('Please enter a valid quantity.');
        } else {
            alert('Please enter a valid quantity.');
        }
        return;
    }

    try {
        const { action, itemId } = quantityModalData;
        const url = action === 'add' ? '/stock/addToStock' : '/stock/removeFromStock';
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, quantity })
        });
        if (!res.ok) throw new Error('Failed to update quantity');
        await fetchStockData();
        hideModal('quantityModal');
        showSuccessMessage(`Quantity ${action === 'add' ? 'added' : 'removed'} successfully!`);
    } catch (err) {
        console.error(err);
        if (window.electronAPI && window.electronAPI.showAlert1) {
            window.electronAPI.showAlert1('Failed to update quantity.');
        } else {
            alert('Failed to update quantity.');
        }
    }
});

// Allow Enter key to confirm quantity
document.getElementById('quantityModalInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('confirmQuantityBtn').click();
    }
});

// Hook up modal open/close buttons
document.getElementById('newStockItemBtn')?.addEventListener('click', () => showModal('newStockModal'));
document.getElementById('closeModalBtn')?.addEventListener('click', () => hideModal('newStockModal'));
document.getElementById('cancelBtn')?.addEventListener('click', () => hideModal('newStockModal'));
document.getElementById('closeEditModalBtn')?.addEventListener('click', () => hideModal('editStockModal'));
document.getElementById('cancelEditBtn')?.addEventListener('click', () => hideModal('editStockModal'));
document.getElementById('closeDetailsModalBtn')?.addEventListener('click', () => hideModal('itemDetailsModal'));
document.getElementById('closePrintModalBtn')?.addEventListener('click', () => hideModal('printModal'));
document.getElementById('cancelPrintBtn')?.addEventListener('click', () => hideModal('printModal'));

// Print action
document.getElementById('printBtn')?.addEventListener('click', () => {
    // show print modal
    showModal('printModal');
});

document.getElementById('finalPrintBtn')?.addEventListener('click', () => {
    const type = document.getElementById('printTypeFilter')?.value || 'all';
    const category = document.getElementById('printCategoryFilter')?.value || 'all';
    const status = document.getElementById('printStatusFilter')?.value || 'all';
    // Build a simple HTML snapshot of the table
    const tableHtml = document.getElementById('stock-table')?.outerHTML || '';
    const content = `<h1>Stock Report</h1><p>Type: ${escapeHtml(type)} | Category: ${escapeHtml(category)} | Status: ${escapeHtml(status)}</p>` + tableHtml;
    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        window.electronAPI.handlePrintEvent(content, 'print', 'Stock Report');
    } else if (window.electronAPI && window.electronAPI.showAlert1) {
        window.electronAPI.showAlert1('Print functionality is not available.');
    }
    hideModal('printModal');
});

// Attach low-stock button by searching for the button text (present in HTML)
Array.from(document.querySelectorAll('button')).forEach(btn => {
    if (btn.textContent && btn.textContent.includes('Low Stock Items')) {
        btn.addEventListener('click', async () => {
            try {
                const res = await fetch('/stock/getStock');
                if (!res.ok) throw new Error('Failed');
                const data = await res.json();
                renderStockTable((data || []).filter(i => (Number(normalizeField(i, ['quantity', 'qty'])) || 0) < (Number(normalizeField(i, ['min_quantity', 'minQuantity'])) || 0)));
            } catch (err) { console.error(err); }
        });
    }
});

// Search functionality
const searchInput = document.querySelector('input[placeholder="Search stock items..."]');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#stock-table tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

// Refresh functionality
const refreshBtn = Array.from(document.querySelectorAll('button')).find(btn =>
    btn.querySelector('i.fa-sync-alt') !== null
);
if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
        fetchStockData();
        showSuccessMessage('Stock data refreshed!');
    });
}

// Dropdown functionality
function setupDropdown(buttonId, dropdownId) {
    const button = document.getElementById(buttonId);
    const dropdown = document.getElementById(dropdownId);

    if (button && dropdown) {
        button.addEventListener('click', (e) => {
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

        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
}

// Setup all dropdowns
setupDropdown('typeFilterBtn', 'typeFilterDropdown');
setupDropdown('categoryFilterBtn', 'categoryFilterDropdown');
setupDropdown('filterBtn', 'filterDropdown');

// Filter functionality
function applyFilters() {
    const typeFilter = document.querySelector('#typeFilterDropdown .bg-gray-100')?.getAttribute('data-type-filter') || 'all';
    const categoryFilter = document.querySelector('#categoryFilterDropdown .bg-gray-100')?.getAttribute('data-type-filter') || 'all';
    const statusFilter = document.querySelector('#filterDropdown .bg-gray-100')?.getAttribute('data-filter') || 'all';

    let filteredData = currentStockData;

    if (typeFilter !== 'all') {
        filteredData = filteredData.filter(item => normalizeField(item, ['type']) === typeFilter);
    }

    if (categoryFilter !== 'all') {
        filteredData = filteredData.filter(item => normalizeField(item, ['category']) === categoryFilter);
    }

    if (statusFilter !== 'all') {
        filteredData = filteredData.filter(item => {
            const quantity = Number(normalizeField(item, ['quantity', 'qty'])) || 0;
            const minQuantity = Number(normalizeField(item, ['min_quantity', 'minQuantity'])) || 0;

            if (statusFilter === 'In Stock') return quantity >= minQuantity;
            if (statusFilter === 'Low Stock') return quantity > 0 && quantity < minQuantity;
            if (statusFilter === 'Out of Stock') return quantity === 0;
            return true;
        });
    }

    renderStockTable(filteredData);
}

// Setup filter click handlers
function setupFilterHandlers(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                e.preventDefault();

                // Remove active state from all items in this dropdown
                dropdown.querySelectorAll('a').forEach(link => {
                    link.classList.remove('bg-gray-100', 'font-semibold');
                });

                // Add active state to clicked item
                e.target.classList.add('bg-gray-100', 'font-semibold');

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

// Add Quantity button functionality in edit modal
const addQuantityBtn = document.getElementById('addQuantityBtn');
if (addQuantityBtn) {
    addQuantityBtn.addEventListener('click', () => {
        const quantityInput = document.getElementById('editQuantity');
        const currentQty = parseInt(quantityInput.value) || 0;
        const addQty = parseInt(window.prompt('Enter quantity to add:')) || 0;

        if (addQty > 0) {
            quantityInput.value = currentQty + addQty;
        }
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+N or Cmd+N to add new stock item
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showModal('newStockModal');
    }

    // Escape to close modals
    if (e.key === 'Escape') {
        const modals = ['newStockModal', 'editStockModal', 'itemDetailsModal', 'printModal', 'quantityModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && !modal.classList.contains('hidden')) {
                hideModal(modalId);
            }
        });
    }

    // Ctrl+R or Cmd+R to refresh (prevent default and use our refresh)
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        fetchStockData();
    }
});

// Add tooltips to action buttons
function addTooltips() {
    const newStockBtn = document.getElementById('newStockItemBtn');
    if (newStockBtn) newStockBtn.title = 'Add new stock item (Ctrl+N)';

    const refreshBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.querySelector('i.fa-sync-alt') !== null
    );
    if (refreshBtn) refreshBtn.title = 'Refresh data (Ctrl+R)';

    const printBtn = document.getElementById('printBtn');
    if (printBtn) printBtn.title = 'Print stock report';
}

// Add success feedback for operations
function showSuccessMessage(message) {
    if (window.electronAPI && window.electronAPI.showAlert1) {
        window.electronAPI.showAlert1(message);
    } else {
        // Fallback for web version
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 success-notification';
        notification.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Add error feedback for operations
function showErrorMessage(message) {
    if (window.electronAPI && window.electronAPI.showAlert1) {
        window.electronAPI.showAlert1(message);
    } else {
        // Fallback for web version
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 success-notification';
        notification.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${message}`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Sorting functionality
let currentSort = { field: null, direction: 'asc' };

function setupSorting() {
    const sortableHeaders = document.querySelectorAll('th[data-sort]');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.getAttribute('data-sort');
            const direction = currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc';

            currentSort = { field, direction };

            // Update header icons
            sortableHeaders.forEach(h => {
                const icon = h.querySelector('i');
                icon.className = 'fas fa-sort ml-1';
            });

            const currentIcon = header.querySelector('i');
            currentIcon.className = `fas fa-sort-${direction === 'asc' ? 'up' : 'down'} ml-1`;

            // Sort and re-render
            const sortedData = sortData(currentStockData, field, direction);
            renderStockTable(sortedData);
        });
    });
}

function sortData(data, field, direction) {
    return [...data].sort((a, b) => {
        let aVal, bVal;

        switch (field) {
            case 'name':
                aVal = normalizeField(a, ['item_name', 'itemName']).toLowerCase();
                bVal = normalizeField(b, ['item_name', 'itemName']).toLowerCase();
                break;
            case 'price':
                aVal = parseFloat(normalizeField(a, ['unit_price', 'unitPrice'])) || 0;
                bVal = parseFloat(normalizeField(b, ['unit_price', 'unitPrice'])) || 0;
                break;
            case 'quantity':
                aVal = Number(normalizeField(a, ['quantity', 'qty'])) || 0;
                bVal = Number(normalizeField(b, ['quantity', 'qty'])) || 0;
                break;
            case 'gst':
                aVal = parseFloat(normalizeField(a, ['GST', 'gstRate'])) || 0;
                bVal = parseFloat(normalizeField(b, ['GST', 'gstRate'])) || 0;
                break;
            case 'status':
                const getStatusPriority = (item) => {
                    const quantity = Number(normalizeField(item, ['quantity', 'qty'])) || 0;
                    const minQuantity = Number(normalizeField(item, ['min_quantity', 'minQuantity'])) || 0;
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

// Initialize the page
addTooltips();
setupSorting();
fetchStockData();