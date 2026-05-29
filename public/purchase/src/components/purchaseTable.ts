// @ts-nocheck
(function () {
    class PurchaseTable {
        constructor() {
            this.container = document.querySelector('.records');
        }

        renderPurchases(purchases: any[]) {
            if (!this.container) return;

            this.container.innerHTML = '';
            
            const isTrash = !!(window as any).showDeletedItems;
            const isArchivedView = !isTrash && (window as any).statusFilter === 'archived';

            if (!purchases || purchases.length === 0) {
                if (isTrash) {
                    this.container.innerHTML = `
                        <div class="col-span-full flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                            <div class="text-rose-500 text-5xl mb-4">
                                <i class="fas fa-trash-alt"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">Trash is Empty</h2>
                            <p class="text-gray-600">No soft-deleted purchases found</p>
                        </div>
                    `;
                } else if (isArchivedView) {
                    this.container.innerHTML = `
                        <div class="col-span-full flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                            <div class="text-amber-500 text-5xl mb-4">
                                <i class="fas fa-archive"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">No Archived Purchases</h2>
                            <p class="text-gray-600">Purchases you archive will show up here</p>
                        </div>
                    `;
                } else {
                    this.container.innerHTML = `
                        <div class="col-span-full flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                            <div class="text-blue-500 text-5xl mb-4">
                                <i class="fas fa-shopping-bag"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">No Purchases Found</h2>
                            <p class="text-gray-600">Start creating purchases for your suppliers</p>
                        </div>
                    `;
                }
                return;
            }

            purchases.forEach(p => {
                const card = this.createPurchaseCard(p);
                this.container.appendChild(card);
            });
        }

        createPurchaseCard(purchase: any): HTMLElement {
            const div = document.createElement('div');
            
            const isTrash = !!(window as any).showDeletedItems;
            const isArchived = !isTrash && purchase.is_archived;

            if (isTrash) {
                div.className = "bg-rose-50/10 p-5 rounded-xl border border-rose-200 hover:shadow-md hover:border-rose-300 transition-all duration-200 relative doc-card cursor-default";
            } else if (isArchived) {
                div.className = "bg-slate-50/90 p-5 rounded-xl border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200 relative doc-card opacity-80 hover:opacity-100 cursor-default";
            } else {
                div.className = "bg-white p-5 rounded-xl border border-gray-100 transition-all duration-200 hover:shadow-md hover:border-gray-200 relative doc-card cursor-pointer";
            }
            
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
            
            const paymentStatus = purchase.payment_status || 'Unpaid';
            let statusClass = 'text-red-700 bg-red-50';
            if (paymentStatus === 'Paid') {
                statusClass = 'text-green-700 bg-green-50';
            } else if (paymentStatus === 'Partial') {
                statusClass = 'text-yellow-700 bg-yellow-50';
            }

            div.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex-1 pr-4">
                        <div class="flex items-center gap-2">
                            <h3 class="font-bold text-lg text-gray-800 line-clamp-1" title="${supplierName}">
                                ${supplierName}
                            </h3>
                            <span class="px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase ${statusClass}">
                                ${paymentStatus}
                            </span>
                        </div>
                        <div class="flex items-center gap-4 text-xs text-gray-500 mt-2">
                            <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-medium cursor-pointer hover:bg-blue-100 transition-colors copy-id flex items-center gap-1" title="Click to copy ID" data-id="${purchaseId}">
                                ${purchaseId}
                                <i class="far fa-copy opacity-70"></i>
                            </span>
                            <span class="flex items-center gap-1 whitespace-nowrap">
                                <i class="far fa-calendar-alt"></i> ${dateStr}
                            </span>
                            <span class="flex items-center gap-1 truncate max-w-sm" title="${supplierAddress}">
                                <i class="fas fa-map-marker-alt"></i> ${supplierAddress}
                            </span>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        ${isTrash || isArchived ? `
                            <button class="restore-card-btn px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg flex items-center gap-1.5 transition-all text-xs font-semibold tracking-wider hover:border-emerald-300 active:scale-95 cursor-pointer" title="Restore">
                                <i class="fas ${isTrash ? 'fa-trash-restore' : 'fa-box-open'}"></i> Restore
                            </button>
                            <button class="hard-delete-card-btn px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg flex items-center gap-1.5 transition-all text-xs font-semibold tracking-wider hover:border-rose-300 active:scale-95 cursor-pointer" title="Delete Forever">
                                <i class="fas fa-trash-alt"></i> Delete Forever
                            </button>
                        ` : ''}
                        <div class="text-right ml-4 min-w-[100px]">
                            <p class="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Total Amount</p>
                            <p class="text-lg font-bold text-gray-900 mt-0.5">₹ ${totalAmount}</p>
                        </div>
                    </div>
                </div>
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

            const restoreBtn = div.querySelector('.restore-card-btn');
            restoreBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isTrash) {
                    (window as any).handlePurchaseRestoreFromTrash(purchaseId);
                } else {
                    (window as any).handlePurchaseRestoreFromArchive(purchaseId);
                }
            });

            const hardDeleteBtn = div.querySelector('.hard-delete-card-btn');
            hardDeleteBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                (window as any).handlePurchaseHardDelete(purchaseId);
            });

            if (!isTrash && !isArchived) {
                // Click anywhere on an active card to view purchase details.
                div.addEventListener('click', () => {
                    if ((window as any).viewPurchase) {
                        (window as any).viewPurchase(purchase.purchase_no);
                    }
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
