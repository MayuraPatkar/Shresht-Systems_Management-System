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
        card.className = 'supplier-card bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between';
        
        const statusClass = supplier.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
        const statusText = supplier.is_active ? 'Active' : 'Inactive';

        const supplierName = supplier.supplier_name || '-';

        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-4">
                    <div class="p-3 bg-blue-50 rounded-lg">
                        <i class="fas fa-user text-blue-600 text-xl"></i>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${statusClass}">${statusText}</span>
                </div>
                <p class="cust-id-label text-[10px] font-black text-blue-600 mb-1 uppercase tracking-wider cursor-pointer hover:underline" title="Click to copy ID">${supplier.supplier_id || 'ID Pending'}</p>
                <h3 class="text-xl font-bold text-gray-800 mb-1">${supplierName}</h3>
                <p class="text-sm text-gray-500 mb-4 font-medium">${supplier.supplier_type || 'Vendor'}</p>
                
                <div class="space-y-2 mb-6">
                    <div class="flex items-center gap-3 text-gray-600">
                        <i class="fas fa-phone w-5 text-center text-sm"></i>
                        <span class="text-sm">${supplier.phone || '-'}</span>
                    </div>
                    <div class="flex items-center gap-3 text-gray-600">
                        <i class="fas fa-envelope w-5 text-center text-sm"></i>
                        <span class="text-sm truncate">${supplier.email || '-'}</span>
                    </div>
                    <div class="flex items-center gap-3 text-gray-600">
                        <i class="fas fa-map-marker-alt w-5 text-center text-sm"></i>
                        <span class="text-sm truncate">${supplier.billing_address?.city || '-'}${supplier.billing_address?.state ? ', ' + supplier.billing_address.state : ''}</span>
                    </div>
                </div>
            </div>
            
            <div class="flex items-center gap-2 pt-4 border-t border-gray-100">
                <button class="view-btn flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg font-semibold hover:bg-blue-100 transition-colors">
                    View Profile
                </button>
                <button class="edit-btn p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        card.querySelector('.view-btn')?.addEventListener('click', () => {
            window.location.href = `/supplier/details?id=${supplier._id}`;
        });

        card.querySelector('.cust-id-label')?.addEventListener('click', () => {
            if (supplier.supplier_id) {
                (window as any).copyToClipboard(supplier.supplier_id);
                (window as any).showToast('Supplier ID copied');
            }
        });

        card.querySelector('.edit-btn')?.addEventListener('click', () => {
            if ((window as any).supplierForms) {
                (window as any).supplierForms.openEditModal(supplier);
            }
        });

        card.querySelector('.delete-btn')?.addEventListener('click', () => {
            if ((window as any).handleDelete) {
                (window as any).handleDelete(supplier._id, supplierName);
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

