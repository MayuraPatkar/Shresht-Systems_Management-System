// @ts-nocheck
(function () {
    class PurchaseTable {
        tbody: HTMLElement | null;
        mobileContainer: HTMLElement | null;
        container: HTMLElement | null;
        private paginationManager: any = null;

        constructor() {
            this.tbody = document.getElementById('purchase-tbody');
            this.mobileContainer = document.getElementById('purchase-cards-mobile');
            // Keep container for backward compatibility
            this.container = this.tbody;
        }

        updateTableHeader(isTrash: boolean) {
            const headerRow = document.getElementById('table-header-row');
            if (!headerRow) return;

            if (isTrash) {
                headerRow.innerHTML = `
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Purchase Invoice No</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Supplier Name</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Deleted Date</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold tracking-wider">Total</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold tracking-wider">Actions</th>
                `;
            } else {
                const sortBy = (window as any).currentFilters?.sortBy || 'date-desc';
                
                const dateIcon = sortBy === 'date-desc' ? '<i class="fas fa-chevron-down ml-1.5 text-blue-600"></i>' :
                                 sortBy === 'date-asc' ? '<i class="fas fa-chevron-up ml-1.5 text-blue-600"></i>' :
                                 '<i class="fas fa-sort ml-1.5 opacity-30 group-hover:opacity-60 transition-opacity"></i>';

                headerRow.innerHTML = `
                    <th id="th-date" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-100 hover:text-blue-600 select-none transition-all duration-150 group">
                        <span class="flex items-center">Date ${dateIcon}</span>
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Purchase Invoice No</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Supplier Name</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Payment Status</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold tracking-wider">Total</th>
                `;

                // Attach event listener
                const thDate = document.getElementById('th-date');
                if (thDate) {
                    thDate.onclick = () => {
                        const nextSort = sortBy === 'date-desc' ? 'date-asc' : 'date-desc';
                        if ((window as any).currentFilters) {
                            (window as any).currentFilters.sortBy = nextSort;
                        }
                        const sortFilter = document.getElementById('sort-filter') as HTMLSelectElement | null;
                        if (sortFilter) {
                            sortFilter.value = nextSort;
                        }
                        if (typeof (window as any).applyPurchaseFilters === 'function') {
                            (window as any).applyPurchaseFilters();
                        }
                    };
                }
            }
        }

        renderPurchases(purchases: any[]) {
            if (!this.paginationManager) {
                this.paginationManager = new (window as any).TablePaginationManager(
                    'purchase-tbody',
                    (paginatedData: any[]) => this.renderPage(paginatedData),
                    25
                );
            }
            this.paginationManager.setData(purchases);
        }

        renderPage(purchases: any[]) {
            const isTrash = !!(window as any).showDeletedItems;
            const isArchivedView = !isTrash && (window as any).statusFilter === 'archived';

            if (!this.tbody) {
                this.tbody = document.getElementById('purchase-tbody');
                this.container = this.tbody;
            }
            if (!this.mobileContainer) {
                this.mobileContainer = document.getElementById('purchase-cards-mobile');
            }

            if (this.tbody) this.tbody.innerHTML = '';
            if (this.mobileContainer) this.mobileContainer.innerHTML = '';

            this.updateTableHeader(isTrash);

            if (!purchases || purchases.length === 0) {
                let emptyHtml = '';
                if (isTrash) {
                    emptyHtml = `
                        <div class="inline-flex flex-col items-center justify-center text-center py-4 fade-in select-none" style="min-height: 300px;">
                            <div class="text-rose-500 text-5xl mb-4">
                                <i class="fas fa-trash-alt"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">Trash is Empty</h2>
                            <p class="text-gray-500 text-xs">Deleted purchases will appear here.</p>
                        </div>
                    `;
                } else if (isArchivedView) {
                    emptyHtml = `
                        <div class="inline-flex flex-col items-center justify-center text-center py-4 fade-in select-none" style="min-height: 300px;">
                            <div class="text-amber-500 text-5xl mb-4">
                                <i class="fas fa-archive"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">No Archived Purchases</h2>
                            <p class="text-gray-500 text-xs">Purchases you archive will show up here.</p>
                        </div>
                    `;
                } else {
                    const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
                    const hasSearch = searchInput && searchInput.value.trim() !== '';
                    if (hasSearch) {
                        emptyHtml = `
                            <div class="inline-flex flex-col items-center justify-center text-center py-4 fade-in select-none" style="min-height: 300px;">
                                <div class="text-yellow-500 text-5xl mb-4">
                                    <i class="fas fa-search"></i>
                                </div>
                                <h2 class="text-2xl font-bold text-gray-800 mb-2">No Results Found</h2>
                                <p class="text-gray-500 text-xs">No purchases match your search</p>
                            </div>
                        `;
                    } else {
                        emptyHtml = `
                            <div class="inline-flex flex-col items-center justify-center text-center py-4 fade-in select-none" style="min-height: 300px;">
                                <div class="text-blue-500 text-5xl mb-4">
                                    <i class="fas fa-shopping-bag"></i>
                                </div>
                                <h2 class="text-2xl font-bold text-gray-800 mb-2">No Purchases Found</h2>
                                <p class="text-gray-500 text-xs">Start creating purchases for your suppliers</p>
                            </div>
                        `;
                    }
                }
 
                if (this.tbody) {
                    this.tbody.innerHTML = `
                        <tr>
                            <td colspan="100" class="px-4 py-12 bg-white text-slate-400 text-center">
                                ${emptyHtml}
                            </td>
                        </tr>
                    `;
                }

                if (this.mobileContainer) {
                    this.mobileContainer.innerHTML = `
                        <div class="text-center py-10 bg-white rounded-xl border border-slate-200 p-6">
                            <i class="fas fa-shopping-bag text-3xl text-blue-500 mb-2"></i>
                            <p class="text-sm font-bold text-slate-700">No Purchases Found</p>
                        </div>
                    `;
                }
                return;
            }

            purchases.forEach(p => {
                const row = this.createPurchaseRow(p, isTrash);
                if (this.tbody) this.tbody.appendChild(row);

                const mobileCard = this.createPurchaseMobileCard(p, isTrash);
                if (this.mobileContainer) this.mobileContainer.appendChild(mobileCard);
            });
        }

        createPurchaseRow(purchase: any, isTrash: boolean): HTMLElement {
            const tr = document.createElement('tr');
            const isArchived = !isTrash && purchase.is_archived;

            tr.className = "border-b border-slate-100 hover:bg-slate-50/80 transition-colors duration-150 cursor-pointer group text-xs text-gray-700";
            if (isArchived) {
                tr.className += " bg-slate-50/65 opacity-85 hover:opacity-100";
            } else if (isTrash) {
                tr.className += " bg-rose-50/10 cursor-default";
            }
            
            const purchaseId = purchase.purchase_no;
            const invoiceId = purchase.purchase_invoice_no || purchase.purchase_no || '-';
            
            const dateStr = (window as any).formatDateDisplay ? 
                (window as any).formatDateDisplay(purchase.purchase_date) : 
                new Date(purchase.purchase_date).toLocaleDateString();

            const deletedDateStr = isTrash && purchase.deletion?.deleted_at ? (
                (window as any).formatDateDisplay ? 
                (window as any).formatDateDisplay(purchase.deletion.deleted_at) : 
                new Date(purchase.deletion.deleted_at).toLocaleDateString()
            ) : '';
                
            const totalAmount = (window as any).formatIndian ? 
                (window as any).formatIndian(purchase.totals?.grand_total, 2) : 
                purchase.totals?.grand_total?.toFixed(2) || '0.00';
                
            const supplierName = purchase.supplier_snapshot?.name || 'N/A';
            
            const paymentStatus = purchase.payment_status || 'Unpaid';
            let statusClass = 'text-red-700 bg-red-50 border border-red-200';
            if (paymentStatus === 'Paid') {
                statusClass = 'text-green-700 bg-green-50 border border-green-200';
            } else if (paymentStatus === 'Partial') {
                statusClass = 'text-yellow-700 bg-yellow-50 border border-yellow-200';
            }
            
            const invoiceIdBadge = invoiceId !== '-' ? `
                <span class="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono font-bold copy-invoice-id transition-colors cursor-pointer" data-invoice-id="${invoiceId}">
                    ${invoiceId}
                    <i class="far fa-copy text-[10px] opacity-70"></i>
                </span>
            ` : `<span class="text-slate-400 font-mono font-bold">-</span>`;
            
            if (isTrash) {
                tr.innerHTML = `
                    <td class="px-4 py-3.5 whitespace-nowrap font-medium text-gray-600">${dateStr}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap">${invoiceIdBadge}</td>
                    <td class="px-4 py-3.5 font-semibold text-gray-800">${supplierName}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap text-rose-600 font-medium">${deletedDateStr}</td>
                    <td class="px-4 py-3.5 text-right font-bold text-gray-900 whitespace-nowrap">₹ ${totalAmount}</td>
                    <td class="px-4 py-3.5 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5" onclick="event.stopPropagation()">
                            <button class="restore-card-btn p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-md transition-all cursor-pointer" title="Restore">
                                <i class="fas fa-trash-restore text-xs"></i>
                            </button>
                            <button class="hard-delete-card-btn p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-md transition-all cursor-pointer" title="Delete Forever">
                                <i class="fas fa-trash-alt text-xs"></i>
                            </button>
                        </div>
                    </td>
                `;
            } else {
                tr.innerHTML = `
                    <td class="px-4 py-3.5 whitespace-nowrap font-medium text-gray-600">${dateStr}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap">${invoiceIdBadge}</td>
                    <td class="px-4 py-3.5 font-semibold text-gray-800">
                        <div class="flex items-center gap-2">
                            <span>${supplierName}</span>
                            ${isArchived ? `
                            <span class="px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded text-[9px] font-bold border border-slate-200 uppercase whitespace-nowrap">
                                Archived
                            </span>
                            ` : ''}
                        </div>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap">
                        <span class="px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase ${statusClass}">
                            ${paymentStatus}
                        </span>
                    </td>
                    <td class="px-4 py-3.5 text-right font-bold text-gray-900 whitespace-nowrap">₹ ${totalAmount}</td>
                `;
            }

            // Click row to view
            if (!isTrash) {
                tr.addEventListener('click', () => {
                    window.location.href = `/purchase/details?id=${purchaseId}`;
                });
            }

            // Copy Invoice ID
            const copyInvoiceBtn = tr.querySelector('.copy-invoice-id');
            copyInvoiceBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                if ((window as any).copyToClipboard && invoiceId !== '-') {
                    (window as any).copyToClipboard(invoiceId);
                    const icon = copyInvoiceBtn.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-check text-green-600';
                        setTimeout(() => { icon.className = 'far fa-copy opacity-70'; }, 2000);
                    }
                }
            });

            // Action buttons
            const restoreBtn = tr.querySelector('.restore-card-btn');
            restoreBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                if ((window as any).handlePurchaseRestoreFromTrash) {
                    (window as any).handlePurchaseRestoreFromTrash(purchaseId);
                }
            });

            const hardDeleteBtn = tr.querySelector('.hard-delete-card-btn');
            hardDeleteBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                if ((window as any).handlePurchaseHardDelete) {
                    (window as any).handlePurchaseHardDelete(purchaseId);
                }
            });

            return tr;
        }

        createPurchaseMobileCard(purchase: any, isTrash: boolean): HTMLElement {
            const div = document.createElement('div');
            const isArchived = !isTrash && purchase.is_archived;

            if (isTrash) {
                div.className = "bg-rose-50/10 p-4 rounded-xl border border-rose-100 hover:border-rose-200 hover:shadow-sm transition-all duration-200 relative cursor-default";
            } else if (isArchived) {
                div.className = "bg-slate-50/90 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 relative opacity-85 hover:opacity-100 cursor-default";
            } else {
                div.className = "bg-white p-4 rounded-xl border border-gray-100 hover:border-blue-100 hover:shadow-sm transition-all duration-200 relative cursor-pointer group";
            }
            
            const purchaseId = purchase.purchase_no;
            const invoiceId = purchase.purchase_invoice_no || purchase.purchase_no || '-';
            
            const dateStr = (window as any).formatDateDisplay ? 
                (window as any).formatDateDisplay(purchase.purchase_date) : 
                new Date(purchase.purchase_date).toLocaleDateString();
                
            const totalAmount = (window as any).formatIndian ? 
                (window as any).formatIndian(purchase.totals?.grand_total, 2) : 
                purchase.totals?.grand_total?.toFixed(2) || '0.00';
                
            const supplierName = purchase.supplier_snapshot?.name || 'N/A';
            const paymentStatus = purchase.payment_status || 'Unpaid';
            let statusClass = 'text-red-700 bg-red-50 border border-red-200';
            if (paymentStatus === 'Paid') {
                statusClass = 'text-green-700 bg-green-50 border border-green-200';
            } else if (paymentStatus === 'Partial') {
                statusClass = 'text-yellow-700 bg-yellow-50 border border-yellow-200';
            }

            const mobileInvoiceIdBadge = invoiceId !== '-' ? `
                <span class="font-mono bg-blue-50 text-blue-700 px-1 py-0.5 rounded copy-invoice-id cursor-pointer">${invoiceId}</span>
            ` : `<span class="font-mono text-slate-400 font-bold">-</span>`;

            div.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0 pr-3">
                        <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                            <h4 class="text-sm font-semibold text-gray-800 truncate">${supplierName}</h4>
                            <span class="px-1.5 py-0.2 rounded text-[8px] font-medium tracking-wide uppercase ${statusClass}">
                                ${paymentStatus}
                            </span>
                            ${isArchived ? `<span class="px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded text-[8px] font-bold border border-slate-200 uppercase">Archived</span>` : ''}
                        </div>
                        <div class="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
                            ${mobileInvoiceIdBadge}
                            <span>${dateStr}</span>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <p class="text-[9px] font-semibold text-gray-400 uppercase">Total</p>
                        <p class="text-sm font-bold text-gray-900">₹ ${totalAmount}</p>
                    </div>
                </div>
                ${isTrash ? `
                <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-50 mt-3" onclick="event.stopPropagation()">
                    <button class="restore-card-btn px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg flex items-center gap-1 text-[10px] font-semibold transition-all cursor-pointer">
                        <i class="fas fa-trash-restore"></i> Restore
                    </button>
                    <button class="hard-delete-card-btn px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg flex items-center gap-1 text-[10px] font-semibold transition-all cursor-pointer">
                        <i class="fas fa-trash-alt"></i> Delete Forever
                    </button>
                </div>
                ` : ''}
            `;

            if (!isTrash) {
                div.addEventListener('click', () => {
                    window.location.href = `/purchase/details?id=${purchaseId}`;
                });
            }

            const copyInvoiceBtnMobile = div.querySelector('.copy-invoice-id');
            copyInvoiceBtnMobile?.addEventListener('click', (e) => {
                e.stopPropagation();
                if ((window as any).copyToClipboard && invoiceId !== '-') {
                    (window as any).copyToClipboard(invoiceId);
                    const originalText = copyInvoiceBtnMobile.textContent;
                    copyInvoiceBtnMobile.textContent = 'Copied!';
                    setTimeout(() => { copyInvoiceBtnMobile.textContent = originalText; }, 2000);
                }
            });

            div.querySelector('.restore-card-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                if ((window as any).handlePurchaseRestoreFromTrash) {
                    (window as any).handlePurchaseRestoreFromTrash(purchaseId);
                }
            });

            div.querySelector('.hard-delete-card-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                if ((window as any).handlePurchaseHardDelete) {
                    (window as any).handlePurchaseHardDelete(purchaseId);
                }
            });

            return div;
        }

        handleDelete(id: string) {
            if ((window as any).deleteDocument) {
                (window as any).deleteDocument('purchase', id, 'Purchase', async () => {
                    if ((window as any).purchaseApi) {
                        try {
                            const status = (window as any).statusFilter || '';
                            const deleted = !!(window as any).showDeletedItems;
                            const data = await (window as any).purchaseApi.fetchRecentPurchases(status, deleted);
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
