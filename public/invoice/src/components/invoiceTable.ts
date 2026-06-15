(function () {
    const formatIndian = (...args: any[]) => (window as any).formatIndian(...args);
    const showToast = (...args: any[]) => (window as any).showToast(...args);
    const viewInvoice = (...args: any[]) => (window as any).viewInvoice(...args);
    const openInvoice = (...args: any[]) => (window as any).openInvoice(...args);
    const payment = (...args: any[]) => (window as any).payment(...args);
    const deleteInvoice = (...args: any[]) => (window as any).deleteInvoice(...args);
    const deleteDocument = (...args: any[]) => (window as any).deleteDocument(...args);

    interface BoxStyle {
        background: string;
        border: string;
        text: string;
    }

    const BOX_STYLES: Record<InvoiceStatus, BoxStyle> = {
        [InvoiceStatus.DRAFT]: { background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)', border: '1px solid #e5e7eb', text: '#4b5563' },
        [InvoiceStatus.SENT]: { background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe', text: '#2563eb' },
        [InvoiceStatus.OVERDUE]: { background: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)', border: '1px solid #fecaca', text: '#dc2626' },
        [InvoiceStatus.PARTIALLY_PAID]: { background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '1px solid #fcd34d', text: '#d97706' },
        [InvoiceStatus.PAID]: { background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '1px solid #a7f3d0', text: '#059669' },
        [InvoiceStatus.CANCELLED]: { background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)', border: '1px solid #e5e7eb', text: '#4b5563' },
        [InvoiceStatus.REFUNDED]: { background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', border: '1px solid #e9d5ff', text: '#7c3aed' }
    };

    class InvoiceTable {
        private paginationManager: any = null;
        constructor() {}

        updateTableHeader(isTrash: boolean) {
            const headerRow = document.getElementById('table-header-row');
            if (!headerRow) return;

            if (isTrash) {
                headerRow.innerHTML = `
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">ID</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Project</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Customer</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Deleted Date</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold tracking-wider">Total</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold tracking-wider">Actions</th>
                `;
            } else {
                const sortBy = (window as any).currentFilters?.sortBy || 'date-desc';
                
                const dateIcon = sortBy === 'date-desc' ? '<i class="fas fa-chevron-down ml-1.5 text-blue-600"></i>' :
                                 sortBy === 'date-asc' ? '<i class="fas fa-chevron-up ml-1.5 text-blue-600"></i>' :
                                 '<i class="fas fa-sort ml-1.5 opacity-30 group-hover:opacity-60 transition-opacity"></i>';
                
                const nameIcon = sortBy === 'name-asc' ? '<i class="fas fa-sort-alpha-down ml-1.5 text-blue-600"></i>' :
                                 '<i class="fas fa-sort ml-1.5 opacity-30 group-hover:opacity-60 transition-opacity"></i>';
                
                const amountIcon = sortBy === 'amount-desc' ? '<i class="fas fa-chevron-down mr-1.5 text-blue-600"></i>' :
                                   sortBy === 'amount-asc' ? '<i class="fas fa-chevron-up mr-1.5 text-blue-600"></i>' :
                                   '<i class="fas fa-sort mr-1.5 opacity-30 group-hover:opacity-60 transition-opacity"></i>';

                headerRow.innerHTML = `
                    <th id="th-date" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-100 hover:text-blue-600 select-none transition-all duration-150 group">
                        <span class="flex items-center">Date ${dateIcon}</span>
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Invoice ID</th>
                    <th id="th-name" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-100 hover:text-blue-600 select-none transition-all duration-150 group">
                        <span class="flex items-center">Project Name ${nameIcon}</span>
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Customer</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                    <th id="th-total" class="px-4 py-3 text-right text-xs font-semibold tracking-wider cursor-pointer hover:bg-slate-100 hover:text-blue-600 select-none transition-all duration-150 group">
                        <span class="flex items-center justify-end">${amountIcon} Total</span>
                    </th>
                `;
                
                // Attach event listeners
                document.getElementById('th-date')?.addEventListener('click', () => {
                    const nextSort = sortBy === 'date-desc' ? 'date-asc' : 'date-desc';
                    if (typeof (window as any).triggerHeaderSort === 'function') {
                        (window as any).triggerHeaderSort(nextSort);
                    }
                });
                document.getElementById('th-name')?.addEventListener('click', () => {
                    if (typeof (window as any).triggerHeaderSort === 'function') {
                        (window as any).triggerHeaderSort('name-asc');
                    }
                });
                document.getElementById('th-total')?.addEventListener('click', () => {
                    const nextSort = sortBy === 'amount-desc' ? 'amount-asc' : 'amount-desc';
                    if (typeof (window as any).triggerHeaderSort === 'function') {
                        (window as any).triggerHeaderSort(nextSort);
                    }
                });
            }
        }

        private updateStats(invoices: Invoice[]) {
            const totalCountEl = document.getElementById('total-invoices-count');
            const b2bCountEl = document.getElementById('b2b-invoices-count');
            const b2cCountEl = document.getElementById('b2c-invoices-count');

            if (!totalCountEl || !b2bCountEl || !b2cCountEl) return;

            const total = invoices.length;
            const b2b = invoices.filter(i => {
                const snapGst = i.customer_snapshot?.gstin;
                const flatGst = (i as any).customer_GSTIN;
                return !!((snapGst && snapGst.trim()) || (flatGst && flatGst.trim()));
            }).length;
            const b2c = total - b2b;

            totalCountEl.textContent = total.toString();
            b2bCountEl.textContent = b2b.toString();
            b2cCountEl.textContent = b2c.toString();
        }

        render(invoices: Invoice[]) {
            this.updateStats(invoices);

            if (!this.paginationManager) {
                this.paginationManager = new (window as any).TablePaginationManager(
                    'invoice-tbody',
                    (paginatedData: any[]) => this.renderPage(paginatedData),
                    25
                );
            }
            this.paginationManager.setData(invoices);
        }

        renderPage(invoices: Invoice[]) {
            const isTrash = !!(window as any).showDeletedItems;
            const isArchivedView = !isTrash && (window as any).currentFilters?.status === 'archived';

            const tbody = document.getElementById("invoice-tbody");
            const mobileContainer = document.getElementById("invoice-cards-mobile");
            if (!tbody) return;

            tbody.innerHTML = "";
            if (mobileContainer) mobileContainer.innerHTML = "";

            // Always update the header
            this.updateTableHeader(isTrash);

            if (!invoices || invoices.length === 0) {
                let emptyHtml = "";
                if (isTrash) {
                    emptyHtml = `
                        <div class="w-full h-full min-h-[320px] flex flex-col items-center justify-center text-center py-4 fade-in select-none">
                            <div class="text-rose-500 text-5xl mb-4">
                                <i class="fas fa-trash-alt"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">Trash is Empty</h2>
                            <p class="text-gray-500 text-xs">No soft-deleted invoices found</p>
                        </div>
                    `;
                } else if (isArchivedView) {
                    emptyHtml = `
                        <div class="w-full h-full min-h-[320px] flex flex-col items-center justify-center text-center py-4 fade-in select-none">
                            <div class="text-amber-500 text-5xl mb-4">
                                <i class="fas fa-archive"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">No Archived Invoices</h2>
                            <p class="text-gray-500 text-xs">Invoices you archive will show up here</p>
                        </div>
                    `;
                } else {
                    const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
                    const hasSearch = searchInput && searchInput.value.trim() !== '';
                    if (hasSearch) {
                        emptyHtml = `
                            <div class="w-full h-full min-h-[320px] flex flex-col items-center justify-center text-center py-4 fade-in select-none">
                                <div class="text-yellow-500 text-5xl mb-4">
                                    <i class="fas fa-search"></i>
                                </div>
                                <h2 class="text-2xl font-bold text-gray-800 mb-2">No Results Found</h2>
                                <p class="text-gray-500 text-xs">No invoices match your search</p>
                            </div>
                        `;
                    } else {
                        emptyHtml = `
                            <div class="w-full h-full min-h-[320px] flex flex-col items-center justify-center text-center py-4 fade-in select-none">
                                <div class="text-blue-500 text-5xl mb-4">
                                    <i class="fas fa-file-invoice-dollar"></i>
                                </div>
                                <h2 class="text-2xl font-bold text-gray-800 mb-2">No Invoices Found</h2>
                                <p class="text-gray-500 text-xs">Start creating invoices for your clients</p>
                            </div>
                        `;
                    }
                }
 
                tbody.innerHTML = `
                    <tr>
                        <td colspan="100" class="px-4 py-10 bg-white text-slate-400 text-center align-middle h-full">
                            ${emptyHtml}
                        </td>
                    </tr>
                `;

                if (mobileContainer) {
                    mobileContainer.innerHTML = `
                        <div class="text-center py-10 bg-white rounded-xl border border-slate-200 p-6">
                            <i class="fas fa-file-invoice-dollar text-3xl text-blue-500 mb-2"></i>
                            <p class="text-sm font-bold text-slate-700">No Invoices Found</p>
                        </div>
                    `;
                }

                return;
            }

            invoices.forEach(invoice => {
                const row = this.createInvoiceRow(invoice, isTrash);
                tbody.appendChild(row);
            });

            // Mobile list rendering
            if (mobileContainer) {
                mobileContainer.innerHTML = invoices.map(invoice => {
                    const userRole = sessionStorage.getItem('userRole');
                    const isArchived = !isTrash && invoice.is_archived;
                    const invoiceStatus = getInvoiceStatus(invoice);
                    const detail = { ...INVOICE_STATUS_DETAILS[invoiceStatus] };
                    
                    let statusLabel = detail.label.toUpperCase();
                    let statusClass = `${detail.bgClass} ${detail.textClass}`;
                    if (isTrash) {
                        statusLabel = 'DELETED';
                        statusClass = 'bg-rose-100 text-rose-700';
                    } else if (isArchived) {
                        statusLabel = 'ARCHIVED';
                        statusClass = 'bg-slate-100 text-slate-600 border border-slate-200';
                    }

                    const total = this.getEffectiveTotal(invoice);
                    const dateToFormat = invoice.invoice_date || invoice.createdAt;
                    const formattedDate = dateToFormat ? ((window as any).formatDateDisplay ? (window as any).formatDateDisplay(dateToFormat) : '-') : '-';

                    return `
                        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative cursor-pointer" onclick="viewInvoice('${invoice.invoice_id}', '${userRole}')">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-xs font-bold text-slate-800">${invoice.invoice_id}</span>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${statusClass}">${statusLabel}</span>
                            </div>
                            <h4 class="text-sm font-bold text-slate-900 truncate mb-1">${invoice.project_name || ''}</h4>
                            <p class="text-xs text-slate-600 mb-2 truncate">${invoice.customer_name || ''}</p>
                            <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                <span class="text-slate-400">${formattedDate}</span>
                                <span class="font-bold text-slate-900">₹${formatIndian(total, 2)}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        createInvoiceRow(invoice: Invoice, isTrash: boolean): HTMLTableRowElement {
            const userRole = sessionStorage.getItem('userRole');
            const row = document.createElement("tr");
            const isArchived = !isTrash && invoice.is_archived;

            row.className = "border-b border-slate-100 hover:bg-slate-50 transition-all duration-150 group cursor-pointer text-xs";
            if (isTrash) {
                row.classList.add("bg-rose-50/10");
            } else if (isArchived) {
                row.classList.add("opacity-80");
            }

            const invoiceStatus = getInvoiceStatus(invoice);
            const detail = { ...INVOICE_STATUS_DETAILS[invoiceStatus] };
            
            let statusClass = `${detail.bgClass} ${detail.textClass}`;
            let statusLabel = detail.label.toUpperCase();

            if (isTrash) {
                statusClass = 'bg-rose-100 text-rose-700';
                statusLabel = 'DELETED';
            } else if (isArchived) {
                statusClass = 'bg-slate-100 text-slate-600 border border-slate-200';
                statusLabel = 'ARCHIVED';
            }

            const total = this.getEffectiveTotal(invoice);
            const dateToFormat = invoice.invoice_date || invoice.createdAt;
            const formattedDate = dateToFormat ? ((window as any).formatDateDisplay ? (window as any).formatDateDisplay(dateToFormat) : '-') : '-';

            if (isTrash) {
                const deletedAt = invoice.deletion?.deleted_at
                    ? ((window as any).formatDateDisplay ? (window as any).formatDateDisplay(invoice.deletion.deleted_at) : invoice.deletion.deleted_at)
                    : '-';

                row.innerHTML = `
                    <td class="px-4 py-3 text-slate-850 font-medium whitespace-nowrap text-xs">${formattedDate}</td>
                    <td class="px-4 py-3 text-slate-600 font-bold whitespace-nowrap text-xs">${invoice.invoice_id}</td>
                    <td class="px-4 py-3 text-slate-900 font-semibold text-xs max-w-[150px] truncate" title="${invoice.project_name || '-'}">
                        ${invoice.project_name || '-'}
                    </td>
                    <td class="px-4 py-3 text-slate-700 text-xs max-w-[180px] truncate" title="${invoice.customer_name || ''}">${invoice.customer_name || ''}</td>
                    <td class="px-4 py-3 text-red-500 font-medium whitespace-nowrap text-xs">
                        <i class="fas fa-trash mr-1 text-[10px]"></i> ${deletedAt}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                        <span class="px-2 py-0.5 rounded-md text-xs font-semibold ${statusClass}">
                            ${statusLabel}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-right font-bold text-xs whitespace-nowrap text-slate-900">
                        ₹${formatIndian(total, 2)}
                    </td>
                    <td class="px-4 py-2 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                            <button class="action-btn restore-card-btn px-2.5 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 border border-green-200 hover:border-green-400 font-semibold text-xs flex items-center gap-1" title="Restore">
                                <i class="fas fa-trash-restore text-[10px]"></i> Restore
                            </button>
                            <button class="action-btn hard-delete-card-btn px-2.5 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 border border-red-200 hover:border-red-400 font-semibold text-xs flex items-center gap-1" title="Permanently Delete">
                                <i class="fas fa-trash-alt text-[10px]"></i> Delete
                            </button>
                        </div>
                    </td>
                `;
            } else {
                row.innerHTML = `
                    <td class="px-4 py-3 text-slate-850 font-medium whitespace-nowrap text-xs">${formattedDate}</td>
                    <td class="px-4 py-3 text-slate-850 font-bold whitespace-nowrap text-xs">
                        <span class="cursor-pointer hover:text-blue-600 copy-text transition-colors" title="Click to copy ID">
                            ${invoice.invoice_id}
                            <i class="fas fa-copy text-[10px] ml-1 opacity-50"></i>
                        </span>
                    </td>
                    <td class="px-4 py-3 text-slate-900 font-semibold text-xs max-w-[150px] truncate" title="${invoice.project_name || '-'}">
                        ${invoice.project_name || '-'}
                    </td>
                    <td class="px-4 py-3 text-xs max-w-[180px] truncate">
                        <div class="font-medium text-slate-800 truncate" title="${invoice.customer_name || ''}">${invoice.customer_name || ''}</div>
                        <div class="text-[10px] text-slate-400 truncate" title="${invoice.customer_address || ''}">${invoice.customer_address || ''}</div>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                        <span class="px-2 py-0.5 rounded-md text-xs font-semibold ${statusClass}">
                            ${statusLabel}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-right font-bold text-xs whitespace-nowrap text-slate-900">
                        ₹${formatIndian(total, 2)}
                    </td>
                `;
            }

            const copyElement = row.querySelector('.copy-text') as HTMLElement;
            const restoreCardBtn = row.querySelector('.restore-card-btn') as HTMLElement;
            const hardDeleteCardBtn = row.querySelector('.hard-delete-card-btn') as HTMLElement;

            if (restoreCardBtn) {
                restoreCardBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (isTrash) {
                        (window as any).handleRestoreFromTrash(invoice.invoice_id, invoice.project_name);
                    } else if (isArchived) {
                        (window as any).handleRestoreFromArchive(invoice.invoice_id, invoice.project_name);
                    }
                });
            }

            if (hardDeleteCardBtn) {
                hardDeleteCardBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    (window as any).handleHardDelete(invoice.invoice_id, invoice.project_name);
                });
            }

            if (copyElement) {
                copyElement.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try {
                        await navigator.clipboard.writeText(invoice.invoice_id);
                        showToast('ID Copied to Clipboard!');
                    } catch (err) {
                        console.error('Copy failed', err);
                    }
                });
            }

            row.addEventListener('click', () => {
                if (!isTrash) {
                    sessionStorage.setItem('view-invoice', 'duplicate');
                    viewInvoice(invoice.invoice_id, userRole);
                }
            });

            // Enrich total values if zero asynchronously:
            (async () => {
                try {
                    if (total === 0 && !(invoice.items_duplicate && invoice.items_duplicate.length) && !(invoice.items_original && invoice.items_original.length)) {
                        const full = await (window as any).invoiceApi.getInvoiceById(invoice.invoice_id);
                        if (!full) return;
                        const effective = this.getEffectiveTotal(full);
                        const tdTotal = row.querySelector('td:last-child') as HTMLElement | null;
                        if (tdTotal && !isTrash) {
                            tdTotal.textContent = `₹${formatIndian(effective, 2)}`;
                        }
                    }
                } catch (err) {
                    console.error(err);
                }
            })();

            return row;
        }

        private getEffectiveTotal(invoice: Invoice): number {
            const dup = Number(invoice.total_amount_duplicate || 0);
            if (dup > 0) return dup;
            const items = invoice.items_duplicate && invoice.items_duplicate.length > 0 ? invoice.items_duplicate : (invoice.items_original || []);
            const nonItems = invoice.non_items_duplicate && invoice.non_items_duplicate.length > 0 ? invoice.non_items_duplicate : (invoice.non_items_original || []);
            let subtotal = 0;
            let tax = 0;
            for (const it of items) {
                const qty = Number(it.quantity || 0);
                const unit = Number(it.unit_price || 0);
                const rate = Number(it.rate || 0);
                const taxable = qty * unit;
                subtotal += taxable;
                tax += taxable * (rate / 100);
            }
            for (const nit of nonItems) {
                const price = Number(nit.price || 0);
                const rate = Number(nit.rate || 0);
                subtotal += price;
                tax += price * (rate / 100);
            }
            return Number((subtotal + tax).toFixed(2));
        }
    }

    (window as any).invoiceTable = new InvoiceTable();
})();
