// @ts-nocheck
(function () {
    class PurchaseOrderTable {
        constructor() {
            this.container = document.querySelector('.records');
        }

        renderPurchaseOrders(purchaseOrders: any[]) {
            if (!this.container) return;

            this.container.innerHTML = '';
            
            const isTrash = !!(window as any).showDeletedItems;
            const isArchivedView = !isTrash && (window as any).statusFilter === 'archived';

            if (!purchaseOrders || purchaseOrders.length === 0) {
                if (isTrash) {
                    this.container.innerHTML = `
                        <div class="col-span-full flex flex-col items-center justify-center py-12 fade-in select-none" style="min-height: calc(100vh - 11rem);">
                            <div class="text-rose-500 text-5xl mb-4 animate-bounce">
                                <i class="fas fa-trash-alt"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">Trash is Empty</h2>
                            <p class="text-gray-600 font-medium text-sm">Deleted purchase orders will appear here.</p>
                        </div>
                    `;
                } else if (isArchivedView) {
                    this.container.innerHTML = `
                        <div class="col-span-full flex flex-col items-center justify-center py-12 fade-in select-none" style="min-height: calc(100vh - 11rem);">
                            <div class="text-amber-500 text-5xl mb-4 animate-bounce">
                                <i class="fas fa-archive"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">No Archived Purchase Orders</h2>
                            <p class="text-gray-600 font-medium text-sm">Purchase orders you archive will show up here.</p>
                        </div>
                    `;
                } else {
                    this.container.innerHTML = `
                        <div class="col-span-full flex flex-col items-center justify-center py-12 fade-in" style="min-height: calc(100vh - 11rem);">
                            <div class="text-purple-500 text-5xl mb-4">
                                <i class="fas fa-shopping-cart"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">No Purchase Orders Found</h2>
                            <p class="text-gray-600">Start creating purchase orders for your suppliers</p>
                        </div>
                    `;
                }
                return;
            }

            purchaseOrders.forEach(po => {
                const card = this.createPurchaseOrderCard(po);
                this.container.appendChild(card);
            });
        }

        createPurchaseOrderCard(purchaseOrder: any): HTMLElement {
            const div = document.createElement('div');
            
            const isTrash = !!(window as any).showDeletedItems;
            const isArchived = !isTrash && purchaseOrder.is_archived;

            if (isTrash) {
                div.className = "bg-rose-50/10 p-6 rounded-lg shadow-sm border border-rose-200 hover:shadow-md transition-shadow relative doc-card cursor-default";
            } else if (isArchived) {
                div.className = "bg-slate-50/90 p-6 rounded-lg shadow-sm border border-slate-300 hover:shadow-md transition-shadow relative doc-card cursor-default opacity-85 hover:opacity-100";
            } else {
                div.className = "bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative doc-card cursor-pointer";
            }
            
            // Format ID for display
            const poId = purchaseOrder.purchase_order_no;
            
            const dateStr = (window as any).formatDateDisplay ? 
                (window as any).formatDateDisplay(purchaseOrder.purchase_date) : 
                new Date(purchaseOrder.purchase_date).toLocaleDateString();
                
            const totalAmount = (window as any).formatIndian ? 
                (window as any).formatIndian(purchaseOrder.totals?.grand_total, 2) : 
                purchaseOrder.totals?.grand_total?.toFixed(2) || '0.00';
                
            const supplierName = purchaseOrder.supplier_snapshot?.name || 'N/A';
            const supplierAddress = purchaseOrder.supplier_snapshot?.address?.line1 || 'N/A';
            
            div.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="font-bold text-lg text-gray-800 line-clamp-1" title="${supplierName}">
                                ${supplierName}
                            </h3>
                            ${isArchived ? `
                            <span class="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                ARCHIVED
                            </span>
                            ` : ''}
                        </div>
                        <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
                            <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-medium cursor-pointer hover:bg-blue-100 copy-id" title="Click to copy ID" data-id="${poId}">
                                ${poId}
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
                
                ${isTrash || isArchived ? `
                <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 mt-2">
                    <button class="restore-card-btn px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg flex items-center gap-1.5 transition-all text-xs font-semibold tracking-wider hover:border-emerald-300 active:scale-95 cursor-pointer" title="Restore">
                        <i class="fas ${isTrash ? 'fa-trash-restore' : 'fa-box-open'}"></i> Restore
                    </button>
                    ${isTrash ? `
                    <button class="hard-delete-card-btn px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg flex items-center gap-1.5 transition-all text-xs font-semibold tracking-wider hover:border-rose-300 active:scale-95 cursor-pointer" title="Delete Forever">
                        <i class="fas fa-trash-alt"></i> Delete Forever
                    </button>
                    ` : ''}
                </div>
                ` : ''}
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

            // Restore Button
            const restoreBtn = div.querySelector('.restore-card-btn');
            if (restoreBtn) {
                restoreBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (isTrash && (window as any).handlePurchaseOrderRestoreFromTrash) {
                        (window as any).handlePurchaseOrderRestoreFromTrash(poId);
                    } else if (isArchived && (window as any).handlePurchaseOrderRestoreFromArchive) {
                        (window as any).handlePurchaseOrderRestoreFromArchive(poId);
                    }
                });
            }

            // Hard Delete Button
            const hardDeleteBtn = div.querySelector('.hard-delete-card-btn');
            if (hardDeleteBtn) {
                hardDeleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if ((window as any).handlePurchaseOrderHardDelete) {
                        (window as any).handlePurchaseOrderHardDelete(poId);
                    }
                });
            }

            if (!isTrash && !isArchived) {
                // Click anywhere on an active card to view purchase order details.
                div.addEventListener('click', () => {
                    if ((window as any).viewPurchaseOrder) {
                        (window as any).viewPurchaseOrder(purchaseOrder.purchase_order_no);
                    }
                });
            }

            return div;
        }

        handleDelete(id: string) {
            if ((window as any).deleteDocument) {
                (window as any).deleteDocument('purchaseOrder', id, 'Purchase Order', async () => {
                    // Refresh logic will be called by deleteDocument callback
                    if ((window as any).purchaseOrderApi) {
                        try {
                            const status = (window as any).statusFilter || '';
                            const deleted = !!(window as any).showDeletedItems;
                            const data = await (window as any).purchaseOrderApi.fetchRecentPurchaseOrders(status, deleted);
                            if ((window as any).allPurchaseOrders) {
                                (window as any).allPurchaseOrders = data.purchaseOrders;
                            }
                            if ((window as any).applyPurchaseOrderFilters) {
                                (window as any).applyPurchaseOrderFilters();
                            } else {
                                this.renderPurchaseOrders(data.purchaseOrders);
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

    (window as any).purchaseOrderTable = new PurchaseOrderTable();
})();
