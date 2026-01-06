// Global variables
let currentStockData = [];

function showModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
        el.classList.remove('hidden');
        const firstInput = el.querySelector('input, select, textarea');
        if (firstInput) setTimeout(() => firstInput.focus(), 50);
    }
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
        const response = await fetch('/stock/all');
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
        const id = item._id;
        const name = item.item_name;
        const HSN = item.HSN_SAC;
        const company = item.company;
        const unitPrice = item.unit_price;
        const quantity = Number(item.quantity) || 0;
        const GST = item.GST || 0;
        const minQuantity = Number(item.min_quantity) || 0;
        const category = item.category;
        const type = item.type;

        const row = document.createElement('tr');
        row.classList.add('table-row', 'fade-in', 'hover:bg-slate-50', 'transition-colors');

        if (quantity < 0) {
            row.classList.add('bg-red-200');
        } else if (quantity === 0) {
            row.classList.add('bg-red-100');
        } else if (quantity < minQuantity) {
            row.classList.add('bg-yellow-100');
        }

        const actionsCell = document.createElement('td');

        // Build actions select
        const select = document.createElement('select');
        select.className = 'bg-white border border-gray-300 rounded-lg px-4 py-2 text-base text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:bg-gray-50 transition-colors min-w-[130px]';
        const defaultOpt = document.createElement('option');
        defaultOpt.disabled = true;
        defaultOpt.selected = true;
        defaultOpt.textContent = 'Actions';
        select.appendChild(defaultOpt);

        const actions = [
            { value: 'add', label: 'Add Stock', icon: '+' },
            { value: 'remove', label: 'Remove Stock', icon: '-' },
            { value: 'edit', label: 'Edit Item', icon: '✎' },
            { value: 'details', label: 'View Details', icon: 'ℹ' },
            { value: 'delete', label: 'Delete', icon: '✕' }
        ];

        actions.forEach(action => {
            const opt = document.createElement('option');
            opt.value = action.value;
            opt.textContent = action.label;
            select.appendChild(opt);
        });

        select.addEventListener('change', async () => {
            const action = select.value;
            if (action === 'add' || action === 'remove') {
                showQuantityModal(action, id, name);
            } else if (action === 'edit') {
                openEditModal(item);
            } else if (action === 'details') {
                openDetailsModal(item);
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

        if (quantity < 0) {
            status = 'Negative Stock';
            statusClass = 'bg-red-200 text-red-900 font-bold';
        } else if (quantity === 0) {
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
            <td class="p-4 text-center font-medium">₹ ${escapeHtml(formatIndian(unitPrice))}</td>
            <td class="p-4 text-center font-medium">${escapeHtml(formatIndian(quantity))}</td>
            <td class="p-4 text-center">${escapeHtml(GST)}%</td>
            <td class="p-4 text-center" style="width:140px;">
                <span class="inline-flex text-center px-4 py-1.5 rounded-full text-sm font-semibold ${statusClass}">
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

/**
 * Generate formatted HTML content for stock printing
 * @param {string} type - Type filter value
 * @param {string} category - Category filter value
 * @param {string} status - Status filter value
 * @returns {string} Formatted HTML for printing
 */
function generateStockPrintContent(type, category, status) {
    // Filter data based on print modal selections
    let filteredData = currentStockData;

    // Apply type filter
    if (type !== 'all') {
        filteredData = filteredData.filter(item => item.type === type);
    }

    // Apply category filter
    if (category !== 'all') {
        filteredData = filteredData.filter(item => item.category === category);
    }

    // Apply status filter
    if (status !== 'all') {
        filteredData = filteredData.filter(item => {
            const quantity = Number(item.quantity) || 0;
            const minQuantity = Number(item.min_quantity) || 0;

            if (status === 'In Stock') return quantity >= minQuantity;
            if (status === 'Low Stock') return quantity > 0 && quantity < minQuantity;
            if (status === 'Out of Stock') return quantity === 0;
            return true;
        });
    }

    let itemsHTML = '';
    let totalValue = 0;
    let totalQuantity = 0;

    filteredData.forEach((item, index) => {
        const itemName = item.item_name;
        const company = item.company;
        const itemCategory = item.category;
        const unitPrice = parseFloat(item.unit_price) || 0;
        const qty = Number(item.quantity) || 0;
        const gst = item.GST || 0;
        const minQuantity = Number(item.min_quantity) || 0;

        const value = qty * unitPrice;
        totalQuantity += qty;
        totalValue += value;

        // Determine status
        let statusText = 'In Stock';
        let statusClass = 'stock-status-normal';

        if (qty < 0) {
            statusText = 'Negative Stock';
            statusClass = 'stock-status-negative';
        } else if (qty === 0) {
            statusText = 'Out of Stock';
            statusClass = 'stock-status-out';
        } else if (qty < minQuantity) {
            statusText = 'Low Stock';
            statusClass = 'stock-status-low';
        }

        itemsHTML += `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${escapeHtml(itemName)}</td>
                <td>${escapeHtml(company)}</td>
                <td>${escapeHtml(itemCategory)}</td>
                <td class="text-right">₹${formatIndian(unitPrice, 2)}</td>
                <td class="text-center">${qty}</td>
                <td class="text-center">${gst}%</td>
                <td class="text-right">₹${formatIndian(value, 2)}</td>
                <td class="text-center"><span class="${statusClass}">${escapeHtml(statusText)}</span></td>
            </tr>
        `;
    });

    const currentDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Stock Report</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 15mm;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Arial', 'Helvetica', sans-serif;
                    font-size: 9pt;
                    line-height: 1.3;
                    color: #000;
                }

                .stock-print-container {
                    width: 100%;
                    max-width: 100%;
                    overflow: hidden;
                }

                .stock-print-header {
                    text-align: center;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #2563eb;
                }

                .stock-print-header h1 {
                    font-size: 20pt;
                    font-weight: bold;
                    color: #1e40af;
                    margin-bottom: 4px;
                }

                .stock-print-header .company-name {
                    font-size: 12pt;
                    color: #374151;
                    margin-bottom: 5px;
                }

                .stock-print-header .report-date {
                    font-size: 9pt;
                    color: #6b7280;
                }

                .stock-print-filters {
                    background-color: #f3f4f6;
                    padding: 8px 12px;
                    margin-bottom: 12px;
                    border-radius: 3px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 8pt;
                }

                .stock-print-filters strong {
                    color: #1f2937;
                }

                .stock-print-filters span {
                    color: #2563eb;
                    font-weight: 600;
                }

                .stock-print-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 15px;
                    table-layout: fixed;
                }

                .stock-print-table thead {
                    background-color: #2563eb;
                    color: white;
                }

                .stock-print-table thead th {
                    padding: 8px 4px;
                    font-weight: 600;
                    text-align: left;
                    font-size: 8pt;
                    border: 1px solid #1e40af;
                    word-wrap: break-word;
                }

                .stock-print-table tbody td {
                    padding: 6px 4px;
                    border: 1px solid #d1d5db;
                    font-size: 8pt;
                    word-wrap: break-word;
                    vertical-align: top;
                }

                .stock-print-table tbody tr:nth-child(even) {
                    background-color: #f9fafb;
                }

                .stock-status-normal {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 7pt;
                    font-weight: 600;
                    background-color: #dcfce7;
                    color: #166534;
                    white-space: nowrap;
                }

                .stock-status-low {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 7pt;
                    font-weight: 600;
                    background-color: #fef3c7;
                    color: #92400e;
                    white-space: nowrap;
                }

                .stock-status-out {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 7pt;
                    font-weight: 600;
                    background-color: #fee2e2;
                    color: #991b1b;
                    white-space: nowrap;
                }

                .stock-status-negative {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 7pt;
                    font-weight: 600;
                    background-color: #fecaca;
                    color: #7f1d1d;
                    white-space: nowrap;
                }

                .stock-print-summary {
                    margin-top: 15px;
                    padding: 12px;
                    background-color: #f3f4f6;
                    border-radius: 3px;
                    display: flex;
                    justify-content: space-around;
                }

                .stock-summary-item {
                    text-align: center;
                }

                .stock-summary-item .label {
                    font-size: 8pt;
                    color: #6b7280;
                    margin-bottom: 4px;
                }

                .stock-summary-item .value {
                    font-size: 12pt;
                    font-weight: bold;
                    color: #1f2937;
                }

                .stock-print-footer {
                    margin-top: 20px;
                    padding-top: 12px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    font-size: 7pt;
                    color: #6b7280;
                }

                /* Text utilities */
                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .text-right { text-align: right; }
            </style>
        </head>
        <body>
            <div class="stock-print-container">
                <div class="stock-print-header">
                    <h1>STOCK REPORT</h1>
                    <div class="company-name">SHRESHT SYSTEMS</div>
                    <div class="report-date">Generated on: ${currentDate}</div>
                </div>
                
                <div class="stock-print-filters">
                    <div><strong>Type:</strong> <span>${escapeHtml(type === 'all' ? 'All Types' : type)}</span></div>
                    <div><strong>Category:</strong> <span>${escapeHtml(category === 'all' ? 'All Categories' : category)}</span></div>
                    <div><strong>Status:</strong> <span>${escapeHtml(status === 'all' ? 'All Status' : status)}</span></div>
                </div>
                
                <table class="stock-print-table">
                    <thead>
                        <tr>
                            <th style="width: 3%;">#</th>
                            <th style="width: 26%;">Item Name</th>
                            <th style="width: 13%;">Company</th>
                            <th style="width: 11%;">Category</th>
                            <th style="width: 11%; text-align: right;">Price</th>
                            <th style="width: 6%; text-align: center;">Qty</th>
                            <th style="width: 6%; text-align: center;">GST</th>
                            <th style="width: 13%; text-align: right;">Value</th>
                            <th style="width: 11%; text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML || '<tr><td colspan="9" style="text-align: center; padding: 15px; color: #6b7280;">No stock items to display</td></tr>'}
                    </tbody>
                </table>
                
                <div class="stock-print-summary">
                    <div class="stock-summary-item">
                        <div class="label">Total Items</div>
                        <div class="value">${filteredData.length}</div>
                    </div>
                    <div class="stock-summary-item">
                        <div class="label">Total Quantity</div>
                        <div class="value">${totalQuantity}</div>
                    </div>
                    <div class="stock-summary-item">
                        <div class="label">Total Stock Value</div>
                        <div class="value">₹ ${formatIndian(totalValue, 2)}</div>
                    </div>
                </div>
                
                <div class="stock-print-footer">
                    <p>This is a computer-generated stock report | Shresht Systems | Ph: 7204657707 / 9901730305</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function populateCategoryFilters(data) {
    const cats = new Set();
    data.forEach(i => {
        const c = i.category;
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
        const item_name = document.getElementById('itemName').value.trim();
        const HSN_SAC = document.getElementById('hsnCode').value.trim();
        const company = document.getElementById('company').value.trim();
        const category = document.getElementById('category').value.trim();
        const type = document.getElementById('type').value.trim();
        const unit_price = parseFloat(document.getElementById('unitPrice').value);
        // Quantity field removed from UI, defaulting to 0 for new items
        const quantity = 0;
        const GST = parseFloat(document.getElementById('gstRate').value);
        const min_quantity = parseInt(document.getElementById('minQuantity').value, 10);
        const specifications = document.getElementById('specifications').value.trim();

        if (!item_name || !HSN_SAC || !company || !category || !type) {
            showErrorMessage('Please fill all required text fields.');
            return;
        }

        if (isNaN(unit_price) || unit_price <= 0) {
            showErrorMessage('Please enter a valid unit price.');
            return;
        }

        if (isNaN(GST) || GST < 0) {
            showErrorMessage('Please enter a valid GST rate.');
            return;
        }

        if (isNaN(min_quantity) || min_quantity < 0) {
            showErrorMessage('Please enter a valid minimum quantity.');
            return;
        }

        try {
            const res = await fetch('/stock/addItem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_name, HSN_SAC, company, category, type, unit_price, quantity, GST, min_quantity, specifications })
            });

            if (!res.ok) {
                // Try to parse error message from server
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to add item');
            }

            await fetchStockData();
            hideModal('newStockModal');
            newStockForm.reset();
            showSuccessMessage('Stock item added successfully!');
        } catch (err) {
            console.error(err);
            // Display the specific error message from the server (e.g. "Item already exists")
            showErrorMessage(err.message || 'Failed to add item.');
        }
    });
}

// Edit modal wiring
function openEditModal(item) {
    showModal('editStockModal');
    document.getElementById('editItemName').value = item.item_name || '';
    document.getElementById('editHsnCode').value = item.HSN_SAC || '';
    document.getElementById('editCompany').value = item.company || '';
    document.getElementById('editCategory').value = item.category || '';
    document.getElementById('editType').value = item.type || 'Material';
    document.getElementById('editUnitPrice').value = item.unit_price || '';
    document.getElementById('editGstRate').value = item.GST || '';
    document.getElementById('editMinQuantity').value = item.min_quantity || '5';
    document.getElementById('editSpecifications').value = item.specifications || '';

    // store id on modal element for submit
    document.getElementById('editStockModal').setAttribute('data-item-id', item._id);
}

const editForm = document.getElementById('editStockForm');
if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const modal = document.getElementById('editStockModal');
        const itemId = modal.getAttribute('data-item-id');
        const item_name = document.getElementById('editItemName').value.trim();
        const HSN_SAC = document.getElementById('editHsnCode').value.trim();
        const company = document.getElementById('editCompany').value.trim();
        const category = document.getElementById('editCategory').value.trim();
        const type = document.getElementById('editType').value.trim();
        const unit_price = parseFloat(document.getElementById('editUnitPrice').value);
        const GST = parseFloat(document.getElementById('editGstRate').value);
        const min_quantity = parseInt(document.getElementById('editMinQuantity').value, 10);
        const specifications = document.getElementById('editSpecifications').value.trim();

        if (!itemId) return;

        if (!item_name || !HSN_SAC || !company || !category || !type) {
            showErrorMessage('Please fill all required text fields.');
            return;
        }

        if (isNaN(unit_price) || unit_price <= 0) {
            showErrorMessage('Please enter a valid unit price.');
            return;
        }

        if (isNaN(GST) || GST < 0) {
            showErrorMessage('Please enter a valid GST rate.');
            return;
        }

        if (isNaN(min_quantity) || min_quantity < 0) {
            showErrorMessage('Please enter a valid minimum quantity.');
            return;
        }

        try {
            const res = await fetch('/stock/editItem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, item_name, HSN_SAC, company, category, type, unit_price, GST, min_quantity, specifications })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to edit item');
            await fetchStockData();
            hideModal('editStockModal');
            showSuccessMessage('Stock item updated successfully!');
        } catch (err) {
            console.error(err);
            showErrorMessage(err.message || 'Failed to update item.');
        }
    });
}

