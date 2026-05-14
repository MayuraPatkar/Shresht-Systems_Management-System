/**
 * Stock table rendering, loading, and empty state management.
 */

function showLoading(show: boolean): void {
    const loadingRow = document.getElementById('loading-row');
    const emptyRow = document.getElementById('empty-row');
    if (loadingRow) {
        loadingRow.classList.toggle('hidden', !show);
    }
    if (emptyRow && show) {
        emptyRow.classList.add('hidden');
    }
}

function showEmpty(show: boolean): void {
    const emptyRow = document.getElementById('empty-row');
    const loadingRow = document.getElementById('loading-row');
    if (emptyRow) {
        emptyRow.classList.toggle('hidden', !show);
    }
    if (loadingRow && show) {
        loadingRow.classList.add('hidden');
    }
}

function renderStockTable(data: StockItem[]): void {
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
        const hsn = item.hsn_sac;
        const brand = item.brand;
        const purchasePrice = item.purchase_price || 0;
        const quantity = Number(item.stock_quantity) || 0;
        const gstRate = item.gst_rate || 0;
        const minQuantity = Number(item.min_stock_quantity) || 0;
        const category = item.category;
        const itemType = item.item_type;

        const row = document.createElement('tr');
        row.classList.add('table-row', 'fade-in', 'hover:bg-slate-50', 'transition-colors');

        if (quantity < 0) {
            row.classList.add('bg-red-200');
        } else if (quantity === 0) {
            row.classList.add('bg-red-100');
        } else if (quantity < minQuantity) {
            row.classList.add('bg-yellow-100');
        }

        // Inactive items get a distinct gray overlay
        const isActive = item.is_active !== false;
        if (!isActive) {
            row.classList.remove('bg-red-200', 'bg-red-100', 'bg-yellow-100');
            row.classList.add('bg-gray-200', 'opacity-70');
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

        let actions: ActionOption[] = [];
        if (window.showDeletedItems) {
            actions = [
                { value: 'details', label: 'View Details', icon: 'ℹ' },
                { value: 'restore', label: 'Restore Item', icon: '⟲' },
                { value: 'hardDelete', label: 'Permanently Delete', icon: '🗑' }
            ];
            // Give deleted rows a distinct style
            row.classList.add('bg-red-50');
        } else {
            actions = [
                { value: 'add', label: 'Add Stock', icon: '+' },
                { value: 'remove', label: 'Remove Stock', icon: '-' },
                { value: 'edit', label: 'Edit Item', icon: '✎' },
                { value: 'details', label: 'View Details', icon: 'ℹ' },
                { value: 'delete', label: 'Delete', icon: '✕' }
            ];
        }

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
                window.electronAPI!.showAlert2(`Are you sure you want to delete "${name}"?`);
                if (window.electronAPI) {
                    window.electronAPI.receiveAlertResponse(async (response: string) => {
                        if (response === "Yes") {
                            try {
                                const res = await fetch('/stock/deleteItem', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                        itemId: id,
                                        username: sessionStorage.getItem('username') || 'Admin'
                                    })
                                });
                                if (!res.ok) throw new Error('Failed to delete item');
                                await fetchStockData();
                                window.electronAPI!.showAlert1('Stock item deleted successfully!');
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
            } else if (action === 'restore') {
                window.electronAPI!.showAlert2(`Are you sure you want to restore "${name}" to active stock?`);
                if (window.electronAPI) {
                    window.electronAPI.receiveAlertResponse(async (response: string) => {
                        if (response === "Yes") {
                            try {
                                const res = await fetch('/stock/restoreItem', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ itemId: id })
                                });
                                if (!res.ok) throw new Error('Failed to restore item');
                                await fetchStockData();
                                window.electronAPI!.showAlert1('Stock item restored successfully!');
                            } catch (err) {
                                console.error(err);
                                window.electronAPI?.showAlert1('Failed to restore item.');
                            }
                        }
                    });
                }
            } else if (action === 'hardDelete') {
                window.electronAPI!.showAlert2(`Are you sure you want to PERMANENTLY delete "${name}"? This will remove it from the database forever.`);
                if (window.electronAPI) {
                    window.electronAPI.receiveAlertResponse(async (response: string) => {
                        if (response === "Yes") {
                            try {
                                const res = await fetch('/stock/hardDeleteItem', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ itemId: id })
                                });
                                if (!res.ok) throw new Error('Failed to permanently delete item');
                                await fetchStockData();
                                window.electronAPI!.showAlert1('Stock item permanently deleted!');
                            } catch (err) {
                                console.error(err);
                                window.electronAPI?.showAlert1('Failed to permanently delete item.');
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

        if (!isActive) {
            status = 'Inactive';
            statusClass = 'bg-gray-200 text-gray-600';
        } else if (quantity < 0) {
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
                    <div class="text-sm text-gray-500">${escapeHtml(brand)} • ${escapeHtml(category)}</div>
                </div>
            </td>
            <td class="p-4 text-center font-medium">₹ ${escapeHtml(formatIndian(purchasePrice))}</td>
            <td class="p-4 text-center font-medium">${escapeHtml(formatIndian(quantity))}</td>
            <td class="p-4 text-center">${escapeHtml(gstRate)}%</td>
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
