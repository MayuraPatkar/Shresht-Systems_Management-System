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
            this.updateStats([]);
            return;
        }

        container.classList.remove('hidden');
        emptyState.classList.add('hidden');

        customers.forEach(customer => {
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
        card.className = 'customer-card-premium p-5 flex flex-col justify-between group';
        
        const statusClass = customer.is_active 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/40' 
            : 'bg-rose-50 text-rose-700 border border-rose-100/40';
        const statusText = customer.is_active ? 'Active' : 'Inactive';

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

        card.innerHTML = `
            <div>
                <div class="flex items-center gap-3.5 mb-4">
                    <div class="w-11 h-11 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-sm tracking-tight shadow-sm shrink-0">
                        ${initials}
                    </div>
                    <div class="min-w-0 flex-1">
                        <h3 class="text-base font-extrabold text-slate-800 tracking-tight leading-snug truncate group-hover:text-blue-600 transition-colors">${fullName}</h3>
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
            </div>
        `;

        // Click handler for entire card
        card.addEventListener('click', () => {
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

        return card;
    }

    private updateStats(customers: any[]) {
        const totalCountEl = document.getElementById('total-customers-count');
        const activeCountEl = document.getElementById('active-customers-count');
        const inactiveCountEl = document.getElementById('inactive-customers-count');
        const commercialCountEl = document.getElementById('commercial-customers-count');

        if (!totalCountEl || !activeCountEl || !inactiveCountEl || !commercialCountEl) return;

        const total = customers.length;
        const active = customers.filter(c => c.is_active).length;
        const inactive = total - active;
        const commercial = customers.filter(c => c.customer_type === 'Commercial' || c.customer_type === 'Company').length;

        totalCountEl.textContent = total.toString();
        activeCountEl.textContent = active.toString();
        inactiveCountEl.textContent = inactive.toString();
        commercialCountEl.textContent = commercial.toString();
    }
}

(window as any).customerTable = new CustomerTable('customer-list', 'empty-state');
