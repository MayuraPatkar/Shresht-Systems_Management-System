// @ts-nocheck
(function () {
    class PurchaseTable {
        constructor() {
            this.container = document.querySelector('.records');
        }

        renderPurchases(purchases: any[]) {
            if (!this.container) return;

            this.container.innerHTML = '';
            
            if (!purchases || purchases.length === 0) {
                this.container.innerHTML = `
                    <div class="col-span-full flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                        <div class="text-blue-500 text-5xl mb-4">
                            <i class="fas fa-shopping-bag"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">No Purchases Found</h2>
                        <p class="text-gray-600">Start creating purchases for your suppliers</p>
                    </div>
                `;
                return;
            }

            purchases.forEach(p => {
                const card = this.createPurchaseCard(p);
                this.container.appendChild(card);
            });
        }

        createPurchaseCard(purchase: any): HTMLElement {
            const div = document.createElement('div');
            div.className = "bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative doc-card";
            
            // Format ID for display
            const purchaseId = purchase.purchase_no;
            
            const dateStr = (window as any).formatDateDisplay ? 
                (window as any).formatDateDisplay(purchase.purchase_date) : 
                new Date(purchase.purchase_date).toLocaleDateString();
                
            const totalAmount = (window as any).formatIndian ? 
                (window as any).formatIndian(purchase.totals?.grand_total, 2) : 
                purchase.totals?.grand_total?.toFixed(2) || '0.00';
                
            const supplierName = purchase.supplier_snapshot?.name || 'N/A';
            const supplierAddress = purchase.supplier_snapshot?.address?.line1 || 'N/A';
            
            div.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="font-bold text-lg text-gray-800 line-clamp-1" title="${supplierName}">
                                ${supplierName}
                            </h3>
                        </div>
                        <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
                            <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-medium cursor-pointer hover:bg-blue-100 copy-id" title="Click to copy ID" data-id="${purchaseId}">
                                ${purchaseId}
                                <i class="far fa-copy ml-1 text-xs opacity-70"></i>
                            </span>
                            <span class="flex items-center gap-1">
                                <i class="far fa-calendar-alt"></i> ${dateStr}
                            </span>
                        </div>
                        <p class="text-gray-600 text-sm line-clamp-2 min-h-[40px]" title="${supplierAddress}">
                            <i class="fas fa-map-marker-alt text-gray-400 mr-1"></i> ${supplierAddress}
                        </p>
                    </div>
                    <div class="text-right ml-4 bg-gray-50 p-3 rounded-lg border border-gray-100 min-w-[120px]">
                        <p class="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total Amount</p>
                        <p class="font-bold text-lg text-gray-900">₹ ${totalAmount}</p>
                    </div>
                </div>
                
                <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 mt-2">
                    <button class="view-btn text-purple-600 hover:bg-purple-50 p-2 flex items-center justify-center rounded-lg transition-colors border border-transparent hover:border-purple-200" title="View Purchase Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="edit-btn text-blue-600 hover:bg-blue-50 p-2 flex items-center justify-center rounded-lg transition-colors border border-transparent hover:border-blue-200" title="Edit Purchase">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn text-red-600 hover:bg-red-50 p-2 flex items-center justify-center rounded-lg transition-colors border border-transparent hover:border-red-200" title="Delete Purchase">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;

            // ID Copy Functionality
            const copyIdBtn = div.querySelector('.copy-id');
            if (copyIdBtn) {
                copyIdBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idToCopy = (e.currentTarget as HTMLElement).getAttribute('data-id');
                    if (idToCopy && (window as any).copyToClipboard) {
                        (window as any).copyToClipboard(idToCopy);
                        
                        // Visual feedback
                        const icon = copyIdBtn.querySelector('i');
                        if (icon) {
                            icon.className = 'fas fa-check text-green-600 ml-1 text-xs';
                            setTimeout(() => {
                                icon.className = 'far fa-copy ml-1 text-xs opacity-70';
                            }, 2000);
                        }
                    }
                });
            }

            // View Button
            const viewBtn = div.querySelector('.view-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if ((window as any).viewPurchase) {
                        (window as any).viewPurchase(purchase.purchase_no);
                    }
                });
            }

            // Edit Button
            const editBtn = div.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    sessionStorage.setItem('currentTab-status', 'update');
                    if ((window as any).openPurchase) {
                        (window as any).openPurchase(purchase.purchase_no);
                    }
                });
            }

            // Delete Button
            const deleteBtn = div.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handleDelete(purchase.purchase_no);
                });
            }

            return div;
        }

        handleDelete(id: string) {
            if ((window as any).deleteDocument) {
                (window as any).deleteDocument('purchase', id, 'Purchase', async () => {
                    // Refresh logic will be called by deleteDocument callback
                    if ((window as any).purchaseApi) {
                        try {
                            const data = await (window as any).purchaseApi.fetchRecentPurchases();
                            if ((window as any).allPurchases) {
                                (window as any).allPurchases = data.purchases;
                            }
                            if ((window as any).applyPurchaseFilters) {
                                (window as any).applyPurchaseFilters();
                            } else {
                                this.renderPurchases(data.purchases);
                            }
                        } catch (err) {
                            console.error("Error refreshing after delete", err);
                        }
                    }
                });
            } else {
                console.error("deleteDocument utility not available");
            }
        }
    }

    (window as any).purchaseTable = new PurchaseTable();
})();
