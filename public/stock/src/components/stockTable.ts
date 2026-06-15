/**
 * Stock table rendering, loading, and empty state management.
 * Improved UI: 3-dot context menu, SKU column, right-aligned numerics,
 * clickable item name, low-stock warning, proper status badges.
 */

// ─── Singleton context menu element ──────────────────────────────────────────

let _ctxMenu: HTMLElement | null = null;
let _ctxCloseHandler: ((e: MouseEvent) => void) | null = null;

function getContextMenu(): HTMLElement {
    if (!_ctxMenu) {
        _ctxMenu = document.createElement('div');
        _ctxMenu.className = 'ctx-menu';
        _ctxMenu.id = 'stockCtxMenu';
        document.body.appendChild(_ctxMenu);
    }
    return _ctxMenu;
}

function closeContextMenu(): void {
    const menu = document.getElementById('stockCtxMenu');
    if (menu) menu.remove();
    _ctxMenu = null;
    if (_ctxCloseHandler) {
        document.removeEventListener('click', _ctxCloseHandler, true);
        _ctxCloseHandler = null;
    }
}

interface CtxMenuItem {
    icon: string;
    label: string;
    danger?: boolean;
    dividerBefore?: boolean;
    action: () => void;
}

function openContextMenu(triggerBtn: HTMLElement, items: CtxMenuItem[]): void {
    closeContextMenu();

    const menu = getContextMenu();
    menu.innerHTML = '';

    items.forEach(item => {
        if (item.dividerBefore) {
            const div = document.createElement('div');
            div.className = 'ctx-menu-divider';
            menu.appendChild(div);
        }
        const btn = document.createElement('button');
        btn.className = 'ctx-menu-item' + (item.danger ? ' danger' : '');
        btn.innerHTML = `<i class="${item.icon}" style="width:14px;text-align:center;"></i>${escapeHtml(item.label)}`;
        btn.addEventListener('click', () => {
            closeContextMenu();
            item.action();
        });
        menu.appendChild(btn);
    });

    document.body.appendChild(menu);

    // Position: below the button, aligned right to trigger
    const rect = triggerBtn.getBoundingClientRect();
    const menuW = 176;
    const menuH = menu.offsetHeight || items.length * 36 + 8;
    let left = rect.right - menuW;
    let top  = rect.bottom + 4;

    // Flip up if not enough space below
    if (top + menuH > window.innerHeight - 8) {
        top = rect.top - menuH - 4;
    }
    // Clamp left
    if (left < 8) left = 8;

    menu.style.left = `${left}px`;
    menu.style.top  = `${top}px`;

    // Close on outside click
    setTimeout(() => {
        _ctxCloseHandler = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node) && e.target !== triggerBtn) {
                closeContextMenu();
            }
        };
        document.addEventListener('click', _ctxCloseHandler, true);
    }, 0);
}

// ─── Loading / Empty state ────────────────────────────────────────────────────

function showLoading(show: boolean): void {
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const tableContainer = document.getElementById('stock-table-container');
    
    if (loadingState) loadingState.classList.toggle('hidden', !show);
    if (show) {
        if (emptyState) emptyState.classList.add('hidden');
        if (tableContainer) tableContainer.classList.add('hidden');
    }
}

function showEmpty(show: boolean): void {
    const loadingState = document.getElementById('loading-state');
    const emptyState   = document.getElementById('empty-state');
    const tableContainer = document.getElementById('stock-table-container');
    
    if (emptyState)   emptyState.classList.toggle('hidden', !show);
    if (tableContainer) tableContainer.classList.toggle('hidden', show);
    if (loadingState && show) loadingState.classList.add('hidden');
}

// ─── SKU generation (deterministic from item data) ────────────────────────────