function openDetailsModal(item) {
    showModal('itemDetailsModal');
    document.getElementById('detailsItemName').textContent = item.item_name || '';
    document.getElementById('detailsMinQuantity').textContent = item.min_quantity || '0';
    document.getElementById('detailsUnitPrice').textContent = item.unit_price ? `₹ ${formatIndian(item.unit_price)}` : '';
    document.getElementById('detailsQuantity').textContent = item.quantity || '0';
    document.getElementById('detailsGstRate').textContent = item.GST ? `${item.GST}%` : '0%';
    // document.getElementById('detailsMargin').textContent = item.margin ? `${item.margin}%` : '0%';
    document.getElementById('detailsHsn').textContent = item.HSN_SAC || '';
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
document.getElementById('closeModalBtn')?.addEventListener('click', () => { hideModal('newStockModal'); document.getElementById('newStockForm')?.reset(); });
document.getElementById('cancelBtn')?.addEventListener('click', () => { hideModal('newStockModal'); document.getElementById('newStockForm')?.reset(); });
document.getElementById('closeEditModalBtn')?.addEventListener('click', () => hideModal('editStockModal'));
document.getElementById('cancelEditBtn')?.addEventListener('click', () => hideModal('editStockModal'));
document.getElementById('closeDetailsModalBtn')?.addEventListener('click', () => hideModal('itemDetailsModal'));
document.getElementById('closeDetailsBtn')?.addEventListener('click', () => hideModal('itemDetailsModal'));
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

    // Generate properly styled print content
    const content = generateStockPrintContent(type, category, status);

    if (window.electronAPI && window.electronAPI.handlePrintEvent) {
        window.electronAPI.handlePrintEvent(content, 'print', 'Stock Report');
    } else if (window.electronAPI && window.electronAPI.showAlert1) {
        window.electronAPI.showAlert1('Print functionality is not available.');
    }
    hideModal('printModal');
});

