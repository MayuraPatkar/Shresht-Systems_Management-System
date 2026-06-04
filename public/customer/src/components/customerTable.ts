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
        if (!container || !emptyState) return;

        container.innerHTML = '';
        
        if (customers.length === 0) {
            container.classList.add('hidden');
            emptyState.classList.remove('hidden');
            
            const isArchived = (document.getElementById('status-filter') as HTMLSelectElement)?.value === 'archived';
            const isTrash = (window as any).showDeletedItems;
            
            if (isTrash) {
                emptyState.innerHTML = `
                    <div class="text-rose-500 text-5xl mb-4">
                        <i class="fas fa-trash-alt"></i>
                    </div>
                    <p class="text-2xl font-bold text-gray-800">Trash is Empty</p>
                    <p class="mt-2 text-gray-600">No deleted customers found</p>
                `;
            } else if (isArchived) {
                emptyState.innerHTML = `
                    <div class="text-amber-500 text-5xl mb-4">
                        <i class="fas fa-archive"></i>
                    </div>
                    <p class="text-2xl font-bold text-gray-800">No Archived Customers</p>
                    <p class="mt-2 text-gray-600">Customers you archive will show up here</p>
                `;
            } else {
                emptyState.innerHTML = `
                    <div class="text-purple-500 text-5xl mb-4">
                        <i class="fas fa-users"></i>
                    </div>
                    <p class="text-2xl font-bold text-gray-800">No Customers Found</p>
                    <p class="mt-2 text-gray-600">Try adjusting your search or filters</p>
                `;
            }

            this.updateStats([]);
            return;
        }

        container.classList.remove('hidden');
        emptyState.classList.add('hidden');

        const limitedCustomers = customers.slice(0, 9);
        limitedCustomers.forEach(customer => {
            const card = this.createCustomerCard(customer);
            container.appendChild(card);
        });

        this.updateStats(customers);
    }

    private getCustomerDisplayName(customer: any): string {
        const firstName = customer?.customer?.first_name || '';
        const lastName = customer?.customer?.last_name || '';
        return `${firstName} ${lastName}`.trim() || customer?.customer?.name || '-';
    }

    private createCustomerCard(customer: any): HTMLElement {
        const card = document.createElement('div');
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

        if ((window as any).showDeletedItems) {
            card.className = 'customer-card-premium p-5 flex flex-col justify-between group border border-rose-100 bg-rose-50/10 cursor-default h-full';
        } else if (customer.is_archived) {
            card.className = 'customer-card-premium archived p-5 flex flex-col justify-between group h-full';
        } else {
            card.className = 'customer-card-premium p-5 flex flex-col justify-between group h-full';
        }

        const fullName = this.getCustomerDisplayName(customer);
        const initials = fullName !== '-' 
            ? fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
            : '?';

        // Construct contact list dynamically, omitting missing fields
        let contactHtml = '';
        if (customer.customer?.phone) {
            contactHtml += `
                <div class="flex items-center gap-2.5 text-slate-600">
                    <i class="fas fa-phone w-4 text-center text-xs text-slate-400"></i>
                    <span class="text-xs font-semibold">${customer.customer.phone}</span>
                </div>`;
        }
        if (customer.customer?.email) {
            contactHtml += `
                <div class="flex items-center gap-2.5 text-slate-600">
                    <i class="fas fa-envelope w-4 text-center text-xs text-slate-400"></i>
                    <span class="text-xs font-semibold truncate max-w-[180px]" title="${customer.customer.email}">${customer.customer.email}</span>
                </div>`;
        }
        const city = customer.billing_address?.city || '';
        const state = customer.billing_address?.state || '';
        const fullAddress = (city || state) ? `${city}${state ? ', ' + state : ''}`.trim() : '';
        if (fullAddress) {
            contactHtml += `
                <div class="flex items-center gap-2.5 text-slate-600">
                    <i class="fas fa-map-marker-alt w-4 text-center text-xs text-slate-400"></i>
                    <span class="text-xs font-semibold truncate max-w-[180px]" title="${fullAddress}">${fullAddress}</span>
                </div>`;
        }

        let restoreHtml = '';
        if (customer.is_archived && !(window as any).showDeletedItems) {
            restoreHtml = `
                <div class="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                    <button class="restore-card-btn px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all focus:outline-none active:scale-95 cursor-pointer">
                        <i class="fas fa-box-open"></i> Restore Customer
                    </button>
                </div>
            `;
        }

        card.innerHTML = `
            <div>
                <div class="flex items-center gap-3.5 mb-4">
                    <div class="w-11 h-11 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-sm tracking-tight shadow-sm shrink-0">
                        ${initials}
                    </div>
                    <div class="min-w-0 flex-1">
                        <h3 class="text-base font-extrabold text-slate-800 tracking-tight leading-snug truncate ${((window as any).showDeletedItems) ? '' : 'group-hover:text-blue-600'} transition-colors">${fullName}</h3>
                        <div class="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <span class="cursor-pointer hover:underline hover:text-blue-600 transition-colors cust-id-label inline-flex items-center gap-1" title="Click to copy ID">
                                ${customer.customer_id || 'ID Pending'}
                                <i class="fas fa-copy text-[8px] opacity-50"></i>
                            </span>
                            <span class="text-slate-300 font-normal">•</span>
                            <span>${customer.customer_type || 'Individual'}</span>
                        </div>
                    </div>
                    <span class="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusClass}">${statusText}</span>
                </div>
                
                <div class="space-y-2 text-slate-600">
                    ${contactHtml}
                </div>
                ${restoreHtml}
            </div>
        `;

        if ((window as any).showDeletedItems) {
            card.innerHTML += `
                <div class="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100 z-20">
                    <button class="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100/50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer restore-btn">
                        <i class="fas fa-trash-restore"></i> Restore
                    </button>
                    <button class="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100/50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer delete-btn">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            `;
        }

        // Click handler for entire card
        card.addEventListener('click', () => {
            if ((window as any).showDeletedItems) return;
            window.location.href = `/customer/details?id=${customer._id}`;
        });

        // Prevent navigation when copying ID
        card.querySelector('.cust-id-label')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (customer.customer_id) {
                await (window as any).copyToClipboard(customer.customer_id);
                (window as any).showToast('Customer ID copied');
                
                const icon = card.querySelector('.cust-id-label i');
                if (icon) {
                    icon.className = 'fas fa-check text-[8px] text-emerald-500 scale-125 transition-all';
                    setTimeout(() => {
                        icon.className = 'fas fa-copy text-[8px] opacity-50';
                    }, 1000);
                }
            }
        });

        // Prevent navigation when clicking restore
        card.querySelector('.restore-card-btn')?.addEventListener('click', (e) => {
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

        if ((window as any).showDeletedItems) {
            card.querySelector('.restore-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                (window as any).handleRestoreFromTrash(customer._id, fullName);
            });
            card.querySelector('.delete-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                (window as any).handleHardDelete(customer._id, fullName);
            });
        }

        return card;
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