function deriveSku(item: StockItem): string {
    // If the item has a stored sku field, use it; otherwise derive from type + id suffix
    if ((item as any).sku) return (item as any).sku as string;
    const typeCode = (item.item_type || 'ITM').substring(0, 3).toUpperCase();
    const idSuffix = (item._id || '').toString().slice(-4).toUpperCase();
    return `${typeCode}-${idSuffix}`;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

interface StatusInfo {
    label: string;
    dotColor: string;
    badgeBg: string;
    badgeText: string;
}

function getStatusInfo(item: StockItem): StatusInfo {
    const isActive  = item.is_active !== false;
    const quantity  = Number(item.stock_quantity) || 0;
    const minQty    = Number(item.min_stock_quantity) || 0;

    if (!isActive) return {
        label: 'Inactive',
        dotColor:   '#94a3b8',
        badgeBg:    '#f1f5f9',
        badgeText:  '#475569',
    };
    if (quantity < 0) return {
        label: 'Negative',
        dotColor:   '#dc2626',
        badgeBg:    '#fef2f2',
        badgeText:  '#991b1b',
    };
    if (quantity === 0) return {
        label: 'Out of Stock',
        dotColor:   '#ef4444',
        badgeBg:    '#fee2e2',
        badgeText:  '#b91c1c',
    };
    if (quantity < minQty) return {
        label: 'Low Stock',
        dotColor:   '#f97316',
        badgeBg:    '#fff7ed',
        badgeText:  '#c2410c',
    };
    return {
        label: 'In Stock',
        dotColor:   '#22c55e',
        badgeBg:    '#f0fdf4',
        badgeText:  '#15803d',
    };
}

// ─── Row background for quick at-a-glance scanning ───────────────────────────

function getRowBgClasses(item: StockItem): string[] {
    const isActive = item.is_active !== false;
    const quantity = Number(item.stock_quantity) || 0;
    const minQty   = Number(item.min_stock_quantity) || 0;

    if (window.showDeletedItems) return ['bg-rose-50/60'];
    if (!isActive)               return ['bg-slate-50', 'opacity-75'];
    if (quantity < 0)            return ['bg-red-50'];
    if (quantity === 0)          return ['bg-red-50/50'];
    if (quantity < minQty)       return ['bg-amber-50/50'];
    return [];
}

// ─── Main render function ─────────────────────────────────────────────────────

function renderStockTable(data: StockItem[]): void {
    const tbody = document.querySelector('#stock-table tbody') as HTMLTableSectionElement | null;
    if (!tbody) return;

    // Remove dynamic rows, keep loading/empty sentinels
    tbody.querySelectorAll('tr:not(#empty-row)').forEach(r => r.remove());

    showLoading(false);

    if (!data || data.length === 0) {
        showEmpty(true);
        return;
    }

    showEmpty(false);

    data.forEach(item => {
        const id       = item._id;
        const name     = item.item_name || '—';
        const brand    = item.brand     || '';
        const category = item.category  || '';
        const hsn      = item.hsn_sac   || '';
        const sku      = deriveSku(item);

        const purchasePrice       = parseFloat(String(item.purchase_price)) || 0;
        const gstRate             = parseFloat(String(item.gst_rate))       || 0;
        const purchasePriceWithTax = purchasePrice * (1 + gstRate / 100);

        const quantity = Number(item.stock_quantity)     || 0;
        const minQty   = Number(item.min_stock_quantity) || 0;
        const unit     = item.unit || 'pc';
        const isPc     = unit === 'pc';
        const isLowStock = item.is_active !== false && quantity > 0 && quantity < minQty;
        const isActive = item.is_active !== false;

        const statusInfo = getStatusInfo(item);

        // ── Row ──
        const row = document.createElement('tr');
        row.classList.add(
            'table-row', 'fade-in',
            'border-b', 'border-slate-100',
            'hover:bg-blue-50/30',
            'transition-colors', 'duration-100',
            'group'
        );
        getRowBgClasses(item).forEach(c => row.classList.add(c));

        // ── Quantity display with low-stock warning ──
        const qtyFormatted = formatIndian(quantity, isPc ? 0 : 2);
        const qtyHtml = isLowStock
            ? `<span class="inline-flex items-center gap-1 text-orange-600 font-semibold">
                   <i class="fas fa-exclamation-triangle text-[10px]"></i>${escapeHtml(qtyFormatted)} ${escapeHtml(unit)}
               </span>`
            : `<span class="${quantity === 0 ? 'text-red-600 font-semibold' : quantity < 0 ? 'text-red-700 font-bold' : ''}">${escapeHtml(qtyFormatted)} ${escapeHtml(unit)}</span>`;

        // ── Status badge ──
        const badge = `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                  style="background:${statusInfo.badgeBg};color:${statusInfo.badgeText};">
                <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${statusInfo.dotColor};"></span>
                ${escapeHtml(statusInfo.label)}
            </span>`;

        // ── Row HTML (all data cells except the last actions cell) ──
        row.innerHTML = `
            <td class="p-3 max-w-[260px]">
                <div>
                    <div class="font-semibold text-slate-800 text-sm item-name-link leading-tight truncate" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
                    <div class="text-xs text-slate-400 mt-0.5 truncate">${escapeHtml(brand)}${brand && category ? ' <span class="mx-0.5">·</span> ' : ''}${escapeHtml(category)}</div>
                </div>
            </td>
            <td class="p-3">
                <span class="text-xs font-mono text-slate-400 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 tracking-wider">${escapeHtml(hsn || '—')}</span>
            </td>
            <td class="p-3 text-right font-medium text-slate-700 text-sm tabular-nums">
                ₹&nbsp;${escapeHtml(formatIndian(purchasePriceWithTax, 2))}
            </td>
            <td class="p-3 text-right text-sm tabular-nums">
                ${qtyHtml}
            </td>
            <td class="p-3 text-right text-sm font-medium text-slate-600 tabular-nums">
                ${escapeHtml(String(gstRate))}%
            </td>
            <td class="p-3 text-center">
                ${badge}
            </td>
        `;

        // ── Clickable item name → opens details modal ──
        const nameEl = row.querySelector('.item-name-link') as HTMLElement | null;
        if (nameEl) {
            nameEl.addEventListener('click', () => openDetailsModal(item));
        }

        // ── 3-dot actions cell ──
        const actionsCell = document.createElement('td');
        actionsCell.className = 'p-2 text-center';

        const menuBtn = document.createElement('button');
        menuBtn.className = 'ctx-menu-btn opacity-0 group-hover:opacity-100 transition-opacity';
        menuBtn.title = 'Actions';
        menuBtn.innerHTML = '<i class="fas fa-ellipsis-v text-sm"></i>';

        let menuItems: CtxMenuItem[];

        if (window.showDeletedItems) {
            menuItems = [
                { icon: 'fas fa-info-circle text-blue-500',    label: 'View Details',        action: () => openDetailsModal(item) },
                { icon: 'fas fa-trash-restore text-green-600', label: 'Restore Item',         action: () => handleRestore(id, name) },
                { icon: 'fas fa-trash-alt',                    label: 'Permanently Delete',   danger: true, dividerBefore: true, action: () => handleHardDelete(id, name) },
            ];
        } else {
            menuItems = [
                { icon: 'fas fa-plus-circle text-blue-500',  label: 'Add Stock',    action: () => showQuantityModal('add',    id, name) },
                { icon: 'fas fa-minus-circle text-orange-500', label: 'Remove Stock', action: () => showQuantityModal('remove', id, name) },
                { icon: 'fas fa-edit text-slate-500',         label: 'Edit Item',    dividerBefore: true, action: () => openEditModal(item) },
                { icon: 'fas fa-info-circle text-slate-500',  label: 'View Details', action: () => openDetailsModal(item) },
                { icon: 'fas fa-trash-alt',                   label: 'Delete',       danger: true, dividerBefore: true, action: () => handleDelete(id, name) },
            ];
        }

        menuBtn.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            openContextMenu(menuBtn, menuItems);
        });

        actionsCell.appendChild(menuBtn);
        row.appendChild(actionsCell);
        tbody.appendChild(row);
    });
}

