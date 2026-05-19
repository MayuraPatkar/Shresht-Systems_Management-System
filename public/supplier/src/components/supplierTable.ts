/**
 * Supplier Module Table/UI Rendering
 */

class SupplierTable {
    private containerId: string;
    private emptyId: string;

    constructor(containerId: string, emptyId: string) {
        this.containerId = containerId;
        this.emptyId = emptyId;
    }

    render(suppliers: any[]) {
        const container = document.getElementById(this.containerId);
        const emptyState = document.getElementById(this.emptyId);
        if (!container || !emptyState) return;

        container.innerHTML = '';
        
        if (suppliers.length === 0) {
            container.classList.add('hidden');
            emptyState.classList.remove('hidden');
            this.updateStats([]);
            return;
        }

        container.classList.remove('hidden');
        emptyState.classList.add('hidden');

        suppliers.forEach(supplier => {
            const card = this.createSupplierCard(supplier);
            container.appendChild(card);
        });

        this.updateStats(suppliers);
    }

    private createSupplierCard(supplier: any): HTMLElement {
        const card = document.createElement('div');
        
        let statusClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100/40';
        let statusText = 'Active';
        if (!supplier.is_active) {
            statusClass = 'bg-rose-50 text-rose-700 border border-rose-100/40';
            statusText = 'Inactive';
        }
        card.className = 'supplier-card-premium p-5 flex flex-col justify-between group';

        const supplierName = supplier.supplier_name || '-';
        const initials = supplierName !== '-' 
            ? supplierName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
            : '?';

        // Construct contact list dynamically, omitting missing fields
        let contactHtml = '';
        if (supplier.phone) {
            contactHtml += `
                <div class="flex items-center gap-2.5 text-slate-600">
                    <i class="fas fa-phone w-4 text-center text-xs text-slate-400"></i>
                    <span class="text-xs font-semibold">${supplier.phone}</span>
                </div>`;
        }
        if (supplier.email) {
            contactHtml += `
                <div class="flex items-center gap-2.5 text-slate-600">
                    <i class="fas fa-envelope w-4 text-center text-xs text-slate-400"></i>
                    <span class="text-xs font-semibold truncate max-w-[180px]" title="${supplier.email}">${supplier.email}</span>
                </div>`;
        }
        const city = supplier.billing_address?.city || '';
        const state = supplier.billing_address?.state || '';
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
                        <h3 class="text-base font-extrabold text-slate-800 tracking-tight leading-snug truncate group-hover:text-blue-600 transition-colors">${supplierName}</h3>
                        <div class="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <span class="cursor-pointer hover:underline hover:text-blue-600 transition-colors cust-id-label inline-flex items-center gap-1" title="Click to copy ID">
                                ${supplier.supplier_id || 'ID Pending'}
                                <i class="fas fa-copy text-[8px] opacity-50"></i>
                            </span>
                            <span class="text-slate-300 font-normal">•</span>
                            <span>${supplier.supplier_type || 'Vendor'}</span>
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
            window.location.href = `/supplier/details?id=${supplier._id}`;
        });

        // Prevent navigation when copying ID
        card.querySelector('.cust-id-label')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (supplier.supplier_id) {
                await (window as any).copyToClipboard(supplier.supplier_id);
                (window as any).showToast('Supplier ID copied');
                
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

