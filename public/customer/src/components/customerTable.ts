// @ts-nocheck
/**
 * Customer Module Table/UI Rendering
 */

class CustomerTable {
    private containerId: string;
    private emptyId: string;

    constructor(containerId: string, emptyId: string) {
        this.containerId = containerId;
        this.emptyId = emptyId;
    }

    render(customers: any[]) {
        const container = document.getElementById(this.containerId);
        const emptyState = document.getElementById(this.emptyId);
        const mobileContainer = document.getElementById('customer-cards-mobile');
        if (!container || !emptyState) return;

        container.innerHTML = '';
        if (mobileContainer) mobileContainer.innerHTML = '';
        
        if (customers.length === 0) {
            // Hide the table wrapper, show empty state
            const tableWrapper = container.closest('.bg-white');
            if (tableWrapper) tableWrapper.classList.add('hidden');
            emptyState.classList.remove('hidden');
            
            const isArchived = (document.getElementById('status-filter') as HTMLSelectElement)?.value === 'archived';
            const isTrash = (window as any).showDeletedItems;
            
            if (isTrash) {
                emptyState.innerHTML = `
                    <div class="inline-block max-w-md mx-auto text-center py-12 fade-in select-none">
                        <div class="text-rose-500 text-5xl mb-4">
                            <i class="fas fa-trash-alt"></i>
                        </div>
                        <p class="text-2xl font-bold text-gray-800">Trash is Empty</p>
                        <p class="mt-2 text-gray-650">No deleted customers found</p>
                    </div>
                `;
            } else if (isArchived) {
                emptyState.innerHTML = `
                    <div class="inline-block max-w-md mx-auto text-center py-12 fade-in select-none">
                        <div class="text-amber-500 text-5xl mb-4">
                            <i class="fas fa-archive"></i>
                        </div>
                        <p class="text-2xl font-bold text-gray-800">No Archived Customers</p>
                        <p class="mt-2 text-gray-650">Customers you archive will show up here</p>
                    </div>
                `;
            } else {
                emptyState.innerHTML = `
                    <div class="inline-block max-w-md mx-auto text-center py-12 fade-in select-none">
                        <div class="text-purple-500 text-5xl mb-4">
                            <i class="fas fa-users"></i>
                        </div>
                        <p class="text-2xl font-bold text-gray-800">No Customers Found</p>
                        <p class="mt-2 text-gray-650">Try adjusting your search or filters</p>
                    </div>
                `;
            }

            this.updateStats([]);
            return;
        }

        const tableWrapper = container.closest('.bg-white');
        if (tableWrapper) tableWrapper.classList.remove('hidden');
        emptyState.classList.add('hidden');

        // Dynamically update headers to fit state
        this.updateTableHeader(!!(window as any).showDeletedItems);

        customers.forEach(customer => {
            const row = this.createCustomerRow(customer);
            container.appendChild(row);
        });

        // Mobile list rendering
        if (mobileContainer) {
            mobileContainer.innerHTML = customers.map((c: any) => {
                const fullName = this.getCustomerDisplayName(c);
                let statusClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100/40';
                let statusText = 'Active';
                if ((window as any).showDeletedItems) {
                    statusClass = 'bg-rose-50 text-rose-700 border border-rose-100/40';
                    statusText = 'Deleted';
                } else if (c.is_archived) {
                    statusClass = 'bg-slate-100 text-slate-600 border border-slate-200';
                    statusText = 'Archived';
                } else if (!c.is_active) {
                    statusClass = 'bg-rose-50 text-rose-700 border border-rose-100/40';
                    statusText = 'Inactive';
                }

                return `
                <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col gap-2.5 active:bg-slate-50" onclick="window.location.href='/customer/details?id=${c._id}'">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${c.customer_id || 'ID Pending'}</span>
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusClass}">${statusText}</span>
                    </div>
                    <div class="flex items-center justify-between mt-0.5">
                        <div>
                            <p class="text-sm font-bold text-slate-800">${fullName}</p>
                            <p class="text-xs text-slate-500 font-medium mt-0.5">${c.customer_type || 'Individual'}</p>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        this.updateStats(customers);
    }

    private updateTableHeader(isTrash: boolean) {
        const headerRow = document.getElementById('table-header-row');
        if (!headerRow) return;
        
        let actionsHeader = '';
        if (isTrash) {
            actionsHeader = `<th class="px-4 py-3 text-right text-xs font-semibold tracking-wider">Actions</th>`;
        }

        headerRow.innerHTML = `
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Customer ID</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Contact Info</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Location</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Type</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
            ${actionsHeader}
        `;
    }

    private getCustomerDisplayName(customer: any): string {
        const firstName = customer?.customer?.first_name || '';
        const lastName = customer?.customer?.last_name || '';
        return `${firstName} ${lastName}`.trim() || customer?.customer?.name || '-';
    }

    private createCustomerRow(customer: any): HTMLElement {
        const row = document.createElement('tr');
        row.className = "border-b border-slate-100 hover:bg-slate-50 transition-all duration-150 group cursor-pointer text-xs";

        let statusClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100/40';
        let statusText = 'Active';
        if ((window as any).showDeletedItems) {
            statusClass = 'bg-rose-50 text-rose-700 border border-rose-100/40';
            statusText = 'Deleted';
        } else if (customer.is_archived) {
            statusClass = 'bg-slate-100 text-slate-600 border border-slate-200';
            statusText = 'Archived';
        } else if (!customer.is_active) {
            statusClass = 'bg-rose-50 text-rose-700 border border-rose-100/40';
            statusText = 'Inactive';
        }

        const fullName = this.getCustomerDisplayName(customer);
        const initials = fullName !== '-' 
            ? fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
            : '?';

        const phone = customer.customer?.phone || '-';
        const email = customer.customer?.email || '';
        const city = customer.billing_address?.city || '';
        const state = customer.billing_address?.state || '';
        const fullAddress = (city || state) ? `${city}${state ? ', ' + state : ''}`.trim() : '-';

        row.innerHTML = `
            <td class="px-4 py-3 text-slate-850 font-bold whitespace-nowrap text-xs">
                <span class="cursor-pointer hover:text-blue-600 copy-text transition-colors inline-flex items-center gap-1" title="Click to copy ID">
                    ${customer.customer_id || 'ID Pending'}
                    <i class="fas fa-copy text-[8px] opacity-50"></i>
                </span>
            </td>
            <td class="px-4 py-3 text-slate-900 font-semibold text-xs max-w-[180px] truncate">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-[10px] shrink-0">
                        ${initials}
                    </div>
                    <span class="truncate font-semibold text-slate-800" title="${fullName}">${fullName}</span>
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
                ${customer.customer_type || 'Individual'}
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
            window.location.href = `/customer/details?id=${customer._id}`;
        });

        // Prevent navigation when copying ID
        row.querySelector('.copy-text')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (customer.customer_id) {
                await (window as any).copyToClipboard(customer.customer_id);
                (window as any).showToast('Customer ID copied');
                
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
            showConfirm(`Are you sure you want to restore customer "${fullName}"?`, async (confirmed) => {
                if (confirmed === 'Yes') {
                    try {
                        await customerApi.restoreCustomer(customer._id);
                        (window as any).showToast('Customer restored successfully');
                        (window as any).fetchCustomers();
                        if ((window as any).updateArchivedCount) {
                            (window as any).updateArchivedCount();
                        }
                    } catch (err) {
                        console.error(err);
                        (window as any).showToast('Failed to restore customer', 'error');
                    }
                }
            });
        });

        // Action buttons in Trash Mode
        if ((window as any).showDeletedItems) {
            row.querySelector('.restore-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                (window as any).handleRestoreFromTrash(customer._id, fullName);
            });
            row.querySelector('.delete-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                (window as any).handleHardDelete(customer._id, fullName);
            });
        }

        return row;
    }

    private updateStats(customers: any[]) {
        const totalCountEl = document.getElementById('total-customers-count');
        const activeCountEl = document.getElementById('active-customers-count');
        const inactiveCountEl = document.getElementById('inactive-customers-count');
        const b2bCountEl = document.getElementById('b2b-customers-count');
        const b2cCountEl = document.getElementById('b2c-customers-count');

        if (!totalCountEl || !activeCountEl || !inactiveCountEl || !b2bCountEl || !b2cCountEl) return;

        const total = customers.length;
        const active = customers.filter(c => c.is_active && !c.is_archived).length;
        const inactive = customers.filter(c => !c.is_active && !c.is_archived).length;
        const b2b = customers.filter(c => c.is_active && !c.is_archived && (c.customer_type === 'Commercial' || c.customer_type === 'Government')).length;
        const b2c = customers.filter(c => c.is_active && !c.is_archived && c.customer_type === 'Individual').length;

        totalCountEl.textContent = total.toString();
        activeCountEl.textContent = active.toString();
        inactiveCountEl.textContent = inactive.toString();
        b2bCountEl.textContent = b2b.toString();
        b2cCountEl.textContent = b2c.toString();
    }
}

(window as any).customerTable = new CustomerTable('customer-list', 'empty-state');