// ─── Action handlers (extracted from inline select handler) ──────────────────

async function handleDelete(id: string, name: string): Promise<void> {
    window.electronAPI!.showAlert2(`Are you sure you want to delete "${name}"?`);
    if (window.electronAPI) {
        window.electronAPI.receiveAlertResponse(async (response: string) => {
            if (response === 'Yes') {
                try {
                    const res = await fetch('/stock/deleteItem', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ itemId: id, username: sessionStorage.getItem('username') || 'Admin' })
                    });
                    if (!res.ok) throw new Error('Failed to delete item');
                    await fetchStockData();
                    showUndoToast(`Deleted "${name}"`, id);
                } catch (err) {
                    console.error(err);
                    window.electronAPI?.showAlert1?.('Failed to delete item.');
                }
            }
        });
    }
}

async function handleRestore(id: string, name: string): Promise<void> {
    window.electronAPI!.showAlert2(`Are you sure you want to restore "${name}" to active stock?`);
    if (window.electronAPI) {
        window.electronAPI.receiveAlertResponse(async (response: string) => {
            if (response === 'Yes') {
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
                    window.electronAPI?.showAlert1?.('Failed to restore item.');
                }
            }
        });
    }
}

async function handleHardDelete(id: string, name: string): Promise<void> {
    window.electronAPI!.showAlert2(`Are you sure you want to PERMANENTLY delete "${name}"? This will remove it from the database forever.`);
    if (window.electronAPI) {
        window.electronAPI.receiveAlertResponse(async (response: string) => {
            if (response === 'Yes') {
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
                    window.electronAPI?.showAlert1?.('Failed to permanently delete item.');
                }
            }
        });
    }
}