// Low Stock Items button handler
const lowStockBtn = document.getElementById('lowStockBtn');
if (lowStockBtn) {
    lowStockBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/stock/all');
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            const lowStockItems = (data || []).filter(i => {
                const qty = Number(i.quantity) || 0;
                const minQty = Number(i.min_quantity) || 0;
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

// Home button handler
const homeBtn = document.getElementById('home-btn');
if (homeBtn) {
    homeBtn.addEventListener('click', () => {
        window.location.href = '../dashboard/dashboard.html';
    });
}

// Search functionality
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();

        if (!searchTerm) {
            // If search is cleared, show all items (with current filters applied)
            applyFilters();
            return;
        }

        const filteredData = currentStockData.filter(item => {
            const name = (item.item_name || '').toLowerCase();
            const company = (item.company || '').toLowerCase();
            const category = (item.category || '').toLowerCase();
            const hsn = (item.HSN_SAC || '').toLowerCase();

            return name.includes(searchTerm) ||
                company.includes(searchTerm) ||
                category.includes(searchTerm) ||
                hsn.includes(searchTerm);
        });

        renderStockTable(filteredData);
    });
}

// Refresh functionality
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
        filteredData = filteredData.filter(item => item.type === typeFilter);
    }

    if (categoryFilter !== 'all') {
        filteredData = filteredData.filter(item => item.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
        filteredData = filteredData.filter(item => {
            const quantity = Number(item.quantity) || 0;
            const minQuantity = Number(item.min_quantity) || 0;

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
    // Don't trigger shortcuts when typing in input fields (except for Escape and Ctrl combinations)
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

    // Ctrl+F or Cmd+F to focus search input
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    // Ctrl+N or Cmd+N to add new stock item
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showModal('newStockModal');
        // Focus first input in the form
        setTimeout(() => {
            document.getElementById('itemName')?.focus();
        }, 100);
    }

    // Ctrl+S or Cmd+S to save (submit) the active form
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();

        // Check which modal is open and submit its form
        const newStockModal = document.getElementById('newStockModal');
        const editStockModal = document.getElementById('editStockModal');

        // Also check for quantity modal
        const quantityModal = document.getElementById('quantityModal');

        if (newStockModal && !newStockModal.classList.contains('hidden')) {
            document.getElementById('newStockForm')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        } else if (editStockModal && !editStockModal.classList.contains('hidden')) {
            document.getElementById('editStockForm')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        } else if (quantityModal && !quantityModal.classList.contains('hidden')) {
            // Retrieve the stored submit handler or trigger the button click
            document.getElementById('quantityModalSubmitBtn')?.click();
        }
    }

    // Ctrl+P or Cmd+P to open print modal
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        showModal('printModal');
    }

    // Escape to close modals
    if (e.key === 'Escape') {
        // Prevent global redirection
        e.preventDefault();
        e.stopPropagation();

        const modals = ['newStockModal', 'editStockModal', 'itemDetailsModal', 'printModal', 'quantityModal', 'keyboardShortcutsModal'];
        let closedSomething = false;

        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && !modal.classList.contains('hidden')) {
                hideModal(modalId);
                closedSomething = true;
            }
        });

        // If no modal was closed, redirect to dashboard manually if needed, 
        // to mimic global behavior but controlled by this listener
        if (!closedSomething) {
            window.location = '/dashboard';
        }
    }

    // Ctrl+R or Cmd+R to refresh (prevent default and use our refresh)
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        fetchStockData();
        showSuccessMessage('Stock data refreshed!');
    }

    // ? key to show keyboard shortcuts help (only when not typing)
    if (e.key === '?' && !isTyping) {
        e.preventDefault();
        showModal('keyboardShortcutsModal');
    }
}, true); // Use capture phase to intercept before global listener

