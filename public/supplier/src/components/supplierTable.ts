// @ts-nocheck
/**
 * Supplier Module Table/UI Rendering
 */

class SupplierTable {
    private containerId: string;
    private emptyId: string;
    private paginationManager: any = null;

    constructor(containerId: string, emptyId: string) {
        this.containerId = containerId;
        this.emptyId = emptyId;
    }

    render(suppliers: any[]) {
        this.updateStats(suppliers);

        if (!this.paginationManager) {
            this.paginationManager = new (window as any).TablePaginationManager(
                this.containerId,
                (paginatedData: any[]) => this.renderPage(paginatedData),
                25
            );
        }
        this.paginationManager.setData(suppliers);
    }

    renderPage(suppliers: any[]) {
        const container = document.getElementById(this.containerId);
        const emptyState = document.getElementById(this.emptyId);
        const mobileContainer = document.getElementById('supplier-cards-mobile');
        if (!container || !emptyState) return;

        container.innerHTML = '';
        if (mobileContainer) mobileContainer.innerHTML = '';

        const tableWrapper = container.closest('.bg-white');
        if (tableWrapper) tableWrapper.classList.remove('hidden');
        emptyState.classList.add('hidden');

        const isTrash = !!(window as any).showDeletedItems;
        const isArchived = (document.getElementById('status-filter') as HTMLSelectElement)?.value === 'archived';

        if (suppliers.length === 0) {
            this.updateTableHeader(isTrash);

            let emptyContentHtml = '';
            if (isTrash) {
                emptyContentHtml = `
                    <div class="inline-block max-w-md mx-auto text-center py-12 fade-in select-none">
                        <div class="text-rose-500 text-5xl mb-4">
                            <i class="fas fa-trash-alt"></i>
                        </div>
                        <p class="text-2xl font-bold text-gray-800">Trash is Empty</p>
                        <p class="mt-2 text-gray-600">No deleted suppliers found</p>
                    </div>
                `;
            } else if (isArchived) {
                emptyContentHtml = `
                    <div class="inline-block max-w-md mx-auto text-center py-12 fade-in select-none">
                        <div class="text-amber-500 text-5xl mb-4">
                            <i class="fas fa-archive"></i>
                        </div>
                        <p class="text-2xl font-bold text-gray-800">No Archived Suppliers</p>
                        <p class="mt-2 text-gray-650">Suppliers you archive will show up here</p>
                    </div>
                `;
            } else {
                emptyContentHtml = `
                    <div class="inline-block max-w-md mx-auto text-center py-12 fade-in select-none">
                        <div class="text-purple-500 text-5xl mb-4">
                            <i class="fas fa-truck"></i>
                        </div>
                        <p class="text-2xl font-bold text-gray-800">No Suppliers Found</p>
                        <p class="mt-2 text-gray-650">Try adjusting your search or filters</p>
                    </div>
                `;
            }

            container.innerHTML = `
                <tr>
                    <td colspan="${isTrash ? 7 : 6}" class="px-4 py-12 bg-white text-center">
                        ${emptyContentHtml}
                    </td>
                </tr>
            `;

            if (mobileContainer) {
                let mobileIcon = 'fa-truck';
                let mobileColor = 'text-purple-500';
                let mobileTitle = 'No Suppliers Found';
                if (isTrash) {
                    mobileIcon = 'fa-trash-alt';
                    mobileColor = 'text-rose-500';
                    mobileTitle = 'Trash is Empty';
                } else if (isArchived) {
                    mobileIcon = 'fa-archive';
                    mobileColor = 'text-amber-500';
                    mobileTitle = 'No Archived Suppliers';
                }
                mobileContainer.innerHTML = `
                    <div class="text-center py-10 bg-white rounded-xl border border-slate-200 p-6">
                        <i class="fas ${mobileIcon} text-3xl ${mobileColor} mb-2"></i>
                        <p class="text-sm font-bold text-slate-700">${mobileTitle}</p>
                    </div>
                `;
            }

            return;
        }

        // Dynamically update headers to fit state
        this.updateTableHeader(isTrash);

        suppliers.forEach(supplier => {
            const row = this.createSupplierRow(supplier);
            container.appendChild(row);
        });

        // Mobile list rendering
        if (mobileContainer) {
            mobileContainer.innerHTML = suppliers.map((s: any) => {
                const supplierName = s.supplier_name || '-';
                let statusClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100/40';
                let statusText = 'Active';
                if ((window as any).showDeletedItems) {
                    statusClass = 'bg-rose-50 text-rose-700 border border-rose-100/40';
                    statusText = 'Deleted';
                } else if (s.is_archived) {
                    statusClass = 'bg-slate-100 text-slate-600 border border-slate-200';
                    statusText = 'Archived';
                } else if (!s.is_active) {
                    statusClass = 'bg-rose-50 text-rose-700 border border-rose-100/40';
                    statusText = 'Inactive';
                }

                return `
                <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col gap-2.5 active:bg-slate-50" onclick="window.location.href='/supplier/details?id=${s._id}'">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${s.supplier_id || 'ID Pending'}</span>
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusClass}">${statusText}</span>
                    </div>
                    <div class="flex items-center justify-between mt-0.5">
                        <div>
                            <p class="text-sm font-bold text-slate-800">${supplierName}</p>
                            <p class="text-xs text-slate-500 font-medium mt-0.5">${s.supplier_type || 'Vendor'}</p>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }
    }

    private updateTableHeader(isTrash: boolean) {
        const headerRow = document.getElementById('table-header-row');
        if (!headerRow) return;
        
        let actionsHeader = '';
        if (isTrash) {
            actionsHeader = `<th class="px-4 py-3 text-right text-xs font-semibold tracking-wider">Actions</th>`;
        }

        headerRow.innerHTML = `
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Supplier ID</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Contact Info</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Location</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Type</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
            ${actionsHeader}
        `;
    }

    private createSupplierRow(supplier: any): HTMLElement {
        const row = document.createElement('tr');
        row.className = "border-b border-slate-100 hover:bg-slate-50 transition-all duration-150 group cursor-pointer text-xs";

        let statusClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100/40';
        let statusText = 'Active';
        if ((window as any).showDeletedItems) {
            statusClass = 'bg-rose-50 text-rose-700 border border-rose-100/40';
            statusText = 'Deleted';
        } else if (supplier.is_archived) {
            statusClass = 'bg-slate-100 text-slate-600 border border-slate-200';
            statusText = 'Archived';
        } else if (!supplier.is_active) {
            statusClass = 'bg-rose-50 text-rose-700 border border-rose-100/40';
            statusText = 'Inactive';
        }

        const supplierName = supplier.supplier_name || '-';
        const initials = supplierName !== '-' 
            ? supplierName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
            : '?';

        const phone = supplier.phone || '-';
        const email = supplier.email || '';
        const city = supplier.billing_address?.city || '';
        const state = supplier.billing_address?.state || '';
        const fullAddress = (city || state) ? `${city}${state ? ', ' + state : ''}`.trim() : '-';

        row.innerHTML = `
            <td class="px-4 py-3 text-slate-850 font-bold whitespace-nowrap text-xs">
                <span class="cursor-pointer hover:text-blue-600 copy-text transition-colors inline-flex items-center gap-1" title="Click to copy ID">
                    ${supplier.supplier_id || 'ID Pending'}
                    <i class="fas fa-copy text-[8px] opacity-50"></i>
                </span>
            </td>
            <td class="px-4 py-3 text-slate-900 font-semibold text-xs max-w-[180px] truncate">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-[10px] shrink-0">
                        ${initials}
                    </div>
                    <span class="truncate font-semibold text-slate-800" title="${supplierName}">${supplierName}</span>
                </div>
            </td>
            <td class="px-4 py-3 text-xs max-w-[180px] truncate">
                <div class="font-medium text-slate-800">${phone}</div>
                <div class="text-[10px] text-slate-400 truncate" title="${email}">${email}</div>
            </td>
            <td class="px-4 py-3 text-slate-500 max-w-[150px] truncate text-xs" title="${fullAddress}">
                ${fullAddress}
            </td>
            <td class="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                ${supplier.supplier_type || 'Vendor'}
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusClass}">${statusText}</span>
            </td>
            ${(window as any).showDeletedItems ? `
                <td class="px-4 py-3 text-right whitespace-nowrap text-xs">
                    <div class="flex items-center justify-end gap-2">
                        <button class="py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100/50 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer restore-btn">
                            <i class="fas fa-trash-restore"></i> Restore
                        </button>
                        <button class="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100/50 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer delete-btn">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </div>
                </td>
            ` : ''}
        `;

        // Click handler for entire row
        row.addEventListener('click', () => {
            if ((window as any).showDeletedItems) return;
            window.location.href = `/supplier/details?id=${supplier._id}`;
        });

        // Prevent navigation when copying ID
        row.querySelector('.copy-text')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (supplier.supplier_id) {
                await (window as any).copyToClipboard(supplier.supplier_id);
                (window as any).showToast('Supplier ID copied');
                
                const icon = row.querySelector('.copy-text i');
                if (icon) {
                    icon.className = 'fas fa-check text-[8px] text-emerald-500 scale-125 transition-all';
                    setTimeout(() => {
                        icon.className = 'fas fa-copy text-[8px] opacity-50';
                    }, 1000);
                }
            }
        });

        // Prevent navigation when clicking restore card
        row.querySelector('.restore-card-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showConfirm(`Are you sure you want to restore supplier "${supplierName}"?`, async (confirmed) => {
                if (confirmed === 'Yes') {
                    try {
                        // Assuming API supports restore
                        if (typeof supplierApi.restoreSupplier === 'function') {
                            await supplierApi.restoreSupplier(supplier._id);
                        } else {
                            await supplierApi.restoreSupplierFromTrash(supplier._id);
                        }
                        (window as any).showToast('Supplier restored successfully');
                        (window as any).fetchSuppliers();
                    } catch (err) {
                        console.error(err);
                        (window as any).showToast('Failed to restore supplier', 'error');
                    }
                }
            });
        });

        // Action buttons in Trash Mode
        if ((window as any).showDeletedItems) {
            row.querySelector('.restore-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                (window as any).handleRestoreFromTrash(supplier._id, supplierName);
            });
            row.querySelector('.delete-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                (window as any).handleHardDelete(supplier._id, supplierName);
            });
        }

        return row;
    }

    private updateStats(suppliers: any[]) {
        const totalCountEl = document.getElementById('total-suppliers-count');
        const activeCountEl = document.getElementById('active-suppliers-count');
        const inactiveCountEl = document.getElementById('inactive-suppliers-count');
        const commercialCountEl = document.getElementById('commercial-suppliers-count');

        if (!totalCountEl || !activeCountEl || !inactiveCountEl || !commercialCountEl) return;

        const total = suppliers.length;
        const active = suppliers.filter(c => c.is_active).length;
        const inactive = total - active;
        const vendors = suppliers.filter(c => c.supplier_type === 'Vendor').length;

        totalCountEl.textContent = total.toString();
        activeCountEl.textContent = active.toString();
        inactiveCountEl.textContent = inactive.toString();
        commercialCountEl.textContent = vendors.toString();
    }
}

(window as any).supplierTable = new SupplierTable('supplier-list', 'empty-state');