// Keyboard shortcuts modal handlers
document.getElementById('keyboardShortcutsBtn')?.addEventListener('click', () => showModal('keyboardShortcutsModal'));
document.getElementById('closeKeyboardModalBtn')?.addEventListener('click', () => hideModal('keyboardShortcutsModal'));
document.getElementById('closeKeyboardHelpBtn')?.addEventListener('click', () => hideModal('keyboardShortcutsModal'));

// Add tooltips to action buttons
function addTooltips() {
    const newStockBtn = document.getElementById('newStockItemBtn');
    if (newStockBtn) newStockBtn.title = 'Add new stock item (Ctrl+N)';

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.title = 'Refresh data (Ctrl+R)';

    const printBtn = document.getElementById('printBtn');
    if (printBtn) printBtn.title = 'Print stock report (Ctrl+P)';

    const lowStockBtn = document.getElementById('lowStockBtn');
    if (lowStockBtn) lowStockBtn.title = 'Show only low stock and out of stock items';

    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) homeBtn.title = 'Go to Dashboard';

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.title = 'Search stock items (Ctrl+F)';

    const keyboardBtn = document.getElementById('keyboardShortcutsBtn');
    if (keyboardBtn) keyboardBtn.title = 'Keyboard shortcuts (?)';
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
                aVal = (a.item_name || '').toLowerCase();
                bVal = (b.item_name || '').toLowerCase();
                break;
            case 'price':
                aVal = parseFloat(a.unit_price) || 0;
                bVal = parseFloat(b.unit_price) || 0;
                break;
            case 'quantity':
                aVal = Number(a.quantity) || 0;
                bVal = Number(b.quantity) || 0;
                break;
            case 'gst':
                aVal = parseFloat(a.GST) || 0;
                bVal = parseFloat(b.GST) || 0;
                break;
            case 'status':
                const getStatusPriority = (item) => {
                    const quantity = Number(item.quantity) || 0;
                    const minQuantity = Number(item.min_quantity) || 0;
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

// Initialize the page
addTooltips();
setupSorting();
fetchStockData();

// Auto-open add quantity modal if ?item=<name> is in URL
document.addEventListener('DOMContentLoaded', () => {
    const searchParams = new URLSearchParams(window.location.search);
    const itemName = searchParams.get('item');

    if (itemName) {
        // Wait for table to render and data to load, then open add modal for the item
        setTimeout(() => {
            // Find the item in currentStockData
            const stockItem = currentStockData.find(item =>
                (item.item_name || '').trim() === itemName.trim()
            );

            if (stockItem) {
                const itemId = stockItem._id;
                const itemNameFromData = stockItem.item_name;

                // Scroll to the item first
                const rows = document.querySelectorAll('#stock-table tbody tr');
                rows.forEach(row => {
                    const nameCell = row.querySelector('td:first-child .font-medium');
                    if (nameCell && nameCell.textContent.trim() === itemName.trim()) {
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });

                        // Brief highlight
                        row.classList.add('bg-yellow-200');
                        setTimeout(() => {
                            row.classList.remove('bg-yellow-200');
                            const qty = parseInt(row.querySelector('td:nth-child(3)')?.textContent.replace(/[^0-9]/g, '')) || 0;
                            const minQty = Number(stockItem.min_quantity) || 0;

                            if (qty < 0) {
                                row.classList.add('bg-red-200');
                            } else if (qty === 0) {
                                row.classList.add('bg-red-100');
                            } else if (qty < minQty) {
                                row.classList.add('bg-yellow-100');
                            }
                        }, 800);
                    }
                });

                // Open the "Add Quantity" modal after a brief delay
                setTimeout(() => {
                    showQuantityModal('add', itemId, itemNameFromData);
                }, 600);

            } else {
                // Item not found in stock data
                showErrorMessage(`Item "${itemName}" not found in stock list.`);
            }
        }, 800);
    }
});

// Integer validation for quantity inputs (replacing inline onkeypress)
document.addEventListener('DOMContentLoaded', () => {
    const ids = ['quantity', 'minQuantity', 'editMinQuantity', 'quantityModalInput'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keypress', function (event) {
                if (event.charCode < 48 || event.charCode > 57) event.preventDefault();
            });
        }
    });
});